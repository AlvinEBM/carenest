// =================================================================
// CAPA: Domain / Repositories
// CONTRATO de persistencia del módulo Médicos.
// =================================================================
import { Atencion } from '../entities/atencion.entity';
import { EstadoCita } from '../reglas-atencion';

export interface PerfilMedico {
    id_medico: number;
    nombres: string;
    apellidos: string;
    colegiatura: string | null;
    id_especialidad: number;
    especialidad: string;
}

export interface CitaAgenda {
    id_cita: number;
    fecha: string;
    hora: string;
    estado: EstadoCita;
    motivo: string | null;
    notas: string | null;
    // Persona atendida (titular o familiar a cargo)
    id_paciente: number;
    paciente_nombres: string;
    paciente_apellidos: string;
    paciente_dni: string | null;
    es_menor: boolean;
    parentesco: string | null;
    // Titular que reservó
    titular_nombres: string;
    titular_apellidos: string;
    estado_pago: string | null;
    atendida: boolean;
}

export interface CitaDeMedico {
    id_cita: number;
    id_medico: number;
    estado: EstadoCita;
    fecha: string;
}

export interface AtencionHistorial {
    id_atencion: number;
    id_cita: number;
    fecha: string;
    hora: string;
    especialidad: string;
    medico: string;
    diagnostico: string;
    indicaciones: string | null;
    fecha_atencion: Date;
}

export interface IMedicoRepository {
    obtenerPerfilPorUsuario(idUsuario: number): Promise<PerfilMedico | null>;
    agenda(idMedico: number, fecha: string): Promise<CitaAgenda[]>;
    obtenerCitaDeMedico(idCita: number): Promise<CitaDeMedico | null>;
    existeAtencion(idCita: number): Promise<boolean>;
    /** Guarda la atención y deja la cita en COMPLETADA (transacción). */
    registrarAtencion(atencion: Atencion): Promise<Atencion>;
    /** ¿El médico tiene (o tuvo) alguna cita con este paciente? */
    medicoAtiendeAPaciente(idMedico: number, idPaciente: number): Promise<boolean>;
    historialPaciente(idPaciente: number): Promise<AtencionHistorial[]>;
    datosPaciente(idPaciente: number): Promise<{ nombres: string; apellidos: string; dni: string | null; fecha_nacimiento: string | null } | null>;
}
