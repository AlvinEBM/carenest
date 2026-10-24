// =================================================================
// Endpoints del módulo Pagos (Mercado Pago Checkout Pro)
// =================================================================
import { apiClient } from './axios';
import { ResultadoVerificacion } from '../types';

export const pagosApi = {
    // GET /pagos/estado → ¿está configurado Mercado Pago en el backend?
    estado: async (): Promise<{ habilitado: boolean }> => {
        const response = await apiClient.get('/pagos/estado');
        return response.data;
    },

    // POST /pagos/preferencia → devuelve la URL del checkout
    crearPreferencia: async (idCita: number): Promise<{ ok: boolean; id_pago: number; url_pago: string; monto: number; mensaje?: string }> => {
        const response = await apiClient.post('/pagos/preferencia', { id_cita: idCita });
        return response.data;
    },

    // POST /pagos/:id/verificar → el backend consulta a Mercado Pago
    verificar: async (idPago: number): Promise<ResultadoVerificacion> => {
        const response = await apiClient.post(`/pagos/${idPago}/verificar`);
        return response.data;
    },
};
