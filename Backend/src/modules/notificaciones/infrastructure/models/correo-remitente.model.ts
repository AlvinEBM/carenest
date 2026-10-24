import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
} from 'typeorm';

@Entity('correos_remitentes')
export class CorreoRemitenteModel {
    @PrimaryGeneratedColumn()
    id_remitente!: number;

    @Column()
    correo!: string;                       // cuenta que envía (ej. clinica@gmail.com)

    @Column()
    app_password!: string;                 // contraseña de aplicación (texto plano)

    @Column({ type: 'varchar', nullable: true })
    nombre_remitente!: string | null;      // nombre visible en el "De:"

    @Column({ type: 'varchar', nullable: true })
    host!: string | null;                  // si es NULL => Gmail (smtp.gmail.com)

    @Column({ type: 'int', nullable: true })
    puerto!: number | null;                // si es NULL => 587

    @Column({ default: true })
    activo!: boolean;                      // participa o no en el envío

    @Column({ default: 0 })
    prioridad!: number;                    // orden de failover (menor = primero)
}