import { IFamiliarRepository } from '../../domain/repositories/IFamiliarRepository';
import { FamiliarRepository } from '../../infrastructure/repositories/familiar.repository';
import { UsuarioFactory } from '../../domain/factories/usuario.factory';
import { CrearFamiliarDTO } from '../dtos/crear-familiar.dto';
import { User } from '../../domain/entities/user.entity';

export class FamiliarService {

    private repo: IFamiliarRepository = new FamiliarRepository();

    async registrar(idTutor: number, dto: CrearFamiliarDTO) {
        const dniOcupado = await this.repo.existeDni(dto.dni);
        if (dniOcupado) {
            return { ok: false, mensaje: 'Ya existe una persona registrada con ese DNI' };
        }

        const nuevo = UsuarioFactory.crearFamiliar({
            idTutor,
            dni: dto.dni,
            nombres: dto.nombres.trim(),
            apellidos: dto.apellidos.trim(),
            parentesco: dto.parentesco,
            fecha_nacimiento: dto.fecha_nacimiento,
        });

        const guardado = await this.repo.crear(nuevo);

        return {
            ok: true,
            mensaje: 'Familiar registrado correctamente',
            id_familiar: guardado.id_usuario,
        };
    }

    async listar(idTutor: number) {
        const familiares = await this.repo.listarPorTutor(idTutor);
        return { ok: true, familiares: familiares.map(f => this.aRespuesta(f)) };
    }

    private aRespuesta(f: User) {
        return {
            id_familiar: f.id_usuario,
            nombres: f.nombres,
            apellidos: f.apellidos,
            dni: f.dni,
            fecha_nacimiento: this.fechaStr(f.fecha_nacimiento),
            parentesco: f.parentesco,
        };
    }

    private fechaStr(fecha: any): string | null {
        if (!fecha) return null;
        if (fecha instanceof Date) {
            return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
        }
        return String(fecha).slice(0, 10);
    }
}