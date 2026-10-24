// =================================================================
// Sidebar de navegación del panel ADMIN.
// =================================================================
import { NavLink } from 'react-router-dom';

const OPCIONES = [
    { to: '/admin/especialidades',   icono: '📋', label: 'Especialidades' },
    { to: '/admin/sanciones',        icono: '⚖️', label: 'Sanciones' },
    { to: '/admin/cancelaciones',    icono: '🚫', label: 'Cancelaciones' },
    { to: '/admin/cancelacion',      icono: '✕',  label: 'Cancelación masiva' },
    { to: '/admin/cuentas-admision', icono: '👥', label: 'Cuentas Admisión' },
    { to: '/admin/correos',          icono: '📧', label: 'Correos' },
    { to: '/admin/reportes',         icono: '📊', label: 'Reportes' },
];

export const Sidebar = () => {
    return (
        <aside className="w-60 bg-white border-r border-gray-100 min-h-[calc(100vh-60px)] p-4">
            <p className="text-[10px] font-bold text-mute-soft tracking-widest mb-3 px-2">
                GESTIÓN DEL SISTEMA
            </p>
            <nav className="space-y-1">
                {OPCIONES.map(op => (
                    <NavLink
                        key={op.to}
                        to={op.to}
                        className={({ isActive }) => `
                            flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-semibold transition-colors
                            ${isActive
                                ? 'bg-sky-soft text-sky-deep border-l-[3px] border-sky-main'
                                : 'text-mute hover:bg-smoke hover:text-ink-soft'}
                        `}
                    >
                        <span>{op.icono}</span>
                        <span>{op.label}</span>
                    </NavLink>
                ))}
            </nav>
        </aside>
    );
};