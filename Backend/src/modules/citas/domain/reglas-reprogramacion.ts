// =================================================================
// CAPA: Domain
// Reglas para REPROGRAMAR una cita (TDD — ciclo 1).
// PASO ROJO: solo la "firma" de la función, sin lógica todavía.
// Las pruebas de tests/unit/reglas-reprogramacion.test.ts deben FALLAR.
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

export function validarReprogramacion(_d: DatosReprogramacion): ResultadoReprogramacion {
    throw new Error('Pendiente de implementar');
}