// =================================================================
// Contexto global de autenticación.
// Maneja el token, los datos del usuario y las funciones login/logout.
// =================================================================
import { createContext, useState, useEffect, ReactNode } from 'react';
import { LoginResponse, Rol } from '../types';
import { authApi } from '../api/authApi';

interface AuthContextValue {
    token: string | null;
    user: LoginResponse | null;
    isAuthenticated: boolean;
    cargando: boolean;
    login: (data: LoginResponse) => void;
    logout: () => Promise<void>;
    tieneRol: (...roles: Rol[]) => boolean;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
    const [token, setToken] = useState<string | null>(null);
    const [user, setUser]   = useState<LoginResponse | null>(null);
    const [cargando, setCargando] = useState(true);

    // Cargar de localStorage al iniciar
    // Cargar de localStorage al iniciar
    useEffect(() => {
        const storedToken = localStorage.getItem('carenest_token');
        const storedUser  = localStorage.getItem('carenest_user');
        if (storedToken && storedUser) {
            setToken(storedToken);
            try {
                setUser(JSON.parse(storedUser));
            } catch {
                localStorage.removeItem('carenest_token');
                localStorage.removeItem('carenest_user');
            }
        }
        setCargando(false);
    }, []);

    const login = (data: LoginResponse) => {
        localStorage.setItem('carenest_token', data.token);
        localStorage.setItem('carenest_user', JSON.stringify(data));
        setToken(data.token);
        setUser(data);
    };

    const logout = async () => {
        // Avisar al backend para cerrar la sesión (simetría con login).
        // Si la llamada falla, igual limpiamos localmente para que el
        // usuario nunca quede atrapado en sesión.
        try {
            await authApi.logout();
        } catch {
            // Silencioso: el cierre local se hace de todas formas.
        }

        localStorage.removeItem('carenest_token');
        localStorage.removeItem('carenest_user');
        setToken(null);
        setUser(null);
    };

    const tieneRol = (...roles: Rol[]): boolean => {
        if (!user) return false;
        return roles.includes(user.rol);
    };

    const value: AuthContextValue = {
        token,
        user,
        isAuthenticated: !!token && !!user,
        cargando,
        login,
        logout,
        tieneRol,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};