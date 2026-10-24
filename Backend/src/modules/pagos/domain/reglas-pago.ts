// =================================================================
// CAPA: Domain
// Reglas de negocio PURAS de la pasarela de pagos.
// Sin BD ni HTTP → se prueban con TDD / pruebas unitarias.
// =================================================================
import { EstadoPago } from './entities/pago.entity';

/** Estados de cita que todavía se pueden pagar. */
export const ESTADOS_CITA_PAGABLES = ['RESERVADA', 'CONFIRMADA', 'RECORDATORIO'] as const;

export const MONTO_MINIMO = 1;
export const MONTO_MAXIMO = 999.99;

export function citaEsPagable(estadoCita: string): boolean {
    return (ESTADOS_CITA_PAGABLES as readonly string[]).includes(estadoCita);
}

/**
 * Valida el monto que se enviará a la pasarela.
 * Valores límite: 0.99 ✗ | 1.00 ✓ | 999.99 ✓ | 1000.00 ✗ | NaN ✗ | 3 decimales ✗
 */
export function montoEsValido(monto: number): boolean {
    if (typeof monto !== 'number' || !Number.isFinite(monto)) return false;
    if (monto < MONTO_MINIMO || monto > MONTO_MAXIMO) return false;
    // máximo 2 decimales
    return Math.abs(Math.round(monto * 100) - monto * 100) < 1e-6;
}

/**
 * Traduce el "status" de Mercado Pago a nuestro estado interno.
 * Referencia: approved, pending, authorized, in_process, in_mediation,
 *             rejected, cancelled, refunded, charged_back.
 */
export function mapearEstadoMercadoPago(status: string | null | undefined): EstadoPago {
    switch ((status ?? '').toLowerCase()) {
        case 'approved':
            return 'APROBADO';
        case 'rejected':
            return 'RECHAZADO';
        case 'cancelled':
            return 'CANCELADO';
        case 'refunded':
        case 'charged_back':
            return 'REEMBOLSADO';
        case 'pending':
        case 'authorized':
        case 'in_process':
        case 'in_mediation':
        default:
            return 'PENDIENTE';
    }
}

/**
 * SEGURIDAD (OWASP A08 - Integridad de datos):
 * El monto que reporta Mercado Pago debe coincidir con el que
 * registramos. Si alguien manipula la preferencia, no se confirma.
 */
export function montosCoinciden(esperado: number, recibido: number): boolean {
    return Math.round(esperado * 100) === Math.round(recibido * 100);
}
