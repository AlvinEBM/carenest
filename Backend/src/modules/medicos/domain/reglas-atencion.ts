// =================================================================
// CAPA: Domain
// Reglas de negocio PURAS para que un médico registre la atención
// de una cita. No dependen de BD ni de HTTP → se prueban con TDD.
//
//  R1. Solo se atienden citas activas o ya marcadas como asistidas
//      (RESERVADA, CONFIRMADA, RECORDATORIO, COMPLETADA).
//  R2. Una cita CANCELADA o con FALTA no se puede atender.
//  R3. Una cita solo tiene UNA atención (no se sobrescribe).
//  R4. No se puede atender una cita de una fecha futura.
//  R5. El médico solo atiende SUS citas (control de acceso, OWASP A01).
// =================================================================
export type EstadoCita =
    | 'RESERVADA'
    | 'CONFIRMADA'
    | 'RECORDATORIO'
    | 'COMPLETADA'
    | 'CANCELADA'
    | 'FALTA';

export const ESTADOS_ATENDIBLES: EstadoCita[] = [
    'RESERVADA',
    'CONFIRMADA',
    'RECORDATORIO',
    'COMPLETADA',
];

export interface DatosValidacionAtencion {
    estado: EstadoCita;
    fechaCita: string;        // "YYYY-MM-DD"
    hoy: string;              // "YYYY-MM-DD"
    yaAtendida: boolean;
    idMedicoCita: number;     // médico dueño de la cita
    idMedicoSesion: number;   // médico que intenta atender
}

export type ResultadoValidacion =
    | { ok: true }
    | { ok: false; codigo: 'PROHIBIDO' | 'REGLA'; motivo: string };

export function validarAtencion(d: DatosValidacionAtencion): ResultadoValidacion {
    // R5 primero: si no es su cita, no revelamos nada más de ella
    if (d.idMedicoCita !== d.idMedicoSesion) {
        return { ok: false, codigo: 'PROHIBIDO', motivo: 'No puedes atender una cita asignada a otro médico' };
    }
    // R2 / R1
    if (!ESTADOS_ATENDIBLES.includes(d.estado)) {
        return { ok: false, codigo: 'REGLA', motivo: `No se puede atender una cita en estado ${d.estado}` };
    }
    // R3
    if (d.yaAtendida) {
        return { ok: false, codigo: 'REGLA', motivo: 'Esta cita ya tiene una atención registrada' };
    }
    // R4 (comparación lexicográfica válida para YYYY-MM-DD)
    if (d.fechaCita > d.hoy) {
        return { ok: false, codigo: 'REGLA', motivo: 'No puedes atender una cita programada para una fecha futura' };
    }
    return { ok: true };
}
