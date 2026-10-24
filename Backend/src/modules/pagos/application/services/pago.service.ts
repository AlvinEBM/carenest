// =================================================================
// CAPA: Application / Services
// Casos de uso de la pasarela de pagos:
//   1. Crear la preferencia de pago de una cita (paciente)
//   2. Verificar el pago al volver de Mercado Pago (paciente)
//   3. Procesar una notificación (webhook) de Mercado Pago
//   4. Listar pagos (paciente / admin)
//
// Flujo:
//   Paciente → POST /pagos/preferencia → se crea pago PENDIENTE
//            → se abre Checkout Pro → paga con tarjeta de prueba
//            → vuelve → POST /pagos/:id/verificar (o llega webhook)
//            → el backend CONSULTA a Mercado Pago (no confía en lo
//              que dice el navegador) → APROBADO → cita CONFIRMADA
// =================================================================
import { IPagoRepository } from '../../domain/repositories/IPagoRepository';
import { IPasarelaPago, PagoExterno } from '../../domain/gateways/IPasarelaPago';
import { Pago } from '../../domain/entities/pago.entity';
import {
    citaEsPagable,
    mapearEstadoMercadoPago,
    montoEsValido,
    montosCoinciden,
} from '../../domain/reglas-pago';
import { PagoRepository } from '../../infrastructure/repositories/pago.repository';
import { MercadoPagoGateway } from '../../infrastructure/gateways/mercadopago.gateway';

type Resultado<T = Record<string, unknown>> =
    | ({ ok: true; codigo: number; mensaje?: string } & T)
    | { ok: false; codigo: number; mensaje: string };

const MENSAJES_ESTADO: Record<string, string> = {
    APROBADO: '¡Pago aprobado! Tu cita quedó confirmada.',
    PENDIENTE: 'Tu pago está pendiente. Te avisaremos cuando se acredite.',
    RECHAZADO: 'El pago fue rechazado. Puedes intentarlo nuevamente.',
    CANCELADO: 'El pago fue cancelado.',
    REEMBOLSADO: 'El pago fue reembolsado.',
};

export class PagoService {
    private repo: IPagoRepository;
    private pasarela: IPasarelaPago;

    constructor(repo?: IPagoRepository, pasarela?: IPasarelaPago) {
        this.repo = repo ?? new PagoRepository();
        this.pasarela = pasarela ?? new MercadoPagoGateway();
    }

    estado() {
        return { ok: true, habilitado: this.pasarela.estaConfigurada(), proveedor: 'Mercado Pago' };
    }

    // ============================================================
    // 1) CREAR PREFERENCIA
    // ============================================================
    async crearPreferencia(idUsuario: number, idCita: number): Promise<Resultado<{ id_pago: number; url_pago: string; monto: number }>> {
        if (!this.pasarela.estaConfigurada()) {
            return { ok: false, codigo: 503, mensaje: 'Los pagos en línea no están habilitados en este momento' };
        }

        const cita = await this.repo.obtenerCitaParaPago(idCita);
        if (!cita) {
            return { ok: false, codigo: 404, mensaje: 'La cita no existe' };
        }

        // OWASP A01: solo el titular de la cita puede pagarla
        if (cita.id_usuario !== idUsuario) {
            return { ok: false, codigo: 403, mensaje: 'No puedes pagar una cita que no es tuya' };
        }

        if (!citaEsPagable(cita.estado)) {
            return { ok: false, codigo: 409, mensaje: `No se puede pagar una cita en estado ${cita.estado}` };
        }

        if (await this.repo.existePagoAprobado(idCita)) {
            return { ok: false, codigo: 409, mensaje: 'Esta cita ya fue pagada' };
        }

        // El monto sale de la BD, nunca del cliente
        if (!montoEsValido(cita.precio)) {
            return { ok: false, codigo: 422, mensaje: 'La especialidad no tiene un precio válido configurado' };
        }

        const pago = await this.repo.crear(
            new Pago(0, idCita, idUsuario, cita.precio, 'PEN', 'PENDIENTE', null, null, null, null),
        );

        try {
            const preferencia = await this.pasarela.crearPreferencia({
                idPago: pago.id_pago,
                titulo: `Consulta de ${cita.especialidad} - ${cita.fecha} ${cita.hora.slice(0, 5)}`,
                monto: cita.precio,
                moneda: 'PEN',
                emailPagador: cita.correo,
            });
            await this.repo.asignarPreferencia(pago.id_pago, preferencia.preferenceId);

            return {
                ok: true,
                codigo: 201,
                mensaje: 'Preferencia de pago creada',
                id_pago: pago.id_pago,
                url_pago: preferencia.urlPago,
                monto: cita.precio,
            };
        } catch (e: any) {
            // El intento no llegó a la pasarela: se marca CANCELADO
            await this.repo.aplicarResultado(pago.id_pago, {
                estado: 'CANCELADO',
                payment_id: null,
                metodo: null,
                detalle_estado: 'error_creando_preferencia',
            });
            console.error('[Pagos] No se pudo crear la preferencia:', e?.message);
            return { ok: false, codigo: 502, mensaje: 'No se pudo conectar con Mercado Pago. Intenta nuevamente.' };
        }
    }

