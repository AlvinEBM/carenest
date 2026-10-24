import { Repository } from 'typeorm';
import { AppDataSource } from '../../../../config/datasource';
import { CorreoRemitenteModel } from '../models/correo-remitente.model';

export class CorreoRemitenteRepository {
    private repo: Repository<CorreoRemitenteModel>;

    constructor() {
        this.repo = AppDataSource.getRepository(CorreoRemitenteModel);
    }

    async listarTodos(): Promise<CorreoRemitenteModel[]> {
        return this.repo.find({ order: { prioridad: 'ASC', id_remitente: 'ASC' } });
    }

    // Solo los ACTIVOS, en orden de failover (menor prioridad primero)
    async listarActivosOrdenados(): Promise<CorreoRemitenteModel[]> {
        return this.repo.find({
            where: { activo: true },
            order: { prioridad: 'ASC', id_remitente: 'ASC' },
        });
    }

    async crear(data: Partial<CorreoRemitenteModel>): Promise<CorreoRemitenteModel> {
        const nuevo = this.repo.create(data);
        return this.repo.save(nuevo);
    }

    async actualizar(id: number, data: Partial<CorreoRemitenteModel>): Promise<void> {
        await this.repo.update({ id_remitente: id }, data);
    }

    async eliminar(id: number): Promise<void> {
        await this.repo.delete({ id_remitente: id });
    }

    async buscarPorCorreo(correo: string): Promise<CorreoRemitenteModel | null> {
        return this.repo.findOne({ where: { correo } });
    }
}