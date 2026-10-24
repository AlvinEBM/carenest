// =================================================================
// CAPA: Application / Services
// Servicio que ejecuta la lógica diaria de disponibilidad (Fase 3).
//
// Lógica de cancelación:
//   - Solo inhabilitación (sin habilitación): cancela TODAS las
//     citas desde la fecha de corte en adelante.
//   - Inhabilitación + habilitación (rango cerrado): cancela solo
//     las citas entre la inhabilitación y el día antes de la
//     reapertura. Las del día de vuelta en adelante se respetan.
// =================================================================
import { AppDataSource } from '../../../../config/datasource';
import { EspecialidadModel } from '../../../citas/infrastructure/models/especialidad.model';
import { MedicoModel } from '../../../citas/infrastructure/models/medico.model';
import { CitaModel } from '../../../citas/infrastructure/models/cita.model';
import { UserModel } from '../../../usuarios/infrastructure/models/user.model';
import { NotificacionModel } from '../../../notificaciones/infrastructure/models/notificacion.model';

const DIAS_ANTICIPACION = 5;

function hoyStr(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fechaLocalStr(fecha: any): string | null {
    if (!fecha) return null;
    if (fecha instanceof Date) {
        return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
    }
    return String(fecha).slice(0, 10);
}

function restarDias(fechaStr: string, dias: number): string {
    const d = new Date(fechaStr + 'T00:00:00');
    d.setDate(d.getDate() - dias);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export class DisponibilidadService {
    private especialidadRepo = AppDataSource.getRepository(EspecialidadModel);
    private medicoRepo       = AppDataSource.getRepository(MedicoModel);
    private citaRepo         = AppDataSource.getRepository(CitaModel);
    private userRepo         = AppDataSource.getRepository(UserModel);
    private notifRepo        = AppDataSource.getRepository(NotificacionModel);

    async ejecutarRevisionDiaria() {
        const hoy = hoyStr();
        let citasCanceladas = 0;
        let avisosEnviados = 0;

        // ========================================================
        // 1) ESPECIALIDADES
        // ========================================================
        const especialidades = await this.especialidadRepo.find();

        for (const esp of especialidades) {
            const fInhab = fechaLocalStr((esp as any).fecha_inhabilitacion);
            const fHab   = fechaLocalStr((esp as any).fecha_habilitacion);

            // a) Cancelar las citas afectadas de INMEDIATO (no espera a que llegue la fecha).
            //    Cancela el rango [fInhab, fHab): si hay reapertura, respeta las del día de vuelta.
            //    Las ya canceladas se ignoran, así que correr esto varias veces es seguro.
            if (fInhab) {
                citasCanceladas += await this.cancelarCitasEspecialidad(esp.id_especialidad, fInhab, fHab, esp.nombre);
            }

            // b) Apagar la especialidad SOLO cuando llega su fecha de inhabilitación.
            //    Antes de esa fecha sigue ACTIVA (reservable para los días previos);
            //    las fechas >= fInhab ya las bloquea estaDisponibleEnFecha.
            if (fInhab && hoy >= fInhab && esp.estado === 'ACTIVA') {
                await this.especialidadRepo.update({ id_especialidad: esp.id_especialidad }, { estado: 'INACTIVA' });
            }

            // c) Aviso de reapertura 5 días antes
            if (fHab && (esp as any).aviso_habilitacion_enviado === 0) {
                const fechaAviso = restarDias(fHab, DIAS_ANTICIPACION);
                if (hoy >= fechaAviso) {
                    await this.avisarReaperturaTodos(`La especialidad ${esp.nombre} estará disponible desde el ${fHab}. ¡Ya puedes agendar tu cita!`);
                    await this.especialidadRepo.update({ id_especialidad: esp.id_especialidad }, { aviso_habilitacion_enviado: 1 });
                    avisosEnviados++;
                }
            }

            // d) Habilitación llegó: reactivar y limpiar fechas
            if (fHab && hoy >= fHab) {
                await this.especialidadRepo.update(
                    { id_especialidad: esp.id_especialidad },
                    { estado: 'ACTIVA', fecha_inhabilitacion: null as any, fecha_habilitacion: null as any, aviso_habilitacion_enviado: 0 },
                );
            }
        }

        // ========================================================
        // 2) MÉDICOS  (misma lógica que especialidades)
        // ========================================================
        const medicos = await this.medicoRepo.find();

        for (const med of medicos) {
            const fInhab = fechaLocalStr((med as any).fecha_inhabilitacion);
            const fHab   = fechaLocalStr((med as any).fecha_habilitacion);
            const estado = (med as any).estado ?? 'ACTIVO';

            // a) Cancelar las citas afectadas de INMEDIATO
            if (fInhab) {
                citasCanceladas += await this.cancelarCitasMedico(med.id_medico, fInhab, fHab, `${med.nombres} ${med.apellidos}`);
            }

            // b) Apagar al médico SOLO cuando llega su fecha de inhabilitación
            if (fInhab && hoy >= fInhab && estado === 'ACTIVO') {
                await this.medicoRepo.update({ id_medico: med.id_medico }, { estado: 'INACTIVO' } as any);
            }

            // c) Aviso de reapertura 5 días antes
            if (fHab && (med as any).aviso_habilitacion_enviado === 0) {
                const fechaAviso = restarDias(fHab, DIAS_ANTICIPACION);
                if (hoy >= fechaAviso) {
                    await this.avisarReaperturaTodos(`El Dr. ${med.nombres} ${med.apellidos} estará disponible desde el ${fHab}. ¡Ya puedes agendar tu cita!`);
                    await this.medicoRepo.update({ id_medico: med.id_medico }, { aviso_habilitacion_enviado: 1 } as any);
                    avisosEnviados++;
                }
            }

            // d) Habilitación llegó: reactivar y limpiar fechas
            if (fHab && hoy >= fHab) {
                await this.medicoRepo.update(
                    { id_medico: med.id_medico },
                    { estado: 'ACTIVO', fecha_inhabilitacion: null, fecha_habilitacion: null, aviso_habilitacion_enviado: 0 } as any,
                );
            }
        }

        return { citasCanceladas, avisosEnviados };
    }

    // Cancela citas de una especialidad. Si 'hasta' existe, solo cancela
    // las anteriores a esa fecha (rango cerrado). Si es null, cancela todas.
    private async cancelarCitasEspecialidad(idEspecialidad: number, desde: string, hasta: string | null, nombreEsp: string): Promise<number> {
        const query = this.citaRepo
            .createQueryBuilder('c')
            .innerJoin('horarios', 'h', 'h.id_horario = c.id_horario')
            .innerJoin('medicos', 'm', 'm.id_medico = h.id_medico')
            .where('m.id_especialidad = :idEsp', { idEsp: idEspecialidad })
            .andWhere('h.fecha >= :desde', { desde })
            .andWhere('c.estado IN (:...estados)', { estados: ['RESERVADA', 'CONFIRMADA', 'RECORDATORIO'] });

        if (hasta) {
            query.andWhere('h.fecha < :hasta', { hasta });
        }

        const citas = await query.select(['c.id_cita AS id_cita', 'c.id_usuario AS id_usuario']).getRawMany();

        for (const c of citas) {
            await this.citaRepo.update({ id_cita: Number(c.id_cita) }, { estado: 'CANCELADA' as any });
            const mensaje = hasta
                ? `Tu cita de ${nombreEsp} fue cancelada porque la especialidad no atenderá en esa fecha. Podrás reservar nuevamente desde el ${hasta}.`
                : `Tu cita de ${nombreEsp} fue cancelada porque la especialidad no atenderá en esa fecha.`;
            await this.crearNotificacion(Number(c.id_usuario), Number(c.id_cita), 'CANCELACION', mensaje);
        }
        return citas.length;
    }

    private async cancelarCitasMedico(idMedico: number, desde: string, hasta: string | null, nombreMedico: string): Promise<number> {
        const query = this.citaRepo
            .createQueryBuilder('c')
            .innerJoin('horarios', 'h', 'h.id_horario = c.id_horario')
            .where('h.id_medico = :idMedico', { idMedico })
            .andWhere('h.fecha >= :desde', { desde })
            .andWhere('c.estado IN (:...estados)', { estados: ['RESERVADA', 'CONFIRMADA', 'RECORDATORIO'] });

        if (hasta) {
            query.andWhere('h.fecha < :hasta', { hasta });
        }

        const citas = await query.select(['c.id_cita AS id_cita', 'c.id_usuario AS id_usuario']).getRawMany();

        for (const c of citas) {
            await this.citaRepo.update({ id_cita: Number(c.id_cita) }, { estado: 'CANCELADA' as any });
            const mensaje = hasta
                ? `Tu cita con el Dr. ${nombreMedico} fue cancelada porque no atenderá en esa fecha. Podrás reservar nuevamente desde el ${hasta}.`
                : `Tu cita con el Dr. ${nombreMedico} fue cancelada porque no atenderá en esa fecha.`;
            await this.crearNotificacion(Number(c.id_usuario), Number(c.id_cita), 'CANCELACION', mensaje);
        }
        return citas.length;
    }

    private async avisarReaperturaTodos(mensaje: string) {
        const pacientes = await this.userRepo.find({ where: { rol: 'PACIENTE' as any } });
        for (const p of pacientes) {
            await this.crearNotificacion(p.id_usuario, null, 'RECORDATORIO', mensaje);
        }
    }

    private async crearNotificacion(idUsuario: number, idCita: number | null, tipo: string, mensaje: string) {
        const notif = this.notifRepo.create({
            id_usuario: idUsuario,
            id_cita: idCita as any,
            tipo: tipo as any,
            mensaje,
            enviado: true,
            leida: false,
            fecha_programada: new Date(),
        } as any);
        await this.notifRepo.save(notif);
    }
}