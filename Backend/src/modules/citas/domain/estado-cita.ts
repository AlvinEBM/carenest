// =================================================================
// CAPA: Domain (módulo Citas)
// Estados posibles de una cita. Es un concepto del módulo Citas:
// lo usan Citas (reprogramar), Médicos (atender) y Asistencias.
//
// Refactorización (Fan-In / Fan-Out): antes este tipo vivía en
// medicos/domain/reglas-atencion.ts y obligaba a Citas a depender de
// Médicos, formando un ciclo Citas ⇄ Médicos.
// =================================================================
export type EstadoCita =
    | 'RESERVADA'
    | 'CONFIRMADA'
    | 'RECORDATORIO'
    | 'COMPLETADA'
    | 'CANCELADA'
    | 'FALTA';
