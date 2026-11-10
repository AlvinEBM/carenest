// =================================================================
// CAPA: Application / Services
// Lógica de negocio del módulo Citas.
//
// CAMBIO (Enfoque A1 - horarios virtuales):
//   - listarHorariosDisponibles ahora GENERA los slots al vuelo
//     (no lee horarios pre-cargados).
//   - reservarCita recibe fecha+hora, crea el horario en BD en
//     ese momento y luego crea la cita.
// =================================================================
import { IEspecialidadRepository } from '../../domain/repositories/IEspecialidadRepository';
import { IHorarioRepository } from '../../domain/repositories/IHorarioRepository';
import { ICitaRepository } from '../../domain/repositories/ICitaRepository';

import { EspecialidadRepository } from '../../infrastructure/repositories/especialidad.repository';
import { HorarioRepository } from '../../infrastructure/repositories/horario.repository';
import { CitaRepository } from '../../infrastructure/repositories/cita.repository';
import { HorarioVirtualRepository } from '../../infrastructure/repositories/horario-virtual.repository';
import { FamiliarRepository } from '../../../usuarios/infrastructure/repositories/familiar.repository';

import { ReservarCitaDTO } from '../dto/reservar-cita.dto';
import { CitaFactory } from '../../domain/factories/cita.factory';
import { fechaEsReservable, esHoraPasada } from '../../domain/horario.config';

export class CitaService {
    private especialidadRepo: IEspecialidadRepository = new EspecialidadRepository();
    private horarioRepo: IHorarioRepository           = new HorarioRepository();
    private citaRepo: ICitaRepository                 = new CitaRepository();
    private horarioVirtualRepo                        = new HorarioVirtualRepository();
    private familiarRepo                              = new FamiliarRepository();

    // ============================================================
    // 1) Listar especialidades activas
    // ============================================================
    async listarEspecialidades() {
        const especialidades = await this.especialidadRepo.findActivas();
        return { ok: true, especialidades };
    }

    // ============================================================
    // 2) Listar horarios disponibles (GENERADOS AL VUELO)
    // ============================================================
    async listarHorariosDisponibles(fecha: string, idMedico: number) {
            const resultado = await this.horarioVirtualRepo.obtenerSlots(fecha, idMedico);
            if (!resultado.ok) {
                return { ok: false, mensaje: resultado.motivo };
            }
            return { ok: true, medico: resultado.medico, horarios: resultado.slots };
    }

    // ============================================================
    // 2b) Calendario del mes (para pintar el calendario visual)
    // ============================================================
    async obtenerCalendario(anio: number, mes: number, idMedico: number) {
            const resultado = await this.horarioVirtualRepo.obtenerCalendario(anio, mes, idMedico);
            return { ok: resultado.ok, dias: resultado.dias };
    }

