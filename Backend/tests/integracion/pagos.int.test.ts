// =================================================================
// PRUEBAS DE INTEGRACIÓN — Pasarela de pagos (Mercado Pago)
// API real + MySQL real. Solo la API de Mercado Pago se simula
// (fetch) para no depender de internet ni de credenciales.
// =================================================================
import crypto from 'crypto';
import request from 'supertest';
import { app, conectarBD, desconectarBD, token, sql, fechaLaborable } from '../helpers/app';
import { construirManifiesto } from '../../src/modules/pagos/domain/firma-webhook';

let tJuan: string, tAdmin: string;
let fetchMock: jest.SpyInstance;
const FECHA = fechaLaborable(4);

const resp = (status: number, body: unknown) => ({ ok: status < 300, status, json: async () => body }) as Response;

/** Simula Mercado Pago: preferencia OK y búsqueda de pagos con el status/monto indicado. */
function simularMercadoPago(pago: { status: string; monto: number; id?: number } | null) {
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
        if (url.endsWith('/checkout/preferences')) {
            const body = JSON.parse(String(init?.body));
            return resp(201, { id: `pref-${body.external_reference}`, init_point: `https://www.mercadopago.com.pe/checkout?ref=${body.external_reference}` });
        }
        const ref = new URL(url).searchParams.get('external_reference') ?? url.split('/').pop();
        if (!pago) return resp(200, { results: [] });
        const p = { id: pago.id ?? 1001, status: pago.status, status_detail: 'x', external_reference: ref, transaction_amount: pago.monto, payment_method_id: 'visa' };
        return url.includes('/search') ? resp(200, { results: [p] }) : resp(200, p);
    });
}

async function reservar(tok: string, hora: string, idEspecialidad = 1, idMedico = 1) {
    const r = await request(app).post('/citas/reservar').set('Authorization', `Bearer ${tok}`)
        .send({ fecha: FECHA, hora, id_especialidad: idEspecialidad, id_medico: idMedico, motivo: 'Chequeo' });
    if (r.status !== 201) throw new Error(JSON.stringify(r.body));
    return r.body.cita.id_cita as number;
}

beforeAll(async () => {
    await conectarBD();
    process.env.MP_ACCESS_TOKEN = 'TEST-token-de-prueba';
    tJuan = await token('juan@gmail.com');
    tAdmin = await token('admin@carenest.pe');
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
});
beforeEach(() => { fetchMock = jest.spyOn(global, 'fetch'); });
afterEach(() => fetchMock.mockRestore());
afterAll(async () => { delete process.env.MP_ACCESS_TOKEN; await desconectarBD(); });

describe('Flujo completo de pago', () => {
    let idCita: number, idPago: number;

    test('PI-PAG-01 crear preferencia → 201, pago PENDIENTE con el precio de la especialidad', async () => {
        idCita = await reservar(tJuan, '09:00:00');
        simularMercadoPago(null);
        const r = await request(app).post('/pagos/preferencia').set('Authorization', `Bearer ${tJuan}`).send({ id_cita: idCita, monto: 0.01 });
        expect(r.status).toBe(201);
        expect(r.body.url_pago).toContain('mercadopago.com.pe');
        idPago = r.body.id_pago;
        const [p] = await sql('SELECT * FROM pagos WHERE id_pago = ?', [idPago]);
        expect(p).toMatchObject({ estado: 'PENDIENTE', monto: '30.00', moneda: 'PEN', preference_id: `pref-${idPago}` });
        // El "monto: 0.01" que mandó el cliente se ignoró
        const enviado = JSON.parse(fetchMock.mock.calls[0][1].body);
        expect(enviado.items[0].unit_price).toBe(30);
    });

    test('PI-PAG-02 verificar antes de pagar → sigue PENDIENTE', async () => {
        simularMercadoPago(null);
        const r = await request(app).post(`/pagos/${idPago}/verificar`).set('Authorization', `Bearer ${tJuan}`);
        expect(r.status).toBe(200);
        expect(r.body.estado).toBe('PENDIENTE');
    });

    test('PI-PAG-03 pago aprobado (tarjeta APRO) → APROBADO y la cita pasa a CONFIRMADA', async () => {
        simularMercadoPago({ status: 'approved', monto: 30 });
        const r = await request(app).post(`/pagos/${idPago}/verificar`).set('Authorization', `Bearer ${tJuan}`);
        expect(r.body).toMatchObject({ ok: true, estado: 'APROBADO', id_cita: idCita });
        const [c] = await sql('SELECT estado FROM citas WHERE id_cita = ?', [idCita]);
        expect(c.estado).toBe('CONFIRMADA');
    });

    test('PI-PAG-04 "Mis citas" muestra el pago aprobado y el precio', async () => {
        const r = await request(app).get('/citas/mis-citas').set('Authorization', `Bearer ${tJuan}`);
        const cita = r.body.citas.find((c: { id_cita: number }) => c.id_cita === idCita);
        expect(cita).toMatchObject({ estado: 'CONFIRMADA', estado_pago: 'APROBADO', precio: 30, id_pago: idPago });
    });

    test('PI-PAG-05 intentar pagar de nuevo la misma cita → 409', async () => {
        const r = await request(app).post('/pagos/preferencia').set('Authorization', `Bearer ${tJuan}`).send({ id_cita: idCita });
        expect(r.status).toBe(409);
    });
});

