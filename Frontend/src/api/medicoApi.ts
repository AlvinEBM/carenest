// =================================================================
// Endpoints del rol MEDICO
// =================================================================
import { apiClient } from './axios';
import { AtencionHistorial, CitaAgenda, PerfilMedico, ResumenAgenda } from '../types';

export const medicoApi = {
    // GET /medico/agenda?fecha=YYYY-MM-DD
    agenda: async (fecha: string): Promise<{ fecha: string; medico: PerfilMedico; resumen: ResumenAgenda; citas: CitaAgenda[] }> => {
        const response = await apiClient.get('/medico/agenda', { params: { fecha } });
        return response.data;
    },

    // PUT /medico/citas/:id/atender
    atender: async (idCita: number, data: { diagnostico: string; indicaciones?: string }): Promise<{ ok: boolean; mensaje: string }> => {
        const response = await apiClient.put(`/medico/citas/${idCita}/atender`, data);
        return response.data;
    },

    // GET /medico/pacientes/:id/historial
    historial: async (idPaciente: number): Promise<{
        paciente: { nombres: string; apellidos: string; dni: string | null; fecha_nacimiento: string | null } | null;
        atenciones: AtencionHistorial[];
    }> => {
        const response = await apiClient.get(`/medico/pacientes/${idPaciente}/historial`);
        return response.data;
    },
};
