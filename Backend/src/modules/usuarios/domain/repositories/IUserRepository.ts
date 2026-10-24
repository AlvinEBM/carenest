import { User } from '../entities/user.entity';

export interface IUserRepository {
    findByEmail(correo: string): Promise<User | null>;
    findCredentials(correo: string): Promise<any>;
    findByDni(dni: string): Promise<User | null>;
    save(user: User): Promise<User>;
    desbloquearCuenta(idUsuario: number): Promise<void>;
    obtenerConfiguracion(clave: string): Promise<string | null>;
}