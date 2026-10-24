import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
} from 'typeorm';

@Entity('usuarios')
export class UserModel {
    @PrimaryGeneratedColumn()
    id_usuario!: number;

    // Nullable: un FAMILIAR no inicia sesión, no tiene correo real.
    @Column({ type: 'varchar', length: 100, nullable: true })
    correo!: string | null;

    // Nullable: un FAMILIAR no inicia sesión, no tiene contraseña.
    @Column({ type: 'varchar', length: 255, nullable: true })
    contrasena!: string | null;

    @Column({
        type: 'enum',
        enum: ['PACIENTE', 'ADMIN', 'ADMISION', 'MEDICO', 'FAMILIAR'],
    })
    rol!: 'PACIENTE' | 'ADMIN' | 'ADMISION' | 'MEDICO' | 'FAMILIAR';

    // Auto-referencia: paciente (tutor) que registró a este familiar.
    @Column({ type: 'int', nullable: true })
    id_tutor!: number | null;

    @Column({ nullable: true })
    dni!: string;

    @Column({ nullable: true })
    nombres!: string;

    @Column({ nullable: true })
    apellidos!: string;

    @Column({ nullable: true })
    telefono!: string;

    @Column({ type: 'date', nullable: true })
    fecha_nacimiento!: Date;

    @Column({ nullable: true })
    direccion!: string;

    @Column({
        type: 'enum',
        enum: ['Masculino', 'Femenino', 'Otros'],
        nullable: true,
    })
    genero!: 'Masculino' | 'Femenino' | 'Otros';

    // Parentesco del familiar respecto a su tutor (solo rol = 'FAMILIAR').
    @Column({ type: 'varchar', length: 50, nullable: true })
    parentesco!: string | null;

    // ----- Estado del paciente -----
    @Column({ default: 0 })
    inasistencias!: number;

    @Column({ default: 0 })
    cancelaciones!: number;

    @Column({ default: false })
    cuenta_bloqueada!: boolean;

    @Column({ type: 'date', nullable: true })
    fecha_bloqueo!: string | null;

    // ----- Control de acceso -----
    @Column({ default: 0 })
    intentos_fallidos!: number;

    @Column({ default: true })
    activo!: boolean;

    @CreateDateColumn()
    fecha_registro!: Date;
}