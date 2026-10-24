// =================================================================
// PRUEBAS UNITARIAS — Reglas de la pasarela de pagos
// =================================================================
import {
    citaEsPagable,
    mapearEstadoMercadoPago,
    montoEsValido,
    montosCoinciden,
} from '../../src/modules/pagos/domain/reglas-pago';

describe('montoEsValido — valores límite (S/ 1.00 a S/ 999.99)', () => {
    test.each([
        [0.99, false, 'VL inferior - 0.01'],
        [1.0, true, 'VL inferior'],
        [1.01, true, 'VL inferior + 0.01'],
        [30, true, 'CE válida (precio típico)'],
        [999.98, true, 'VL superior - 0.01'],
        [999.99, true, 'VL superior'],
        [1000, false, 'VL superior + 0.01'],
        [0, false, 'CE inválida: cero'],
        [-30, false, 'CE inválida: negativo'],
        [30.555, false, 'CE inválida: 3 decimales'],
        [Number.NaN, false, 'CE inválida: NaN'],
        [Number.POSITIVE_INFINITY, false, 'CE inválida: infinito'],
    ])('CP-PAG-01 monto %p → %p (%s)', (monto, esperado) => {
        expect(montoEsValido(monto)).toBe(esperado);
    });
});

describe('mapearEstadoMercadoPago', () => {
    test.each([
        ['approved', 'APROBADO'],
        ['pending', 'PENDIENTE'],
        ['in_process', 'PENDIENTE'],
        ['authorized', 'PENDIENTE'],
        ['in_mediation', 'PENDIENTE'],
        ['rejected', 'RECHAZADO'],
        ['cancelled', 'CANCELADO'],
        ['refunded', 'REEMBOLSADO'],
        ['charged_back', 'REEMBOLSADO'],
        ['APPROVED', 'APROBADO'],
        ['desconocido', 'PENDIENTE'],
        [null, 'PENDIENTE'],
    ])('CP-PAG-02 status "%s" → %s', (status, esperado) => {
        expect(mapearEstadoMercadoPago(status as string | null)).toBe(esperado);
    });
});

describe('citaEsPagable', () => {
    test.each([
        ['RESERVADA', true],
        ['CONFIRMADA', true],
        ['RECORDATORIO', true],
        ['COMPLETADA', false],
        ['CANCELADA', false],
        ['FALTA', false],
    ])('CP-PAG-03 cita %s → pagable: %p', (estado, esperado) => {
        expect(citaEsPagable(estado as string)).toBe(esperado);
    });
});

describe('montosCoinciden (integridad A08)', () => {
    test('CP-PAG-04 30.00 vs 30 → coinciden', () => expect(montosCoinciden(30, 30.0)).toBe(true));
    test('CP-PAG-05 problema de coma flotante 0.1+0.2 vs 0.3 → coinciden', () => expect(montosCoinciden(0.1 + 0.2, 0.3)).toBe(true));
    test('CP-PAG-06 30.00 vs 29.99 → NO coinciden', () => expect(montosCoinciden(30, 29.99)).toBe(false));
    test('CP-PAG-07 30.00 vs 0.01 (monto manipulado) → NO coinciden', () => expect(montosCoinciden(30, 0.01)).toBe(false));
});
