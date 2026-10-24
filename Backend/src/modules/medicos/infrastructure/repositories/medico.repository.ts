// =================================================================
// CAPA: Infrastructure / Repositories
// Implementación de IMedicoRepository con TypeORM.
//
// Todas las consultas usan parámetros (:nombre / ?) → sin
// concatenar texto del usuario (OWASP A03 - Inyección SQL).
// =================================================================
import { AppDataSource } from '../../../../config/datasource';
import {
    AtencionHistorial,
    CitaAgenda,
    CitaDeMedico,
    IMedicoRepository,
    PerfilMedico,
} from '../../domain/repositories/IMedicoRepository';
import { Atencion } from '../../domain/entities/atencion.entity';
import { AtencionModel } from '../models/atencion.model';
import { CitaModel } from '../../../citas/infrastructure/models/cita.model';
import { fechaBDaTexto } from '../../../../shared/utils/fecha';

export class MedicoRepository implements IMedicoRepository {

    async obtenerPerfilPorUsuario(idUsuario: number): Promise<PerfilMedico | null> {
        const rows = await AppDataSource.query(
            `SELECT m.id_medico, m.nombres, m.apellidos, m.colegiatura,
                    m.id_especialidad, e.nombre AS especialidad
               FROM medicos m
               JOIN especialidades e ON e.id_especialidad = m.id_especialidad
              WHERE m.id_usuario = ?
              LIMIT 1`,
            [idUsuario],
        );
        if (!rows.length) return null;
        const r = rows[0];
        return {
            id_medico: Number(r.id_medico),
            nombres: r.nombres,
            apellidos: r.apellidos,
            colegiatura: r.colegiatura ?? null,
            id_especialidad: Number(r.id_especialidad),
            especialidad: r.especialidad,
        };
    }

    async agenda(idMedico: number, fecha: string): Promise<CitaAgenda[]> {
        const rows = await AppDataSource.query(
            `SELECT c.id_cita, h.fecha, h.hora, c.estado, c.motivo, c.notas,
                    c.id_usuario, c.id_dependiente,
                    t.nombres   AS titular_nombres,
                    t.apellidos AS titular_apellidos,
                    t.dni       AS titular_dni,
                    d.nombres   AS dep_nombres,
                    d.apellidos AS dep_apellidos,
                    d.dni       AS dep_dni,
                    d.parentesco AS dep_parentesco,
                    (SELECT p.estado FROM pagos p
                      WHERE p.id_cita = c.id_cita
                      ORDER BY (p.estado = 'APROBADO') DESC, p.id_pago DESC
                      LIMIT 1) AS estado_pago,
                    EXISTS(SELECT 1 FROM atenciones a WHERE a.id_cita = c.id_cita) AS atendida
               FROM citas c
               JOIN horarios h ON h.id_horario = c.id_horario
               JOIN usuarios t ON t.id_usuario = c.id_usuario
          LEFT JOIN usuarios d ON d.id_usuario = c.id_dependiente
              WHERE h.id_medico = ? AND h.fecha = ?
              ORDER BY h.hora ASC`,
            [idMedico, fecha],
        );

        return rows.map((r: any) => {
            const esMenor = r.id_dependiente != null;
            return {
                id_cita: Number(r.id_cita),
                fecha: fechaBDaTexto(r.fecha)!,
                hora: String(r.hora),
                estado: r.estado,
                motivo: r.motivo ?? null,
                notas: r.notas ?? null,
                id_paciente: Number(esMenor ? r.id_dependiente : r.id_usuario),
                paciente_nombres: esMenor ? r.dep_nombres : r.titular_nombres,
                paciente_apellidos: esMenor ? r.dep_apellidos : r.titular_apellidos,
                paciente_dni: (esMenor ? r.dep_dni : r.titular_dni) ?? null,
                es_menor: esMenor,
                parentesco: esMenor ? (r.dep_parentesco ?? null) : null,
                titular_nombres: r.titular_nombres,
                titular_apellidos: r.titular_apellidos,
                estado_pago: r.estado_pago ?? null,
                atendida: Number(r.atendida) === 1,
            };
        });
    }

