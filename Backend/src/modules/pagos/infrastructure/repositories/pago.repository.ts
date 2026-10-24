// =================================================================
// CAPA: Infrastructure / Repositories
// Implementación de IPagoRepository con TypeORM (consultas con
// parámetros, sin concatenar datos del usuario).
// =================================================================
import { AppDataSource } from '../../../../config/datasource';
import { CitaParaPago, IPagoRepository, ResultadoPago } from '../../domain/repositories/IPagoRepository';
import { Pago } from '../../domain/entities/pago.entity';
import { PagoModel } from '../models/pago.model';
import { CitaModel } from '../../../citas/infrastructure/models/cita.model';
import { fechaBDaTexto } from '../../../../shared/utils/fecha';

function aDominio(m: PagoModel): Pago {
    return new Pago(
        m.id_pago,
        m.id_cita,
        m.id_usuario,
        Number(m.monto),
        m.moneda,
        m.estado,
        m.preference_id,
        m.payment_id,
        m.metodo,
        m.detalle_estado,
        m.fecha_creacion ?? null,
    );
}

export class PagoRepository implements IPagoRepository {
    private get repo() {
        return AppDataSource.getRepository(PagoModel);
    }

    async obtenerCitaParaPago(idCita: number): Promise<CitaParaPago | null> {
        const rows = await AppDataSource.query(
            `SELECT c.id_cita, c.id_usuario, c.estado, e.nombre AS especialidad, e.precio,
                    h.fecha, h.hora, u.correo
               FROM citas c
               JOIN horarios h       ON h.id_horario = c.id_horario
               JOIN medicos m        ON m.id_medico = h.id_medico
               JOIN especialidades e ON e.id_especialidad = m.id_especialidad
               JOIN usuarios u       ON u.id_usuario = c.id_usuario
              WHERE c.id_cita = ?
              LIMIT 1`,
            [idCita],
        );
        if (!rows.length) return null;
        const r = rows[0];
        return {
            id_cita: Number(r.id_cita),
            id_usuario: Number(r.id_usuario),
            estado: r.estado,
            especialidad: r.especialidad,
            precio: Number(r.precio),
            fecha: fechaBDaTexto(r.fecha)!,
            hora: String(r.hora),
            correo: r.correo ?? null,
        };
    }

    async existePagoAprobado(idCita: number): Promise<boolean> {
        const total = await this.repo.count({ where: { id_cita: idCita, estado: 'APROBADO' } });
        return total > 0;
    }

    async crear(pago: Pago): Promise<Pago> {
        const guardado = await this.repo.save(this.repo.create({
            id_cita: pago.id_cita,
            id_usuario: pago.id_usuario,
            monto: pago.monto.toFixed(2),
            moneda: pago.moneda,
            estado: pago.estado,
        }));
        return aDominio(guardado);
    }

    async asignarPreferencia(idPago: number, preferenceId: string): Promise<void> {
        await this.repo.update({ id_pago: idPago }, { preference_id: preferenceId });
    }

    async obtenerPorId(idPago: number): Promise<Pago | null> {
        const m = await this.repo.findOne({ where: { id_pago: idPago } });
        return m ? aDominio(m) : null;
    }

    async aplicarResultado(idPago: number, r: ResultadoPago): Promise<void> {
        await AppDataSource.transaction(async (manager) => {
            await manager.update(PagoModel, { id_pago: idPago }, {
                estado: r.estado,
                payment_id: r.payment_id,
                metodo: r.metodo,
                detalle_estado: r.detalle_estado,
            });

            if (r.estado === 'APROBADO') {
                const pago = await manager.findOne(PagoModel, { where: { id_pago: idPago } });
                if (pago) {
                    // Solo una cita RESERVADA pasa a CONFIRMADA; no tocamos
                    // citas en RECORDATORIO/COMPLETADA/etc.
                    await manager.update(
                        CitaModel,
                        { id_cita: pago.id_cita, estado: 'RESERVADA' },
                        { estado: 'CONFIRMADA' },
                    );
                }
            }
        });
    }

    async listarPorUsuario(idUsuario: number): Promise<Pago[]> {
        const modelos = await this.repo.find({
            where: { id_usuario: idUsuario },
            order: { id_pago: 'DESC' },
        });
        return modelos.map(aDominio);
    }

    async listarTodos(): Promise<any[]> {
        const rows = await AppDataSource.query(
            `SELECT p.id_pago, p.id_cita, p.monto, p.moneda, p.estado, p.payment_id, p.metodo,
                    p.detalle_estado, p.fecha_creacion, p.fecha_actualizacion,
                    CONCAT(u.nombres, ' ', u.apellidos) AS paciente, u.dni,
                    e.nombre AS especialidad, h.fecha, h.hora
               FROM pagos p
               JOIN usuarios u       ON u.id_usuario = p.id_usuario
               JOIN citas c          ON c.id_cita = p.id_cita
               JOIN horarios h       ON h.id_horario = c.id_horario
               JOIN medicos m        ON m.id_medico = h.id_medico
               JOIN especialidades e ON e.id_especialidad = m.id_especialidad
              ORDER BY p.id_pago DESC
              LIMIT 500`,
        );
        return rows.map((r: any) => ({
            ...r,
            id_pago: Number(r.id_pago),
            id_cita: Number(r.id_cita),
            monto: Number(r.monto),
            fecha: fechaBDaTexto(r.fecha),
        }));
    }
}
