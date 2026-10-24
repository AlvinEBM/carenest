// =================================================================
// Endpoints del módulo Administración (rol ADMIN)
// =================================================================
import { apiClient } from './axios';
import { Especialidad, Medico, UsuarioAdmision, Sanciones, ReporteCita, ReporteTotales } from '../types';

export const adminApi = {
    // ----- Especialidades -----
    listarEspecialidades: async (): Promise<Especialidad[]> => {
        const response = await apiClient.get('/admin/especialidades');
        return response.data.especialidades ?? [];
    },

    crearEspecialidad: async (data: { nombre: string; descripcion: string; requiere_datos_menor?: boolean; precio?: number }): Promise<{ ok: boolean; mensaje: string }> => {
        const response = await apiClient.post('/admin/especialidad', data);
        return response.data;
    },

    inhabilitarEspecialidad: async (id_especialidad: number): Promise<{ ok: boolean; mensaje: string }> => {
        const response = await apiClient.put('/admin/especialidad/inhabilitar', { id_especialidad });
        return response.data;
    },

    // ----- Médicos -----
    listarMedicos: async (): Promise<Medico[]> => {
        const response = await apiClient.get('/admin/medicos');
        return response.data.medicos ?? [];
    },

    reporteCitas: async (filtros: {
        desde?: string;
        hasta?: string;
        id_especialidad?: number;
        id_medico?: number;
        estado?: string;
    }): Promise<{ citas: ReporteCita[]; totales: ReporteTotales }> => {
        const params = new URLSearchParams();
        if (filtros.desde)           params.append('desde', filtros.desde);
        if (filtros.hasta)           params.append('hasta', filtros.hasta);
        if (filtros.id_especialidad) params.append('id_especialidad', String(filtros.id_especialidad));
        if (filtros.id_medico)       params.append('id_medico', String(filtros.id_medico));
        if (filtros.estado)          params.append('estado', filtros.estado);

        const response = await apiClient.get(`/admin/reportes/citas?${params.toString()}`);
        return {
            citas: response.data.citas ?? [],
            totales: response.data.totales ?? { total: 0, completadas: 0, canceladas: 0, faltas: 0, reservadas: 0 },
        };
    },
    
    // Crea el médico CON su cuenta de acceso (rol MEDICO)
    crearMedico: async (data: {
        nombres: string; apellidos: string; id_especialidad: number;
        correo: string; contrasena: string; dni: string; colegiatura: string; telefono?: string;
    }): Promise<{ ok: boolean; mensaje: string }> => {
        const response = await apiClient.post('/admin/medico', data);
        return response.data;
    },

    // Da acceso a un médico registrado sin cuenta
    crearCuentaMedico: async (idMedico: number, data: { correo: string; contrasena: string; dni: string }): Promise<{ ok: boolean; mensaje: string }> => {
        const response = await apiClient.post(`/admin/medico/${idMedico}/cuenta`, data);
        return response.data;
    },

    // Precio de la consulta por especialidad
    actualizarPrecio: async (idEspecialidad: number, precio: number): Promise<{ ok: boolean; mensaje: string }> => {
        const response = await apiClient.put(`/admin/especialidad/${idEspecialidad}/precio`, { precio });
        return response.data;
    },

    // ----- Fase 3: programar disponibilidad -----
    programarEspecialidad: async (data: { id: number; accion: 'INHABILITAR' | 'HABILITAR'; fecha: string }): Promise<{ ok: boolean; mensaje: string }> => {
        const response = await apiClient.post('/admin/programar-especialidad', data);
        return response.data;
    },

    programarMedico: async (data: { id: number; accion: 'INHABILITAR' | 'HABILITAR'; fecha: string }): Promise<{ ok: boolean; mensaje: string }> => {
        const response = await apiClient.post('/admin/programar-medico', data);
        return response.data;
    },

    cancelarProgramacionEspecialidad: async (id: number, cual: 'INHABILITAR' | 'HABILITAR'): Promise<{ ok: boolean; mensaje: string }> => {
        const response = await apiClient.post('/admin/cancelar-programacion-especialidad', { id, cual });
        return response.data;
    },

    cancelarProgramacionMedico: async (id: number, cual: 'INHABILITAR' | 'HABILITAR'): Promise<{ ok: boolean; mensaje: string }> => {
        const response = await apiClient.post('/admin/cancelar-programacion-medico', { id, cual });
        return response.data;
    },

    // ----- Sanciones -----
    obtenerSanciones: async (): Promise<Sanciones> => {
        const response = await apiClient.get('/admin/sanciones');
        return response.data.sanciones ?? response.data ?? { limite_inasistencias: 3, dias_suspension: 15 };
    },

    configurarSanciones: async (data: Sanciones): Promise<{ ok: boolean; mensaje: string }> => {
        const response = await apiClient.put('/admin/sanciones', data);
        return response.data;
    },

    // ----- Cancelación masiva -----
    cancelacionMasiva: async (data: { fecha: string; id_especialidad: number; motivo: string }): Promise<{ ok: boolean; mensaje: string; afectadas?: number }> => {
        const response = await apiClient.post('/admin/cancelacion-masiva', data);
        return response.data;
    },

    // ----- Cuentas de admisión -----
    listarUsuariosAdmision: async (): Promise<UsuarioAdmision[]> => {
        const response = await apiClient.get('/admin/usuarios-admision');
        return response.data.usuarios ?? [];
    },

    crearUsuarioAdmision: async (data: {
        correo: string; contrasena: string; nombres: string; apellidos: string; dni: string; telefono: string;
    }): Promise<{ ok: boolean; mensaje: string }> => {
        const response = await apiClient.post('/admin/usuario-admision', data);
        return response.data;
    },

    // ----- Fase 3: disparar la revisión del cron manualmente (para demo) -----
    ejecutarRevision: async (): Promise<{ ok: boolean; citasCanceladas: number; avisosEnviados: number }> => {
        const response = await apiClient.post('/admin/ejecutar-revision');
        return response.data;
    },
    obtenerCancelaciones: async (): Promise<{ limite_cancelaciones: number; dias_suspension_cancelaciones: number }> => {
        const response = await apiClient.get('/admin/cancelaciones-config');
        return response.data.configuracion;
    },

    configurarCancelaciones: async (data: { limite_cancelaciones: number; dias_suspension_cancelaciones: number }): Promise<{ ok: boolean; mensaje: string }> => {
        const response = await apiClient.put('/admin/cancelaciones-config', data);
        return response.data;
    },

};