    async obtenerCitaDeMedico(idCita: number): Promise<CitaDeMedico | null> {
        const rows = await AppDataSource.query(
            `SELECT c.id_cita, c.estado, h.id_medico, h.fecha
               FROM citas c
               JOIN horarios h ON h.id_horario = c.id_horario
              WHERE c.id_cita = ?
              LIMIT 1`,
            [idCita],
        );
        if (!rows.length) return null;
        const r = rows[0];
        return {
            id_cita: Number(r.id_cita),
            id_medico: Number(r.id_medico),
            estado: r.estado,
            fecha: fechaBDaTexto(r.fecha)!,
        };
    }

    async existeAtencion(idCita: number): Promise<boolean> {
        const total = await AppDataSource.getRepository(AtencionModel).count({ where: { id_cita: idCita } });
        return total > 0;
    }

    async registrarAtencion(atencion: Atencion): Promise<Atencion> {
        // Transacción: o se guardan ambas cosas o ninguna
        return AppDataSource.transaction(async (manager) => {
            const modelo = manager.create(AtencionModel, {
                id_cita: atencion.id_cita,
                id_medico: atencion.id_medico,
                diagnostico: atencion.diagnostico,
                indicaciones: atencion.indicaciones,
            });
            const guardado = await manager.save(AtencionModel, modelo);

            await manager.update(CitaModel, { id_cita: atencion.id_cita }, { estado: 'COMPLETADA' });

            return new Atencion(
                guardado.id_atencion,
                guardado.id_cita,
                guardado.id_medico,
                guardado.diagnostico,
                guardado.indicaciones,
                guardado.fecha_atencion,
            );
        });
    }

    async medicoAtiendeAPaciente(idMedico: number, idPaciente: number): Promise<boolean> {
        const rows = await AppDataSource.query(
            `SELECT 1
               FROM citas c
               JOIN horarios h ON h.id_horario = c.id_horario
              WHERE h.id_medico = ?
                AND COALESCE(c.id_dependiente, c.id_usuario) = ?
              LIMIT 1`,
            [idMedico, idPaciente],
        );
        return rows.length > 0;
    }

    async historialPaciente(idPaciente: number): Promise<AtencionHistorial[]> {
        const rows = await AppDataSource.query(
            `SELECT a.id_atencion, a.id_cita, h.fecha, h.hora, e.nombre AS especialidad,
                    CONCAT(m.nombres, ' ', m.apellidos) AS medico,
                    a.diagnostico, a.indicaciones, a.fecha_atencion
               FROM atenciones a
               JOIN citas c          ON c.id_cita = a.id_cita
               JOIN horarios h       ON h.id_horario = c.id_horario
               JOIN medicos m        ON m.id_medico = a.id_medico
               JOIN especialidades e ON e.id_especialidad = m.id_especialidad
              WHERE COALESCE(c.id_dependiente, c.id_usuario) = ?
              ORDER BY h.fecha DESC, h.hora DESC`,
            [idPaciente],
        );
        return rows.map((r: any) => ({
            id_atencion: Number(r.id_atencion),
            id_cita: Number(r.id_cita),
            fecha: fechaBDaTexto(r.fecha)!,
            hora: String(r.hora),
            especialidad: r.especialidad,
            medico: r.medico,
            diagnostico: r.diagnostico,
            indicaciones: r.indicaciones ?? null,
            fecha_atencion: r.fecha_atencion,
        }));
    }

    async datosPaciente(idPaciente: number) {
        const rows = await AppDataSource.query(
            `SELECT nombres, apellidos, dni, fecha_nacimiento FROM usuarios WHERE id_usuario = ? LIMIT 1`,
            [idPaciente],
        );
        if (!rows.length) return null;
        const r = rows[0];
        return {
            nombres: r.nombres,
            apellidos: r.apellidos,
            dni: r.dni ?? null,
            fecha_nacimiento: fechaBDaTexto(r.fecha_nacimiento),
        };
    }
}
