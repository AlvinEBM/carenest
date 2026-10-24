// =================================================================
// PRUEBAS DE INTEGRACIÓN — Módulo Médicos (login, agenda, atención)
// API real + MySQL real.
//   Seed: carlos.lopez → médico 1 (Medicina General)
//         maria.gonzales → médico 2 (Pediatría)
//         juan@gmail.com → paciente id 3
// =================================================================
import request from 'supertest';
import { app, conectarBD, desconectarBD, token, sql, hoy, fechaLaborable, crearCitaDirecta } from '../helpers/app';

let tCarlos: string, tMaria: string, tAdmin: string;
let citaHoyCarlos: number, citaHoyMaria: number;

beforeAll(async () => {
    await conectarBD();
    tCarlos = await token('carlos.lopez@carenest.pe');
    tMaria  = await token('maria.gonzales@carenest.pe');
    tAdmin  = await token('admin@carenest.pe');
    citaHoyCarlos = await crearCitaDirecta(3, 1, hoy(), '08:00:00', 'CONFIRMADA');
    citaHoyMaria  = await crearCitaDirecta(3, 2, hoy(), '08:30:00');
});
afterAll(desconectarBD);

describe('Login y agenda del médico', () => {
    test('PI-MED-01 el médico inicia sesión y recibe rol MEDICO', async () => {
        const r = await request(app).post('/auth/login').send({ correo: 'carlos.lopez@carenest.pe', contrasena: 'admin123' });
        expect(r.status).toBe(200);
        expect(r.body).toMatchObject({ ok: true, rol: 'MEDICO', nombres: 'Carlos' });
    });

    test('PI-MED-02 la agenda de hoy muestra SOLO las citas de ese médico', async () => {
        const r = await request(app).get('/medico/agenda').set('Authorization', `Bearer ${tCarlos}`);
        expect(r.status).toBe(200);
        const ids = r.body.citas.map((c: { id_cita: number }) => c.id_cita);
        expect(ids).toContain(citaHoyCarlos);
        expect(ids).not.toContain(citaHoyMaria);
        expect(r.body.medico).toMatchObject({ id_medico: 1, especialidad: 'Medicina General' });
    });

    test('PI-MED-03 fecha con formato inválido → 400', async () => {
        const r = await request(app).get('/medico/agenda?fecha=16-10-2026').set('Authorization', `Bearer ${tCarlos}`);
        expect(r.status).toBe(400);
    });
});

describe('Registrar atención', () => {
    test('PI-MED-04 [A01] otro médico intenta atender la cita → 403 y la cita no cambia', async () => {
        const r = await request(app).put(`/medico/citas/${citaHoyCarlos}/atender`)
            .set('Authorization', `Bearer ${tMaria}`).send({ diagnostico: 'Intento indebido' });
        expect(r.status).toBe(403);
        const [c] = await sql('SELECT estado FROM citas WHERE id_cita = ?', [citaHoyCarlos]);
        expect(c.estado).toBe('CONFIRMADA');
    });

    test('PI-MED-05 diagnóstico de 4 caracteres → 400 con detalle del campo', async () => {
        const r = await request(app).put(`/medico/citas/${citaHoyCarlos}/atender`)
            .set('Authorization', `Bearer ${tCarlos}`).send({ diagnostico: 'abcd' });
        expect(r.status).toBe(400);
        expect(r.body.detalle[0].campo).toBe('diagnostico');
    });

    test('PI-MED-06 atención válida → 201, se guarda en "atenciones" y la cita queda COMPLETADA', async () => {
        const r = await request(app).put(`/medico/citas/${citaHoyCarlos}/atender`)
            .set('Authorization', `Bearer ${tCarlos}`)
            .send({ diagnostico: 'Hipertensión arterial estadio 1', indicaciones: 'Losartán 50 mg cada 24 h' });
        expect(r.status).toBe(201);
        const [a] = await sql('SELECT * FROM atenciones WHERE id_cita = ?', [citaHoyCarlos]);
        expect(a).toMatchObject({ id_medico: 1, diagnostico: 'Hipertensión arterial estadio 1' });
        const [c] = await sql('SELECT estado FROM citas WHERE id_cita = ?', [citaHoyCarlos]);
        expect(c.estado).toBe('COMPLETADA');
    });

    test('PI-MED-07 volver a atender la misma cita → 409', async () => {
        const r = await request(app).put(`/medico/citas/${citaHoyCarlos}/atender`)
            .set('Authorization', `Bearer ${tCarlos}`).send({ diagnostico: 'Segundo intento' });
        expect(r.status).toBe(409);
    });

    test('PI-MED-08 cita de una fecha futura → 409', async () => {
        const futura = await crearCitaDirecta(3, 1, fechaLaborable(5), '10:00:00');
        const r = await request(app).put(`/medico/citas/${futura}/atender`)
            .set('Authorization', `Bearer ${tCarlos}`).send({ diagnostico: 'Aún no llega' });
        expect(r.status).toBe(409);
    });

    test('PI-MED-09 cita inexistente → 404', async () => {
        const r = await request(app).put('/medico/citas/999999/atender')
            .set('Authorization', `Bearer ${tCarlos}`).send({ diagnostico: 'No existe' });
        expect(r.status).toBe(404);
    });

    test('PI-MED-10 la agenda refleja la atención (atendida = true)', async () => {
        const r = await request(app).get('/medico/agenda').set('Authorization', `Bearer ${tCarlos}`);
        const cita = r.body.citas.find((c: { id_cita: number }) => c.id_cita === citaHoyCarlos);
        expect(cita.atendida).toBe(true);
        expect(r.body.resumen.atendidas).toBeGreaterThanOrEqual(1);
    });
});

