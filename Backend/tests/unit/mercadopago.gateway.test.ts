// =================================================================
// PRUEBAS UNITARIAS — Adaptador Mercado Pago
// fetch se simula: se verifica QUÉ se envía a la API sin internet.
// =================================================================
import { MercadoPagoGateway, esUrlLocal } from '../../src/modules/pagos/infrastructure/gateways/mercadopago.gateway';

const respuesta = (status: number, cuerpo: unknown) =>
    ({ ok: status >= 200 && status < 300, status, json: async () => cuerpo }) as Response;

describe('MercadoPagoGateway', () => {
    let fetchMock: jest.SpyInstance;

    beforeEach(() => {
        process.env.MP_ACCESS_TOKEN = 'TEST-123';
        delete process.env.FRONTEND_PUBLIC_URL;
        delete process.env.BACKEND_PUBLIC_URL;
        fetchMock = jest.spyOn(global, 'fetch');
        jest.spyOn(console, 'error').mockImplementation(() => undefined);
    });
    afterEach(() => jest.restoreAllMocks());

    test.each([
        ['http://localhost:5173', true],
        ['http://127.0.0.1:3002', true],
        ['https://carenest.ngrok-free.app', false],
        ['no-es-url', true],
        [undefined, true],
    ])('CP-GW-01 esUrlLocal(%p) → %p', (url, esperado) => {
        expect(esUrlLocal(url as string | undefined)).toBe(esperado);
    });

    test('CP-GW-02 sin token no está configurada', () => {
        delete process.env.MP_ACCESS_TOKEN;
        expect(new MercadoPagoGateway().estaConfigurada()).toBe(false);
    });

    test('CP-GW-03 crea la preferencia con PEN, precio y external_reference; en localhost NO envía back_urls', async () => {
        fetchMock.mockResolvedValue(respuesta(201, { id: 'pref-1', init_point: 'https://mp/checkout?pref=1' }));
        const r = await new MercadoPagoGateway().crearPreferencia({ idPago: 77, titulo: 'Consulta', monto: 30, moneda: 'PEN', emailPagador: 'juan@gmail.com' });

        expect(r).toEqual({ preferenceId: 'pref-1', urlPago: 'https://mp/checkout?pref=1' });
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe('https://api.mercadopago.com/checkout/preferences');
        expect(init.headers.Authorization).toBe('Bearer TEST-123');
        const body = JSON.parse(init.body);
        expect(body.items[0]).toMatchObject({ quantity: 1, currency_id: 'PEN', unit_price: 30 });
        expect(body.external_reference).toBe('77');
        expect(body.back_urls).toBeUndefined();
        expect(body.auto_return).toBeUndefined();
    });

    test('CP-GW-04 con URL pública envía back_urls, auto_return y notification_url', async () => {
        process.env.FRONTEND_PUBLIC_URL = 'https://carenest-web.ngrok-free.app/';
        process.env.BACKEND_PUBLIC_URL = 'https://carenest-api.ngrok-free.app';
        fetchMock.mockResolvedValue(respuesta(201, { id: 'pref-2', init_point: 'https://mp/x' }));
        await new MercadoPagoGateway().crearPreferencia({ idPago: 8, titulo: 'Consulta', monto: 35, moneda: 'PEN' });
        const body = JSON.parse(fetchMock.mock.calls[0][1].body);
        expect(body.back_urls.success).toBe('https://carenest-web.ngrok-free.app/paciente/pago/resultado');
        expect(body.auto_return).toBe('approved');
        expect(body.notification_url).toBe('https://carenest-api.ngrok-free.app/pagos/webhook');
    });

    test('CP-GW-05 error 400 de Mercado Pago → lanza ErrorPasarela', async () => {
        fetchMock.mockResolvedValue(respuesta(400, { message: 'invalid unit_price' }));
        await expect(new MercadoPagoGateway().crearPreferencia({ idPago: 1, titulo: 'x', monto: 30, moneda: 'PEN' }))
            .rejects.toThrow('invalid unit_price');
    });

    test('CP-GW-06 buscarPagoPorReferencia prioriza el intento aprobado', async () => {
        fetchMock.mockResolvedValue(respuesta(200, { results: [
            { id: 2, status: 'rejected', external_reference: '77', transaction_amount: 30 },
            { id: 1, status: 'approved', status_detail: 'accredited', external_reference: '77', transaction_amount: 30, payment_method_id: 'master' },
        ] }));
        const p = await new MercadoPagoGateway().buscarPagoPorReferencia('77');
        expect(p).toEqual({ paymentId: '1', status: 'approved', statusDetail: 'accredited', externalReference: '77', monto: 30, metodo: 'master' });
        expect(fetchMock.mock.calls[0][0]).toContain('external_reference=77');
    });

    test('CP-GW-07 obtenerPago con id no numérico no llama a la API', async () => {
        expect(await new MercadoPagoGateway().obtenerPago('../users/me')).toBeNull();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    test('CP-GW-08 obtenerPago 404 → null', async () => {
        fetchMock.mockResolvedValue(respuesta(404, { message: 'not found' }));
        expect(await new MercadoPagoGateway().obtenerPago('123')).toBeNull();
    });
});
