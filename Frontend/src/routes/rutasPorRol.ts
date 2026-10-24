// =================================================================
// Página de inicio de cada rol (fuente ÚNICA).
// Antes estaba repetida en Login, AppRouter y ProtectedRoute, y el
// rol MEDICO redirigía a /login (no tenía pantalla propia).
// =================================================================
import { Rol } from '../types';

export const RUTA_POR_ROL: Record<Rol, string> = {
    PACIENTE: '/paciente/inicio',
    ADMISION: '/admision/citas-hoy',
    ADMIN:    '/admin/especialidades',
    MEDICO:   '/medico/agenda',
};
