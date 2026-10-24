// =================================================================
// Endpoints del módulo Citas
// =================================================================
import { apiClient } from './axios';
import {
    Especialidad,
    Horario,
    Cita,
    CitaConDetalles,
    ContadoresPaciente,
    DiaCalendario,
    Dependiente,
} from '../types';

import { MedicoReserva } from '../types';

export interface ReservarPayload {
    fecha: string;
    hora: string;
    id_especialidad: number;
    id_medico: number;
    motivo: string;
    notas?: string;
    id_dependiente?: number;
}

export const citasApi = {
    listarEspecialidades: async (): Promise<Especialidad[]> => {
        const response = await apiClient.get('/citas/especialidades');
        return response.data.especialidades ?? response.data ?? [];
    },
    listarMedicos: async (idEspecialidad: number): Promise<MedicoReserva[]> => {
            const response = await apiClient.get('/citas/medicos', {
                params: { especialidad: idEspecialidad },
            });
            return response.data.medicos ?? [];
    },
    // Horarios (slots) de un día concreto
    listarHorarios: async (fecha: string, idMedico: number): Promise<Horario[]> => {
            const response = await apiClient.get('/citas/horarios', {
                params: { fecha, medico: idMedico },
            });
            return response.data.horarios ?? [];
    },

    // Calendario de un mes (para pintar disponibilidad por día)
    obtenerCalendario: async (anio: number, mes: number, idMedico: number): Promise<DiaCalendario[]> => {
            const response = await apiClient.get('/citas/calendario', {
                params: { anio, mes, medico: idMedico },
            });
            return response.data.dias ?? [];
    },

    reservar: async (data: ReservarPayload): Promise<{ ok: boolean; mensaje: string; cita?: Cita }> => {
        const response = await apiClient.post('/citas/reservar', data);
        return response.data;
    },

    // Cancelar una cita del paciente
    cancelar: async (idCita: number): Promise<{ ok: boolean; mensaje: string }> => {
        const response = await apiClient.put(`/citas/${idCita}/cancelar`);
        return response.data;
    },

    misCitas: async (): Promise<CitaConDetalles[]> => {
        const response = await apiClient.get('/citas/mis-citas');
        return response.data.citas ?? response.data ?? [];
    },

    contadores: async (): Promise<ContadoresPaciente> => {
        const response = await apiClient.get('/citas/contadores');
        return response.data.contadores ?? response.data ?? {
            total: 0, completadas: 0, proximas: 0, canceladas: 0, faltas: 0,
        };
    },

    // Lista los familiares del paciente (rol FAMILIAR emparejado por id_tutor).
    // Se mapea la respuesta del backend (id_familiar) al tipo Dependiente
    // (id_dependiente) para no tocar el resto del frontend.
    listarDependientes: async (): Promise<Dependiente[]> => {
        const response = await apiClient.get('/usuarios/familiares');
        const familiares = response.data.familiares ?? [];
        return familiares.map((f: any) => ({
            id_dependiente: f.id_familiar,
            nombres: f.nombres,
            apellidos: f.apellidos,
            dni: f.dni,
            fecha_nacimiento: f.fecha_nacimiento,
            parentesco: f.parentesco,
        }));
    },

    crearDependiente: async (data: {
        nombres: string;
        apellidos: string;
        dni: string;
        fecha_nacimiento: string;
        parentesco: string;
    }): Promise<{ ok: boolean; mensaje: string; id_dependiente: number }> => {
        const response = await apiClient.post('/usuarios/familiares', data);
        // El backend devuelve id_familiar; lo exponemos como id_dependiente.
        return {
            ok: response.data.ok,
            mensaje: response.data.mensaje,
            id_dependiente: response.data.id_familiar,
        };
    },
};