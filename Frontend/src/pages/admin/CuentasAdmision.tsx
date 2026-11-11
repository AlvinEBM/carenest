// =================================================================
// Vista ADMIN — Gestión de cuentas de personal de admisión.
// =================================================================
import { useEffect, useState, FormEvent } from 'react';

import { HeaderAdmin } from '../../components/layout/HeaderAdmin';
import { Sidebar } from '../../components/layout/Sidebar';
import { Card } from '../../components/common/Card';
import { Boton } from '../../components/common/Boton';
import { Input } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';

import { adminApi } from '../../api/adminApi';
import { UsuarioAdmision } from '../../types';
import { obtenerIniciales } from '../../utils/formatters';

export const CuentasAdmision = () => {
    const [cuentas, setCuentas]   = useState<UsuarioAdmision[]>([]);
    const [cargando, setCargando] = useState(true);

    const [correo, setCorreo]         = useState('');
    const [contrasena, setContrasena] = useState('');
    const [nombres, setNombres]       = useState('');
    const [apellidos, setApellidos]   = useState('');
    const [dni, setDni]               = useState('');
    const [telefono, setTelefono]     = useState('');
    const [procesando, setProcesando] = useState(false);
    const [msg, setMsg] = useState<{ texto: string; ok: boolean } | null>(null);

    const cargar = async () => {
        setCargando(true);
        try {
            const data = await adminApi.listarUsuariosAdmision();
            setCuentas(data);
        } catch (e) { console.error(e); }
        finally { setCargando(false); }
    };

    useEffect(() => { cargar(); }, []);

    const crear = async (e: FormEvent) => {
        e.preventDefault();
        setMsg(null);
        if (contrasena.length < 6) { setMsg({ texto: 'La contraseña debe tener al menos 6 caracteres', ok: false }); return; }
        if (dni.length !== 8) { setMsg({ texto: 'El DNI debe tener 8 dígitos', ok: false }); return; }

        setProcesando(true);
        try {
            const res = await adminApi.crearUsuarioAdmision({ correo, contrasena, nombres, apellidos, dni, telefono });
            if (res.ok) {
                setMsg({ texto: '✓ Cuenta de admisión creada correctamente', ok: true });
                setCorreo(''); setContrasena(''); setNombres(''); setApellidos(''); setDni(''); setTelefono('');
                await cargar();
            } else {
                setMsg({ texto: res.mensaje, ok: false });
            }
        } catch {
            setMsg({ texto: 'Error al crear la cuenta', ok: false });
        } finally {
            setProcesando(false);
        }
    };

    return (
        <div className="min-h-screen bg-smoke">
            <HeaderAdmin />
            <div className="flex">
                <Sidebar />
                <main className="flex-1 p-8 max-w-4xl">
                    <h1 className="text-3xl font-extrabold text-ink mb-1">Cuentas de admisión</h1>
                    <p className="text-sm text-mute mb-6">Crea y gestiona el personal de ventanilla</p>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Form */}
                        <Card className="p-6">
                            <h2 className="text-lg font-bold text-blue-deep mb-4">Nueva cuenta</h2>
                            <form onSubmit={crear} className="space-y-3">
                                <Input label="Correo" type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="admision2@carenest.pe" required />
                                <Input label="Contraseña" type="password" value={contrasena} onChange={(e) => setContrasena(e.target.value)} placeholder="Mínimo 6 caracteres" required />
                                <div className="grid grid-cols-2 gap-3">
                                    <Input label="Nombres" value={nombres} onChange={(e) => setNombres(e.target.value)} required />
                                    <Input label="Apellidos" value={apellidos} onChange={(e) => setApellidos(e.target.value)} required />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <Input label="DNI" value={dni} onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))} maxLength={8} required />
                                    <Input label="Teléfono" value={telefono} onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ''))} maxLength={9} required />
                                </div>
                                {msg && (
                                    <div className={`p-3 rounded-lg ${msg.ok ? 'bg-success-soft' : 'bg-danger-soft'}`}>
                                        <p className={`text-xs font-semibold ${msg.ok ? 'text-success-deep' : 'text-danger'}`}>{msg.texto}</p>
                                    </div>
                                )}
                                <Boton type="submit" fullWidth disabled={procesando}>
                                    {procesando ? 'Creando...' : 'Crear cuenta'}
                                </Boton>
                            </form>
                        </Card>

                        {/* Lista */}
                        <div>
                            <h2 className="text-lg font-bold text-ink mb-3">Cuentas registradas ({cuentas.length})</h2>
                            {cargando ? <Card className="p-6 text-center text-mute text-sm">Cargando...</Card> : (
                                <div className="space-y-2">
                                    {cuentas.map(c => (
                                        <Card key={c.id_usuario} className="p-4 flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-sky-soft flex items-center justify-center text-xs font-bold text-sky-deep">
                                                {obtenerIniciales(c.nombres, c.apellidos)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-ink text-sm truncate">{c.nombres} {c.apellidos}</p>
                                                <p className="text-xs text-mute truncate">{c.correo}</p>
                                            </div>
                                            <Badge variante={c.activo ? 'success' : 'gray'}>{c.activo ? 'ACTIVO' : 'INACTIVO'}</Badge>
                                        </Card>
                                    ))}
                                    {cuentas.length === 0 && <Card className="p-6 text-center text-mute text-sm">No hay cuentas registradas</Card>}
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};