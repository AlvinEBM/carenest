// =================================================================
// CAPA: Domain
// Reglas de negocio PURAS para REPROGRAMAR una cita.
// No dependen de BD ni de HTTP: se desarrollaron con TDD
// (tests/unit/reglas-reprogramacion.test.ts).
//
//  R1. Solo el dueño de la cita puede reprogramarla (OWASP A01).
//  R2. Solo se reprograman citas RESERVADA, CONFIRMADA o RECORDATORIO.
//  R3. La cita actual debe estar a 24 horas o más (igual que la
//      regla de cancelación tardía: con menos tiempo se cancela).
//  R4. La nueva fecha/hora debe ser distinta de la actual.
//  R5. La nueva fecha/hora debe estar a más de 2 horas
//      (misma anticipación mínima que al reservar).
// =================================================================
import { EstadoCita } from '../../medicos/domain/reglas-atencion';

export const ESTADOS_REPROGRAMABLES: EstadoCita[] = ['RESERVADA', 'CONFIRMADA', 'RECORDATORIO'];
export const HORAS_MINIMAS_CITA_ACTUAL = 24;
export const HORAS_MINIMAS_NUEVA_CITA = 2;

export interface DatosReprogramacion {
    estado: EstadoCita;
    idUsuarioCita: number;     // dueño de la cita
    idUsuarioSesion: number;   // paciente que intenta reprogramar
    fechaActual: string;       // "YYYY-MM-DD"
    horaActual: string;        // "HH:MM:SS"
    fechaNueva: string;
    horaNueva: string;
    ahora: Date;
}

export type ResultadoReprogramacion =
    | { ok: true }
    | { ok: false; codigo: 'PROHIBIDO' | 'REGLA'; motivo: string };

const rechazo = (motivo: string): ResultadoReprogramacion => ({ ok: false, codigo: 'REGLA', motivo });

/** Horas que faltan desde `ahora` hasta la fecha+hora indicada (negativo si ya pasó). */
function horasHasta(fecha: string, hora: string, ahora: Date): number {
    return (new Date(`${fecha}T${hora}`).getTime() - ahora.getTime()) / 3_600_000;
}

export function validarReprogramacion(d: DatosReprogramacion): ResultadoReprogramacion {
    // R1 primero: si la cita no es suya, no revelamos nada más de ella
    if (d.idUsuarioCita !== d.idUsuarioSesion) {
        return { ok: false, codigo: 'PROHIBIDO', motivo: 'No puedes reprogramar una cita que no es tuya' };
    }
    if (!ESTADOS_REPROGRAMABLES.includes(d.estado)) {                                     // R2
        return rechazo(`No se puede reprogramar una cita en estado ${d.estado}`);
    }
    if (horasHasta(d.fechaActual, d.horaActual, d.ahora) < HORAS_MINIMAS_CITA_ACTUAL) {  // R3
        return rechazo(`Solo puedes reprogramar con al menos ${HORAS_MINIMAS_CITA_ACTUAL} horas de anticipación`);
    }
    if (d.fechaNueva === d.fechaActual && d.horaNueva === d.horaActual) {                // R4
        return rechazo('Elige una fecha u hora distinta a la de tu cita actual');
    }
    if (horasHasta(d.fechaNueva, d.horaNueva, d.ahora) <= HORAS_MINIMAS_NUEVA_CITA) {   // R5
        return rechazo(`Debes reprogramar con al menos ${HORAS_MINIMAS_NUEVA_CITA} horas de anticipación`);
    }
    return { ok: true };
}