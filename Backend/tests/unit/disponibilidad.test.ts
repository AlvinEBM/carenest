// =================================================================
// PRUEBAS UNITARIAS — Disponibilidad programada de especialidades
// y médicos (función central de la Fase 3)
// =================================================================
import { estaDisponibleEnFecha, debeMostrarseParaReservar, restarDias } from '../../src/modules/citas/domain/disponibilidad';

const HOY = '2026-10-14';

describe('estaDisponibleEnFecha', () => {
    test('CP-DIS-01 activo y sin fechas programadas → disponible', () => {
        expect(estaDisponibleEnFecha({ activo: true, fecha_inhabilitacion: null, fecha_habilitacion: null }, '2026-10-20', HOY)).toBe(true);
    });
    test('CP-DIS-02 inactivo y sin fechas → NO disponible', () => {
        expect(estaDisponibleEnFecha({ activo: false, fecha_inhabilitacion: null, fecha_habilitacion: null }, '2026-10-20', HOY)).toBe(false);
    });
    test('CP-DIS-03 [VL] el mismo día de inhabilitación ya NO está disponible', () => {
        const d = { activo: true, fecha_inhabilitacion: '2026-10-20', fecha_habilitacion: null };
        expect(estaDisponibleEnFecha(d, '2026-10-19', HOY)).toBe(true);
        expect(estaDisponibleEnFecha(d, '2026-10-20', HOY)).toBe(false);
    });
    test('CP-DIS-04 [VL] cierre con reapertura: disponible desde la fecha de habilitación', () => {
        const d = { activo: true, fecha_inhabilitacion: '2026-10-20', fecha_habilitacion: '2026-10-25' };
        expect(estaDisponibleEnFecha(d, '2026-10-24', HOY)).toBe(false);
        expect(estaDisponibleEnFecha(d, '2026-10-25', HOY)).toBe(true);
    });
    test('CP-DIS-05 solo reapertura programada (inactivo hoy)', () => {
        const d = { activo: false, fecha_inhabilitacion: null, fecha_habilitacion: '2026-11-01' };
        expect(estaDisponibleEnFecha(d, '2026-10-31', HOY)).toBe(false);
        expect(estaDisponibleEnFecha(d, '2026-11-01', HOY)).toBe(true);
    });
});

describe('debeMostrarseParaReservar', () => {
    test('CP-DIS-06 cierre futuro: todavía se muestra', () => {
        expect(debeMostrarseParaReservar({ activo: true, fecha_inhabilitacion: '2026-10-20', fecha_habilitacion: null }, HOY)).toBe(true);
    });
    test('CP-DIS-07 cierre vigente sin reapertura: se oculta', () => {
        expect(debeMostrarseParaReservar({ activo: true, fecha_inhabilitacion: '2026-10-10', fecha_habilitacion: null }, HOY)).toBe(false);
    });
    test('CP-DIS-08 [VL] reaparece exactamente 5 días antes de la reapertura', () => {
        const d = { activo: false, fecha_inhabilitacion: '2026-10-01', fecha_habilitacion: '2026-10-19' };
        expect(debeMostrarseParaReservar(d, '2026-10-13')).toBe(false); // 6 días antes
        expect(debeMostrarseParaReservar(d, '2026-10-14')).toBe(true);  // 5 días antes
    });
    test('CP-DIS-09 restarDias cruza el cambio de mes', () => {
        expect(restarDias('2026-11-02', 5)).toBe('2026-10-28');
    });
});
