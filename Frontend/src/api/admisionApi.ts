// =================================================================
// Endpoints del módulo Asistencias (rol ADMISION + ADMIN)
// =================================================================
import { apiClient } from './axios';
import { CitaDelDia } from '../types';

export const admisionApi = {
    // GET /admision/citas-hoy?fecha=YYYY-MM-DD
    citasDelDia: async (fecha?: string): Promise<{ ok: boolean; fecha: string; total: number; citas: CitaDelDia[] }> => {
        const response = await apiClient.get('/admision/citas-hoy', {
            params: fecha ? { fecha } : {},
        });
        return response.data;
    },

    // PUT /admision/cita/:id/asistio
    marcarAsistio: async (idCita: number): Promise<{ ok: boolean; mensaje: string }> => {
        const response = await apiClient.put(`/admision/cita/${idCita}/asistio`);
        return response.data;
    },

    // PUT /admision/cita/:id/falta
    marcarFalta: async (idCita: number): Promise<{ ok: boolean; mensaje: string }> => {
        const response = await apiClient.put(`/admision/cita/${idCita}/falta`);
        return response.data;
    },
};