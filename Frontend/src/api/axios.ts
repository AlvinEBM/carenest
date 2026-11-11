// =================================================================
// Cliente Axios con interceptor de JWT
// Cada petición agrega automáticamente el token al header
// =================================================================
import axios from 'axios';

// El backend está en el mismo equipo que sirve el frontend, puerto 3002.
// Así funciona en la PC (localhost) y en el celular (IP de la PC en la red Wi-Fi).
const API_URL = `http://${window.location.hostname}:3002`;

export const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor: agrega el token JWT a cada request automáticamente
apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('carenest_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Interceptor de respuesta: si el token expira (401), redirige al login
// Interceptor de respuesta: si el token expira (401) en una página
// autenticada, redirige al login. PERO no redirige cuando el error
// viene del propio login/registro: ese error se muestra en la página
// (si recargáramos, el mensaje desaparecería al instante).
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        const url: string = error.config?.url || '';
        const esAuth = url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/logout');

        if (error.response?.status === 401 && !esAuth) {
            localStorage.removeItem('carenest_token');
            localStorage.removeItem('carenest_user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    },
);