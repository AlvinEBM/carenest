// =================================================================
// CAPA: Infrastructure / Repositories
// Implementación de ICitaRepository usando TypeORM.
// =================================================================
import { Repository } from 'typeorm';

import { AppDataSource } from '../../../../config/datasource';
import { CitaModel } from '../models/cita.model';
import { HorarioModel } from '../models/horario.model';
import { ICitaRepository } from '../../domain/repositories/ICitaRepository';
import { Cita } from '../../domain/entities/cita.entity';
import { CitaMapping } from '../mapping/cita.mapping';
import { NotificacionModel } from '../../../notificaciones/infrastructure/models/notificacion.model';

// Helper: convierte una fecha de BD a "YYYY-MM-DD" en hora LOCAL
// (evita el desfase de un día que causaba toISOString con UTC)
function fechaLocalStr(fecha: any): string {
    if (fecha instanceof Date) {
        const a = fecha.getFullYear();
        const m = String(fecha.getMonth() + 1).padStart(2, '0');
        const d = String(fecha.getDate()).padStart(2, '0');
        return `${a}-${m}-${d}`;
    }
    return String(fecha).slice(0, 10);
}

export class CitaRepository implements ICitaRepository {
    private repo: Repository<CitaModel>;
    private horarioRepo: Repository<HorarioModel>;
    private notifRepo: Repository<NotificacionModel>;

    constructor() {
        this.repo = AppDataSource.getRepository(CitaModel);
        this.horarioRepo = AppDataSource.getRepository(HorarioModel);
        this.notifRepo = AppDataSource.getRepository(NotificacionModel);
    }

    async save(cita: Cita): Promise<Cita> {
        const model = CitaMapping.toModel(cita);
        const saved = await this.repo.save(model);
        return CitaMapping.toDomain(saved);
    }

    async findByUsuario(idUsuario: number): Promise<Cita[]> {
        const models = await this.repo.find({
            where: { id_usuario: idUsuario },
            order: { fecha_registro: 'DESC' },
        });
        return models.map(m => CitaMapping.toDomain(m));
    }

    // ============================================================
    // Citas del paciente CON datos enriquecidos
    // ============================================================
    async findDetalladasByUsuario(idUsuario: number): Promise<any[]> {
        const rows = await this.repo
            .createQueryBuilder('c')
            .innerJoin('horarios',       'h', 'h.id_horario = c.id_horario')
            .innerJoin('medicos',        'm', 'm.id_medico = h.id_medico')
            .innerJoin('especialidades', 'e', 'e.id_especialidad = m.id_especialidad')
            .leftJoin('usuarios',        'dep', 'dep.id_usuario = c.id_dependiente')
            .select([
                'c.id_cita        AS id_cita',
                'c.id_usuario     AS id_usuario',
                'c.id_horario     AS id_horario',
                'c.id_dependiente AS id_dependiente',
                'c.motivo         AS motivo',
                'c.notas          AS notas',
                'c.estado         AS estado',
                'c.fecha_registro AS fecha_registro',
                'h.fecha          AS fecha',
                'h.hora           AS hora',
                'm.id_medico      AS id_medico',
                'm.nombres        AS medico_nombres',
                'm.apellidos      AS medico_apellidos',
                'e.nombre         AS especialidad',
                'dep.nombres      AS dependiente_nombres',
                'dep.apellidos    AS dependiente_apellidos',
                'dep.parentesco   AS dependiente_parentesco',
                'e.precio         AS precio',
                // Último pago de la cita (priorizando el aprobado)
                `(SELECT p.estado FROM pagos p WHERE p.id_cita = c.id_cita
                   ORDER BY (p.estado = 'APROBADO') DESC, p.id_pago DESC LIMIT 1) AS estado_pago`,
                `(SELECT p.id_pago FROM pagos p WHERE p.id_cita = c.id_cita
                   ORDER BY (p.estado = 'APROBADO') DESC, p.id_pago DESC LIMIT 1) AS id_pago`,
            ])
            .where('c.id_usuario = :idUsuario', { idUsuario })
            .orderBy('h.fecha', 'ASC')
            .addOrderBy('h.hora', 'ASC')
            .getRawMany();

        return rows.map(r => ({
            id_cita: Number(r.id_cita),
            id_usuario: Number(r.id_usuario),
            id_horario: Number(r.id_horario),
            id_dependiente: r.id_dependiente != null ? Number(r.id_dependiente) : null,
            motivo: r.motivo,
            notas: r.notas,
            estado: r.estado,
            fecha_registro: r.fecha_registro,
            fecha: fechaLocalStr(r.fecha),
            hora: r.hora,
            id_medico: Number(r.id_medico),
            medico_nombres: r.medico_nombres,
            medico_apellidos: r.medico_apellidos,
            especialidad: r.especialidad,
            // Datos del menor/dependiente (null si la cita es para el titular)
            dependiente_nombres: r.dependiente_nombres ?? null,
            dependiente_apellidos: r.dependiente_apellidos ?? null,
            dependiente_parentesco: r.dependiente_parentesco ?? null,
            es_para_menor: r.id_dependiente != null,
            // Pago
            precio: r.precio != null ? Number(r.precio) : null,
            estado_pago: r.estado_pago ?? null,
            id_pago: r.id_pago != null ? Number(r.id_pago) : null,
        }));
    }

