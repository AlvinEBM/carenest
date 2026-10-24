import { User } from '../entities/user.entity';

export interface IFamiliarRepository {
    crear(familiar: User): Promise<User>;
    listarPorTutor(idTutor: number): Promise<User[]>;
    perteneceATutor(idFamiliar: number, idTutor: number): Promise<boolean>;
    existeDni(dni: string): Promise<boolean>;
}