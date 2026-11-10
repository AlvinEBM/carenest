// =================================================================
// CAPA: Domain
// Reglas para REPROGRAMAR una cita (TDD — ciclo 1).
// PASO VERDE: el código mínimo para que pasen las pruebas.
// =================================================================
import { EstadoCita } from '../../medicos/domain/reglas-atencion';

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

export function validarReprogramacion(d: DatosReprogramacion): ResultadoReprogramacion {
    if (d.idUsuarioCita !== d.idUsuarioSesion) {
        return { ok: false, codigo: 'PROHIBIDO', motivo: 'No puedes reprogramar una cita que no es tuya' };
    }
    if (d.estado !== 'RESERVADA' && d.estado !== 'CONFIRMADA' && d.estado !== 'RECORDATORIO') {
        return { ok: false, codigo: 'REGLA', motivo: `No se puede reprogramar una cita en estado ${d.estado}` };
    }
    const actual = new Date(`${d.fechaActual}T${d.horaActual}`);
    if ((actual.getTime() - d.ahora.getTime()) / 3600000 < 24) {
        return { ok: false, codigo: 'REGLA', motivo: 'Solo puedes reprogramar con al menos 24 horas de anticipación' };
    }
    if (d.fechaNueva === d.fechaActual && d.horaNueva === d.horaActual) {
        return { ok: false, codigo: 'REGLA', motivo: 'Elige una fecha u hora distinta a la de tu cita actual' };
    }
    const nueva = new Date(`${d.fechaNueva}T${d.horaNueva}`);
    if ((nueva.getTime() - d.ahora.getTime()) / 3600000 <= 2) {
        return { ok: false, codigo: 'REGLA', motivo: 'Debes reprogramar con al menos 2 horas de anticipación' };
    }
    return { ok: true };
}