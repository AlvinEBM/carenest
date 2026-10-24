// =================================================================
// Vista ADMIN — Gestión de especialidades y médicos (con Fase 3).
//
// CAMBIOS:
//   - "Nuevo médico" ahora crea también su CUENTA de acceso
//     (correo, contraseña, DNI, colegiatura) → rol MEDICO.
//   - Médicos sin cuenta muestran el botón "Crear acceso".
//   - Cada especialidad tiene PRECIO de consulta (pasarela de pagos).
// =================================================================
import { useEffect, useState, FormEvent, useCallback } from 'react';
import axios from 'axios';

import { HeaderAdmin } from '../../components/layout/HeaderAdmin';
import { Sidebar } from '../../components/layout/Sidebar';
import { Card } from '../../components/common/Card';
import { Boton } from '../../components/common/Boton';
import { Input } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { ModalProgramar } from '../../components/admin/ModalProgramar';

import { adminApi } from '../../api/adminApi';
import { Especialidad, Medico } from '../../types';
import { formatearSoles } from '../../utils/fechas';

type ObjetoProgramar =
    | { tipo: 'especialidad'; id: number; nombre: string; fechaInhab: string | null; fechaHab: string | null }
    | { tipo: 'medico'; id: number; nombre: string; fechaInhab: string | null; fechaHab: string | null }
    | null;

// Mismas reglas que el backend (validación temprana en el formulario)
const REGEX_DNI = /^\d{8}$/;
const REGEX_COLEGIATURA = /^\d{5,6}$/;
const REGEX_CONTRASENA = /^(?=.*[A-Za-z])(?=.*\d).{8,50}$/;
const REGEX_TELEFONO = /^9\d{8}$/;

const mensajeError = (e: unknown, porDefecto: string) => {
    if (axios.isAxiosError(e)) {
        const data = e.response?.data;
        if (data?.detalle?.length) {
            return data.detalle.flatMap((d: { errores: string[] }) => d.errores).join('. ');
        }
        return data?.mensaje ?? porDefecto;
    }
    return porDefecto;
};

const MEDICO_VACIO = { nombres: '', apellidos: '', correo: '', contrasena: '', dni: '', colegiatura: '', telefono: '' };

