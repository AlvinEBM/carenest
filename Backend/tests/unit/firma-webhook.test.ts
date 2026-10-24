// =================================================================
// PRUEBAS UNITARIAS — Firma de webhooks de Mercado Pago (OWASP A08)
// =================================================================
import crypto from 'crypto';
import { construirManifiesto, validarFirmaWebhook } from '../../src/modules/pagos/domain/firma-webhook';

const SECRETO = 'secreto_de_prueba';
const firmar = (dataId: string, requestId: string, ts: string, secreto = SECRETO) =>
    crypto.createHmac('sha256', secreto).update(construirManifiesto(dataId, requestId, ts)).digest('hex');

describe('validarFirmaWebhook', () => {
    const ts = '1704908010';
    const requestId = 'bb56a2f1-6aae-46ac-982e-9dcd3581d08e';
    const dataId = '123456789';

    test('CP-WEB-01 manifiesto con el formato de Mercado Pago', () => {
        expect(construirManifiesto(dataId, requestId, ts)).toBe(`id:${dataId};request-id:${requestId};ts:${ts};`);
    });

    test('CP-WEB-02 id alfanumérico se firma en minúsculas', () => {
        expect(construirManifiesto('ABC123', requestId, ts)).toBe(`id:abc123;request-id:${requestId};ts:${ts};`);
    });

    test('CP-WEB-03 [CE válida] firma correcta → true', () => {
        const v1 = firmar(dataId, requestId, ts);
        expect(validarFirmaWebhook({ xSignature: `ts=${ts},v1=${v1}`, xRequestId: requestId, dataId, secreto: SECRETO })).toBe(true);
    });

    test('CP-WEB-04 [CE inválida] firma alterada → false', () => {
        const v1 = firmar(dataId, requestId, ts).replace(/^./, c => (c === 'a' ? 'b' : 'a'));
        expect(validarFirmaWebhook({ xSignature: `ts=${ts},v1=${v1}`, xRequestId: requestId, dataId, secreto: SECRETO })).toBe(false);
    });

    test('CP-WEB-05 [CE inválida] payment_id cambiado (reenvío con otro id) → false', () => {
        const v1 = firmar(dataId, requestId, ts);
        expect(validarFirmaWebhook({ xSignature: `ts=${ts},v1=${v1}`, xRequestId: requestId, dataId: '999', secreto: SECRETO })).toBe(false);
    });

    test('CP-WEB-06 [CE inválida] firmado con otra clave → false', () => {
        const v1 = firmar(dataId, requestId, ts, 'otra_clave');
        expect(validarFirmaWebhook({ xSignature: `ts=${ts},v1=${v1}`, xRequestId: requestId, dataId, secreto: SECRETO })).toBe(false);
    });

    test.each([undefined, '', 'v1=abc', `ts=${ts}`])('CP-WEB-07 [CE inválida] header incompleto "%s" → false', (header) => {
        expect(validarFirmaWebhook({ xSignature: header, xRequestId: requestId, dataId, secreto: SECRETO })).toBe(false);
    });
});
