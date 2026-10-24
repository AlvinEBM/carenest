// =================================================================
// CAPA: Infrastructure / Repositories
// Implementación CONCRETA del contrato IEspecialidadRepository.
// Aquí es donde realmente se consulta la tabla "especialidades".
// =================================================================
import { Repository } from 'typeorm';

import { AppDataSource } from '../../../../config/datasource';
import { EspecialidadModel } from '../models/especialidad.model';
import { IEspecialidadRepository } from '../../domain/repositories/IEspecialidadRepository';
import { Especialidad } from '../../domain/entities/especialidad.entity';
import { EspecialidadMapping } from '../mapping/especialidad.mapping';
import { debeMostrarseParaReservar, DatosDisponibilidad } from '../../domain/disponibilidad';

// Helpers de fecha local (mismo criterio que el resto del módulo)
function hoyStr(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function fechaLocalStr(fecha: any): string | null {
    if (!fecha) return null;
    if (fecha instanceof Date) {
        return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
    }
    return String(fecha).slice(0, 10);
}
export class EspecialidadRepository implements IEspecialidadRepository {
    private repo: Repository<EspecialidadModel>;

    constructor() {
        this.repo = AppDataSource.getRepository(EspecialidadModel);
    }

    /**
     * Lista solo las especialidades con estado 'ACTIVA'.
     * Es lo que el paciente verá en el dropdown.
     */
    async findActivas(): Promise<Especialidad[]> {
        // Traemos TODAS y filtramos con la misma regla de visibilidad que los
        // médicos, para que reaparezcan 5 días antes de su reapertura, etc.
        const models = await this.repo.find({
            order: { nombre: 'ASC' },
        });

        const hoy = hoyStr();

        return models
            .filter(m => {
                const datos: DatosDisponibilidad = {
                    activo: m.estado === 'ACTIVA',
                    fecha_inhabilitacion: fechaLocalStr((m as any).fecha_inhabilitacion),
                    fecha_habilitacion: fechaLocalStr((m as any).fecha_habilitacion),
                };
                return debeMostrarseParaReservar(datos, hoy);
            })
            .map(m => EspecialidadMapping.toDomain(m));
    }

    /**
     * Busca una especialidad por su ID.
     */
    async findById(id: number): Promise<Especialidad | null> {
        const model = await this.repo.findOne({
            where: { id_especialidad: id },
        });

        if (!model) {
            return null;
        }

        return EspecialidadMapping.toDomain(model);
    }
}