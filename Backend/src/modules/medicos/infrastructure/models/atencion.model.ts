// =================================================================
// CAPA: Infrastructure / Models
// Model TypeORM mapeado a la tabla "atenciones".
// Registro clínico que deja el médico al atender una cita.
// Una cita tiene como máximo UNA atención (id_cita UNIQUE).
// =================================================================
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
} from 'typeorm';

@Entity('atenciones')
export class AtencionModel {
    @PrimaryGeneratedColumn()
    id_atencion!: number;

    @Column({ type: 'int', unique: true })
    id_cita!: number;

    @Column({ type: 'int' })
    id_medico!: number;

    @Column({ type: 'text' })
    diagnostico!: string;

    @Column({ type: 'text', nullable: true })
    indicaciones!: string | null;

    @CreateDateColumn()
    fecha_atencion!: Date;
}
