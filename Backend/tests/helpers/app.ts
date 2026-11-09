// Ayudantes para las pruebas de integración (Supertest + MySQL real)
import request from 'supertest';
import { AppDataSource } from '../../src/config/datasource';
import { crearApp } from '../../src/app';

export const app = crearApp();

export async function conectarBD() {
    if (!AppDataSource.isInitialized) await AppDataSource.initialize();
}

export async function desconectarBD() {
    if (AppDataSource.isInitialized) await AppDataSource.destroy();
}

export async function token(correo: string, contrasena = 'admin123'): Promise<string> {
    const r = await request(app).post('/auth/login').send({ correo, contrasena });
    if (r.status !== 200) throw new Error(`Login falló para ${correo}: ${r.status} ${JSON.stringify(r.body)}`);
    return r.body.token;
}

export const sql = (consulta: string, params: unknown[] = []) => AppDataSource.query(consulta, params);

/// Avanza `dias` días LABORABLES (se saltan los domingos, que no se atiende).
// Antes se sumaban días corridos y, si caía domingo, se movía al lunes:
// así fechaLaborable(4) y fechaLaborable(5) podían dar el MISMO lunes
// (por ejemplo, ejecutando un miércoles) y dos pruebas chocaban por el
// mismo horario. Contando solo días laborables, cada valor da una fecha distinta.
export function fechaLaborable(dias: number): string {
    const d = new Date();
    let avanzados = 0;
    while (avanzados < dias) {
        d.setDate(d.getDate() + 1);
        if (d.getDay() !== 0) avanzados++;
    }
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function hoy(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Crea una cita directamente en BD (para fechas pasadas/hoy que la API no permite reservar). */
export async function crearCitaDirecta(idUsuario: number, idMedico: number, fecha: string, hora: string, estado = 'RESERVADA') {
    const h = await sql('INSERT INTO horarios (id_medico, fecha, hora, disponible) VALUES (?, ?, ?, 0)', [idMedico, fecha, hora]);
    const c = await sql('INSERT INTO citas (id_usuario, id_horario, motivo, estado) VALUES (?, ?, ?, ?)', [idUsuario, h.insertId, 'Control general', estado]);
    return Number(c.insertId);
}
