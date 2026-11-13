// =================================================================
// Página de Registro de paciente nuevo.
// Conectada al endpoint POST /auth/register del backend.
// El backend fuerza el rol PACIENTE (UsuarioFactory.crearPaciente).
//
// Validación en dos niveles:
//   1. Mientras escribe: los campos bloquean caracteres no permitidos
//      (letras en DNI/teléfono, números en nombres, espacios en el correo).
//   2. Al enviar: se valida cada campo y el error aparece DEBAJO de él.
//      Si el backend rechaza algo (400), su mensaje también se muestra
//      en el campo correspondiente.
// =================================================================
import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

import { authApi, RegistroPayload } from '../../api/authApi';
import { Boton } from '../../components/common/Boton';
import { Input } from '../../components/common/Input';
import {
    CONTRASENA_MAX,
    CONTRASENA_MIN,
    filtrarCorreo,
    filtrarDigitos,
    filtrarLetras,
    requisitosContrasena,
    validarContrasena,
    validarCorreo,
    validarDni,
    validarNombre,
    validarTelefono,
} from '../../utils/validaciones';

type Campo = keyof RegistroPayload | 'confirmar';
type Errores = Partial<Record<Campo, string>>;

const validarFormulario = (form: RegistroPayload, confirmar: string): Errores => {
    const e: Errores = {};
    const poner = (campo: Campo, msg: string | null) => { if (msg) e[campo] = msg; };

    poner('nombres', validarNombre(form.nombres, 'nombres'));
    poner('apellidos', validarNombre(form.apellidos, 'apellidos'));
    poner('dni', validarDni(form.dni));
    poner('telefono', validarTelefono(form.telefono));
    poner('correo', validarCorreo(form.correo));
    poner('contrasena', validarContrasena(form.contrasena));
    if (!confirmar) e.confirmar = 'Confirma tu contraseña';
    else if (confirmar !== form.contrasena) e.confirmar = 'Las contraseñas no coinciden';
    if (form.fecha_nacimiento && form.fecha_nacimiento > new Date().toISOString().slice(0, 10)) {
        e.fecha_nacimiento = 'La fecha de nacimiento no puede ser futura';
    }
    return e;
};

