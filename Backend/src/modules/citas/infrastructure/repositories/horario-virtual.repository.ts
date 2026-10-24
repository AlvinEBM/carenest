// =================================================================
// CAPA: Infrastructure / Repositories
// Genera horarios "virtuales" al vuelo, POR MÉDICO, RESPETANDO
// las fechas de inhabilitación/habilitación (Fase 3).
// =================================================================
import { Repository } from 'typeorm';

import { AppDataSource } from '../../../../config/datasource';
import { CitaModel } from '../models/cita.model';
import { MedicoModel } from '../models/medico.model';
import { EspecialidadModel } from '../models/especialidad.model';

import {
    generarSlotsDelDia,
    fechaEsReservable,
    esHoraPasada,
} from '../../domain/horario.config';
import {
    estaDisponibleEnFecha,
    debeMostrarseParaReservar,
    DatosDisponibilidad,
} from '../../domain/disponibilidad';

export interface SlotDisponible {
    hora: string;
    id_medico: number;
    medico_nombres: string;
    medico_apellidos: string;
    disponible: boolean;
}

// Helper: fecha de hoy como YYYY-MM-DD local
function hoyStr(): string {
    const d = new Date();
    const a = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${a}-${m}-${dd}`;
}

// Helper: normaliza fecha de BD (Date o string) a YYYY-MM-DD
function fechaLocalStr(fecha: any): string | null {
    if (!fecha) return null;
    if (fecha instanceof Date) {
        const a = fecha.getFullYear();
        const m = String(fecha.getMonth() + 1).padStart(2, '0');
        const d = String(fecha.getDate()).padStart(2, '0');
        return `${a}-${m}-${d}`;
    }
    return String(fecha).slice(0, 10);
}

export class HorarioVirtualRepository {
    private citaRepo: Repository<CitaModel>;
    private medicoRepo: Repository<MedicoModel>;
    private especialidadRepo: Repository<EspecialidadModel>;

    constructor() {
        this.citaRepo        = AppDataSource.getRepository(CitaModel);
        this.medicoRepo      = AppDataSource.getRepository(MedicoModel);
        this.especialidadRepo = AppDataSource.getRepository(EspecialidadModel);
    }

    // ============================================================
    // Lista los médicos ACTIVOS de una especialidad
    // (oculta los que ya entraron en periodo inhabilitado)
    // ============================================================
    async listarMedicosDeEspecialidad(idEspecialidad: number): Promise<{
        id_medico: number;
        nombres: string;
        apellidos: string;
    }[]> {
        const medicos = await this.medicoRepo.find({
            where: { id_especialidad: idEspecialidad },
            order: { id_medico: 'ASC' },
        });

        const hoy = hoyStr();

        // Filtra los médicos que hoy no deben mostrarse
        return medicos
            .filter(m => {
                const datos: DatosDisponibilidad = {
                    activo: (m as any).estado ? (m as any).estado === 'ACTIVO' : true,
                    fecha_inhabilitacion: fechaLocalStr((m as any).fecha_inhabilitacion),
                    fecha_habilitacion: fechaLocalStr((m as any).fecha_habilitacion),
                };
                // Mostrar si hay al menos disponibilidad próxima (usamos hoy como sonda)
                return this.medicoVisible(datos, hoy);
            })
            .map(m => ({
                id_medico: m.id_medico,
                nombres: m.nombres,
                apellidos: m.apellidos,
            }));
    }

    // Decide si el médico se muestra en la lista (regla de 5 días)
    // Decide si el médico se muestra en la lista (regla unificada)
    private medicoVisible(datos: DatosDisponibilidad, hoy: string): boolean {
        // Misma fuente de verdad que las especialidades.
        return debeMostrarseParaReservar(datos, hoy);
    }

    // Obtiene datos de disponibilidad combinados de médico + su especialidad
    private async obtenerDisponibilidad(idMedico: number): Promise<{
        medico: MedicoModel | null;
        datosMedico: DatosDisponibilidad | null;
        datosEsp: DatosDisponibilidad | null;
    }> {
        const medico = await this.medicoRepo.findOne({ where: { id_medico: idMedico } });
        if (!medico) return { medico: null, datosMedico: null, datosEsp: null };

        const esp = await this.especialidadRepo.findOne({ where: { id_especialidad: medico.id_especialidad } });

        const datosMedico: DatosDisponibilidad = {
            activo: (medico as any).estado ? (medico as any).estado === 'ACTIVO' : true,
            fecha_inhabilitacion: fechaLocalStr((medico as any).fecha_inhabilitacion),
            fecha_habilitacion: fechaLocalStr((medico as any).fecha_habilitacion),
        };

        const datosEsp: DatosDisponibilidad | null = esp ? {
            activo: esp.estado === 'ACTIVA',
            fecha_inhabilitacion: fechaLocalStr((esp as any).fecha_inhabilitacion),
            fecha_habilitacion: fechaLocalStr((esp as any).fecha_habilitacion),
        } : null;

        return { medico, datosMedico, datosEsp };
    }

    // ============================================================
    // Slots de un día PARA UN MÉDICO (respeta disponibilidad)
    // ============================================================
    async obtenerSlots(fecha: string, idMedico: number): Promise<{
        ok: boolean;
        motivo?: string;
        medico?: { id_medico: number; nombres: string; apellidos: string };
        slots: SlotDisponible[];
    }> {
        const validez = fechaEsReservable(fecha);
        if (!validez.ok) {
            return { ok: false, motivo: validez.motivo, slots: [] };
        }

        const { medico, datosMedico, datosEsp } = await this.obtenerDisponibilidad(idMedico);
        if (!medico || !datosMedico) {
            return { ok: false, motivo: 'El médico no existe', slots: [] };
        }

        const hoy = hoyStr();

        // El médico debe estar disponible esa fecha
        if (!estaDisponibleEnFecha(datosMedico, fecha, hoy)) {
            return { ok: false, motivo: 'El médico no atiende en esa fecha', slots: [] };
        }
        // Y su especialidad también
        if (datosEsp && !estaDisponibleEnFecha(datosEsp, fecha, hoy)) {
            return { ok: false, motivo: 'La especialidad no atiende en esa fecha', slots: [] };
        }

        let todosLosSlots = generarSlotsDelDia();

        // Si la fecha es HOY, descartar las horas que ya pasaron
        todosLosSlots = todosLosSlots.filter(hora => !esHoraPasada(fecha, hora));

        const citasOcupadas = await this.citaRepo
            .createQueryBuilder('c')
            .innerJoin('horarios', 'h', 'h.id_horario = c.id_horario')
            .select('h.hora', 'hora')
            .where('h.fecha = :fecha', { fecha })
            .andWhere('h.id_medico = :idMedico', { idMedico })
            .andWhere('c.estado IN (:...estados)', { estados: ['RESERVADA', 'CONFIRMADA', 'RECORDATORIO', 'COMPLETADA'] })
            .getRawMany();

        const horasOcupadas = new Set(citasOcupadas.map(c => String(c.hora)));

        const slots: SlotDisponible[] = todosLosSlots.map(hora => ({
            hora,
            id_medico: medico.id_medico,
            medico_nombres: medico.nombres,
            medico_apellidos: medico.apellidos,
            disponible: !horasOcupadas.has(hora),
        }));

        return {
            ok: true,
            medico: { id_medico: medico.id_medico, nombres: medico.nombres, apellidos: medico.apellidos },
            slots,
        };
    }

    // ============================================================
    // Calendario de un mes PARA UN MÉDICO (respeta disponibilidad)
    // ============================================================
    async obtenerCalendario(anio: number, mes: number, idMedico: number): Promise<{
        ok: boolean;
        dias: { fecha: string; total: number; libres: number; reservable: boolean }[];
    }> {
        const { medico, datosMedico, datosEsp } = await this.obtenerDisponibilidad(idMedico);
        if (!medico || !datosMedico) {
            return { ok: false, dias: [] };
        }

        const hoy = hoyStr();
        const totalSlots = generarSlotsDelDia().length;
        const diasDelMes = new Date(anio, mes, 0).getDate();
        const dias: { fecha: string; total: number; libres: number; reservable: boolean }[] = [];

        for (let d = 1; d <= diasDelMes; d++) {
            const fechaStr = `${anio}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const validez = fechaEsReservable(fechaStr);

            if (!validez.ok) {
                dias.push({ fecha: fechaStr, total: 0, libres: 0, reservable: false });
                continue;
            }

            // Disponibilidad por fechas programadas (médico + especialidad)
            const medOk = estaDisponibleEnFecha(datosMedico, fechaStr, hoy);
            const espOk = datosEsp ? estaDisponibleEnFecha(datosEsp, fechaStr, hoy) : true;

            if (!medOk || !espOk) {
                dias.push({ fecha: fechaStr, total: 0, libres: 0, reservable: false });
                continue;
            }

            const ocupadas = await this.citaRepo
                .createQueryBuilder('c')
                .innerJoin('horarios', 'h', 'h.id_horario = c.id_horario')
                .where('h.fecha = :fecha', { fecha: fechaStr })
                .andWhere('h.id_medico = :idMedico', { idMedico })
                .andWhere('c.estado IN (:...estados)', { estados: ['RESERVADA', 'CONFIRMADA', 'RECORDATORIO', 'COMPLETADA'] })
                .getCount();

            dias.push({ fecha: fechaStr, total: totalSlots, libres: totalSlots - ocupadas, reservable: true });
        }

        return { ok: true, dias };
    }
}