    // ============================================================
    // 3) Reservar una cita (Enfoque A1)
    //
    //    Flujo:
    //      a) Validar que la fecha esté dentro de la ventana 2 meses
    //      b) Obtener el médico de la especialidad
    //      c) Verificar que el slot no esté ya ocupado
    //      d) Crear el horario en BD (ya ocupado)
    //      e) Crear la cita RESERVADA apuntando a ese horario
    // ============================================================
    async reservarCita(idUsuario: number, data: ReservarCitaDTO) {
        // (0) Datos obligatorios (ahora incluye el médico)
        if (!idUsuario || !data.fecha || !data.hora || !data.id_especialidad || !data.id_medico) {
            return { ok: false, mensaje: 'Faltan datos obligatorios' };
        }

        // (1) La cuenta no debe estar suspendida (se revalida aquí, no solo en login)
        const suspension = await this.verificarSuspension(idUsuario);
        if (suspension) {
            return { ok: false, mensaje: suspension };
        }

        // (2) Ventana de reserva (no pasado, no más de 2 meses, día laborable)
        const validez = fechaEsReservable(data.fecha);
        if (!validez.ok) {
            return { ok: false, mensaje: validez.motivo };
        }

        // (3) Al menos 2 horas de anticipación
        if (esHoraPasada(data.fecha, data.hora)) {
            return { ok: false, mensaje: 'Debes reservar con al menos 2 horas de anticipación' };
        }

        // (4) La especialidad debe existir
        const especialidad = await this.especialidadRepo.findById(data.id_especialidad);
        if (!especialidad) {
            return { ok: false, mensaje: 'La especialidad no existe' };
        }

        // (5) Datos del menor si la especialidad lo requiere
        if (especialidad.requiere_datos_menor) {
            if (!data.id_dependiente) {
                return { ok: false, mensaje: 'Esta especialidad requiere registrar los datos del menor' };
            }
            const pertenece = await this.familiarRepo.perteneceATutor(data.id_dependiente, idUsuario);
            if (!pertenece) {
                return { ok: false, mensaje: 'El familiar seleccionado no es válido' };
            }
        } else {
            data.id_dependiente = undefined;
        }

        // (6) El médico debe PERTENECER a la especialidad y estar disponible/visible.
        const medicos = await this.horarioVirtualRepo.listarMedicosDeEspecialidad(data.id_especialidad);
        const medicoValido = medicos.some(m => m.id_medico === data.id_medico);
        if (!medicoValido) {
            return { ok: false, mensaje: 'El médico seleccionado no pertenece a esa especialidad o no está disponible' };
        }

        // (7) La fecha+hora debe ser un SLOT real, en fecha habilitada y libre.
        const slotsRes = await this.horarioVirtualRepo.obtenerSlots(data.fecha, data.id_medico);
        if (!slotsRes.ok) {
            return { ok: false, mensaje: slotsRes.motivo };
        }
        const slot = slotsRes.slots.find(s => s.hora === data.hora);
        if (!slot) {
            return { ok: false, mensaje: 'La hora seleccionada no es un horario válido' };
        }
        if (!slot.disponible) {
            return { ok: false, mensaje: 'Ese horario ya fue reservado, selecciona otro.' };
        }

        // (8) El usuario no puede tener OTRA cita a la misma fecha+hora (con otro médico)
        const yaTieneCita = await this.citaRepo.usuarioYaTieneCitaEn(idUsuario, data.fecha, data.hora);
        if (yaTieneCita) {
            return { ok: false, mensaje: 'Ya tienes una cita reservada a esa misma hora' };
        }

        // (9) Ocupar el horario (nuevo o liberado por una cancelación) y crear la cita RESERVADA
        const horario = await this.tomarHorario(data.id_medico, data.fecha, data.hora);
        if ('mensaje' in horario) {
            return { ok: false, mensaje: horario.mensaje };
        }
        const idHorario = horario.idHorario;

        const nueva = CitaFactory.crearReserva(idUsuario, {
            id_horario: idHorario,
            id_especialidad: data.id_especialidad,
            id_dependiente: data.id_dependiente,
            motivo: data.motivo,
            notas: data.notas,
        });

        const guardada = await this.citaRepo.save(nueva);

        return { ok: true, mensaje: '¡Felicidades, ya tienes tu cita reservada!', cita: guardada };
    }

    // Ocupa el horario del médico en esa fecha+hora:
    //  - si nunca se reservó, lo crea ya ocupado;
    //  - si existe pero quedó libre por una cancelación, lo vuelve a ocupar (D-16);
    //  - si está ocupado (o dos pacientes lo piden a la vez), devuelve el conflicto.
    private async tomarHorario(idMedico: number, fecha: string, hora: string):
        Promise<{ ok: true; idHorario: number } | { ok: false; mensaje: string }> {
        const OCUPADO = { ok: false as const, mensaje: 'Ese horario ya fue reservado, selecciona otro.' };

        const existente = await this.horarioRepo.findByMedicoFechaHora(idMedico, fecha, hora);
        if (existente) {
            const ocupado = existente.disponible && await this.horarioRepo.ocuparSiDisponible(existente.id_horario);
            return ocupado ? { ok: true, idHorario: existente.id_horario } : OCUPADO;
        }
        try {
            return { ok: true, idHorario: await this.horarioRepo.crearHorario(idMedico, fecha, hora) };
        } catch (err: any) {
            // Choque de reservas simultáneas sobre el mismo slot (UNIQUE de la BD).
            if (err?.esConflictoHorario) return OCUPADO;
            throw err;
        }
    }

    // Verifica si la cuenta está suspendida (misma regla dinámica que el login).
    // Devuelve el mensaje de bloqueo, o null si puede reservar.
    private async verificarSuspension(idUsuario: number): Promise<string | null> {
        const estado = await this.citaRepo.obtenerEstadoUsuario(idUsuario);
        if (!estado || !estado.cuenta_bloqueada) {
            return null;
        }

        const limiteFaltas = Number(await this.citaRepo.obtenerConfig('limite_inasistencias')) || 3;
        const limiteCancel = Number(await this.citaRepo.obtenerConfig('limite_cancelaciones')) || 3;

        let claveDias = 'dias_suspension';
        let motivoTexto = 'inasistencias';
        if (estado.cancelaciones >= limiteCancel && estado.inasistencias < limiteFaltas) {
            claveDias = 'dias_suspension_cancelaciones';
            motivoTexto = 'cancelaciones de último momento';
        }

        const diasSuspension = Number(await this.citaRepo.obtenerConfig(claveDias)) || 15;

        if (!estado.fecha_bloqueo) {
            return 'Tu cuenta está suspendida. No puedes reservar citas.';
        }

        const bloqueo = new Date(estado.fecha_bloqueo + 'T00:00:00');
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const diasTranscurridos = Math.floor((hoy.getTime() - bloqueo.getTime()) / (1000 * 60 * 60 * 24));

        if (diasTranscurridos >= diasSuspension) {
            await this.citaRepo.desbloquearCuenta(idUsuario);
            return null;
        }

        const restantes = diasSuspension - diasTranscurridos;
        return `Tu cuenta está suspendida por ${motivoTexto}. Podrás reservar en ${restantes} día(s).`;
    }

