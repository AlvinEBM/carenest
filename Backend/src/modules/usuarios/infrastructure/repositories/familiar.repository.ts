import { Repository } from 'typeorm';

import { AppDataSource } from '../../../../config/datasource';
import { UserModel } from '../models/user.model';
import { IFamiliarRepository } from '../../domain/repositories/IFamiliarRepository';
import { User } from '../../domain/entities/user.entity';
import { UserMapping } from '../mappings/user.mapping';

export class FamiliarRepository implements IFamiliarRepository {
    private repo: Repository<UserModel>;

    constructor() {
        this.repo = AppDataSource.getRepository(UserModel);
    }

    async crear(familiar: User): Promise<User> {
        const model = UserMapping.toModel(familiar);
        const saved = await this.repo.save(model);
        return UserMapping.toDomain(saved);
    }

    async listarPorTutor(idTutor: number): Promise<User[]> {
        const models = await this.repo.find({
            where: { rol: 'FAMILIAR', id_tutor: idTutor },
            order: { id_usuario: 'DESC' },
        });
        return models.map(UserMapping.toDomain);
    }

    async perteneceATutor(idFamiliar: number, idTutor: number): Promise<boolean> {
        const count = await this.repo.count({
            where: { id_usuario: idFamiliar, rol: 'FAMILIAR', id_tutor: idTutor },
        });
        return count > 0;
    }

    async existeDni(dni: string): Promise<boolean> {
        const count = await this.repo.count({ where: { dni } });
        return count > 0;
    }
}