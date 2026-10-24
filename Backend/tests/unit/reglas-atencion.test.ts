// =================================================================
// PRUEBAS UNITARIAS (TDD) — Reglas para que el médico registre
// la atención de una cita. Escritas ANTES de la implementación
// (Rojo → Verde → Refactor).
// =================================================================
import { validarAtencion, DatosValidacionAtencion } from '../../src/modules/medicos/domain/reglas-atencion';

const base: DatosValidacionAtencion = {
    estado: 'CONFIRMADA',
    fechaCita: '2026-10-14',
    hoy: '2026-10-14',
    yaAtendida: false,
    idMedicoCita: 1,
    idMedicoSesion: 1,
};

describe('validarAtencion', () => {
    test('CP-ATE-01 [CE válida] cita de hoy, confirmada, de su médico → permitido', () => {
        expect(validarAtencion(base)).toEqual({ ok: true });
    });

    test.each(['RESERVADA', 'RECORDATORIO', 'COMPLETADA'] as const)(
        'CP-ATE-02 [CE válida] estado %s es atendible',
        (estado) => {
            expect(validarAtencion({ ...base, estado }).ok).toBe(true);
        },
    );

    test.each(['CANCELADA', 'FALTA'] as const)('CP-ATE-03 [CE inválida] estado %s no es atendible', (estado) => {
        expect(validarAtencion({ ...base, estado })).toEqual({
            ok: false,
            codigo: 'REGLA',
            motivo: `No se puede atender una cita en estado ${estado}`,
        });
    });

    test('CP-ATE-04 [CE inválida] cita ya atendida no se sobrescribe', () => {
        expect(validarAtencion({ ...base, yaAtendida: true })).toMatchObject({ ok: false, codigo: 'REGLA' });
    });

    test('CP-ATE-05 [VL] cita de ayer sí se puede atender (registro tardío)', () => {
        expect(validarAtencion({ ...base, fechaCita: '2026-10-13' }).ok).toBe(true);
    });

    test('CP-ATE-06 [VL] cita de mañana NO se puede atender', () => {
        expect(validarAtencion({ ...base, fechaCita: '2026-10-15' })).toEqual({
            ok: false,
            codigo: 'REGLA',
            motivo: 'No puedes atender una cita programada para una fecha futura',
        });
    });

    test('CP-ATE-07 [Seguridad A01] otro médico no puede atender la cita', () => {
        expect(validarAtencion({ ...base, idMedicoSesion: 2 })).toMatchObject({ ok: false, codigo: 'PROHIBIDO' });
    });

    test('CP-ATE-08 la regla de propiedad se evalúa antes que las demás (no filtra información)', () => {
        const r = validarAtencion({ ...base, idMedicoSesion: 2, estado: 'CANCELADA', yaAtendida: true });
        expect(r).toMatchObject({ codigo: 'PROHIBIDO' });
    });
});
