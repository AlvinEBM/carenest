// =================================================================
// PRUEBAS DE INTEGRACIÓN — Registro de paciente (POST /auth/register)
// API real (Express) + MySQL real (BD carenest_test)
// =================================================================
import request from 'supertest';
import { app, conectarBD, desconectarBD } from '../helpers/app';

beforeAll(conectarBD);
afterAll(desconectarBD);

const nuevo = {
    correo: 'lucia.registro@gmail.com', contrasena: 'Clinica2026', dni: '70000099',
    nombres: 'Lucía', apellidos: 'Ramos Ñique', telefono: '987000111', genero: 'Femenino',
};

describe('Registro de paciente', () => {
    test('PI-REG-01 datos válidos → 201 y luego puede iniciar sesión', async () => {
        const r = await request(app).post('/auth/register').send(nuevo);
        expect(r.status).toBe(201);
        const login = await request(app).post('/auth/login').send({ correo: nuevo.correo, contrasena: nuevo.contrasena });
        expect(login.status).toBe(200);
    });

    test('PI-REG-02 nombre con números → 400 con el campo "nombres"', async () => {
        const r = await request(app).post('/auth/register').send({ ...nuevo, correo: 'otro1@gmail.com', dni: '70000098', nombres: 'Lucia2' });
        expect(r.status).toBe(400);
        expect(r.body.detalle.map((d: { campo: string }) => d.campo)).toEqual(['nombres']);
    });

    test('PI-REG-03 teléfono que no empieza con 9 → 400 con el campo "telefono"', async () => {
        const r = await request(app).post('/auth/register').send({ ...nuevo, correo: 'otro2@gmail.com', dni: '70000097', telefono: '812345678' });
        expect(r.status).toBe(400);
        expect(r.body.detalle.map((d: { campo: string }) => d.campo)).toEqual(['telefono']);
    });

    test('PI-REG-04 correo con dos @ → 400 con el campo "correo"', async () => {
        const r = await request(app).post('/auth/register').send({ ...nuevo, correo: 'otro@@gmail.com', dni: '70000096' });
        expect(r.status).toBe(400);
        expect(r.body.detalle.map((d: { campo: string }) => d.campo)).toEqual(['correo']);
    });

    test('PI-REG-05 contraseña solo de números → 400 con el campo "contrasena"', async () => {
        const r = await request(app).post('/auth/register').send({ ...nuevo, correo: 'otro4@gmail.com', dni: '70000095', contrasena: '1234567890' });
        expect(r.status).toBe(400);
        expect(r.body.detalle.map((d: { campo: string }) => d.campo)).toEqual(['contrasena']);
    });

    test('PI-REG-06 el correo se guarda sin espacios y en minúsculas', async () => {
        const r = await request(app).post('/auth/register').send({ ...nuevo, correo: '  Mario.Ruiz@Gmail.com ', dni: '70000094', nombres: 'Mario', apellidos: 'Ruiz' });
        expect(r.status).toBe(201);
        const login = await request(app).post('/auth/login').send({ correo: 'mario.ruiz@gmail.com', contrasena: nuevo.contrasena });
        expect(login.status).toBe(200);
    });

    test('PI-REG-07 mismo correo otra vez → 409', async () => {
        const r = await request(app).post('/auth/register').send({ ...nuevo, dni: '70000093' });
        expect(r.status).toBe(409);
    });
});