    async contadoresPorUsuario(idUsuario: number) {
        const total       = await this.repo.count({ where: { id_usuario: idUsuario } });
        const completadas = await this.repo.count({ where: { id_usuario: idUsuario, estado: 'COMPLETADA' } });
        const faltas      = await this.repo.count({ where: { id_usuario: idUsuario, estado: 'FALTA' } });
        const canceladas  = await this.repo.count({ where: { id_usuario: idUsuario, estado: 'CANCELADA' } });

        const reservadas    = await this.repo.count({ where: { id_usuario: idUsuario, estado: 'RESERVADA' } });
        const confirmadas   = await this.repo.count({ where: { id_usuario: idUsuario, estado: 'CONFIRMADA' } });
        const recordatorios = await this.repo.count({ where: { id_usuario: idUsuario, estado: 'RECORDATORIO' } });

        return {
            total,
            completadas,
            proximas: reservadas + confirmadas + recordatorios,
            canceladas,
            faltas,
        };
    }

    async listarTodas(): Promise<any[]> {
        const rows = await this.repo
            .createQueryBuilder('c')
            .innerJoin('horarios',       'h',   'h.id_horario = c.id_horario')
            .innerJoin('medicos',        'm',   'm.id_medico = h.id_medico')
            .innerJoin('especialidades', 'e',   'e.id_especialidad = m.id_especialidad')
            .innerJoin('usuarios',       'p',   'p.id_usuario = c.id_usuario')
            .select([
                'c.id_cita        AS id_cita',
                'c.estado         AS estado',
                'c.motivo         AS motivo',
                'c.fecha_registro AS fecha_registro',
                'h.fecha          AS fecha',
                'h.hora           AS hora',
                'p.id_usuario     AS id_usuario',
                'p.nombres        AS paciente_nombres',
                'p.apellidos      AS paciente_apellidos',
                'p.dni            AS paciente_dni',
                'e.nombre         AS especialidad',
            ])
            .orderBy('h.fecha', 'DESC')
            .addOrderBy('h.hora', 'ASC')
            .getRawMany();

        return rows.map(r => ({
            id_cita: Number(r.id_cita),
            estado: r.estado,
            motivo: r.motivo,
            fecha_registro: r.fecha_registro,
            fecha: fechaLocalStr(r.fecha),
            hora: r.hora,
            id_usuario: Number(r.id_usuario),
            paciente_nombres: r.paciente_nombres,
            paciente_apellidos: r.paciente_apellidos,
            paciente_dni: r.paciente_dni,
            especialidad: r.especialidad,
        }));
    }

    async findById(idCita: number): Promise<Cita | null> {
        const model = await this.repo.findOne({ where: { id_cita: idCita } });
        if (!model) return null;
        return CitaMapping.toDomain(model);
    }

    async cancelar(idCita: number): Promise<boolean> {
        const cita = await this.repo.findOne({ where: { id_cita: idCita } });
        if (!cita) return false;

        await this.repo.update({ id_cita: idCita }, { estado: 'CANCELADA' as any });

        await this.horarioRepo.update(
            { id_horario: cita.id_horario },
            { disponible: true },
        );

        return true;
    }
    // Devuelve la fecha y hora del horario de una cita (para calcular anticipación)
    async obtenerFechaHoraDeCita(idCita: number): Promise<{ fecha: string; hora: string } | null> {
        const row = await this.repo
            .createQueryBuilder('c')
            .innerJoin('horarios', 'h', 'h.id_horario = c.id_horario')
            .select(['h.fecha AS fecha', 'h.hora AS hora'])
            .where('c.id_cita = :idCita', { idCita })
            .getRawOne();

        if (!row) return null;
        const fecha = row.fecha instanceof Date
            ? `${row.fecha.getFullYear()}-${String(row.fecha.getMonth() + 1).padStart(2, '0')}-${String(row.fecha.getDate()).padStart(2, '0')}`
            : String(row.fecha).slice(0, 10);
        return { fecha, hora: String(row.hora) };
    }