describe('Casos de error y seguridad', () => {
    test('PI-PAG-06 [A08] monto manipulado en Mercado Pago → RECHAZADO y la cita NO se confirma', async () => {
        const idCita = await reservar(tJuan, '09:30:00');
        simularMercadoPago(null);
        const { body } = await request(app).post('/pagos/preferencia').set('Authorization', `Bearer ${tJuan}`).send({ id_cita: idCita });
        simularMercadoPago({ status: 'approved', monto: 0.01, id: 2002 });
        const r = await request(app).post(`/pagos/${body.id_pago}/verificar`).set('Authorization', `Bearer ${tJuan}`);
        expect(r.body.estado).toBe('RECHAZADO');
        const [p] = await sql('SELECT detalle_estado FROM pagos WHERE id_pago = ?', [body.id_pago]);
        expect(p.detalle_estado).toBe('monto_inconsistente');
        const [c] = await sql('SELECT estado FROM citas WHERE id_cita = ?', [idCita]);
        expect(c.estado).toBe('RESERVADA');
    });

    test('PI-PAG-07 tarjeta rechazada (OTHE) → RECHAZADO; luego puede reintentar', async () => {
        const idCita = await reservar(tJuan, '10:00:00');
        simularMercadoPago(null);
        const p1 = (await request(app).post('/pagos/preferencia').set('Authorization', `Bearer ${tJuan}`).send({ id_cita: idCita })).body;
        simularMercadoPago({ status: 'rejected', monto: 30, id: 3003 });
        expect((await request(app).post(`/pagos/${p1.id_pago}/verificar`).set('Authorization', `Bearer ${tJuan}`)).body.estado).toBe('RECHAZADO');
        simularMercadoPago(null);
        const reintento = await request(app).post('/pagos/preferencia').set('Authorization', `Bearer ${tJuan}`).send({ id_cita: idCita });
        expect(reintento.status).toBe(201);
    });

    test('PI-PAG-08 [A01] otro paciente intenta pagar/verificar una cita ajena → 403', async () => {
        await request(app).post('/auth/register').send({
            correo: 'rosa.paciente@gmail.com', contrasena: 'secreta1', dni: '70000001', nombres: 'Rosa',
            apellidos: 'Huaman', telefono: '912345678', genero: 'Femenino',
        });
        const tRosa = await token('rosa.paciente@gmail.com', 'secreta1');
        const [ajena] = await sql("SELECT c.id_cita, p.id_pago FROM citas c JOIN pagos p ON p.id_cita = c.id_cita WHERE c.id_usuario = 3 LIMIT 1");
        expect((await request(app).post('/pagos/preferencia').set('Authorization', `Bearer ${tRosa}`).send({ id_cita: ajena.id_cita })).status).toBe(403);
        expect((await request(app).post(`/pagos/${ajena.id_pago}/verificar`).set('Authorization', `Bearer ${tRosa}`)).status).toBe(403);
    });

    test('PI-PAG-09 id_cita inválido → 400', async () => {
        const r = await request(app).post('/pagos/preferencia').set('Authorization', `Bearer ${tJuan}`).send({ id_cita: 'abc' });
        expect(r.status).toBe(400);
    });

    test('PI-PAG-10 Mercado Pago no responde → 502 y el intento queda CANCELADO', async () => {
        const idCita = await reservar(tJuan, '10:30:00');
        fetchMock.mockRejectedValue(new TypeError('fetch failed'));
        const r = await request(app).post('/pagos/preferencia').set('Authorization', `Bearer ${tJuan}`).send({ id_cita: idCita });
        expect(r.status).toBe(502);
        const [p] = await sql('SELECT estado FROM pagos WHERE id_cita = ? ORDER BY id_pago DESC LIMIT 1', [idCita]);
        expect(p.estado).toBe('CANCELADO');
    });

    test('PI-PAG-11 sin MP_ACCESS_TOKEN el servicio responde 503 y /pagos/estado lo indica', async () => {
        delete process.env.MP_ACCESS_TOKEN;
        const estado = await request(app).get('/pagos/estado').set('Authorization', `Bearer ${tJuan}`);
        expect(estado.body.habilitado).toBe(false);
        const r = await request(app).post('/pagos/preferencia').set('Authorization', `Bearer ${tJuan}`).send({ id_cita: 1 });
        expect(r.status).toBe(503);
        process.env.MP_ACCESS_TOKEN = 'TEST-token-de-prueba';
    });
});

