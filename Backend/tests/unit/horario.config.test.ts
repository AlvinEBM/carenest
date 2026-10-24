// =================================================================
// PRUEBAS UNITARIAS — Reglas de horario de citas (dominio)
// Técnicas: Clases de equivalencia (CE) y Valores límite (VL)
// Fecha simulada: miércoles 14/10/2026 10:00 (hora Lima)
// =================================================================
import { fechaEsReservable, generarSlotsDelDia, esHoraPasada, HORARIO_CONFIG } from '../../src/modules/citas/domain/horario.config';

describe('Reglas de horario (horario.config)', () => {
    beforeAll(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date(2026, 9, 14, 10, 0, 0)); // 14-oct-2026 10:00
    });
    afterAll(() => jest.useRealTimers());

    describe('fechaEsReservable — ventana de 60 días', () => {
        test('CP-HOR-01 [CE válida] hoy (miércoles) es reservable', () => {
            expect(fechaEsReservable('2026-10-14')).toEqual({ ok: true });
        });
        test('CP-HOR-02 [VL] ayer NO es reservable', () => {
            expect(fechaEsReservable('2026-10-13')).toEqual({ ok: false, motivo: 'No se puede reservar en fechas pasadas' });
        });
        test('CP-HOR-03 [VL] día 60 (13/12/2026, domingo) se rechaza por no laborable, no por ventana', () => {
            expect(fechaEsReservable('2026-12-13').motivo).toBe('Ese día no hay atención (no laborable)');
        });
        test('CP-HOR-04 [VL] día 59 (12/12/2026, sábado) sí es reservable', () => {
            expect(fechaEsReservable('2026-12-12')).toEqual({ ok: true });
        });
        test('CP-HOR-05 [VL] día 61 (14/12/2026) excede la ventana', () => {
            expect(fechaEsReservable('2026-12-14')).toEqual({
                ok: false,
                motivo: `Solo puedes reservar hasta ${HORARIO_CONFIG.ventanaDias} días en adelante`,
            });
        });
        test('CP-HOR-06 [CE inválida] domingo no laborable', () => {
            expect(fechaEsReservable('2026-10-18').ok).toBe(false);
        });
        test('CP-HOR-07 [CE inválida] fecha inexistente → "Fecha inválida"', () => {
            expect(fechaEsReservable('2026-13-45')).toEqual({ ok: false, motivo: 'Fecha inválida' });
        });
    });

    describe('generarSlotsDelDia', () => {
        const slots = generarSlotsDelDia();
        test('CP-HOR-08 genera 18 turnos de 30 minutos', () => {
            expect(slots).toHaveLength(18);
        });
        test('CP-HOR-09 [VL] primer turno 08:00 y último 17:30', () => {
            expect(slots[0]).toBe('08:00:00');
            expect(slots[slots.length - 1]).toBe('17:30:00');
        });
        test('CP-HOR-10 respeta el refrigerio de 12:00 a 13:00', () => {
            expect(slots).not.toContain('12:00:00');
            expect(slots).not.toContain('12:30:00');
            expect(slots).toContain('11:30:00');
            expect(slots).toContain('13:00:00');
        });
    });

    describe('esHoraPasada — anticipación mínima de 120 minutos', () => {
        test('CP-HOR-11 [VL] 11:59 (119 min) NO se puede reservar', () => {
            expect(esHoraPasada('2026-10-14', '11:59:00')).toBe(true);
        });
        test('CP-HOR-12 [VL] 12:00 (exactamente 120 min) NO se puede reservar', () => {
            expect(esHoraPasada('2026-10-14', '12:00:00')).toBe(true);
        });
        test('CP-HOR-13 [VL] 12:01 (121 min) SÍ se puede reservar', () => {
            expect(esHoraPasada('2026-10-14', '12:01')).toBe(false);
        });
        test('CP-HOR-14 [CE] fecha futura no tiene restricción de hora', () => {
            expect(esHoraPasada('2026-10-15', '08:00:00')).toBe(false);
        });
    });
});
