// =================================================================
// CAPA: Domain
// Validación de la firma de las notificaciones (webhooks) de
// Mercado Pago. Evita que un tercero envíe notificaciones falsas.
//
// Mercado Pago envía el header:
//   x-signature: ts=1704908010,v1=618c85345248dd820d5fd456117c2ab2ef8eda45a0282ff693eac24131a5e839
//   x-request-id: <uuid>
// y la "plantilla" firmada con HMAC-SHA256 (clave secreta del panel) es:
//   id:<data.id>;request-id:<x-request-id>;ts:<ts>;
// =================================================================
import crypto from 'crypto';

export interface DatosFirma {
    xSignature: string | undefined;
    xRequestId: string | undefined;
    dataId: string | undefined;
    secreto: string;
}

export function construirManifiesto(dataId: string | undefined, xRequestId: string | undefined, ts: string): string {
    let manifiesto = '';
    if (dataId) {
        // Si el id es alfanumérico, Mercado Pago lo firma en minúsculas
        manifiesto += `id:${/^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId};`;
    }
    if (xRequestId) manifiesto += `request-id:${xRequestId};`;
    manifiesto += `ts:${ts};`;
    return manifiesto;
}

export function validarFirmaWebhook(d: DatosFirma): boolean {
    if (!d.xSignature || !d.secreto) return false;

    const partes = Object.fromEntries(
        d.xSignature.split(',').map(p => {
            const [k, ...v] = p.trim().split('=');
            return [k, v.join('=')];
        }),
    );
    const ts = partes['ts'];
    const v1 = partes['v1'];
    if (!ts || !v1) return false;

    const esperado = crypto
        .createHmac('sha256', d.secreto)
        .update(construirManifiesto(d.dataId, d.xRequestId, ts))
        .digest('hex');

    const a = Buffer.from(esperado, 'utf8');
    const b = Buffer.from(v1, 'utf8');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}