describe('Webhook de Mercado Pago', () => {
    const SECRETO = 'clave_webhook_test';
    let idPago: number;

    beforeAll(async () => {
        const idCita = await reservar(tJuan, '11:00:00');
        fetchMock = jest.spyOn(global, 'fetch');
        simularMercadoPago(null);
        idPago = (await request(app).post('/pagos/preferencia').set('Authorization', `Bearer ${tJuan}`).send({ id_cita: idCita })).body.id_pago;
        fetchMock.mockRestore();
        process.env.MP_WEBHOOK_SECRET = SECRETO;
    });
    afterAll(() => { delete process.env.MP_WEBHOOK_SECRET; });

    const firmar = (dataId: string, requestId: string, ts: string) =>
        `ts=${ts},v1=${crypto.createHmac('sha256', SECRETO).update(construirManifiesto(dataId, requestId, ts)).digest('hex')}`;

    test('PI-PAG-12 [A08] notificación sin firma válida → 401 y no cambia nada', async () => {
        const r = await request(app).post('/pagos/webhook?data.id=5005&type=payment')
            .set('x-signature', 'ts=1,v1=falsa').set('x-request-id', 'req-1')
            .send({ type: 'payment', data: { id: '5005' } });
        expect(r.status).toBe(401);
        const [p] = await sql('SELECT estado FROM pagos WHERE id_pago = ?', [idPago]);
        expect(p.estado).toBe('PENDIENTE');
    });

    test('PI-PAG-13 notificación firmada → consulta el pago real y lo APRUEBA', async () => {
        fetchMock.mockImplementation(async () => resp(200, {
            id: 5005, status: 'approved', status_detail: 'accredited', external_reference: String(idPago), transaction_amount: 30, payment_method_id: 'master',
        }));
        const r = await request(app).post('/pagos/webhook?data.id=5005&type=payment')
            .set('x-signature', firmar('5005', 'req-2', '1704908010')).set('x-request-id', 'req-2')
            .send({ type: 'payment', data: { id: '5005' } });
        expect(r.status).toBe(200);
        expect(r.body).toMatchObject({ ok: true, procesado: true });
        const [p] = await sql('SELECT estado, payment_id, metodo FROM pagos WHERE id_pago = ?', [idPago]);
        expect(p).toEqual({ estado: 'APROBADO', payment_id: '5005', metodo: 'master' });
    });

    test('PI-PAG-14 eventos que no son "payment" se ignoran con 200', async () => {
        const r = await request(app).post('/pagos/webhook?data.id=77&type=merchant_order')
            .set('x-signature', firmar('77', 'req-3', '1')).set('x-request-id', 'req-3')
            .send({ type: 'merchant_order', data: { id: '77' } });
        expect(r.status).toBe(200);
        expect(r.body.ignorado).toBe(true);
    });
});

describe('Precio por especialidad (admin)', () => {
    test.each([[0.99, 400], [1000, 400], [45.5, 200]])('PI-PAG-15 precio %p → %p', async (precio, status) => {
        const r = await request(app).put('/admin/especialidad/3/precio').set('Authorization', `Bearer ${tAdmin}`).send({ precio });
        expect(r.status).toBe(status);
    });

    test('PI-PAG-16 el nuevo precio (S/ 45.50) se usa en el siguiente pago', async () => {
        const idCita = await reservar(tJuan, '11:30:00', 3, 3); // Psicología, médico 3
        simularMercadoPago(null);
        const r = await request(app).post('/pagos/preferencia').set('Authorization', `Bearer ${tJuan}`).send({ id_cita: idCita });
        expect(r.body.monto).toBe(45.5);
        expect(JSON.parse(fetchMock.mock.calls[0][1].body).items[0].unit_price).toBe(45.5);
    });

    test('PI-PAG-17 el admin ve todos los pagos y el total recaudado', async () => {
        const r = await request(app).get('/pagos').set('Authorization', `Bearer ${tAdmin}`);
        expect(r.status).toBe(200);
        expect(r.body.recaudado).toBe(60); // dos pagos aprobados de S/ 30
    });
});
