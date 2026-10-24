// =================================================================
// CAPA: Domain / Repositories
// CONTRATO del repositorio de Citas.
// =================================================================
import { Cita } from '../entities/cita.entity';

export interface ICitaRepository {
    save(cita: Cita): Promise<Cita>;

    findByUsuario(idUsuario: number): Promise<Cita[]>;

    /**
     * Citas del paciente CON datos enriquecidos (fecha, hora,
     * especialidad, médico) para mostrar en el dashboard y mis-citas.
     */
    findDetalladasByUsuario(idUsuario: number): Promise<any[]>;

    contadoresPorUsuario(idUsuario: number): Promise<{
        total: number;
        completadas: number;
        proximas: number;
        canceladas: number;
        faltas: number;
    }>;

    listarTodas(): Promise<any[]>;

    /**
     * Busca una cita por id (entidad pura).
     */
    findById(idCita: number): Promise<Cita | null>;

    /**
     * Cambia el estado de una cita y libera su horario.
     */
    cancelar(idCita: number): Promise<boolean>;
    obtenerFechaHoraDeCita(idCita: number): Promise<{ fecha: string; hora: string } | null>;
    incrementarCancelaciones(idUsuario: number): Promise<number>;
    bloquearPorCancelaciones(idUsuario: number): Promise<void>;
    obtenerConfig(clave: string): Promise<string | null>;
    obtenerEstadoUsuario(idUsuario: number): Promise<{
        cuenta_bloqueada: boolean;
        fecha_bloqueo: string | null;
        inasistencias: number;
        cancelaciones: number;
    } | null>;
    desbloquearCuenta(idUsuario: number): Promise<void>;
    usuarioYaTieneCitaEn(idUsuario: number, fecha: string, hora: string): Promise<boolean>;
    crearNotificacion(idUsuario: number, mensaje: string, idCita?: number | null): Promise<void>;
}