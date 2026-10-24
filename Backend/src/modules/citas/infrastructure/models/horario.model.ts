// =================================================================
// CAPA: Infrastructure / Models
// Model TypeORM mapeado a la tabla "horarios" en MySQL.
// =================================================================
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
} from 'typeorm';

@Entity('horarios')
export class HorarioModel {
    @PrimaryGeneratedColumn()
    id_horario!: number;

    @Column()
    id_medico!: number;

    // IMPORTANTE: la fecha se maneja como STRING "YYYY-MM-DD".
    // Si se usara tipo Date, TypeORM la convierte a UTC y retrocede
    // un día en zonas horarias negativas (como Perú UTC-5).
    @Column({ type: 'date' })
    fecha!: string;

    @Column({ type: 'time' })
    hora!: string;

    @Column({
        type: 'enum',
        enum: ['PRESENCIAL', 'VIRTUAL'],
        default: 'PRESENCIAL',
    })
    tipo_visita!: 'PRESENCIAL' | 'VIRTUAL';

    @Column({ default: true })
    disponible!: boolean;
}