    // Incrementa el contador de cancelaciones del usuario y devuelve el nuevo total
    async incrementarCancelaciones(idUsuario: number): Promise<number> {
        await this.repo.manager.query(
            'UPDATE usuarios SET cancelaciones = cancelaciones + 1 WHERE id_usuario = ?',
            [idUsuario],
        );
        const row = await this.repo.manager.query(
            'SELECT cancelaciones FROM usuarios WHERE id_usuario = ? LIMIT 1',
            [idUsuario],
        );
        return row && row.length > 0 ? Number(row[0].cancelaciones) : 0;
    }

    // Bloquea la cuenta por cancelaciones (guarda fecha de bloqueo)
    async bloquearPorCancelaciones(idUsuario: number): Promise<void> {
        const hoy = new Date();
        const fechaStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
        await this.repo.manager.query(
            'UPDATE usuarios SET cuenta_bloqueada = 1, fecha_bloqueo = ? WHERE id_usuario = ?',
            [fechaStr, idUsuario],
        );
    }

    // Lee un valor de configuracion_sistema
    async obtenerConfig(clave: string): Promise<string | null> {
        const row = await this.repo.manager.query(
            'SELECT valor FROM configuracion_sistema WHERE clave = ? LIMIT 1',
            [clave],
        );
        return row && row.length > 0 ? String(row[0].valor) : null;
    }
    // Lee el estado de sanción del usuario (para validar al reservar)
    async obtenerEstadoUsuario(idUsuario: number): Promise<{
        cuenta_bloqueada: boolean;
        fecha_bloqueo: string | null;
        inasistencias: number;
        cancelaciones: number;
    } | null> {
        const rows = await this.repo.manager.query(
            'SELECT cuenta_bloqueada, fecha_bloqueo, inasistencias, cancelaciones FROM usuarios WHERE id_usuario = ? LIMIT 1',
            [idUsuario],
        );
        if (!rows || rows.length === 0) return null;
        const r = rows[0];
        return {
            cuenta_bloqueada: !!r.cuenta_bloqueada,
            fecha_bloqueo: r.fecha_bloqueo ? String(r.fecha_bloqueo).slice(0, 10) : null,
            inasistencias: Number(r.inasistencias ?? 0),
            cancelaciones: Number(r.cancelaciones ?? 0),
        };
    }

    // Desbloquea la cuenta (cuando ya cumplió el periodo de suspensión)
    // Resetea también los contadores para empezar de cero, igual que en el login.
    async desbloquearCuenta(idUsuario: number): Promise<void> {
        await this.repo.manager.query(
            'UPDATE usuarios SET cuenta_bloqueada = 0, fecha_bloqueo = NULL, inasistencias = 0, cancelaciones = 0 WHERE id_usuario = ?',
            [idUsuario],
        );
    }
    // ¿El usuario YA tiene una cita activa a esa misma fecha y hora? (con cualquier médico)
    async cambiarHorario(idCita: number, idHorarioNuevo: number, idHorarioAnterior: number): Promise<void> {
        await AppDataSource.transaction(async (m) => {
            await m.update(CitaModel, { id_cita: idCita }, { id_horario: idHorarioNuevo });
            await m.update(HorarioModel, { id_horario: idHorarioAnterior }, { disponible: true });
        });
    }

    async usuarioYaTieneCitaEn(idUsuario: number, fecha: string, hora: string): Promise<boolean> {
        const total = await this.repo
            .createQueryBuilder('c')
            .innerJoin('horarios', 'h', 'h.id_horario = c.id_horario')
            .where('c.id_usuario = :idUsuario', { idUsuario })
            .andWhere('h.fecha = :fecha', { fecha })
            .andWhere('h.hora = :hora', { hora })
            .andWhere('c.estado IN (:...estados)', { estados: ['RESERVADA', 'CONFIRMADA', 'RECORDATORIO'] })
            .getCount();
        return total > 0;
    }
    async crearNotificacion(idUsuario: number, mensaje: string, idCita: number | null = null): Promise<void> {
        const notif = this.notifRepo.create({
            id_usuario: idUsuario,
            id_cita: idCita as any,
            tipo: 'RECORDATORIO' as any,
            mensaje,
            enviado: true,
            leida: false,
            fecha_programada: new Date(),
        } as any);
        await this.notifRepo.save(notif);
    }
}