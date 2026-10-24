// =================================================================
// CAPA: Application / Services
// Casos de uso del rol MEDICO:
//   1. Ver su perfil
//   2. Ver su agenda de un día
//   3. Registrar la atención de una cita (diagnóstico + indicaciones)
//   4. Ver el historial de atenciones de un paciente que atiende
//
// SEGURIDAD (OWASP A01 - Control de acceso roto):
//   El id del médico NUNCA viene del cliente: se obtiene a partir
//   del id_usuario del JWT. Así un médico no puede ver ni atender
//   citas de otro cambiando un número en la URL.
//
// El repositorio se inyecta por constructor (con valor por defecto)
// para poder reemplazarlo por un doble de prueba en Jest.
// =================================================================
import { IMedicoRepository } from '../../domain/repositories/IMedicoRepository';
import { MedicoRepository } from '../../infrastructure/repositories/medico.repository';
import { Atencion } from '../../domain/entities/atencion.entity';
import { validarAtencion, ResultadoValidacion } from '../../domain/reglas-atencion';
import { RegistrarAtencionDTO } from '../dto/registrar-atencion.dto';
import { esFechaValida, hoyLocal } from '../../../../shared/utils/fecha';

export type CodigoError = 'NO_ENCONTRADO' | 'PROHIBIDO' | 'REGLA' | 'DATOS';

export class MedicoService {
    private repo: IMedicoRepository;
    private reloj: () => Date;

    constructor(repo?: IMedicoRepository, reloj: () => Date = () => new Date()) {
        this.repo = repo ?? new MedicoRepository();
        this.reloj = reloj;
    }

    // ------------------------------------------------------------
    // Resuelve el médico de la sesión. Si el usuario MEDICO no está
    // vinculado a la tabla medicos, no puede operar.
    // ------------------------------------------------------------
    private async medicoDeSesion(idUsuario: number) {
        return this.repo.obtenerPerfilPorUsuario(idUsuario);
    }

    // ============================================================
    // 1) PERFIL
    // ============================================================
    async perfil(idUsuario: number) {
        const medico = await this.medicoDeSesion(idUsuario);
        if (!medico) {
            return { ok: false as const, codigo: 'NO_ENCONTRADO' as CodigoError, mensaje: 'Tu cuenta no está vinculada a un médico. Contacta al administrador.' };
        }
        return { ok: true as const, medico };
    }

    // ============================================================
    // 2) AGENDA DEL DÍA
    // ============================================================
    async agenda(idUsuario: number, fecha?: string) {
        const dia = fecha && fecha.length > 0 ? fecha : hoyLocal(this.reloj());
        if (!esFechaValida(dia)) {
            return { ok: false as const, codigo: 'DATOS' as CodigoError, mensaje: 'La fecha debe tener formato YYYY-MM-DD' };
        }

        const medico = await this.medicoDeSesion(idUsuario);
        if (!medico) {
            return { ok: false as const, codigo: 'NO_ENCONTRADO' as CodigoError, mensaje: 'Tu cuenta no está vinculada a un médico. Contacta al administrador.' };
        }

        const citas = await this.repo.agenda(medico.id_medico, dia);
        const resumen = {
            total: citas.length,
            atendidas: citas.filter(c => c.atendida).length,
            pendientes: citas.filter(c => !c.atendida && ['RESERVADA', 'CONFIRMADA', 'RECORDATORIO', 'COMPLETADA'].includes(c.estado)).length,
            canceladas: citas.filter(c => c.estado === 'CANCELADA').length,
            faltas: citas.filter(c => c.estado === 'FALTA').length,
        };

        return { ok: true as const, fecha: dia, medico, resumen, citas };
    }

    // ============================================================
    // 3) REGISTRAR ATENCIÓN
    // ============================================================
    async registrarAtencion(idUsuario: number, idCita: number, dto: RegistrarAtencionDTO) {
        if (!Number.isInteger(idCita) || idCita <= 0) {
            return { ok: false as const, codigo: 'DATOS' as CodigoError, mensaje: 'ID de cita inválido' };
        }

        const medico = await this.medicoDeSesion(idUsuario);
        if (!medico) {
            return { ok: false as const, codigo: 'NO_ENCONTRADO' as CodigoError, mensaje: 'Tu cuenta no está vinculada a un médico. Contacta al administrador.' };
        }

        const cita = await this.repo.obtenerCitaDeMedico(idCita);
        if (!cita) {
            return { ok: false as const, codigo: 'NO_ENCONTRADO' as CodigoError, mensaje: 'La cita no existe' };
        }

        const yaAtendida = await this.repo.existeAtencion(idCita);
        const validacion = validarAtencion({
            estado: cita.estado,
            fechaCita: cita.fecha,
            hoy: hoyLocal(this.reloj()),
            yaAtendida,
            idMedicoCita: cita.id_medico,
            idMedicoSesion: medico.id_medico,
        });

        if (!validacion.ok) {
            const error = validacion as Extract<ResultadoValidacion, { ok: false }>;
            return { ok: false as const, codigo: error.codigo as CodigoError, mensaje: error.motivo };
        }

        const atencion = await this.repo.registrarAtencion(
            new Atencion(
                0,
                idCita,
                medico.id_medico,
                dto.diagnostico.trim(),
                dto.indicaciones?.trim() ? dto.indicaciones.trim() : null,
                this.reloj(),
            ),
        );

        return {
            ok: true as const,
            mensaje: 'Atención registrada correctamente',
            atencion,
        };
    }

    // ============================================================
    // 4) HISTORIAL DE UN PACIENTE
    // ============================================================
    async historialPaciente(idUsuario: number, idPaciente: number) {
        if (!Number.isInteger(idPaciente) || idPaciente <= 0) {
            return { ok: false as const, codigo: 'DATOS' as CodigoError, mensaje: 'ID de paciente inválido' };
        }

        const medico = await this.medicoDeSesion(idUsuario);
        if (!medico) {
            return { ok: false as const, codigo: 'NO_ENCONTRADO' as CodigoError, mensaje: 'Tu cuenta no está vinculada a un médico. Contacta al administrador.' };
        }

        // Solo puede ver historiales de pacientes que tienen cita con él
        const autorizado = await this.repo.medicoAtiendeAPaciente(medico.id_medico, idPaciente);
        if (!autorizado) {
            return { ok: false as const, codigo: 'PROHIBIDO' as CodigoError, mensaje: 'Solo puedes ver el historial de pacientes que tienen cita contigo' };
        }

        const paciente = await this.repo.datosPaciente(idPaciente);
        const atenciones = await this.repo.historialPaciente(idPaciente);

        return { ok: true as const, paciente, total: atenciones.length, atenciones };
    }
}
