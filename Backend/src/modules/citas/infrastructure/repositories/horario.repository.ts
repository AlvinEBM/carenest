// =================================================================
// CAPA: Infrastructure / Repositories
// Implementación de IHorarioRepository usando TypeORM.
//
// CAMBIO (Enfoque A1): además de los métodos originales, agrega
// la capacidad de buscar/crear un horario puntual al momento de
// reservar (los horarios ya no están pre-cargados en la BD).
//
// IMPORTANTE: la fecha se maneja como STRING "YYYY-MM-DD" para
// evitar el desfase de un día que causaba new Date() al convertir
// a UTC en zonas horarias negativas (Perú UTC-5).
// =================================================================
import { Repository } from 'typeorm';

import { AppDataSource } from '../../../../config/datasource';
import { HorarioModel } from '../models/horario.model';
import { MedicoModel } from '../models/medico.model';
import { IHorarioRepository } from '../../domain/repositories/IHorarioRepository';
import { Horario } from '../../domain/entities/horario.entity';
import { HorarioMapping } from '../mapping/horario.mapping';

export class HorarioRepository implements IHorarioRepository {
    private repo: Repository<HorarioModel>;
    private medicoRepo: Repository<MedicoModel>;

    constructor() {
        this.repo = AppDataSource.getRepository(HorarioModel);
        this.medicoRepo = AppDataSource.getRepository(MedicoModel);
    }

    /**
     * (Método original - se mantiene por compatibilidad)
     * Devuelve horarios disponibles ya existentes en BD.
     */
    async findDisponibles(
        fecha: string,
        idEspecialidad: number,
    ): Promise<Horario[]> {
        const models = await this.repo
            .createQueryBuilder('h')
            .innerJoin('medicos', 'm', 'm.id_medico = h.id_medico')
            .where('h.fecha = :fecha', { fecha })
            .andWhere('m.id_especialidad = :idEsp', { idEsp: idEspecialidad })
            .andWhere('h.disponible = TRUE')
            .andWhere('(h.hora < "12:00:00" OR h.hora >= "13:00:00")')
            .orderBy('h.hora', 'ASC')
            .getMany();

        return models.map(m => HorarioMapping.toDomain(m));
    }

    async findById(id: number): Promise<Horario | null> {
        const model = await this.repo.findOne({
            where: { id_horario: id },
        });
        if (!model) return null;
        return HorarioMapping.toDomain(model);
    }

    async marcarNoDisponible(id: number): Promise<void> {
        await this.repo.update(
            { id_horario: id },
            { disponible: false },
        );
    }

    // ============================================================
    // NUEVO (Enfoque A1): obtener el médico de una especialidad
    // ============================================================
    async obtenerMedicoDeEspecialidad(idEspecialidad: number): Promise<MedicoModel | null> {
        return this.medicoRepo.findOne({
            where: { id_especialidad: idEspecialidad },
        });
    }

    // ============================================================
    // NUEVO (Enfoque A1): buscar un horario por médico+fecha+hora.
    // Sirve para saber si ese slot ya fue creado/reservado.
    // La fecha se pasa como string puro (sin new Date).
    // ============================================================
    async findByMedicoFechaHora(
        idMedico: number,
        fecha: string,
        hora: string,
    ): Promise<HorarioModel | null> {
        return this.repo.findOne({
            where: {
                id_medico: idMedico,
                fecha: fecha as any,
                hora,
            },
        });
    }

    // ============================================================
    // NUEVO (Enfoque A1): crear un horario en BD al momento de
    // reservar. Devuelve el id_horario recién creado.
    // La fecha se guarda como string puro (sin new Date) para
    // evitar el desfase de zona horaria.
    // ============================================================
    async crearHorario(
        idMedico: number,
        fecha: string,
        hora: string,
    ): Promise<number> {
        const nuevo = this.repo.create({
            id_medico: idMedico,
            fecha: fecha as any,
            hora,
            tipo_visita: 'PRESENCIAL',
            disponible: false, // se crea ya ocupado (se está reservando)
        });
        try {
            const guardado = await this.repo.save(nuevo);
            return guardado.id_horario;
        } catch (err: any) {
            // Si dos reservas simultáneas intentan tomar el mismo slot,
            // el UNIQUE (id_medico, fecha, hora) de la BD lanza este error.
            // Lo convertimos en un error de negocio controlado en vez de un 500.
            if (err?.code === 'ER_DUP_ENTRY' || err?.errno === 1062) {
                const e: any = new Error('Ese horario ya fue reservado, selecciona otro.');
                e.status = 409;
                e.esConflictoHorario = true;
                throw e;
            }
            throw err;
        }
    }
}