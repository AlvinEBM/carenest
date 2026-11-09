// =================================================================
// Configuración central de rutas de toda la aplicación.
//
// Estructura:
//   /login, /registro              → públicas
//   /paciente/*                    → solo PACIENTE
//   /admision/*                    → solo ADMISION (+ ADMIN supervisión)
//   /admin/*                       → solo ADMIN
//   /medico/*                      → solo MEDICO
// =================================================================
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { ProtectedRoute } from './ProtectedRoute';
import { RUTA_POR_ROL } from './rutasPorRol';
import { useAuth } from '../auth/useAuth';

// Páginas públicas
import { Landing } from '../pages/public/Landing';
import { Login } from '../pages/public/Login';
import { Registro } from '../pages/public/Registro';

// Páginas paciente
import { Dashboard as DashboardPaciente } from '../pages/paciente/Dashboard';
import { Reservar } from '../pages/paciente/Reservar';
import { MisCitas } from '../pages/paciente/MisCitas';
import { Perfil } from '../pages/paciente/Perfil';
import { PagoResultado } from '../pages/paciente/PagoResultado';

// Páginas médico
import { Agenda } from '../pages/medico/Agenda';

// Páginas admisión
import { CitasHoy } from '../pages/admision/CitasHoy';

// Páginas admin
import { Especialidades } from '../pages/admin/Especialidades';
import { Sanciones } from '../pages/admin/Sanciones';
import { Cancelaciones } from '../pages/admin/Cancelaciones';
import { CancelacionMasiva } from '../pages/admin/CancelacionMasiva';
import { CuentasAdmision } from '../pages/admin/CuentasAdmision';
import { Pagos } from '../pages/admin/Pagos';
import { CorreosNotificacion } from '../pages/admin/CorreosNotificacion';
import { Reportes } from '../pages/admin/Reportes';


/**
 * Componente raíz que decide a dónde mandar al usuario cuando
 * entra a "/" según si está logueado y qué rol tiene.
 */
const RedireccionRaiz = () => {
    const { isAuthenticated, user, cargando } = useAuth();
    if (cargando) {
        return null;
    }
    // Si NO está logueado, mostrar la landing pública (no redirigir al login)
    if (!isAuthenticated || !user) {
        return <Landing />;
    }
    // Si está logueado, llevarlo a su panel según el rol
    return <Navigate to={RUTA_POR_ROL[user.rol]} replace />;
};

export const AppRouter = () => {
    return (
        <BrowserRouter>
            <Routes>
                {/* Raíz: redirige según contexto */}
                <Route path="/" element={<RedireccionRaiz />} />

                {/* ============== PÚBLICAS ============== */}
                <Route path="/login"    element={<Login />} />
                <Route path="/registro" element={<Registro />} />

                {/* ============== PACIENTE ============== */}
                <Route
                    path="/paciente/inicio"
                    element={
                        <ProtectedRoute roles={['PACIENTE']}>
                            <DashboardPaciente />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/paciente/reservar"
                    element={
                        <ProtectedRoute roles={['PACIENTE']}>
                            <Reservar />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/paciente/mis-citas"
                    element={
                        <ProtectedRoute roles={['PACIENTE']}>
                            <MisCitas />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/paciente/perfil"
                    element={
                        <ProtectedRoute roles={['PACIENTE']}>
                            <Perfil />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/paciente/pago/resultado"
                    element={
                        <ProtectedRoute roles={['PACIENTE']}>
                            <PagoResultado />
                        </ProtectedRoute>
                    }
                />

                {/* ============== MÉDICO ============== */}
                <Route
                    path="/medico/agenda"
                    element={
                        <ProtectedRoute roles={['MEDICO']}>
                            <Agenda />
                        </ProtectedRoute>
                    }
                />

                {/* ============== ADMISIÓN ============== */}
                <Route
                    path="/admision/citas-hoy"
                    element={
                        <ProtectedRoute roles={['ADMISION', 'ADMIN']}>
                            <CitasHoy />
                        </ProtectedRoute>
                    }
                />

                {/* ============== ADMIN ============== */}
                <Route
                    path="/admin/especialidades"
                    element={
                        <ProtectedRoute roles={['ADMIN']}>
                            <Especialidades />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/admin/sanciones"
                    element={
                        <ProtectedRoute roles={['ADMIN']}>
                            <Sanciones />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/admin/cancelaciones"
                    element={
                        <ProtectedRoute roles={['ADMIN']}>
                            <Cancelaciones />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/admin/cancelacion"
                    element={
                        <ProtectedRoute roles={['ADMIN']}>
                            <CancelacionMasiva />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/admin/cuentas-admision"
                    element={
                        <ProtectedRoute roles={['ADMIN']}>
                            <CuentasAdmision />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/admin/correos"
                    element={
                        <ProtectedRoute roles={['ADMIN']}>
                            <CorreosNotificacion />
                        </ProtectedRoute>
                    }
                    
                />
                <Route
                    path="/admin/reportes"
                    element={
                        <ProtectedRoute roles={['ADMIN']}>
                            <Reportes />
                        </ProtectedRoute>
                    }
                />
               <Route
                    path="/admin/pagos"
                    element={
                        <ProtectedRoute roles={['ADMIN']}>
                            <Pagos />
                        </ProtectedRoute>
                    }
                />

                {/* Catch-all: cualquier ruta no definida vuelve a raíz */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
};