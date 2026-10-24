import { AppDataSource } from '../../../../config/datasource';
import { CitaModel } from '../../../citas/infrastructure/models/cita.model';

function fechaLocalStr(fecha: any): string | null {
    if (!fecha) return null;
    if (fecha instanceof Date) {
        return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
    }
    return String(fecha).slice(0, 10);
}

export interface FiltrosReporte {
    desde?: string;
    hasta?: string;
    id_especialidad?: number;
    id_medico?: number;
    estado?: string;
}

export class ReporteRepository {
    private repo = AppDataSource.getRepository(CitaModel);

    async reporteCitas(f: FiltrosReporte): Promise<any[]> {
        const qb = this.repo
            .createQueryBuilder('c')
            .innerJoin('horarios',       'h',       'h.id_horario = c.id_horario')
            .innerJoin('medicos',        'm',       'm.id_medico = h.id_medico')
            .innerJoin('especialidades', 'e',       'e.id_especialidad = m.id_especialidad')
            .innerJoin('usuarios',       'titular', 'titular.id_usuario = c.id_usuario')
            .leftJoin('usuarios',        'fam',     'fam.id_usuario = c.id_dependiente')
            .select([
                'c.id_cita              AS id_cita',
                'c.estado              AS estado',
                'c.motivo              AS motivo',
                'h.fecha               AS fecha',
                'h.hora                AS hora',
                'e.nombre              AS especialidad',
                'e.requiere_datos_menor AS requiere_menor',
                'm.nombres             AS medico_nombres',
                'm.apellidos           AS medico_apellidos',
                'titular.nombres       AS titular_nombres',
                'titular.apellidos     AS titular_apellidos',
                'titular.dni           AS titular_dni',
                'fam.nombres           AS familiar_nombres',
                'fam.apellidos         AS familiar_apellidos',
                'fam.parentesco        AS familiar_parentesco',
            ])
            .orderBy('h.fecha', 'ASC')
            .addOrderBy('h.hora', 'ASC');

        if (f.desde)           qb.andWhere('h.fecha >= :desde', { desde: f.desde });
        if (f.hasta)           qb.andWhere('h.fecha <= :hasta', { hasta: f.hasta });
        if (f.id_especialidad) qb.andWhere('e.id_especialidad = :ie', { ie: f.id_especialidad });
        if (f.id_medico)       qb.andWhere('m.id_medico = :im', { im: f.id_medico });
        if (f.estado)          qb.andWhere('c.estado = :estado', { estado: f.estado });

        const rows = await qb.getRawMany();

        return rows.map(r => {
            const esMenor = !!r.requiere_menor && !!r.familiar_nombres;

            const paciente = esMenor
                ? `${r.familiar_nombres ?? ''} ${r.familiar_apellidos ?? ''}`.trim()
                : `${r.titular_nombres ?? ''} ${r.titular_apellidos ?? ''}`.trim();

            return {
                id_cita:           Number(r.id_cita),
                fecha:             fechaLocalStr(r.fecha),
                hora:              r.hora,
                especialidad:      r.especialidad,
                medico:            `${r.medico_nombres ?? ''} ${r.medico_apellidos ?? ''}`.trim(),
                paciente,
                parentesco:        esMenor ? (r.familiar_parentesco || 'Menor') : null,
                reservado_por:     `${r.titular_nombres ?? ''} ${r.titular_apellidos ?? ''}`.trim(),
                reservado_por_dni: r.titular_dni,
                es_menor:          esMenor,
                estado:            r.estado,
                motivo:            r.motivo,
            };
        });
    }
}