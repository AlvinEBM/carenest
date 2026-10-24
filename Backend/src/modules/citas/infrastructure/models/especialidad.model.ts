// =================================================================
// CAPA: Infrastructure / Models
// Model TypeORM mapeado a la tabla "especialidades" en MySQL.
// =================================================================
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
} from 'typeorm';

@Entity('especialidades')
export class EspecialidadModel {
    @PrimaryGeneratedColumn()
    id_especialidad!: number;

    @Column()
    nombre!: string;

    @Column({ type: 'text', nullable: true })
    descripcion!: string;

    @Column({
        type: 'enum',
        enum: ['ACTIVA', 'INACTIVA'],
        default: 'ACTIVA',
    })
    estado!: 'ACTIVA' | 'INACTIVA';

    @Column({ type: 'tinyint', default: 0 })
    requiere_datos_menor!: number;

    // Precio de la consulta en soles (lo usa la pasarela de pagos).
    // El monto SIEMPRE se toma de aquí, nunca del cliente.
    @Column({ type: 'decimal', precision: 8, scale: 2, default: 30.0 })
    precio!: string;

    // ----- Fase 3: disponibilidad programada -----
    @Column({ type: 'date', nullable: true })
    fecha_inhabilitacion!: string | null;

    @Column({ type: 'date', nullable: true })
    fecha_habilitacion!: string | null;

    @Column({ type: 'tinyint', default: 0 })
    aviso_habilitacion_enviado!: number;
}