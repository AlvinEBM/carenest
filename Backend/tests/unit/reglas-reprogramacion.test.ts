// =================================================================
// PRUEBAS UNITARIAS (TDD) — Reglas para REPROGRAMAR una cita.
// Ciclo 1: estas pruebas se escribieron ANTES que el código
// (Rojo → Verde → Refactorizar).
//
// Reglas:
//  R1. Solo el dueño de la cita puede reprogramarla.
//  R2. Solo se reprograman citas RESERVADA, CONFIRMADA o RECORDATORIO.
//  R3. La cita actual debe estar a 24 horas o más.
//  R4. La nueva fecha/hora debe ser distinta de la actual.
//  R5. La nueva fecha/hora debe estar a más de 2 horas.
// =================================================================
import { validarReprogramacion, DatosReprogramacion } from '../../src/modules/citas/domain/reglas-reprogramacion';

// "Ahora" fijo: martes 10/11/2026 a las 08:00 (hora local)
const AHORA = new Date('2026-11-10T08:00:00');

const base: DatosReprogramacion = {
    estado: 'RESERVADA',
    idUsuarioCita: 3,
    idUsuarioSesion: 3,
    fechaActual: '2026-11-12',
    horaActual: '10:00:00',
    fechaNueva: '2026-11-13',
    horaNueva: '09:00:00',
    ahora: AHORA,
};

describe('validarReprogramacion', () => {
    test('CP-REP-01 [CE válida] su cita RESERVADA, con más de 24 h, a otro día → permitido', () => {
        expect(validarReprogramacion(base)).toEqual({ ok: true });
    });

    test.each(['CONFIRMADA', 'RECORDATORIO'] as const)('CP-REP-02 [CE válida] estado %s se puede reprogramar', (estado) => {
        expect(validarReprogramacion({ ...base, estado }).ok).toBe(true);
    });

    test('CP-REP-03 [CE inválida] cita de otro paciente → PROHIBIDO', () => {
        expect(validarReprogramacion({ ...base, idUsuarioSesion: 9 })).toEqual({
            ok: false,
            codigo: 'PROHIBIDO',
            motivo: 'No puedes reprogramar una cita que no es tuya',
        });
    });

    test.each(['CANCELADA', 'COMPLETADA', 'FALTA'] as const)('CP-REP-04 [CE inválida] estado %s no se reprograma', (estado) => {
        expect(validarReprogramacion({ ...base, estado })).toEqual({
            ok: false,
            codigo: 'REGLA',
            motivo: `No se puede reprogramar una cita en estado ${estado}`,
        });
    });

    test('CP-REP-05 [valor límite] faltan exactamente 24 h → permitido', () => {
        expect(validarReprogramacion({ ...base, fechaActual: '2026-11-11', horaActual: '08:00:00' }).ok).toBe(true);
    });

    test('CP-REP-06 [valor límite] faltan 23 h 30 min → rechazado', () => {
        expect(validarReprogramacion({ ...base, fechaActual: '2026-11-11', horaActual: '07:30:00' })).toEqual({
            ok: false,
            codigo: 'REGLA',
            motivo: 'Solo puedes reprogramar con al menos 24 horas de anticipación',
        });
    });

    test('CP-REP-07 [CE inválida] misma fecha y hora que la cita actual → rechazado', () => {
        expect(validarReprogramacion({ ...base, fechaNueva: '2026-11-12', horaNueva: '10:00:00' })).toEqual({
            ok: false,
            codigo: 'REGLA',
            motivo: 'Elige una fecha u hora distinta a la de tu cita actual',
        });
    });

    test('CP-REP-08 [CE válida] mismo día, otra hora → permitido', () => {
        expect(validarReprogramacion({ ...base, fechaNueva: '2026-11-12', horaNueva: '11:30:00' }).ok).toBe(true);
    });

    test('CP-REP-09 [valor límite] nueva hora a exactamente 2 h → rechazado', () => {
        expect(validarReprogramacion({ ...base, fechaNueva: '2026-11-10', horaNueva: '10:00:00' })).toEqual({
            ok: false,
            codigo: 'REGLA',
            motivo: 'Debes reprogramar con al menos 2 horas de anticipación',
        });
    });

    test('CP-REP-10 [valor límite] nueva hora a 2 h 30 min → permitido', () => {
        expect(validarReprogramacion({ ...base, fechaNueva: '2026-11-10', horaNueva: '10:30:00' }).ok).toBe(true);
    });

    test('CP-REP-11 [CE inválida] nueva fecha en el pasado → rechazado', () => {
        expect(validarReprogramacion({ ...base, fechaNueva: '2026-11-09', horaNueva: '09:00:00' })).toMatchObject({
            ok: false,
            motivo: 'Debes reprogramar con al menos 2 horas de anticipación',
        });
    });

    test('CP-REP-12 la regla del dueño se revisa primero (no revela el estado de citas ajenas)', () => {
        expect(validarReprogramacion({ ...base, idUsuarioSesion: 9, estado: 'CANCELADA' })).toMatchObject({ codigo: 'PROHIBIDO' });
    });
});