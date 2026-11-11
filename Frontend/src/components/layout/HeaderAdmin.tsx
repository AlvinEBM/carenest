// =================================================================
// Header del panel administrativo (oscuro).
// Reutilizable para ADMIN, ADMISION y MEDICO (cambia el badge según rol).
// =================================================================
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { obtenerIniciales } from '../../utils/formatters';

export const HeaderAdmin = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const cerrarSesion = async () => {
        await logout();
        navigate('/login', { replace: true });
    };

    const BADGES: Record<string, string> = {
        ADMIN: 'ADMINISTRACIÓN',
        ADMISION: 'ADMISIÓN',
        MEDICO: 'MÉDICO',
    };
    const badge = BADGES[user?.rol ?? ''] ?? 'ADMISIÓN';

    return (
        <header className="sticky top-0 z-40 bg-blue-deep">
            <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
                {/* Logo */}
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M4 21V8l8-5 8 5v13" stroke="#1E3A8A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M9 21v-4h6v4" stroke="#1E3A8A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M12 7v4M10 9h4" stroke="#1E3A8A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <span className="text-sm font-extrabold text-white leading-tight">CareNest</span>
                    <span className="px-3 py-1 bg-sky-main rounded-full text-[10px] font-bold text-white tracking-wider">
                        {badge}
                    </span>
                </div>

                {/* Usuario */}
                <div className="flex items-center gap-4">
                    <div className="text-right hidden md:block">
                        <p className="text-sm font-bold text-white">{user?.nombres} {user?.apellidos}</p>
                        <p className="text-[11px] text-sky-soft">{user?.correo}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-sky-main flex items-center justify-center text-white text-sm font-bold">
                        {user ? obtenerIniciales(user.nombres, user.apellidos) : '?'}
                    </div>
                    <button
                        type="button"
                        onClick={cerrarSesion}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm font-semibold transition-colors"
                    >
                        Cerrar sesión
                    </button>
                </div>
            </div>
        </header>
    );
};