// =================================================================
// Badge de estado reutilizable
// =================================================================
import { ReactNode } from 'react';
import { EstadoCita, EstadoPago } from '../../types';

interface BadgeProps {
    children: ReactNode;
    variante?: 'sky' | 'success' | 'danger' | 'warning' | 'gray';
    conPunto?: boolean;
}

export const Badge = ({ children, variante = 'sky', conPunto = false }: BadgeProps) => {
    const variantes = {
        sky:     'bg-sky-soft text-sky-deep',
        success: 'bg-success-soft text-success-deep',
        danger:  'bg-danger-soft text-danger',
        warning: 'bg-warning-soft text-warning',
        gray:    'bg-gray-100 text-gray-700',   // antes text-mute: 4.3:1 sobre gris (WCAG 1.4.3)
    };

    const puntoColor = {
        sky:     'bg-sky-main',
        success: 'bg-success',
        danger:  'bg-danger',
        warning: 'bg-warning',
        gray:    'bg-mute',
    };

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide ${variantes[variante]}`}>
            {conPunto && (
                <span className={`w-1.5 h-1.5 rounded-full ${puntoColor[variante]}`} />
            )}
            {children}
        </span>
    );
};

/**
 * Helper: convierte un estado de cita a su badge correspondiente
 */
export const BadgeEstadoCita = ({ estado }: { estado: EstadoCita }) => {
    const config = {
        RESERVADA:  { variante: 'sky' as const,     texto: 'RESERVADA',  conPunto: true },
        // BUG CORREGIDO: CONFIRMADA y RECORDATORIO no tenían badge y se
        // mostraban como "RESERVADA" (ahora una cita pagada se ve confirmada)
        CONFIRMADA: { variante: 'success' as const, texto: 'CONFIRMADA', conPunto: true },
        RECORDATORIO: { variante: 'warning' as const, texto: 'RECORDATORIO', conPunto: true },
        EN_CURSO:   { variante: 'warning' as const, texto: 'EN CURSO',   conPunto: true },
        COMPLETADA: { variante: 'success' as const, texto: '✓ COMPLETADA', conPunto: false },
        FALTA:      { variante: 'danger' as const,  texto: '✕ FALTA',    conPunto: false },
        CANCELADA:  { variante: 'gray' as const,    texto: 'CANCELADA',  conPunto: false },
    };
    const c = config[estado] ?? config.RESERVADA;

    return <Badge variante={c.variante} conPunto={c.conPunto}>{c.texto}</Badge>;
};

/**
 * Badge del estado de pago (Mercado Pago). Si no hay pago, "SIN PAGAR".
 */
export const BadgePago = ({ estado }: { estado: EstadoPago | null | undefined }) => {
    const config: Record<EstadoPago | 'SIN_PAGO', { variante: 'sky' | 'success' | 'danger' | 'warning' | 'gray'; texto: string }> = {
        APROBADO:    { variante: 'success', texto: '💳 PAGADO' },
        PENDIENTE:   { variante: 'warning', texto: '💳 PAGO PENDIENTE' },
        RECHAZADO:   { variante: 'danger',  texto: '💳 PAGO RECHAZADO' },
        CANCELADO:   { variante: 'gray',    texto: '💳 SIN PAGAR' },
        REEMBOLSADO: { variante: 'gray',    texto: '💳 REEMBOLSADO' },
        SIN_PAGO:    { variante: 'gray',    texto: '💳 SIN PAGAR' },
    };
    const c = config[estado ?? 'SIN_PAGO'] ?? config.SIN_PAGO;
    return <Badge variante={c.variante}>{c.texto}</Badge>;
};