// =================================================================
// CAPA: Infrastructure / Gateways
// Adaptador de Mercado Pago (Checkout Pro) usando su API REST.
//
// Modo PRUEBAS (sin costo): usa el Access Token de un USUARIO DE
// PRUEBA vendedor (empieza con "APP_USR-" en la cuenta de prueba, o
// "TEST-" en credenciales de prueba). No se mueve dinero real.
//
// Variables de entorno:
//   MP_ACCESS_TOKEN      → obligatorio para habilitar pagos
//   FRONTEND_PUBLIC_URL  → URL pública del frontend (opcional).
//                          Mercado Pago NO acepta "localhost" en las
//                          back_urls; si no hay URL pública, el
//                          paciente vuelve a la app y pulsa
//                          "Verificar pago".
//   BACKEND_PUBLIC_URL   → URL pública del backend (opcional, ej. ngrok)
//                          para recibir el webhook /pagos/webhook.
// =================================================================
import {
    DatosPreferencia,
    IPasarelaPago,
    PagoExterno,
    PreferenciaCreada,
} from '../../domain/gateways/IPasarelaPago';

const API = 'https://api.mercadopago.com';
const TIMEOUT_MS = 15000;

export class ErrorPasarela extends Error {
    constructor(mensaje: string, public status?: number) {
        super(mensaje);
        this.name = 'ErrorPasarela';
    }
}

/** true si la URL apunta a la propia PC (Mercado Pago la rechaza). */
export function esUrlLocal(url: string | undefined | null): boolean {
    if (!url) return true;
    try {
        const { hostname } = new URL(url);
        return ['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]'].includes(hostname)
            || hostname.endsWith('.local');
    } catch {
        return true;
    }
}

export class MercadoPagoGateway implements IPasarelaPago {
    private get token(): string | undefined {
        return process.env.MP_ACCESS_TOKEN?.trim() || undefined;
    }

    estaConfigurada(): boolean {
        return !!this.token;
    }

    private async llamar(ruta: string, init: RequestInit = {}): Promise<Response> {
        if (!this.token) {
            throw new ErrorPasarela('Mercado Pago no está configurado (falta MP_ACCESS_TOKEN)');
        }
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
        try {
            return await fetch(`${API}${ruta}`, {
                ...init,
                signal: controller.signal,
                headers: {
                    Authorization: `Bearer ${this.token}`,
                    'Content-Type': 'application/json',
                    ...(init.headers || {}),
                },
            });
        } catch (e: any) {
            throw new ErrorPasarela(
                e?.name === 'AbortError'
                    ? 'Mercado Pago no respondió a tiempo'
                    : 'No se pudo conectar con Mercado Pago',
            );
        } finally {
            clearTimeout(timer);
        }
    }

    async crearPreferencia(d: DatosPreferencia): Promise<PreferenciaCreada> {
        const urlFrontend = [process.env.FRONTEND_PUBLIC_URL, process.env.FRONTEND_URL]
            .find(u => u && !esUrlLocal(u));
        const urlBackend = process.env.BACKEND_PUBLIC_URL;

        const cuerpo: Record<string, unknown> = {
            items: [
                {
                    id: `CITA-${d.idPago}`,
                    title: d.titulo.slice(0, 250),
                    quantity: 1,
                    currency_id: d.moneda,
                    unit_price: d.monto,
                },
            ],
            external_reference: String(d.idPago),
            statement_descriptor: 'CARENEST',
            // La preferencia vence en 24 horas
            expires: true,
            expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        };

        if (d.emailPagador) {
            cuerpo.payer = { email: d.emailPagador };
        }

        if (urlFrontend) {
            const base = urlFrontend.replace(/\/$/, '');
            cuerpo.back_urls = {
                success: `${base}/paciente/pago/resultado`,
                failure: `${base}/paciente/pago/resultado`,
                pending: `${base}/paciente/pago/resultado`,
            };
            cuerpo.auto_return = 'approved';
        }

        if (urlBackend && !esUrlLocal(urlBackend)) {
            cuerpo.notification_url = `${urlBackend.replace(/\/$/, '')}/pagos/webhook`;
        }

        const resp = await this.llamar('/checkout/preferences', {
            method: 'POST',
            headers: { 'X-Idempotency-Key': `pago-${d.idPago}` },
            body: JSON.stringify(cuerpo),
        });

        const data: any = await resp.json().catch(() => ({}));
        if (!resp.ok) {
            console.error('[MercadoPago] Error creando preferencia:', resp.status, data);
            throw new ErrorPasarela(data?.message || 'Mercado Pago rechazó la preferencia', resp.status);
        }

        const urlPago = data.init_point || data.sandbox_init_point;
        if (!data.id || !urlPago) {
            throw new ErrorPasarela('Respuesta inesperada de Mercado Pago');
        }
        return { preferenceId: String(data.id), urlPago };
    }

    private aPagoExterno(p: any): PagoExterno {
        return {
            paymentId: String(p.id),
            status: String(p.status ?? ''),
            statusDetail: p.status_detail ?? null,
            externalReference: p.external_reference ?? null,
            monto: Number(p.transaction_amount ?? 0),
            metodo: p.payment_method_id ?? p.payment_type_id ?? null,
        };
    }

    async obtenerPago(paymentId: string): Promise<PagoExterno | null> {
        if (!/^\d+$/.test(paymentId)) return null;
        const resp = await this.llamar(`/v1/payments/${paymentId}`);
        if (resp.status === 404) return null;
        const data: any = await resp.json().catch(() => ({}));
        if (!resp.ok) {
            throw new ErrorPasarela(data?.message || 'No se pudo consultar el pago', resp.status);
        }
        return this.aPagoExterno(data);
    }

    async buscarPagoPorReferencia(externalReference: string): Promise<PagoExterno | null> {
        const qs = new URLSearchParams({
            external_reference: externalReference,
            sort: 'date_created',
            criteria: 'desc',
        });
        const resp = await this.llamar(`/v1/payments/search?${qs.toString()}`);
        const data: any = await resp.json().catch(() => ({}));
        if (!resp.ok) {
            throw new ErrorPasarela(data?.message || 'No se pudo buscar el pago', resp.status);
        }
        const resultados: any[] = Array.isArray(data.results) ? data.results : [];
        if (resultados.length === 0) return null;
        // Si hay varios intentos, priorizamos el aprobado
        const aprobado = resultados.find(r => r.status === 'approved');
        return this.aPagoExterno(aprobado ?? resultados[0]);
    }
}
