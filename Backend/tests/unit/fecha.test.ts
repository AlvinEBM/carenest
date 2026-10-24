// =================================================================
// PRUEBA DE REGRESIÓN — Bug de fecha UTC en "Citas del día"
//
// Bug detectado: admisión usaba new Date().toISOString().slice(0,10).
// A las 19:00 o más (hora Lima, UTC-5) eso ya es "mañana" en UTC y
// la lista mostraba las citas del día siguiente.
// =================================================================
import { esFechaValida, fechaBDaTexto, hoyLocal } from '../../src/shared/utils/fecha';

describe('hoyLocal (regresión bug UTC)', () => {
    test('CP-FEC-01 a las 23:30 de Lima sigue siendo el mismo día', () => {
        const nocheLima = new Date(2026, 9, 16, 23, 30); // 16-oct 23:30 Lima = 17-oct 04:30 UTC
        expect(nocheLima.toISOString().slice(0, 10)).toBe('2026-10-17'); // comportamiento del bug
        expect(hoyLocal(nocheLima)).toBe('2026-10-16');                  // corregido
    });
    test('CP-FEC-02 [VL] 18:59 y 19:00 de Lima devuelven el mismo día', () => {
        expect(hoyLocal(new Date(2026, 9, 16, 18, 59))).toBe('2026-10-16');
        expect(hoyLocal(new Date(2026, 9, 16, 19, 0))).toBe('2026-10-16');
    });
});

describe('esFechaValida', () => {
    test.each([
        ['2026-10-16', true],
        ['2028-02-29', true],   // bisiesto
        ['2026-02-29', false],  // no bisiesto
        ['2026-13-01', false],
        ['2026-10-32', false],
        ['16/10/2026', false],
        ['2026-1-5', false],
        ['', false],
        ["2026-10-16' OR '1'='1", false],
    ])('CP-FEC-03 "%s" → %p', (texto, esperado) => {
        expect(esFechaValida(texto)).toBe(esperado);
    });
});

describe('fechaBDaTexto', () => {
    test('CP-FEC-04 convierte Date y string; null → null', () => {
        expect(fechaBDaTexto(new Date(2026, 0, 5))).toBe('2026-01-05');
        expect(fechaBDaTexto('2026-01-05T00:00:00.000Z')).toBe('2026-01-05');
        expect(fechaBDaTexto(null)).toBeNull();
    });
});
