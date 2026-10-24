// =================================================================
// CAPA: Infrastructure / Models
// Model TypeORM mapeado a la tabla "medicos" en MySQL.
//
// CAMBIO (módulo Médicos con login):
//   - id_usuario  → vincula al médico con su cuenta en "usuarios"
//                   (rol MEDICO). NULL = médico sin acceso al sistema.
//   - colegiatura → número de colegiatura (CMP / CPsP), 5 a 6 dígitos.
// =================================================================
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
} from 'typeorm';

@Entity('medicos')
export class MedicoModel {
    @PrimaryGeneratedColumn()
    id_medico!: number;

    @Column()
    nombres!: string;

    @Column()
    apellidos!: string;

    @Column()
    id_especialidad!: number;

    // ----- Cuenta de acceso (rol MEDICO) -----
    @Column({ type: 'int', nullable: true, unique: true })
    id_usuario!: number | null;

    @Column({ type: 'varchar', length: 6, nullable: true })
    colegiatura!: string | null;

    // ----- Fase 3: estado y disponibilidad programada -----
    @Column({
        type: 'enum',
        enum: ['ACTIVO', 'INACTIVO'],
        default: 'ACTIVO',
    })
    estado!: 'ACTIVO' | 'INACTIVO';

    @Column({ type: 'date', nullable: true })
    fecha_inhabilitacion!: string | null;

    @Column({ type: 'date', nullable: true })
    fecha_habilitacion!: string | null;

    @Column({ type: 'tinyint', default: 0 })
    aviso_habilitacion_enviado!: number;
}