    // ============================================================
    // 4) Historial de citas del paciente
    // ============================================================
// ============================================================
    // 4) Historial de citas del paciente (CON datos enriquecidos)
    // ============================================================
    async historialPaciente(idUsuario: number) {
        const citas = await this.citaRepo.findDetalladasByUsuario(idUsuario);
        return { ok: true, citas };
    }

    // ============================================================
    // 5) Contadores del dashboard
    // ============================================================
    async contadoresPaciente(idUsuario: number) {
        const contadores = await this.citaRepo.contadoresPorUsuario(idUsuario);
        return { ok: true, contadores };
    }

    // ============================================================
    // 6) Todas las citas (ADMIN)
    // ============================================================
    async listarTodas() {
        const citas = await this.citaRepo.listarTodas();
        return { ok: true, total: citas.length, citas };
    }
    // ============================================================
    // 7) Cancelar una cita del paciente
    //    Verifica que la cita le pertenezca al usuario.
    // ============================================================
    async cancelarCita(idUsuario: number, idCita: number) {
        const cita = await this.citaRepo.findById(idCita);

        if (!cita) {
            return { ok: false, mensaje: 'La cita no existe' };
        }

        // Seguridad: solo el dueño puede cancelar su cita
        if (cita.id_usuario !== idUsuario) {
            return { ok: false, mensaje: 'No puedes cancelar una cita que no es tuya' };
        }

        // Solo se pueden cancelar citas activas
        if (!['RESERVADA', 'CONFIRMADA', 'RECORDATORIO'].includes(cita.estado)) {
            return { ok: false, mensaje: `No se puede cancelar una cita en estado ${cita.estado}` };
        }

        // Cancelar la cita (libera el horario)
        await this.citaRepo.cancelar(idCita);

        // ----- SANCIÓN POR CANCELACIÓN DE ÚLTIMO MOMENTO (menos de 24h) -----
        let sancionada = false;
        let cuentaBloqueada = false;

        const fechaHora = await this.citaRepo.obtenerFechaHoraDeCita(idCita);
        if (fechaHora) {
            const fechaCita = new Date(`${fechaHora.fecha}T${fechaHora.hora}`);
            const ahora = new Date();
            const horasDeAnticipacion = (fechaCita.getTime() - ahora.getTime()) / (1000 * 60 * 60);

            // Solo sanciona si cancela con menos de 24h (y la cita aún no pasó)
            if (horasDeAnticipacion < 24 && horasDeAnticipacion > -24) {
                sancionada = true;
                const totalCancelaciones = await this.citaRepo.incrementarCancelaciones(idUsuario);

                const limiteStr = await this.citaRepo.obtenerConfig('limite_cancelaciones');
                const limite = limiteStr ? Number(limiteStr) : 3;

                if (totalCancelaciones >= limite) {
                    await this.citaRepo.bloquearPorCancelaciones(idUsuario);
                    cuentaBloqueada = true;
                    await this.citaRepo.crearNotificacion(
                        idUsuario,
                        `Tu cuenta ha sido suspendida por acumular ${totalCancelaciones} cancelaciones de último momento. No podrás agendar citas durante el periodo de suspensión.`,
                        idCita,
                    );
                } else {
                    const restantes = limite - totalCancelaciones;
                    await this.citaRepo.crearNotificacion(
                        idUsuario,
                        `Registramos una cancelación de último momento (${totalCancelaciones} de ${limite}). Te ${restantes === 1 ? 'queda 1 cancelación' : `quedan ${restantes} cancelaciones`} antes de que tu cuenta sea suspendida.`,
                        idCita,
                    );
                }
            }
        }

        let mensaje = 'Cita cancelada correctamente';
        if (sancionada && cuentaBloqueada) {
            mensaje = 'Cita cancelada. Has superado el límite de cancelaciones de último momento y tu cuenta ha sido suspendida.';
        } else if (sancionada) {
            mensaje = 'Cita cancelada. Ten en cuenta que cancelar con menos de 24h de anticipación cuenta como una cancelación tardía.';
        }

        return { ok: true, mensaje, id_cita: idCita, sancionada, cuentaBloqueada };
    }
    async listarMedicosDeEspecialidad(idEspecialidad: number) {
        const medicos = await this.horarioVirtualRepo.listarMedicosDeEspecialidad(idEspecialidad);
        return { ok: true, medicos };
    }
}