export const Registro = () => {
    const navigate = useNavigate();

    const [form, setForm] = useState<RegistroPayload>({
        correo: '',
        contrasena: '',
        dni: '',
        nombres: '',
        apellidos: '',
        telefono: '',
        genero: 'Masculino',
        fecha_nacimiento: '',
        direccion: '',
    });

    const [confirmar, setConfirmar] = useState('');
    const [errores, setErrores]     = useState<Errores>({});
    const [error, setError]         = useState<string | null>(null);
    const [cargando, setCargando]   = useState(false);
    const [exito, setExito]         = useState(false);

    const actualizar = (campo: keyof RegistroPayload, valor: string) => {
        setForm((f) => ({ ...f, [campo]: valor }));
        // Al corregir un campo se borra su mensaje de error
        if (errores[campo]) setErrores((e) => ({ ...e, [campo]: undefined }));
    };

    // Valida un campo al salir de él (onBlur), para avisar antes de enviar
    const validarAlSalir = (campo: Campo) => {
        const todos = validarFormulario(form, confirmar);
        setErrores((e) => ({ ...e, [campo]: todos[campo] }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);

        const encontrados = validarFormulario(form, confirmar);
        setErrores(encontrados);
        if (Object.keys(encontrados).length > 0) {
            setError('Revisa los campos marcados en rojo');
            return;
        }

        setCargando(true);
        try {
            await authApi.register({
                ...form,
                nombres: form.nombres.trim(),
                apellidos: form.apellidos.trim(),
                correo: form.correo.trim().toLowerCase(),
                direccion: form.direccion?.trim(),
            });
            setExito(true);

            // Después de 2 segundos, redirige al login
            setTimeout(() => navigate('/login'), 2000);
        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                const data = err.response?.data;
                // 400: el backend devuelve un error por campo → se muestran en el formulario
                if (Array.isArray(data?.detalle)) {
                    const delBackend: Errores = {};
                    for (const d of data.detalle as { campo: Campo; errores: string[] }[]) {
                        delBackend[d.campo] = d.errores?.[0];
                    }
                    setErrores(delBackend);
                    setError('Revisa los campos marcados en rojo');
                } else {
                    // 409: correo o DNI ya registrado, u otro mensaje del servidor
                    setError(typeof data?.mensaje === 'string' ? data.mensaje : 'Error al registrar. Verifica tus datos.');
                }
            } else {
                setError('Error inesperado. Intenta de nuevo.');
            }
        } finally {
            setCargando(false);
        }
    };

    // ===== Pantalla de éxito =====
    if (exito) {
        return (
            <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-soft via-blue-50 to-smoke">
                <div className="bg-white rounded-3xl shadow-card p-12 max-w-md text-center">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-success flex items-center justify-center">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                            <path d="M5 12 L10 17 L19 8"
                                  stroke="white" strokeWidth="3"
                                  strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-extrabold text-blue-deep mb-2">¡Cuenta creada!</h1>
                    <p className="text-sm text-mute">Te estamos redirigiendo al login...</p>
                </div>
            </main>
        );
    }

    const requisitos = requisitosContrasena(form.contrasena);

    // ===== Formulario =====
    return (
        <main className="min-h-screen flex items-center justify-center py-10 bg-gradient-to-br from-sky-soft via-blue-50 to-smoke">
            <div className="w-full max-w-2xl bg-white rounded-3xl shadow-card p-10">
                {/* Header */}
                <div className="text-center mb-6">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-sky-main to-sky-deep flex items-center justify-center">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                            <path d="M5 12 L10 17 L19 8" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-extrabold text-blue-deep">Crear cuenta</h1>
                    <p className="text-xs text-mute mt-1">Regístrate como paciente para agendar tus citas</p>
                </div>

                <form onSubmit={handleSubmit} noValidate className="space-y-4">
                    {/* Datos personales */}
                    <div>
                        <h2 className="text-xs font-bold text-sky-deep uppercase tracking-widest mb-3">Datos personales</h2>
                        <div className="grid grid-cols-2 gap-3">
                            <Input
                                label="Nombres"
                                value={form.nombres}
                                onChange={(e) => actualizar('nombres', filtrarLetras(e.target.value))}
                                onBlur={() => validarAlSalir('nombres')}
                                error={errores.nombres}
                                placeholder="Juan Carlos"
                                maxLength={100}
                                autoComplete="given-name"
                                required
                            />
                            <Input
                                label="Apellidos"
                                value={form.apellidos}
                                onChange={(e) => actualizar('apellidos', filtrarLetras(e.target.value))}
                                onBlur={() => validarAlSalir('apellidos')}
                                error={errores.apellidos}
                                placeholder="Pérez García"
                                maxLength={100}
                                autoComplete="family-name"
                                required
                            />
                            <Input
                                label="DNI"
                                value={form.dni}
                                onChange={(e) => actualizar('dni', filtrarDigitos(e.target.value, 8))}
                                onBlur={() => validarAlSalir('dni')}
                                error={errores.dni}
                                placeholder="76543210"
                                inputMode="numeric"
                                maxLength={8}
                                required
                            />
                            <Input
                                label="Teléfono (celular)"
                                value={form.telefono}
                                onChange={(e) => actualizar('telefono', filtrarDigitos(e.target.value, 9))}
                                onBlur={() => validarAlSalir('telefono')}
                                error={errores.telefono}
                                placeholder="987654321"
                                inputMode="numeric"
                                maxLength={9}
                                autoComplete="tel-national"
                                required
                            />
                            {/* Género */}
                            <div>
                                <label htmlFor="registro-genero" className="block text-xs font-semibold text-ink-soft mb-2">Género</label>
                                <select
                                    id="registro-genero"
                                    value={form.genero}
                                    onChange={(e) => actualizar('genero', e.target.value as 'Masculino' | 'Femenino' | 'Otros')}
                                    className="w-full px-4 py-3 text-sm bg-white rounded-lg border border-gray-200 focus:border-sky-main outline-none"
                                >
                                    <option value="Masculino">Masculino</option>
                                    <option value="Femenino">Femenino</option>
                                    <option value="Otros">Otros</option>
                                </select>
                            </div>

                            <Input
                                label="Fecha de nacimiento"
                                type="date"
                                value={form.fecha_nacimiento}
                                max={new Date().toISOString().slice(0, 10)}
                                onChange={(e) => actualizar('fecha_nacimiento', e.target.value)}
                                error={errores.fecha_nacimiento}
                            />
                        </div>

                        <div className="mt-3">
                            <Input
                                label="Dirección (opcional)"
                                value={form.direccion}
                                onChange={(e) => actualizar('direccion', e.target.value)}
                                error={errores.direccion}
                                placeholder="Av. Los Olivos 123, Lima"
                                maxLength={200}
                            />
                        </div>
                    </div>

                    <div className="h-px bg-gray-100 my-4" />

                    {/* Credenciales */}
                    <div>
                        <h2 className="text-xs font-bold text-sky-deep uppercase tracking-widest mb-3">Credenciales de acceso</h2>
                        <div className="space-y-3">
                            <Input
                                label="Correo electrónico"
                                type="email"
                                value={form.correo}
                                onChange={(e) => actualizar('correo', filtrarCorreo(e.target.value))}
                                onBlur={() => validarAlSalir('correo')}
                                error={errores.correo}
                                placeholder="juan@correo.com"
                                maxLength={100}
                                autoComplete="email"
                                required
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <Input
                                    label="Contraseña"
                                    type="password"
                                    value={form.contrasena}
                                    onChange={(e) => actualizar('contrasena', e.target.value)}
                                    onBlur={() => validarAlSalir('contrasena')}
                                    error={errores.contrasena}
                                    placeholder={`Mínimo ${CONTRASENA_MIN} caracteres`}
                                    maxLength={CONTRASENA_MAX}
                                    autoComplete="new-password"
                                    required
                                />
                                <Input
                                    label="Confirmar contraseña"
                                    type="password"
                                    value={confirmar}
                                    onChange={(e) => {
                                        setConfirmar(e.target.value);
                                        if (errores.confirmar) setErrores((er) => ({ ...er, confirmar: undefined }));
                                    }}
                                    onBlur={() => validarAlSalir('confirmar')}
                                    error={errores.confirmar}
                                    placeholder="Repite tu contraseña"
                                    maxLength={CONTRASENA_MAX}
                                    autoComplete="new-password"
                                    required
                                />
                            </div>

                            {/* Requisitos de la contraseña (se marcan mientras escribe) */}
                            <ul className="grid grid-cols-3 gap-2" aria-label="Requisitos de la contraseña">
                                {requisitos.map((r) => (
                                    <li
                                        key={r.texto}
                                        className={`text-xs font-medium flex items-center gap-1.5 ${r.ok ? 'text-success' : 'text-mute'}`}
                                    >
                                        <span aria-hidden="true">{r.ok ? '✓' : '○'}</span>
                                        {r.texto}
                                        <span className="sr-only">{r.ok ? ' (cumplido)' : ' (pendiente)'}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Error general */}
                    {error && (
                        <div className="p-3 bg-danger-soft border border-danger-border rounded-lg" role="alert">
                            <p className="text-xs text-danger font-semibold flex items-center gap-2">
                                <span aria-hidden="true">⚠</span> {error}
                            </p>
                        </div>
                    )}

                    {/* Botones */}
                    <div className="flex gap-3 pt-2">
                        <Boton
                            type="button"
                            variante="secondary"
                            onClick={() => navigate('/login')}
                            fullWidth
                        >
                            Cancelar
                        </Boton>
                        <Boton
                            type="submit"
                            disabled={cargando}
                            fullWidth
                        >
                            {cargando ? 'Creando cuenta...' : 'Crear cuenta →'}
                        </Boton>
                    </div>
                </form>

                {/* Footer */}
                <div className="text-center mt-6 pt-6 border-t border-gray-100">
                    <p className="text-sm text-mute">
                        ¿Ya tienes cuenta?{' '}
                        <Link to="/login" className="text-sky-main hover:text-sky-deep font-bold">
                            Iniciar sesión
                        </Link>
                    </p>
                </div>
            </div>
        </main>
    );
};
