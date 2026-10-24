// =================================================================
// CAPA: Infrastructure / Models
// Model TypeORM mapeado a la tabla "pagos".
//
// Cada intento de pago de una cita genera un registro. El
// external_reference que se envía a Mercado Pago es el id_pago,
// así cualquier notificación se puede asociar sin ambigüedad.
// =================================================================
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

export type EstadoPago = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'CANCELADO' | 'REEMBOLSADO';

@Entity('pagos')
export class PagoModel {
    @PrimaryGeneratedColumn()
    id_pago!: number;

    @Column({ type: 'int' })
    id_cita!: number;

    @Column({ type: 'int' })
    id_usuario!: number;

    @Column({ type: 'decimal', precision: 8, scale: 2 })
    monto!: string;

    @Column({ type: 'varchar', length: 3, default: 'PEN' })
    moneda!: string;

    @Column({
        type: 'enum',
        enum: ['PENDIENTE', 'APROBADO', 'RECHAZADO', 'CANCELADO', 'REEMBOLSADO'],
        default: 'PENDIENTE',
    })
    estado!: EstadoPago;

    @Column({ type: 'varchar', length: 100, nullable: true })
    preference_id!: string | null;

    @Column({ type: 'varchar', length: 50, nullable: true, unique: true })
    payment_id!: string | null;

    @Column({ type: 'varchar', length: 50, nullable: true })
    metodo!: string | null;

    @Column({ type: 'varchar', length: 100, nullable: true })
    detalle_estado!: string | null;

    @CreateDateColumn()
    fecha_creacion!: Date;

    @UpdateDateColumn()
    fecha_actualizacion!: Date;
}
