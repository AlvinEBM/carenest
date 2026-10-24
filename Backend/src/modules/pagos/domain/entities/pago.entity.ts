// =================================================================
// CAPA: Domain / Entities
// Entidad PURA "Pago": un intento de pago de una cita.
// =================================================================
export type EstadoPago = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'CANCELADO' | 'REEMBOLSADO';

export class Pago {
    constructor(
        public id_pago: number,
        public id_cita: number,
        public id_usuario: number,
        public monto: number,
        public moneda: string,
        public estado: EstadoPago,
        public preference_id: string | null,
        public payment_id: string | null,
        public metodo: string | null,
        public detalle_estado: string | null,
        public fecha_creacion: Date | null = null,
    ) {}
}
