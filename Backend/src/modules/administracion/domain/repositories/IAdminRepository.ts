// =================================================================
// CAPA: Domain / Repositories
// CONTRATO único de persistencia para el módulo Administración.
//
// Agrupa todas las operaciones que el AdminService necesita.
// La implementación concreta vive en Infrastructure/Repositories.
// =================================================================
import { Configuracion } from '../entities/configuracion.entity';

export interface IAdminRepository {
    // ============================================================
    // 1) CANCELACIÓN MASIVA
    // ============================================================
    cancelarCitasPorFechaEspecialidad(
        fecha: string,
        idEspecialidad: number,
        motivo: string,
    ): Promise<{ afectadas: number; idsUsuariosAfectados: number[] }>;

    insertarNotificacionesMasivas(
        idsUsuarios: number[],
        idCita: number | null,
        mensaje: string,
    ): Promise<void>;

    registrarFechaBloqueada(
        fecha: string,
        idEspecialidad: number,
        motivo: string,
        creadoPor: number,
    ): Promise<void>;

    // ============================================================
    // 2) GESTIÓN DE ESPECIALIDADES
    // ============================================================
    existeEspecialidadPorNombre(nombre: string): Promise<boolean>;

    crearEspecialidad(
        nombre: string,
        descripcion: string,
        requiereDatosMenor?: boolean,
        precio?: number,
    ): Promise<{ id: number }>;

    /** Devuelve false si la especialidad no existe. */
    actualizarPrecioEspecialidad(idEspecialidad: number, precio: number): Promise<boolean>;

    inhabilitarEspecialidad(
        idEspecialidad: number,
        desde: string,
        hasta: string,
        motivo: string,
        creadoPor: number,
    ): Promise<void>;

    // ============================================================
    // 3) CONFIGURACIÓN DE SANCIONES
    // ============================================================
    obtenerConfiguracion(clave: string): Promise<Configuracion | null>;

    guardarConfiguracion(
        clave: string,
        valor: string,
        descripcion?: string,
    ): Promise<void>;

    // ============================================================
    // 4) GESTIÓN DE USUARIOS DE ADMISIÓN
    // ============================================================
    crearUsuarioAdmision(data: {
        correo: string;
        contrasenaHash: string;
        dni: string;
        nombres: string;
        apellidos: string;
        telefono: string;
    }): Promise<{ id_usuario: number }>;

    correoOdniExiste(correo: string, dni: string): Promise<boolean>;
    // ============================================================
    // 5) LISTADOS (para las vistas del admin)
    // ============================================================
    listarEspecialidades(): Promise<{
        id_especialidad: number;
        nombre: string;
        descripcion: string | null;
        estado: string;
    }[]>;

    listarUsuariosAdmision(): Promise<{
        id_usuario: number;
        correo: string;
        nombres: string;
        apellidos: string;
        dni: string;
        activo: boolean;
    }[]>;

    // ============================================================
    // 6) GESTIÓN DE MÉDICOS
    // ============================================================
    existeEspecialidadActiva(idEspecialidad: number): Promise<boolean>;

    /**
     * Crea el usuario (rol MEDICO) y el registro en "medicos"
     * vinculados, dentro de UNA transacción.
     */
    crearMedicoConCuenta(data: {
        nombres: string;
        apellidos: string;
        id_especialidad: number;
        colegiatura: string;
        correo: string;
        contrasenaHash: string;
        dni: string;
        telefono: string | null;
    }): Promise<{ id_medico: number; id_usuario: number }>;

    obtenerMedico(idMedico: number): Promise<{
        id_medico: number;
        nombres: string;
        apellidos: string;
        id_usuario: number | null;
    } | null>;

    /** Crea la cuenta MEDICO y la vincula a un médico existente. */
    crearCuentaParaMedico(idMedico: number, data: {
        nombres: string;
        apellidos: string;
        correo: string;
        contrasenaHash: string;
        dni: string;
    }): Promise<{ id_usuario: number }>;

    listarMedicos(): Promise<{
        id_medico: number;
        nombres: string;
        apellidos: string;
        id_especialidad: number;
        especialidad: string;
        colegiatura?: string | null;
        correo?: string | null;
        tiene_cuenta?: boolean;
    }[]>;

    // ============================================================
    // FASE 3: programar disponibilidad con fecha
    // ============================================================
    programarEspecialidad(id: number, accion: 'INHABILITAR' | 'HABILITAR', fecha: string): Promise<{ ok: boolean; mensaje: string }>;

    programarMedico(id: number, accion: 'INHABILITAR' | 'HABILITAR', fecha: string): Promise<{ ok: boolean; mensaje: string }>;
    cancelarProgramacionEspecialidad(id: number, cual: 'INHABILITAR' | 'HABILITAR'): Promise<{ ok: boolean; mensaje: string }>;
    cancelarProgramacionMedico(id: number, cual: 'INHABILITAR' | 'HABILITAR'): Promise<{ ok: boolean; mensaje: string }>;
}