export const Especialidades = () => {
    const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
    const [medicos, setMedicos]               = useState<Medico[]>([]);
    const [cargando, setCargando]             = useState(true);

    // Nueva especialidad
    const [nombreEsp, setNombreEsp] = useState('');
    const [descEsp, setDescEsp]     = useState('');
    const [precioEsp, setPrecioEsp] = useState('30.00');
    const [msgEsp, setMsgEsp]       = useState<string | null>(null);
    const [requiereMenor, setRequiereMenor] = useState(false);

    // Nuevo médico (con cuenta)
    const [med, setMed]       = useState(MEDICO_VACIO);
    const [espMed, setEspMed] = useState<number>(0);
    const [msgMed, setMsgMed] = useState<string | null>(null);
    const [creandoMed, setCreandoMed] = useState(false);

    // Modal "crear acceso" para médico sin cuenta
    const [medicoAcceso, setMedicoAcceso] = useState<Medico | null>(null);
    const [acceso, setAcceso] = useState({ correo: '', contrasena: '', dni: '' });
    const [msgAcceso, setMsgAcceso] = useState<string | null>(null);

    // Modal precio
    const [espPrecio, setEspPrecio] = useState<Especialidad | null>(null);
    const [nuevoPrecio, setNuevoPrecio] = useState('');
    const [msgPrecio, setMsgPrecio] = useState<string | null>(null);

    // Modal de programación
    const [programar, setProgramar] = useState<ObjetoProgramar>(null);

    // Estado del botón de revisión manual
    const [revisando, setRevisando] = useState(false);

    const cargar = async () => {
        setCargando(true);
        try {
            const [esp, meds] = await Promise.all([
                adminApi.listarEspecialidades(),
                adminApi.listarMedicos(),
            ]);
            setEspecialidades(esp);
            setMedicos(meds);
        } catch (e) {
            console.error(e);
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => { cargar(); }, []);

    // ---------- Especialidad ----------
    const crearEspecialidad = async (e: FormEvent) => {
        e.preventDefault();
        setMsgEsp(null);
        const precio = Number(precioEsp);
        if (!Number.isFinite(precio) || precio < 1 || precio > 999.99) {
            setMsgEsp('El precio debe estar entre S/ 1.00 y S/ 999.99');
            return;
        }
        try {
            const res = await adminApi.crearEspecialidad({
                nombre: nombreEsp.trim(),
                descripcion: descEsp.trim(),
                requiere_datos_menor: requiereMenor,
                precio: Math.round(precio * 100) / 100,
            });
            if (res.ok) {
                setNombreEsp(''); setDescEsp(''); setRequiereMenor(false); setPrecioEsp('30.00');
                setMsgEsp('✓ Especialidad creada');
                await cargar();
            } else setMsgEsp(res.mensaje);
        } catch (err) { setMsgEsp(mensajeError(err, 'Error al crear la especialidad')); }
    };

    const abrirPrecio = (esp: Especialidad) => {
        setEspPrecio(esp);
        setNuevoPrecio(String(Number(esp.precio ?? 30).toFixed(2)));
        setMsgPrecio(null);
    };
    const cerrarPrecio = useCallback(() => setEspPrecio(null), []);

    const guardarPrecio = async (e: FormEvent) => {
        e.preventDefault();
        if (!espPrecio) return;
        const precio = Number(nuevoPrecio);
        if (!Number.isFinite(precio) || precio < 1 || precio > 999.99) {
            setMsgPrecio('El precio debe estar entre S/ 1.00 y S/ 999.99');
            return;
        }
        try {
            await adminApi.actualizarPrecio(espPrecio.id_especialidad, Math.round(precio * 100) / 100);
            setEspPrecio(null);
            await cargar();
        } catch (err) { setMsgPrecio(mensajeError(err, 'No se pudo actualizar el precio')); }
    };

    // ---------- Médico ----------
    const validarMedico = (): string | null => {
        if (!espMed) return 'Selecciona una especialidad';
        if (!REGEX_DNI.test(med.dni)) return 'El DNI debe tener exactamente 8 dígitos';
        if (!REGEX_COLEGIATURA.test(med.colegiatura)) return 'La colegiatura debe tener 5 o 6 dígitos';
        if (!REGEX_CONTRASENA.test(med.contrasena)) return 'La contraseña debe tener 8 a 50 caracteres, con al menos una letra y un número';
        if (med.telefono && !REGEX_TELEFONO.test(med.telefono)) return 'El teléfono debe tener 9 dígitos y empezar con 9';
        return null;
    };

    const crearMedico = async (e: FormEvent) => {
        e.preventDefault();
        setMsgMed(null);
        const error = validarMedico();
        if (error) { setMsgMed(error); return; }
        setCreandoMed(true);
        try {
            const res = await adminApi.crearMedico({
                nombres: med.nombres.trim(),
                apellidos: med.apellidos.trim(),
                id_especialidad: espMed,
                correo: med.correo.trim(),
                contrasena: med.contrasena,
                dni: med.dni,
                colegiatura: med.colegiatura,
                telefono: med.telefono || undefined,
            });
            if (res.ok) {
                setMed(MEDICO_VACIO); setEspMed(0);
                setMsgMed('✓ Médico registrado. Ya puede iniciar sesión con su correo.');
                await cargar();
            } else setMsgMed(res.mensaje);
        } catch (err) { setMsgMed(mensajeError(err, 'Error al registrar el médico')); }
        finally { setCreandoMed(false); }
    };

    const abrirAcceso = (m: Medico) => {
        setMedicoAcceso(m);
        setAcceso({ correo: '', contrasena: '', dni: '' });
        setMsgAcceso(null);
    };
    const cerrarAcceso = useCallback(() => setMedicoAcceso(null), []);

    const crearAcceso = async (e: FormEvent) => {
        e.preventDefault();
        if (!medicoAcceso) return;
        if (!REGEX_DNI.test(acceso.dni)) { setMsgAcceso('El DNI debe tener exactamente 8 dígitos'); return; }
        if (!REGEX_CONTRASENA.test(acceso.contrasena)) { setMsgAcceso('La contraseña debe tener 8 a 50 caracteres, con al menos una letra y un número'); return; }
        try {
            await adminApi.crearCuentaMedico(medicoAcceso.id_medico, { ...acceso, correo: acceso.correo.trim() });
            setMedicoAcceso(null);
            await cargar();
        } catch (err) { setMsgAcceso(mensajeError(err, 'No se pudo crear el acceso')); }
    };

    // ---------- Programación (Fase 3) ----------
    const confirmarProgramacion = async (accion: 'INHABILITAR' | 'HABILITAR', fecha: string) => {
        if (!programar) return;
        if (programar.tipo === 'especialidad') {
            await adminApi.programarEspecialidad({ id: programar.id, accion, fecha });
        } else {
            await adminApi.programarMedico({ id: programar.id, accion, fecha });
        }
        setProgramar(null);
        await cargar();
    };

    const cancelarProgramacion = async (cual: 'INHABILITAR' | 'HABILITAR') => {
        if (!programar) return;
        if (programar.tipo === 'especialidad') {
            await adminApi.cancelarProgramacionEspecialidad(programar.id, cual);
        } else {
            await adminApi.cancelarProgramacionMedico(programar.id, cual);
        }
        setProgramar(null);
        await cargar();
    };

    const ejecutarRevision = async () => {
        setRevisando(true);
        try {
            const res = await adminApi.ejecutarRevision();
            alert(`Revisión ejecutada:\n- Citas canceladas: ${res.citasCanceladas}\n- Avisos enviados: ${res.avisosEnviados}`);
            await cargar();
        } catch {
            alert('No se pudo ejecutar la revisión');
        } finally {
            setRevisando(false);
        }
    };

    const activas = especialidades.filter(e => e.estado === 'ACTIVA');
    const setCampoMed = (campo: keyof typeof MEDICO_VACIO) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setMed(prev => ({ ...prev, [campo]: e.target.value }));

    return (
        <div className="min-h-screen bg-smoke">
            <HeaderAdmin />
            <div className="flex">
                <Sidebar />
                <main className="flex-1 p-8 max-w-5xl">
                    <div className="flex items-start justify-between mb-6">
                        <div>
                            <h1 className="text-3xl font-extrabold text-ink mb-1">Especialidades y médicos</h1>
                            <p className="text-sm text-mute">Gestiona las especialidades, el cuerpo médico, sus accesos y precios</p>
                        </div>
                        <Boton variante="secondary" onClick={ejecutarRevision} disabled={revisando}>
                            {revisando ? 'Ejecutando...' : '⟳ Ejecutar revisión ahora'}
                        </Boton>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Crear especialidad */}
                        <Card className="p-6">
                            <h2 className="text-lg font-bold text-blue-deep mb-4">Nueva especialidad</h2>
                            <form onSubmit={crearEspecialidad} className="space-y-3">
                                <Input id="esp-nombre" label="Nombre" value={nombreEsp} onChange={(e) => setNombreEsp(e.target.value)} placeholder="Cardiología" required minLength={3} maxLength={100} />
                                <Input id="esp-desc" label="Descripción" value={descEsp} onChange={(e) => setDescEsp(e.target.value)} placeholder="Atención del corazón" required maxLength={500} />
                                <Input id="esp-precio" label="Precio de la consulta (S/)" type="number" min={1} max={999.99} step={0.01} value={precioEsp} onChange={(e) => setPrecioEsp(e.target.value)} required />
                                <label className="flex items-center gap-2 cursor-pointer py-1">
                                    <input
                                        type="checkbox"
                                        checked={requiereMenor}
                                        onChange={(e) => setRequiereMenor(e.target.checked)}
                                        className="w-4 h-4 accent-sky-main"
                                    />
                                    <span className="text-xs text-ink-soft font-semibold">
                                        Requiere datos del menor (ej. Pediatría)
                                    </span>
                                </label>
                                {msgEsp && <p role="status" className={`text-xs font-semibold ${msgEsp.startsWith('✓') ? 'text-success' : 'text-danger'}`}>{msgEsp}</p>}
                                <Boton type="submit" fullWidth>Crear especialidad</Boton>
                            </form>
                        </Card>

                        {/* Crear médico con cuenta */}
                        <Card className="p-6">
                            <h2 className="text-lg font-bold text-blue-deep mb-1">Nuevo médico</h2>
                            <p className="text-xs text-mute mb-4">Se crea también su cuenta para iniciar sesión (rol Médico).</p>
                            <form onSubmit={crearMedico} className="space-y-3" noValidate>
                                <div className="grid grid-cols-2 gap-3">
                                    <Input id="med-nombres" label="Nombres" value={med.nombres} onChange={setCampoMed('nombres')} placeholder="Andrea" required maxLength={100} />
                                    <Input id="med-apellidos" label="Apellidos" value={med.apellidos} onChange={setCampoMed('apellidos')} placeholder="Torres" required maxLength={100} />
                                </div>
                                <div>
                                    <label htmlFor="med-especialidad" className="block text-xs font-semibold text-ink-soft mb-2">Especialidad</label>
                                    <select id="med-especialidad" value={espMed} onChange={(e) => setEspMed(Number(e.target.value))}
                                        className="w-full px-4 py-3 text-sm bg-white rounded-lg border border-gray-200 focus:border-sky-main outline-none">
                                        <option value={0}>Selecciona...</option>
                                        {activas.map(e => <option key={e.id_especialidad} value={e.id_especialidad}>{e.nombre}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <Input id="med-dni" label="DNI" value={med.dni} onChange={setCampoMed('dni')} placeholder="41234567" inputMode="numeric" maxLength={8} required />
                                    <Input id="med-colegiatura" label="Colegiatura (CMP)" value={med.colegiatura} onChange={setCampoMed('colegiatura')} placeholder="045123" inputMode="numeric" maxLength={6} required />
                                </div>
                                <Input id="med-telefono" label="Teléfono (opcional)" value={med.telefono} onChange={setCampoMed('telefono')} placeholder="987654321" inputMode="numeric" maxLength={9} />
                                <Input id="med-correo" label="Correo de acceso" type="email" value={med.correo} onChange={setCampoMed('correo')} placeholder="andrea.torres@carenest.pe" required autoComplete="off" />
                                <Input id="med-contrasena" label="Contraseña inicial" type="password" value={med.contrasena} onChange={setCampoMed('contrasena')} placeholder="Mínimo 8, con letra y número" required autoComplete="new-password" />
                                {msgMed && <p role="status" className={`text-xs font-semibold ${msgMed.startsWith('✓') ? 'text-success' : 'text-danger'}`}>{msgMed}</p>}
                                <Boton type="submit" fullWidth disabled={creandoMed}>{creandoMed ? 'Registrando...' : 'Registrar médico'}</Boton>
                            </form>
                        </Card>
                    </div>

                    {/* Lista especialidades */}
                    <h2 className="text-lg font-bold text-ink mt-8 mb-3">Especialidades registradas</h2>
                    {cargando ? <Card className="p-6 text-center text-mute text-sm">Cargando...</Card> : (
                        <div className="space-y-2 mb-8">
                            {especialidades.map(e => (
                                <Card key={e.id_especialidad} className="p-4 flex items-center justify-between gap-3">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="font-bold text-ink text-sm">{e.nombre}</h3>
                                            <Badge variante={e.estado === 'ACTIVA' ? 'success' : 'gray'}>{e.estado}</Badge>
                                            <Badge variante="sky">{formatearSoles(e.precio)}</Badge>
                                            {e.fecha_inhabilitacion && <span className="text-[10px] text-danger font-semibold">⏸ inhab. {e.fecha_inhabilitacion}</span>}
                                            {e.fecha_habilitacion && <span className="text-[10px] text-success font-semibold">▶ hab. {e.fecha_habilitacion}</span>}
                                        </div>
                                        <p className="text-xs text-mute mt-0.5">{e.descripcion}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Boton tamano="sm" variante="secondary" onClick={() => abrirPrecio(e)}>Precio</Boton>
                                        <Boton tamano="sm" variante="secondary" onClick={() => setProgramar({ tipo: 'especialidad', id: e.id_especialidad, nombre: e.nombre, fechaInhab: e.fecha_inhabilitacion ?? null, fechaHab: e.fecha_habilitacion ?? null })}>
                                            Programar
                                        </Boton>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}

                    {/* Lista médicos */}
                    <h2 className="text-lg font-bold text-ink mb-3">Médicos registrados</h2>
                    <div className="space-y-2">
                        {medicos.map(m => (
                            <Card key={m.id_medico} className="p-4 flex items-center justify-between gap-3">
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="font-bold text-ink text-sm">Dr. {m.nombres} {m.apellidos}</h3>
                                        {m.estado === 'INACTIVO' && <Badge variante="gray">INACTIVO</Badge>}
                                        {m.tiene_cuenta
                                            ? <Badge variante="success">CON ACCESO</Badge>
                                            : <Badge variante="warning">SIN ACCESO</Badge>}
                                        {m.fecha_inhabilitacion && <span className="text-[10px] text-danger font-semibold">⏸ inhab. {m.fecha_inhabilitacion}</span>}
                                        {m.fecha_habilitacion && <span className="text-[10px] text-success font-semibold">▶ hab. {m.fecha_habilitacion}</span>}
                                    </div>
                                    <p className="text-xs text-mute">
                                        {m.especialidad}
                                        {m.colegiatura && <> · CMP {m.colegiatura}</>}
                                        {m.correo && <> · {m.correo}</>}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    {!m.tiene_cuenta && (
                                        <Boton tamano="sm" onClick={() => abrirAcceso(m)}>Crear acceso</Boton>
                                    )}
                                    <Boton tamano="sm" variante="secondary" onClick={() => setProgramar({ tipo: 'medico', id: m.id_medico, nombre: `Dr. ${m.nombres} ${m.apellidos}`, fechaInhab: m.fecha_inhabilitacion ?? null, fechaHab: m.fecha_habilitacion ?? null })}>
                                        Programar
                                    </Boton>
                                </div>
                            </Card>
                        ))}
                    </div>
                </main>
            </div>

            {/* Modal de programación */}
            <ModalProgramar
                abierto={!!programar}
                titulo={programar?.nombre ?? ''}
                fechaInhabActual={programar?.fechaInhab ?? null}
                fechaHabActual={programar?.fechaHab ?? null}
                onCerrar={() => setProgramar(null)}
                onConfirmar={confirmarProgramacion}
                onCancelarProgramacion={cancelarProgramacion}
            />

            {/* Modal crear acceso */}
            <Modal
                abierto={!!medicoAcceso}
                titulo="Crear acceso al sistema"
                subtitulo={medicoAcceso ? `Dr. ${medicoAcceso.nombres} ${medicoAcceso.apellidos} · ${medicoAcceso.especialidad}` : ''}
                onCerrar={cerrarAcceso}
                ancho="sm"
            >
                <form onSubmit={crearAcceso} className="space-y-3" noValidate>
                    <Input id="acc-dni" label="DNI" value={acceso.dni} onChange={(e) => setAcceso(a => ({ ...a, dni: e.target.value }))} inputMode="numeric" maxLength={8} required />
                    <Input id="acc-correo" label="Correo de acceso" type="email" value={acceso.correo} onChange={(e) => setAcceso(a => ({ ...a, correo: e.target.value }))} required autoComplete="off" />
                    <Input id="acc-contrasena" label="Contraseña inicial" type="password" value={acceso.contrasena} onChange={(e) => setAcceso(a => ({ ...a, contrasena: e.target.value }))} placeholder="Mínimo 8, con letra y número" required autoComplete="new-password" />
                    {msgAcceso && <p role="alert" className="text-xs font-semibold text-danger">{msgAcceso}</p>}
                    <div className="flex gap-3 pt-2">
                        <Boton type="button" variante="secondary" fullWidth onClick={cerrarAcceso}>Cancelar</Boton>
                        <Boton type="submit" fullWidth>Crear acceso</Boton>
                    </div>
                </form>
            </Modal>

            {/* Modal precio */}
            <Modal
                abierto={!!espPrecio}
                titulo="Precio de la consulta"
                subtitulo={espPrecio?.nombre}
                onCerrar={cerrarPrecio}
                ancho="sm"
            >
                <form onSubmit={guardarPrecio} className="space-y-3" noValidate>
                    <Input id="precio-esp" label="Precio (S/)" type="number" min={1} max={999.99} step={0.01} value={nuevoPrecio} onChange={(e) => setNuevoPrecio(e.target.value)} required />
                    <p className="text-[11px] text-mute">Entre S/ 1.00 y S/ 999.99. Se aplica a los pagos nuevos.</p>
                    {msgPrecio && <p role="alert" className="text-xs font-semibold text-danger">{msgPrecio}</p>}
                    <div className="flex gap-3 pt-2">
                        <Boton type="button" variante="secondary" fullWidth onClick={cerrarPrecio}>Cancelar</Boton>
                        <Boton type="submit" fullWidth>Guardar</Boton>
                    </div>
                </form>
            </Modal>
        </div>
    );
};
