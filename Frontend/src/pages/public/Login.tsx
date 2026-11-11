// =================================================================
// Página de Login.
// Conectada al endpoint POST /auth/login del backend.
// Al loguearse exitosamente, redirige según el rol del usuario.
// =================================================================
import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

import { useAuth } from '../../auth/useAuth';
import { authApi } from '../../api/authApi';
import { Boton } from '../../components/common/Boton';
import { Input } from '../../components/common/Input';
import { RUTA_POR_ROL } from '../../routes/rutasPorRol';

export const Login = () => {
    const navigate = useNavigate();
    const { login } = useAuth();

    const [correo, setCorreo]         = useState('');
    const [contrasena, setContrasena] = useState('');
    const [error, setError]           = useState<string | null>(null);
    const [cargando, setCargando]     = useState(false);
    const [verPass, setVerPass]       = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setCargando(true);

        try {
            const data = await authApi.login({ correo, contrasena });
            login(data);
            navigate(RUTA_POR_ROL[data.rol], { replace: true });
        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                const msg = err.response?.data?.mensaje || 'Credenciales incorrectas';
                setError(msg);
            } else {
                setError('Error inesperado. Intenta de nuevo.');
            }
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-sky-soft via-blue-50 to-smoke">
            <div className="absolute top-20 left-20 w-72 h-72 rounded-full bg-sky-main opacity-[0.05] blur-3xl" />
            <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-blue-deep opacity-[0.04] blur-3xl" />
            <div className="absolute top-1/2 left-10 w-40 h-40 rounded-full bg-sky-main opacity-[0.06] blur-2xl" />

            <div className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-card p-10">
                {/* Logo */}
                <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-sky-main to-sky-deep flex items-center justify-center shadow-cta">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                            <path d="M4 21V8l8-5 8 5v13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M9 21v-4h6v4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M12 7v4M10 9h4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                </div>

                {/* Marca */}
                <div className="text-center mb-2">
                    <h1 className="text-2xl font-extrabold text-blue-deep leading-tight">Policlínico<br/>CareNest</h1>
                    <p className="text-xs text-mute mt-2">Tu salud, nuestra prioridad</p>
                </div>

                <div className="h-px bg-gray-100 my-6" />

                <div className="text-center mb-6">
                    <h2 className="text-xl font-bold text-ink">Bienvenido de vuelta</h2>
                    <p className="text-xs text-mute mt-1">
                        Ingresa tus credenciales para continuar
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="Correo electrónico"
                        type="email"
                        value={correo}
                        onChange={(e) => setCorreo(e.target.value)}
                        placeholder="correo@ejemplo.com"
                        required
                        autoComplete="email"
                    />

                    <div className="relative">
                        <Input
                            label="Contraseña"
                            type={verPass ? 'text' : 'password'}
                            value={contrasena}
                            onChange={(e) => setContrasena(e.target.value)}
                            placeholder="••••••••"
                            required
                            autoComplete="current-password"
                        />
                        <button
                            type="button"
                            onClick={() => setVerPass(!verPass)}
                            className="absolute right-3 top-[38px] text-mute hover:text-sky-main text-sm"
                            tabIndex={-1}
                        >
                            {verPass ? '🙈' : '👁'}
                        </button>
                    </div>

                    {error && (
                        <div className="p-3 bg-danger-soft border border-danger-border rounded-lg">
                            <p className="text-xs text-danger font-semibold flex items-center gap-2">
                                <span>⚠</span> {error}
                            </p>
                        </div>
                    )}

                    <div className="flex justify-end">
                        <button
                            type="button"
                            className="text-xs text-sky-main hover:text-sky-deep font-semibold"
                            onClick={() => alert('Funcionalidad próximamente disponible')}
                        >
                            ¿Olvidaste tu contraseña?
                        </button>
                    </div>

                    <Boton
                        type="submit"
                        fullWidth
                        tamano="lg"
                        disabled={cargando}
                    >
                        {cargando ? 'Ingresando...' : 'Iniciar sesión →'}
                    </Boton>
                </form>

                <div className="text-center mt-6 pt-6 border-t border-gray-100">
                    <p className="text-sm text-mute">
                        ¿Eres nuevo aquí?{' '}
                        <Link
                            to="/registro"
                            className="text-sky-main hover:text-sky-deep font-bold"
                        >
                            Crear cuenta
                        </Link>
                    </p>
                </div>
            </div>

            <p className="absolute bottom-6 text-xs text-mute z-10">
                © 2026 Policlínico CareNest
            </p>
        </div>
    );
};