import { useEffect, useState, FormEvent } from 'react';

import { HeaderAdmin } from '../../components/layout/HeaderAdmin';
import { Sidebar } from '../../components/layout/Sidebar';
import { Card } from '../../components/common/Card';
import { Boton } from '../../components/common/Boton';
import { Input } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';

import { correosApi } from '../../api/correosApi';
import { Remitente } from '../../types';

export const CorreosNotificacion = () => {
    const [remitentes, setRemitentes] = useState<Remitente[]>([]);
    const [pendientes, setPendientes] = useState(0);
    const [cargando, setCargando]     = useState(true);

    const [editando, setEditando]             = useState<Remitente | null>(null);
    const [correo, setCorreo]                 = useState('');
    const [appPassword, setAppPassword]       = useState('');
    const [nombreRemitente, setNombreRemitente] = useState('');
    const [host, setHost]                     = useState('');
    const [puerto, setPuerto]                 = useState('');
    const [prioridad, setPrioridad]           = useState('0');
    const [procesando, setProcesando]         = useState(false);
    const [msg, setMsg] = useState<{ texto: string; ok: boolean } | null>(null);

    const [enviando, setEnviando]     = useState(false);
    const [msgEnvio, setMsgEnvio]     = useState<{ texto: string; ok: boolean } | null>(null);

    const cargar = async () => {
        setCargando(true);
        try {
            const [lista, p] = await Promise.all([
                correosApi.listarRemitentes(),
                correosApi.contarPendientes(),
            ]);
            setRemitentes(lista);
            setPendientes(p);
        } catch (e) { console.error(e); }
        finally { setCargando(false); }
    };

    useEffect(() => { cargar(); }, []);

    const limpiar = () => {
        setEditando(null);
        setCorreo(''); setAppPassword(''); setNombreRemitente('');
        setHost(''); setPuerto(''); setPrioridad('0');
        setMsg(null);
    };

    const iniciarEdicion = (r: Remitente) => {
        setEditando(r);
        setCorreo(r.correo);
        setAppPassword('');
        setNombreRemitente(r.nombre_remitente ?? '');
        setHost(r.host ?? '');
        setPuerto(r.puerto ? String(r.puerto) : '');
        setPrioridad(String(r.prioridad));
        setMsg(null);
    };

    const guardar = async (e: FormEvent) => {
        e.preventDefault();
        setMsg(null);

        if (!editando && !appPassword) {
            setMsg({ texto: 'La contraseña de aplicación es obligatoria', ok: false });
            return;
        }

        setProcesando(true);
        try {
            const datos: any = {
                correo,
                nombre_remitente: nombreRemitente || undefined,
                host: host || undefined,
                puerto: puerto ? Number(puerto) : undefined,
                activo: true,
                prioridad: Number(prioridad) || 0,
            };
            if (appPassword) datos.app_password = appPassword;

            let res: { ok: boolean; mensaje: string };

            if (editando) {
                res = await correosApi.actualizarRemitente(editando.id_remitente, datos);
            } else {
                datos.app_password = appPassword;
                res = await correosApi.crearRemitente(datos);
            }

            if (res.ok) {
                setMsg({ texto: editando ? '✓ Remitente actualizado' : '✓ Remitente agregado', ok: true });
                limpiar();
                await cargar();
            } else {
                setMsg({ texto: res.mensaje, ok: false });
            }
        } catch {
            setMsg({ texto: 'Error al guardar el remitente', ok: false });
        } finally { setProcesando(false); }
    };

    const eliminar = async (id: number) => {
        if (!window.confirm('¿Eliminar este remitente?')) return;
        try {
            await correosApi.eliminarRemitente(id);
            await cargar();
        } catch { /* error handler global cubre */ }
    };

    const toggleActivo = async (r: Remitente) => {
        try {
            await correosApi.actualizarRemitente(r.id_remitente, {
                correo: r.correo,
                activo: !r.activo,
                prioridad: r.prioridad,
            });
            await cargar();
        } catch { /* error handler global cubre */ }
    };

    const enviarAhora = async () => {
        setEnviando(true);
        setMsgEnvio(null);
        try {
            const res = await correosApi.enviarPendientes();
            setMsgEnvio({ texto: res.mensaje, ok: res.ok });
            await cargar();
        } catch {
            setMsgEnvio({ texto: 'Error al enviar los correos', ok: false });
        } finally { setEnviando(false); }
    };

    return (
        <div className="min-h-screen bg-smoke">
            <HeaderAdmin />
            <div className="flex">
                <Sidebar />
                <main className="flex-1 p-8 max-w-5xl">
                    <h1 className="text-3xl font-extrabold text-ink mb-1">Correos de notificación</h1>
                    <p className="text-sm text-mute mb-6">Gestiona los correos remitentes y envía notificaciones por email</p>

                    {/* ═══════ Envío ═══════ */}
                    <Card className="p-6 mb-6">
                        <div className="flex items-center justify-between flex-wrap gap-4">
                            <div>
                                <h2 className="text-lg font-bold text-ink">Envío de correos</h2>
                                <p className="text-sm text-mute mt-1">
                                    {cargando
                                        ? 'Cargando...'
                                        : pendientes > 0
                                            ? <><span className="font-bold text-warning">{pendientes}</span> correo(s) pendiente(s) de enviar</>
                                            : <span className="text-success-deep font-semibold">No hay correos pendientes</span>
                                    }
                                </p>
                                <p className="text-xs text-mute mt-1">El cron automático envía cada 2 minutos. Usa el botón para enviar ahora.</p>
                            </div>
                            <Boton
                                variante="primary"
                                onClick={enviarAhora}
                                disabled={enviando || pendientes === 0}
                            >
                                {enviando ? 'Enviando...' : '📧 Enviar correos ahora'}
                            </Boton>
                        </div>
                        {msgEnvio && (
                            <div className={`mt-4 p-3 rounded-lg ${msgEnvio.ok ? 'bg-success-soft' : 'bg-danger-soft'}`}>
                                <p className={`text-xs font-semibold ${msgEnvio.ok ? 'text-success-deep' : 'text-danger'}`}>{msgEnvio.texto}</p>
                            </div>
                        )}
                    </Card>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* ═══════ Formulario ═══════ */}
                        <Card className="p-6">
                            <h2 className="text-lg font-bold text-blue-deep mb-4">
                                {editando ? 'Editar remitente' : 'Agregar remitente'}
                            </h2>
                            <form onSubmit={guardar} className="space-y-3">
                                <Input label="Correo remitente" type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="notificaciones@gmail.com" required />
                                <Input label={editando ? 'Contraseña de aplicación (dejar vacío para mantener)' : 'Contraseña de aplicación'} type="password" value={appPassword} onChange={(e) => setAppPassword(e.target.value)} placeholder="xxxx xxxx xxxx xxxx" required={!editando} />
                                <Input label="Nombre visible en el correo (opcional)" value={nombreRemitente} onChange={(e) => setNombreRemitente(e.target.value)} placeholder="Policlínico CareNest" />
                                <div className="grid grid-cols-2 gap-3">
                                    <Input label="Host SMTP (vacío = Gmail)" value={host} onChange={(e) => setHost(e.target.value)} placeholder="smtp.gmail.com" />
                                    <Input label="Puerto (vacío = 587)" value={puerto} onChange={(e) => setPuerto(e.target.value.replace(/\D/g, ''))} placeholder="587" />
                                </div>
                                <Input label="Prioridad (menor = se intenta primero)" value={prioridad} onChange={(e) => setPrioridad(e.target.value.replace(/\D/g, ''))} placeholder="0" />

                                {msg && (
                                    <div className={`p-3 rounded-lg ${msg.ok ? 'bg-success-soft' : 'bg-danger-soft'}`}>
                                        <p className={`text-xs font-semibold ${msg.ok ? 'text-success-deep' : 'text-danger'}`}>{msg.texto}</p>
                                    </div>
                                )}

                                <div className="flex gap-2">
                                    <Boton type="submit" fullWidth disabled={procesando}>
                                        {procesando ? 'Guardando...' : editando ? 'Actualizar' : 'Agregar remitente'}
                                    </Boton>
                                    {editando && (
                                        <Boton type="button" variante="secondary" onClick={limpiar}>Cancelar</Boton>
                                    )}
                                </div>
                            </form>
                        </Card>

                        {/* ═══════ Lista ═══════ */}
                        <div>
                            <h2 className="text-lg font-bold text-ink mb-3">Remitentes configurados ({remitentes.length})</h2>
                            {cargando ? (
                                <Card className="p-6 text-center text-mute text-sm">Cargando...</Card>
                            ) : remitentes.length === 0 ? (
                                <Card className="p-6 text-center text-mute text-sm">No hay remitentes configurados. Agrega uno para empezar a enviar correos.</Card>
                            ) : (
                                <div className="space-y-2">
                                    {remitentes.map(r => (
                                        <Card key={r.id_remitente} className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-sky-soft flex items-center justify-center text-xs font-bold text-sky-deep shrink-0">#{r.prioridad}</div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-ink text-sm truncate">{r.correo}</p>
                                                    <p className="text-xs text-mute truncate">
                                                        {r.nombre_remitente || 'Sin nombre visible'}
                                                        {r.host ? ` · ${r.host}:${r.puerto || 587}` : ' · Gmail'}
                                                    </p>
                                                </div>
                                                <Badge variante={r.activo ? 'success' : 'gray'}>{r.activo ? 'ACTIVO' : 'INACTIVO'}</Badge>
                                            </div>
                                            <div className="flex gap-2 mt-3 justify-end">
                                                <Boton tamano="sm" variante={r.activo ? 'secondary' : 'success'} onClick={() => toggleActivo(r)}>
                                                    {r.activo ? 'Desactivar' : 'Activar'}
                                                </Boton>
                                                <Boton tamano="sm" variante="ghost" onClick={() => iniciarEdicion(r)}>Editar</Boton>
                                                <Boton tamano="sm" variante="danger" onClick={() => eliminar(r.id_remitente)}>Eliminar</Boton>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};