    // ============================================================
    // 2) VERIFICAR (al volver del checkout o con el botón)
    // ============================================================
    async verificarPago(idUsuario: number, idPago: number): Promise<Resultado<{ estado: string; id_cita: number }>> {
        const pago = await this.repo.obtenerPorId(idPago);
        if (!pago) {
            return { ok: false, codigo: 404, mensaje: 'El pago no existe' };
        }
        if (pago.id_usuario !== idUsuario) {
            return { ok: false, codigo: 403, mensaje: 'No puedes consultar un pago que no es tuyo' };
        }

        // Estados finales: no hace falta volver a consultar
        if (pago.estado === 'APROBADO' || pago.estado === 'REEMBOLSADO') {
            return { ok: true, codigo: 200, estado: pago.estado, id_cita: pago.id_cita, mensaje: MENSAJES_ESTADO[pago.estado] };
        }

        let externo: PagoExterno | null;
        try {
            externo = await this.pasarela.buscarPagoPorReferencia(String(pago.id_pago));
        } catch {
            return { ok: false, codigo: 502, mensaje: 'No se pudo consultar a Mercado Pago. Intenta en unos segundos.' };
        }

        if (!externo) {
            return {
                ok: true,
                codigo: 200,
                estado: pago.estado,
                id_cita: pago.id_cita,
                mensaje: 'Aún no registramos un pago para esta cita. Si ya pagaste, espera unos segundos y vuelve a verificar.',
            };
        }

        const estado = await this.aplicar(pago, externo);
        return { ok: true, codigo: 200, estado, id_cita: pago.id_cita, mensaje: MENSAJES_ESTADO[estado] };
    }

    // ============================================================
    // 3) WEBHOOK
    //    Nunca confiamos en el cuerpo: con el payment_id volvemos a
    //    pedir el pago a Mercado Pago y recién ahí actualizamos.
    // ============================================================
    async procesarNotificacion(paymentId: string): Promise<{ procesado: boolean; motivo?: string }> {
        if (!paymentId || !/^\d+$/.test(paymentId)) {
            return { procesado: false, motivo: 'payment_id inválido' };
        }

        const externo = await this.pasarela.obtenerPago(paymentId);
        if (!externo) return { procesado: false, motivo: 'pago no encontrado en la pasarela' };

        const idPago = Number(externo.externalReference);
        if (!Number.isInteger(idPago) || idPago <= 0) {
            return { procesado: false, motivo: 'external_reference inválido' };
        }

        const pago = await this.repo.obtenerPorId(idPago);
        if (!pago) return { procesado: false, motivo: 'pago local no encontrado' };

        await this.aplicar(pago, externo);
        return { procesado: true };
    }

    // ------------------------------------------------------------
    // Aplica el resultado externo validando integridad del monto
    // ------------------------------------------------------------
    private async aplicar(pago: Pago, externo: PagoExterno) {
        // Idempotencia: un pago APROBADO no retrocede a otro estado
        // (salvo reembolso).
        let estado = mapearEstadoMercadoPago(externo.status);
        if (pago.estado === 'APROBADO' && estado !== 'REEMBOLSADO') {
            return pago.estado;
        }

        let detalle = externo.statusDetail;
        if (estado === 'APROBADO' && !montosCoinciden(pago.monto, externo.monto)) {
            // OWASP A08: el monto pagado no coincide con el registrado
            console.warn(`[Pagos] Monto inconsistente en pago ${pago.id_pago}: esperado ${pago.monto}, recibido ${externo.monto}`);
            estado = 'RECHAZADO';
            detalle = 'monto_inconsistente';
        }

        await this.repo.aplicarResultado(pago.id_pago, {
            estado,
            payment_id: externo.paymentId,
            metodo: externo.metodo,
            detalle_estado: detalle,
        });
        return estado;
    }

    // ============================================================
    // 4) LISTADOS
    // ============================================================
    async misPagos(idUsuario: number) {
        const pagos = await this.repo.listarPorUsuario(idUsuario);
        return { ok: true, total: pagos.length, pagos };
    }

    async listarTodos() {
        const pagos = await this.repo.listarTodos();
        const aprobados = pagos.filter(p => p.estado === 'APROBADO');
        return {
            ok: true,
            total: pagos.length,
            recaudado: Number(aprobados.reduce((s, p) => s + Number(p.monto), 0).toFixed(2)),
            pagos,
        };
    }
}
