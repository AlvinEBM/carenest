// =================================================================
// PRUEBAS DE INTEGRACIÓN — Seguridad (OWASP Top 10:2021)
// API real (Express) + MySQL real (BD carenest_test)
// =================================================================
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app, conectarBD, desconectarBD, token } from '../helpers/app';
import { crearApp } from '../../src/app';

beforeAll(conectarBD);
afterAll(desconectarBD);

describe('Autenticación y control de acceso', () => {
    test('PI-SEG-01 [A01] sin token → 401', async () => {
        const r = await request(app).get('/medico/agenda');
        expect(r.status).toBe(401);
        expect(r.body).toEqual({ ok: false, mensaje: 'Token no proporcionado' });
    });

    test('PI-SEG-02 [A02] token firmado con la clave antigua por defecto ("secret") → 401', async () => {
        const falso = jwt.sign({ id: 1, rol: 'ADMIN' }, 'secret');
        const r = await request(app).get('/admin/medicos').set('Authorization', `Bearer ${falso}`);
        expect(r.status).toBe(401);
    });

    test('PI-SEG-03 [A01] token alterado (rol cambiado a mano) → 401', async () => {
        const t = await token('juan@gmail.com');
        const [h, , f] = t.split('.');
        const payload = Buffer.from(JSON.stringify({ id: 3, rol: 'ADMIN' })).toString('base64url');
        const r = await request(app).get('/admin/medicos').set('Authorization', `Bearer ${h}.${payload}.${f}`);
        expect(r.status).toBe(401);
    });

    test.each([
        ['juan@gmail.com', '/medico/agenda'],
        ['juan@gmail.com', '/admin/medicos'],
        ['carlos.lopez@carenest.pe', '/admin/medicos'],
        ['carlos.lopez@carenest.pe', '/citas/mis-citas'],
        ['admision@carenest.pe', '/medico/agenda'],
    ])('PI-SEG-04 [A01] %s no puede entrar a %s → 403', async (correo, ruta) => {
        const r = await request(app).get(ruta).set('Authorization', `Bearer ${await token(correo)}`);
        expect(r.status).toBe(403);
    });

    test('PI-SEG-05 credenciales incorrectas → 401 con mensaje genérico (no revela si el correo existe)', async () => {
        const a = await request(app).post('/auth/login').send({ correo: 'juan@gmail.com', contrasena: 'mala' });
        const b = await request(app).post('/auth/login').send({ correo: 'noexiste@gmail.com', contrasena: 'mala' });
        expect(a.status).toBe(401);
        expect(b.status).toBe(401);
        expect(a.body.mensaje).toBe(b.body.mensaje);
    });

    test("PI-SEG-06 [A03] inyección SQL en el login (' OR '1'='1) → 400, nunca 200 ni 500", async () => {
        const r = await request(app).post('/auth/login').send({ correo: "' OR '1'='1' -- ", contrasena: "' OR '1'='1" });
        expect(r.status).toBe(400);
    });

    test('PI-SEG-07 [A07] fuerza bruta: al superar el límite de intentos → 429', async () => {
        const anterior = process.env.LOGIN_MAX_INTENTOS;
        process.env.LOGIN_MAX_INTENTOS = '3';
        const appLimitada = crearApp();
        process.env.LOGIN_MAX_INTENTOS = anterior;

        const intentos = [];
        for (let i = 0; i < 4; i++) {
            intentos.push((await request(appLimitada).post('/auth/login').send({ correo: 'juan@gmail.com', contrasena: 'mala' })).status);
        }
        expect(intentos).toEqual([401, 401, 401, 429]);
    });
});

describe('Configuración segura (A05)', () => {
    test('PI-SEG-08 cabeceras de seguridad presentes y sin X-Powered-By', async () => {
        const r = await request(app).get('/');
        expect(r.headers['x-content-type-options']).toBe('nosniff');
        expect(r.headers['x-frame-options']).toBeDefined();
        expect(r.headers['x-powered-by']).toBeUndefined();
    });

    test('PI-SEG-09 ruta inexistente → 404 en JSON (sin página de error de Express)', async () => {
        const r = await request(app).get('/no-existe');
        expect(r.status).toBe(404);
        expect(r.body).toEqual({ ok: false, mensaje: 'Recurso no encontrado' });
    });

    test('PI-SEG-10 body mayor a 100 KB → rechazado (413)', async () => {
        const r = await request(app).post('/auth/login').send({ correo: 'a@a.pe', contrasena: 'x'.repeat(150_000) });
        expect(r.status).toBe(413);
        expect(r.body).toEqual({ ok: false, mensaje: 'La solicitud es demasiado grande' });
    });

    test('PI-SEG-11 JSON mal formado → 400 con mensaje claro (antes: "error inesperado")', async () => {
        const r = await request(app).post('/auth/login').set('Content-Type', 'application/json').send('{"correo": ');
        expect(r.status).toBe(400);
        expect(r.body).toEqual({ ok: false, mensaje: 'El cuerpo de la solicitud no es un JSON válido' });
    });
});
