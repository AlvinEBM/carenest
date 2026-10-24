import { apiClient } from './axios';
import { Remitente } from '../types';

export const correosApi = {
    listarRemitentes: async (): Promise<Remitente[]> => {
        const res = await apiClient.get('/notificaciones/remitentes');
        return res.data.remitentes ?? [];
    },

    crearRemitente: async (data: {
        correo: string;
        app_password: string;
        nombre_remitente?: string;
        host?: string;
        puerto?: number;
        activo?: boolean;
        prioridad?: number;
    }): Promise<{ ok: boolean; mensaje: string }> => {
        const res = await apiClient.post('/notificaciones/remitentes', data);
        return res.data;
    },

    actualizarRemitente: async (id: number, data: {
        correo: string;
        app_password?: string;
        nombre_remitente?: string;
        host?: string;
        puerto?: number;
        activo?: boolean;
        prioridad?: number;
    }): Promise<{ ok: boolean; mensaje: string }> => {
        const res = await apiClient.put(`/notificaciones/remitentes/${id}`, data);
        return res.data;
    },

    eliminarRemitente: async (id: number): Promise<{ ok: boolean; mensaje: string }> => {
        const res = await apiClient.delete(`/notificaciones/remitentes/${id}`);
        return res.data;
    },

    enviarPendientes: async (): Promise<{
        ok: boolean;
        mensaje: string;
        resultado: { enviados: number; fallidos: number; sinCorreo: number; remitentesActivos: number };
    }> => {
        const res = await apiClient.post('/notificaciones/enviar-correos');
        return res.data;
    },

    contarPendientes: async (): Promise<number> => {
        const res = await apiClient.get('/notificaciones/correos-pendientes');
        return res.data.pendientes ?? 0;
    },
};