describe('Historial del paciente', () => {
    test('PI-MED-11 el médico que lo atiende ve el historial', async () => {
        const r = await request(app).get('/medico/pacientes/3/historial').set('Authorization', `Bearer ${tCarlos}`);
        expect(r.status).toBe(200);
        expect(r.body.paciente).toMatchObject({ nombres: 'Juan', dni: '76543210' });
        expect(r.body.atenciones[0]).toMatchObject({ diagnostico: 'Hipertensión arterial estadio 1' });
    });

    test('PI-MED-12 [A01] un médico SIN citas con el paciente → 403', async () => {
        const tPedro = await token('pedro.sanchez@carenest.pe'); // Enfermería: nunca tiene citas con Juan en las pruebas
        const r = await request(app).get('/medico/pacientes/3/historial').set('Authorization', `Bearer ${tPedro}`);
        expect(r.status).toBe(403);
    });
});

describe('Administración de médicos', () => {
    const nuevo = {
        nombres: 'Elena', apellidos: 'Torres', id_especialidad: 1, correo: 'elena.torres@carenest.pe',
        contrasena: 'Medico2026', dni: '41234567', colegiatura: '067890', telefono: '987111222',
    };

    test('PI-MED-13 admin registra médico con cuenta → 201 y el médico ya puede iniciar sesión', async () => {
        const r = await request(app).post('/admin/medico').set('Authorization', `Bearer ${tAdmin}`).send(nuevo);
        expect(r.status).toBe(201);
        const login = await request(app).post('/auth/login').send({ correo: nuevo.correo, contrasena: nuevo.contrasena });
        expect(login.body.rol).toBe('MEDICO');
        const agenda = await request(app).get('/medico/agenda').set('Authorization', `Bearer ${login.body.token}`);
        expect(agenda.body.medico).toMatchObject({ nombres: 'Elena', colegiatura: '067890' });
    });

    test('PI-MED-14 mismo correo/DNI otra vez → 409', async () => {
        const r = await request(app).post('/admin/medico').set('Authorization', `Bearer ${tAdmin}`).send(nuevo);
        expect(r.status).toBe(409);
    });

    test('PI-MED-15 datos inválidos → 400 con un error por campo', async () => {
        const r = await request(app).post('/admin/medico').set('Authorization', `Bearer ${tAdmin}`)
            .send({ ...nuevo, dni: '4123a567', colegiatura: '12', contrasena: 'abcdefgh' });
        expect(r.status).toBe(400);
        expect(r.body.detalle.map((d: { campo: string }) => d.campo).sort()).toEqual(['colegiatura', 'contrasena', 'dni']);
    });

    test('PI-MED-16 la transacción no deja usuarios huérfanos si falla el alta', async () => {
        const antes = (await sql("SELECT COUNT(*) AS n FROM usuarios WHERE rol = 'MEDICO'"))[0].n;
        await request(app).post('/admin/medico').set('Authorization', `Bearer ${tAdmin}`)
            .send({ ...nuevo, correo: 'otro@carenest.pe', dni: '49999999', id_especialidad: 999 });
        const despues = (await sql("SELECT COUNT(*) AS n FROM usuarios WHERE rol = 'MEDICO'"))[0].n;
        expect(despues).toBe(antes);
    });

    test('PI-MED-17 crear acceso a un médico registrado sin cuenta', async () => {
        const ins = await sql("INSERT INTO medicos (nombres, apellidos, id_especialidad) VALUES ('Jorge', 'Mendoza', 3)");
        const id = Number(ins.insertId);
        const r = await request(app).post(`/admin/medico/${id}/cuenta`).set('Authorization', `Bearer ${tAdmin}`)
            .send({ correo: 'jorge.mendoza@carenest.pe', contrasena: 'Psico2026', dni: '42345678' });
        expect(r.status).toBe(201);
        const repetido = await request(app).post(`/admin/medico/${id}/cuenta`).set('Authorization', `Bearer ${tAdmin}`)
            .send({ correo: 'jorge2@carenest.pe', contrasena: 'Psico2026', dni: '42345679' });
        expect(repetido.status).toBe(409);
        expect((await token('jorge.mendoza@carenest.pe', 'Psico2026')).length).toBeGreaterThan(20);
    });
});
