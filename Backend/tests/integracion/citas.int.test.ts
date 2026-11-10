// =================================================================
// PRUEBAS DE INTEGRACIÓN (TDD) — Citas: horario liberado y reprogramación
// API real (Express) + MySQL real (BD carenest_test).
//
// Ciclo 2: un horario liberado por una cancelación debe poder
//          reservarse otra vez (defecto D-16).
// Ciclo 3: PUT /citas/:id/reprogramar (nueva funcionalidad).
// =================================================================
import request from 'supertest';
import { app, conectarBD, desconectarBD, token, sql, fechaLaborable, hoy, crearCitaDirecta } from '../helpers/app';

const FECHA = fechaLaborable(6);
const FECHA2 = fechaLaborable(7);
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

describe('Reprogramar una cita (PUT /citas/:id/reprogramar)', () => {
    let idCita: number;
    const reprogramar = (id: number, tok: string | null, body: object) => {
        const r = request(app).put(`/citas/${id}/reprogramar`);
        if (tok) r.set('Authorization', `Bearer ${tok}`);
        return r.send(body);
    };
    const horarioDe = async (id: number) =>
        (await sql(`SELECT DATE_FORMAT(h.fecha, '%Y-%m-%d') AS fecha, h.hora, c.estado
                    FROM citas c JOIN horarios h ON h.id_horario = c.id_horario WHERE c.id_cita = ?`, [id]))[0];

    beforeAll(async () => {
        const r = await reservar(tJuan, '09:00:00');
        idCita = r.body.cita.id_cita;
    });

    test('PI-CIT-03 su cita pasa a la nueva fecha y hora → 200, misma cita y sigue RESERVADA', async () => {
        const r = await reprogramar(idCita, tJuan, { fecha: FECHA2, hora: '10:00:00' });
        expect(r.status).toBe(200);
        expect(r.body.mensaje).toBe('Tu cita fue reprogramada');
        expect(await horarioDe(idCita)).toEqual({ fecha: FECHA2, hora: '10:00:00', estado: 'RESERVADA' });
    });

    test('PI-CIT-04 el horario anterior queda libre y otra paciente lo puede reservar', async () => {
        const r = await reservar(tMaria, '09:00:00');
        expect(r.status).toBe(201);
    });

    test('PI-CIT-05 cita de otro paciente → 403', async () => {
        const r = await reprogramar(idCita, tMaria, { fecha: FECHA2, hora: '11:00:00' });
        expect(r.status).toBe(403);
        expect(r.body.mensaje).toBe('No puedes reprogramar una cita que no es tuya');
    });

    test('PI-CIT-06 el nuevo horario ya está ocupado → 409', async () => {
        await reservar(tMaria, '11:00:00', FECHA2);
        const r = await reprogramar(idCita, tJuan, { fecha: FECHA2, hora: '11:00:00' });
        expect(r.status).toBe(409);
        expect(r.body.mensaje).toBe('Ese horario ya fue reservado, selecciona otro.');
        expect((await horarioDe(idCita)).hora).toBe('10:00:00'); // no cambió
    });

    test('PI-CIT-07 hora fuera del horario de atención → 409', async () => {
        const r = await reprogramar(idCita, tJuan, { fecha: FECHA2, hora: '07:00:00' });
        expect(r.status).toBe(409);
        expect(r.body.mensaje).toBe('La hora seleccionada no es un horario válido');
    });

    test('PI-CIT-08 cita a menos de 24 horas → 400', async () => {
        const id = await crearCitaDirecta(3, 1, hoy(), '23:30:00');
        const r = await reprogramar(id, tJuan, { fecha: FECHA2, hora: '12:00:00' });
        expect(r.status).toBe(400);
        expect(r.body.mensaje).toBe('Solo puedes reprogramar con al menos 24 horas de anticipación');
    });

    test('PI-CIT-09 cita CANCELADA → 400', async () => {
        const otra = (await reservar(tJuan, '10:30:00')).body.cita.id_cita;
        await request(app).put(`/citas/${otra}/cancelar`).set('Authorization', `Bearer ${tJuan}`);
        const r = await reprogramar(otra, tJuan, { fecha: FECHA2, hora: '12:00:00' });
        expect(r.status).toBe(400);
        expect(r.body.mensaje).toBe('No se puede reprogramar una cita en estado CANCELADA');
    });

    test('PI-CIT-10 hora con formato inválido → 400 con el campo "hora"', async () => {
        const r = await reprogramar(idCita, tJuan, { fecha: FECHA2, hora: '10am' });
        expect(r.status).toBe(400);
        expect(r.body.detalle.map((d: { campo: string }) => d.campo)).toEqual(['hora']);
    });

    test('PI-CIT-11 sin iniciar sesión → 401', async () => {
        const r = await reprogramar(idCita, null, { fecha: FECHA2, hora: '12:00:00' });
        expect(r.status).toBe(401);
    });

    test('PI-CIT-12 un usuario de admisión no puede usar la ruta del paciente → 403', async () => {
        const r = await reprogramar(idCita, await token('admision@carenest.pe'), { fecha: FECHA2, hora: '12:00:00' });
        expect(r.status).toBe(403);
    });
});
