// =================================================================
// PRUEBAS DE INTEGRACIÓN (TDD) — Citas: horario liberado y reprogramación
// API real (Express) + MySQL real (BD carenest_test).
//
// Ciclo 2: un horario liberado por una cancelación debe poder
//          reservarse otra vez (defecto D-16).
// =================================================================
import request from 'supertest';
import { app, conectarBD, desconectarBD, token, sql, fechaLaborable } from '../helpers/app';

const FECHA = fechaLaborable(6);
let tJuan: string, tMaria: string;

async function reservar(tok: string, hora: string, fecha = FECHA) {
    return request(app).post('/citas/reservar').set('Authorization', `Bearer ${tok}`)
        .send({ fecha, hora, id_especialidad: 1, id_medico: 1, motivo: 'Control general' });
}

beforeAll(async () => {
    await conectarBD();
    tJuan = await token('juan@gmail.com');
    // Segunda paciente para las pruebas
    await request(app).post('/auth/register').send({
        nombres: 'María', apellidos: 'Quispe Rojas', dni: '70000555', telefono: '987000555',
        correo: 'maria.tdd@gmail.com', contrasena: 'Clinica2026', genero: 'Femenino',
    });
    tMaria = await token('maria.tdd@gmail.com', 'Clinica2026');
});
afterAll(desconectarBD);

describe('Horario liberado por una cancelación', () => {
    test('PI-CIT-01 otra paciente puede reservar el horario que se canceló', async () => {
        const r1 = await reservar(tJuan, '08:00:00');
        expect(r1.status).toBe(201);
        const cancelar = await request(app).put(`/citas/${r1.body.cita.id_cita}/cancelar`).set('Authorization', `Bearer ${tJuan}`);
        expect(cancelar.status).toBe(200);

        const r2 = await reservar(tMaria, '08:00:00');
        expect(r2.status).toBe(201);
        expect(r2.body.cita.id_horario).toBe(r1.body.cita.id_horario); // reutiliza el mismo horario
    });

    test('PI-CIT-02 el horario reutilizado vuelve a quedar ocupado', async () => {
        const [h] = await sql(
            'SELECT disponible FROM horarios WHERE id_medico = 1 AND fecha = ? AND hora = ?', [FECHA, '08:00:00']);
        expect(Number(h.disponible)).toBe(0);
        const r3 = await reservar(tJuan, '08:00:00');
        expect(r3.status).toBe(409);
        expect(r3.body.mensaje).toBe('Ese horario ya fue reservado, selecciona otro.');
    });
});