// =================================================================
// Reservar Cita — Wizard de 4 pasos:
//   1. Especialidad → 2. Médico → 3. Fecha → 4. Hora + motivo
//
// Cada médico tiene su propia agenda independiente.
// =================================================================
import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

import { Header } from '../../components/layout/Header';
import { Boton } from '../../components/common/Boton';
import { Card } from '../../components/common/Card';

import { citasApi } from '../../api/citasApi';
import { Especialidad, Horario, DiaCalendario, MedicoReserva, Dependiente } from '../../types';
import { formatearFecha, formatearHora, obtenerIniciales } from '../../utils/formatters';
import { formatearSoles } from '../../utils/fechas';
import { filtrarLetras, validarNombre } from '../../utils/validaciones';

type Paso = 1 | 2 | 3 | 4 | 5; // 5 = éxito

export const Reservar = () => {
    const navigate = useNavigate();
    const [paso, setPaso] = useState<Paso>(1);

    const [especialidad, setEspecialidad] = useState<Especialidad | null>(null);
    const [medico, setMedico]             = useState<MedicoReserva | null>(null);
    const [fecha, setFecha]               = useState('');
    const [horaSel, setHoraSel]           = useState<Horario | null>(null);
    const [motivo, setMotivo]             = useState('');
    const [notas, setNotas]               = useState('');
// Datos del menor (solo si la especialidad lo requiere)
    const [dependientes, setDependientes]     = useState<Dependiente[]>([]);
    const [dependienteSel, setDependienteSel] = useState<number | null>(null);
    const [creandoDep, setCreandoDep]         = useState(false);
    const [depNombres, setDepNombres]         = useState('');
    const [depApellidos, setDepApellidos]     = useState('');
    const [depDni, setDepDni]                 = useState('');
    const [depFechaNac, setDepFechaNac]       = useState('');
    const [depParentesco, setDepParentesco]   = useState('');
    const [guardandoDep, setGuardandoDep]     = useState(false);
    const [errorDep, setErrorDep]             = useState<string | null>(null);
    const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
    const [medicos, setMedicos]               = useState<MedicoReserva[]>([]);
    const [horarios, setHorarios]             = useState<Horario[]>([]);
    const [cargando, setCargando]             = useState(false);
    const [error, setError]                   = useState<string | null>(null);

    // Cargar especialidades
    useEffect(() => {
        (async () => {
            setCargando(true);
            try {
                const lista = await citasApi.listarEspecialidades();
                setEspecialidades(lista.filter(e => e.estado !== 'INACTIVA'));
            } catch {
                setError('No pudimos cargar las especialidades');
            } finally {
                setCargando(false);
            }
        })();
    }, []);

    // Cargar médicos cuando se elige especialidad
    useEffect(() => {
        if (!especialidad) return;
        (async () => {
            setCargando(true);
            setError(null);
            try {
                const lista = await citasApi.listarMedicos(especialidad.id_especialidad);
                setMedicos(lista);
            } catch {
                setError('No pudimos cargar los médicos');
                setMedicos([]);
            } finally {
                setCargando(false);
            }
        })();
    }, [especialidad]);

    // Cargar horarios cuando hay fecha + médico
    useEffect(() => {
        if (!fecha || !medico) return;
        (async () => {
            setCargando(true);
            setError(null);
            try {
                const lista = await citasApi.listarHorarios(fecha, medico.id_medico);
                setHorarios(lista);
                setHoraSel(null);
            } catch {
                setError('No pudimos cargar los horarios');
                setHorarios([]);
            } finally {
                setCargando(false);
            }
        })();
    }, [fecha, medico]);
    // Cargar dependientes cuando la especialidad requiere datos del menor
    useEffect(() => {
        if (!especialidad?.requiere_datos_menor) return;
        (async () => {
            try {
                const lista = await citasApi.listarDependientes();
                setDependientes(lista);
            } catch {
                setDependientes([]);
            }
        })();
    }, [especialidad]);

    const guardarDependiente = async () => {
        setErrorDep(null);
        if (!depNombres.trim() || !depApellidos.trim() || !depDni.trim() || !depFechaNac || !depParentesco) {
            setErrorDep('Completa todos los datos del menor');
            return;
        }
        const errNombre = validarNombre(depNombres, 'nombres') || validarNombre(depApellidos, 'apellidos');
        if (errNombre) {
            setErrorDep(errNombre);
            return;
        }
        if (!/^\d{8}$/.test(depDni)) {
            setErrorDep('El DNI debe tener 8 dígitos');
            return;
        }
        setGuardandoDep(true);
        try {
            const res = await citasApi.crearDependiente({
                nombres: depNombres.trim(),
                apellidos: depApellidos.trim(),
                dni: depDni,
                fecha_nacimiento: depFechaNac,
                parentesco: depParentesco,
            });
            const lista = await citasApi.listarDependientes();
            setDependientes(lista);
            setDependienteSel(res.id_dependiente);
            setCreandoDep(false);
            setDepNombres(''); setDepApellidos(''); setDepDni(''); setDepFechaNac(''); setDepParentesco('');
        } catch {
            setErrorDep('No se pudo guardar el menor');
        } finally {
            setGuardandoDep(false);
        }
    };

    const handleReservar = async (e: FormEvent) => {
        e.preventDefault();
        if (!horaSel || !especialidad || !medico || !fecha) return;

        setCargando(true);
        setError(null);
        try {
            // Si la especialidad requiere menor, validar que haya uno seleccionado
            if (especialidad.requiere_datos_menor && !dependienteSel) {
                setError('Debes registrar o elegir los datos del menor');
                setCargando(false);
                return;
            }

            const res = await citasApi.reservar({
                fecha,
                hora: horaSel.hora,
                id_especialidad: especialidad.id_especialidad,
                id_medico: medico.id_medico,
                motivo: motivo.trim(),
                notas: notas.trim() || undefined,
                id_dependiente: especialidad.requiere_datos_menor ? dependienteSel ?? undefined : undefined,
            });
            if (res.ok) {
                setPaso(5);
                setTimeout(() => navigate('/paciente/inicio'), 2500);
            } else {
                setError(res.mensaje || 'No se pudo reservar');
            }
        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                setError(err.response?.data?.mensaje || 'Error al reservar');
            } else {
                setError('Error inesperado');
            }
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className="min-h-screen bg-smoke">
            <Header />
            <main className="max-w-4xl mx-auto px-6 py-8">
                <div className="mb-8">
                    <button onClick={() => navigate('/paciente/inicio')} className="text-sm text-mute hover:text-sky-main mb-2">
                        ← Volver al inicio
                    </button>
                    <h1 className="text-3xl font-extrabold text-ink">Agendar nueva cita</h1>
                    <p className="text-sm text-mute mt-1">Sigue los pasos para reservar tu cita</p>
                </div>

                {paso < 5 && <Stepper pasoActual={paso} />}

                {paso === 1 && (
                    <PasoEspecialidad
                        especialidades={especialidades}
                        cargando={cargando}
                        seleccionada={especialidad}
                        onSeleccionar={(e) => { setEspecialidad(e); setMedico(null); setDependienteSel(null); setPaso(2); }}
                    />
                )}

                {paso === 2 && especialidad && (
                    <PasoMedico
                        especialidad={especialidad}
                        medicos={medicos}
                        cargando={cargando}
                        seleccionado={medico}
                        error={error}
                        onSeleccionar={(m) => { setMedico(m); setPaso(3); }}
                        onAtras={() => setPaso(1)}
                    />
                )}

                {paso === 3 && medico && (
                    <PasoCalendario
                        medico={medico}
                        fechaSel={fecha}
                        onFecha={setFecha}
                        onAtras={() => setPaso(2)}
                        onContinuar={() => setPaso(4)}
                    />
                )}

                {paso === 4 && especialidad && medico && (
                    <PasoHorario
                        especialidad={especialidad}
                        medico={medico}
                        fecha={fecha}
                        horarios={horarios}
                        horaSel={horaSel}
                        cargando={cargando}
                        motivo={motivo}
                        notas={notas}
                        error={error}
                        onSeleccionarHora={setHoraSel}
                        onMotivo={setMotivo}
                        onNotas={setNotas}
                        onAtras={() => setPaso(3)}
                        onConfirmar={handleReservar}
                        dependientes={dependientes}
                        dependienteSel={dependienteSel}
                        onElegirDependiente={setDependienteSel}
                        creandoDep={creandoDep}
                        onToggleCrear={setCreandoDep}
                        depNombres={depNombres} onDepNombres={setDepNombres}
                        depApellidos={depApellidos} onDepApellidos={setDepApellidos}
                        depDni={depDni} onDepDni={setDepDni}
                        depFechaNac={depFechaNac} onDepFechaNac={setDepFechaNac}
                        depParentesco={depParentesco} onDepParentesco={setDepParentesco}
                        guardandoDep={guardandoDep}
                        errorDep={errorDep}
                        onGuardarDep={guardarDependiente}
                    />
                )}

                {paso === 5 && especialidad && (
                    <ExitoReserva especialidad={especialidad.nombre} fecha={fecha} hora={horaSel?.hora ?? ''} />
                )}
            </main>
        </div>
    );
};

// ============== STEPPER (4 pasos) ==============
const Stepper = ({ pasoActual }: { pasoActual: number }) => {
    const pasos = [
        { num: 1, label: 'Especialidad' },
        { num: 2, label: 'Médico' },
        { num: 3, label: 'Fecha' },
        { num: 4, label: 'Hora y motivo' },
    ];
    return (
        <div className="flex items-center justify-center gap-2 mb-8">
            {pasos.map((p, i) => {
                const completado = pasoActual > p.num;
                const activo = pasoActual === p.num;
                return (
                    <div key={p.num} className="flex items-center">
                        <div className="flex flex-col items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm
                                ${completado ? 'bg-success text-white' : ''}
                                ${activo ? 'bg-sky-main text-white shadow-cta' : ''}
                                ${!completado && !activo ? 'bg-gray-200 text-mute' : ''}`}>
                                {completado ? '✓' : p.num}
                            </div>
                            <span className={`text-[11px] font-bold mt-2 ${activo ? 'text-sky-main' : 'text-mute'}`}>{p.label}</span>
                        </div>
                        {i < pasos.length - 1 && (
                            <div className={`w-12 h-0.5 mx-2 mb-6 ${pasoActual > p.num ? 'bg-success' : 'bg-gray-200'}`} />
                        )}
                    </div>
                );
            })}
        </div>
    );
};

// ============== PASO 1: ESPECIALIDAD ==============
const PasoEspecialidad = ({ especialidades, cargando, seleccionada, onSeleccionar }: {
    especialidades: Especialidad[];
    cargando: boolean;
    seleccionada: Especialidad | null;
    onSeleccionar: (e: Especialidad) => void;
}) => {
    if (cargando) return <Card className="p-12 text-center"><p className="text-mute">Cargando especialidades...</p></Card>;
    return (
        <Card className="p-8">
            <h2 className="text-xl font-extrabold text-blue-deep mb-2">¿Qué especialidad necesitas?</h2>
            <p className="text-sm text-mute mb-6">Selecciona una opción para continuar</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {especialidades.map(e => {
                    const activa = seleccionada?.id_especialidad === e.id_especialidad;
                    return (
                        <button key={e.id_especialidad} type="button" aria-pressed={activa} onClick={() => onSeleccionar(e)}
                            className={`p-5 rounded-xl border-2 text-left transition-all
                                ${activa ? 'border-sky-main bg-sky-soft shadow-cta' : 'border-gray-200 hover:border-sky-main hover:bg-sky-soft'}`}>
                            <div className="w-10 h-10 rounded-lg bg-sky-soft flex items-center justify-center mb-3"><span className="text-xl">🏥</span></div>
                            <h3 className="font-bold text-ink text-sm mb-1">{e.nombre}</h3>
                            {e.descripcion && <p className="text-xs text-mute line-clamp-2">{e.descripcion}</p>}
                            {!!e.precio && <p className="text-xs font-bold text-sky-deep mt-2">Consulta: {formatearSoles(e.precio)}</p>}
                        </button>
                    );
                })}
            </div>
        </Card>
    );
};

// ============== PASO 2: MÉDICO ==============
const PasoMedico = ({ especialidad, medicos, cargando, seleccionado, error, onSeleccionar, onAtras }: {
    especialidad: Especialidad;
    medicos: MedicoReserva[];
    cargando: boolean;
    seleccionado: MedicoReserva | null;
    error: string | null;
    onSeleccionar: (m: MedicoReserva) => void;
    onAtras: () => void;
}) => (
    <Card className="p-8">
        <h2 className="text-xl font-extrabold text-blue-deep mb-2">Elige tu médico</h2>
        <p className="text-sm text-mute mb-6">
            Especialidad: <span className="font-bold text-sky-deep">{especialidad.nombre}</span>
        </p>

        {cargando ? (
            <p className="text-mute text-sm py-6 text-center">Cargando médicos...</p>
        ) : medicos.length === 0 ? (
            <div className="bg-warning-soft border border-warning rounded-lg p-4 text-center mb-4">
                <p className="text-sm text-warning font-semibold">
                    No hay médicos disponibles en esta especialidad todavía.
                </p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {medicos.map(m => {
                    const activo = seleccionado?.id_medico === m.id_medico;
                    return (
                        <button key={m.id_medico} onClick={() => onSeleccionar(m)}
                            className={`p-5 rounded-xl border-2 text-left transition-all flex items-center gap-4
                                ${activo ? 'border-sky-main bg-sky-soft shadow-cta' : 'border-gray-200 hover:border-sky-main hover:bg-sky-soft'}`}>
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-main to-sky-deep flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                {obtenerIniciales(m.nombres, m.apellidos)}
                            </div>
                            <div>
                                <h3 className="font-bold text-ink text-sm">Dr. {m.nombres} {m.apellidos}</h3>
                                <p className="text-xs text-mute">{especialidad.nombre}</p>
                            </div>
                        </button>
                    );
                })}
            </div>
        )}

        {error && <p className="text-xs text-danger font-semibold mt-3">⚠ {error}</p>}

        <div className="flex gap-3 mt-8">
            <Boton variante="secondary" onClick={onAtras}>← Atrás</Boton>
        </div>
    </Card>
);

// ============== PASO 3: CALENDARIO ==============
const PasoCalendario = ({ medico, fechaSel, onFecha, onAtras, onContinuar }: {
    medico: MedicoReserva;
    fechaSel: string;
    onFecha: (f: string) => void;
    onAtras: () => void;
    onContinuar: () => void;
}) => {
    const hoy = new Date();
    const [anio, setAnio] = useState(hoy.getFullYear());
    const [mes, setMes]   = useState(hoy.getMonth() + 1);
    const [dias, setDias] = useState<DiaCalendario[]>([]);
    const [cargando, setCargando] = useState(false);

    useEffect(() => {
        (async () => {
            setCargando(true);
            try {
                const data = await citasApi.obtenerCalendario(anio, mes, medico.id_medico);
                setDias(data);
            } catch {
                setDias([]);
            } finally {
                setCargando(false);
            }
        })();
    }, [anio, mes, medico]);

    const nombresMes = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const primerDiaSemana = new Date(anio, mes - 1, 1).getDay();
    const diasMap = new Map(dias.map(d => [d.fecha, d]));

    const cambiarMes = (delta: number) => {
        let nuevoMes = mes + delta, nuevoAnio = anio;
        if (nuevoMes > 12) { nuevoMes = 1; nuevoAnio++; }
        if (nuevoMes < 1)  { nuevoMes = 12; nuevoAnio--; }
        setMes(nuevoMes); setAnio(nuevoAnio);
    };

    const celdas: (DiaCalendario | null)[] = [];
    for (let i = 0; i < primerDiaSemana; i++) celdas.push(null);
    const totalDias = new Date(anio, mes, 0).getDate();
    for (let d = 1; d <= totalDias; d++) {
        const fechaStr = `${anio}-${String(mes).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        celdas.push(diasMap.get(fechaStr) ?? { fecha: fechaStr, total: 0, libres: 0, reservable: false });
    }

    return (
        <Card className="p-8">
            <h2 className="text-xl font-extrabold text-blue-deep mb-2">Elige la fecha de tu cita</h2>
            <p className="text-sm text-mute mb-6">
                Médico: <span className="font-bold text-sky-deep">Dr. {medico.nombres} {medico.apellidos}</span>
            </p>

            <div className="flex items-center justify-between mb-4">
                <button onClick={() => cambiarMes(-1)} className="w-9 h-9 rounded-lg bg-smoke hover:bg-sky-soft text-mute font-bold">‹</button>
                <h3 className="text-base font-bold text-ink">{nombresMes[mes - 1]} {anio}</h3>
                <button onClick={() => cambiarMes(1)} className="w-9 h-9 rounded-lg bg-smoke hover:bg-sky-soft text-mute font-bold">›</button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
                {['D','L','M','M','J','V','S'].map((d, i) => (
                    <div key={i} className="text-center text-[11px] font-bold text-mute py-1">{d}</div>
                ))}
            </div>

            {cargando ? (
                <p className="text-center text-mute py-12 text-sm">Cargando disponibilidad...</p>
            ) : (
                <div className="grid grid-cols-7 gap-1">
                    {celdas.map((celda, i) => {
                        if (!celda) return <div key={i} />;
                        const dia = Number(celda.fecha.split('-')[2]);
                        const seleccionada = fechaSel === celda.fecha;
                        const sinCupo = celda.reservable && celda.libres === 0;

                        if (!celda.reservable) {
                            return <div key={i} className="aspect-square flex items-center justify-center text-sm text-gray-300">{dia}</div>;
                        }
                        return (
                            <button key={i} onClick={() => !sinCupo && onFecha(celda.fecha)} disabled={sinCupo}
                                aria-pressed={seleccionada}
                                aria-label={`${dia}: ${sinCupo ? 'sin cupo' : `${celda.libres} horarios libres`}${seleccionada ? ', seleccionado' : ''}`}
                                className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm transition-all
                                    ${seleccionada ? 'bg-sky-main text-white font-bold shadow-cta ring-4 ring-offset-2 ring-blue-deep' : ''}
                                    ${!seleccionada && !sinCupo ? 'bg-sky-soft text-sky-deep font-semibold hover:bg-sky-bright hover:text-white' : ''}
                                    ${sinCupo ? 'bg-gray-100 text-gray-400 cursor-not-allowed line-through' : ''}`}>
                                {dia}
                                {/* WCAG 1.4.1: el estado no se indica solo con color */}
                                {seleccionada && <span aria-hidden="true" className="text-xs mt-0.5">✓ elegido</span>}
                                {!seleccionada && !sinCupo && <span className="text-[11px] mt-0.5">{celda.libres} libres</span>}
                                {sinCupo && <span className="text-[11px] mt-0.5">sin cupo</span>}
                            </button>
                        );
                    })}
                </div>
            )}

            <div className="flex gap-4 mt-4 text-[11px] text-mute">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-sky-soft inline-block" /> Disponible («N libres»)</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-100 inline-block" /> Sin cupo (tachado)</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-sky-main inline-block" /> Seleccionado (✓ y borde)</span>
            </div>

            <div className="flex gap-3 mt-8">
                <Boton variante="secondary" onClick={onAtras}>← Atrás</Boton>
                <Boton onClick={onContinuar} disabled={!fechaSel}>Continuar →</Boton>
            </div>
        </Card>
    );
};
// ============== PASO 4: HORARIO + MOTIVO ==============
const PARENTESCOS = ['Padre', 'Madre', 'Hermano', 'Hermana', 'Tio', 'Tia', 'Abuelo', 'Abuela', 'Apoderado', 'Otro'];

const PasoHorario = ({
    especialidad, medico, fecha, horarios, horaSel, cargando, motivo, notas, error,
    onSeleccionarHora, onMotivo, onNotas, onAtras, onConfirmar,
    dependientes, dependienteSel, onElegirDependiente,
    creandoDep, onToggleCrear,
    depNombres, onDepNombres, depApellidos, onDepApellidos,
    depDni, onDepDni, depFechaNac, onDepFechaNac, depParentesco, onDepParentesco,
    guardandoDep, errorDep, onGuardarDep,
}: {
    especialidad: Especialidad;
    medico: MedicoReserva;
    fecha: string;
    horarios: Horario[];
    horaSel: Horario | null;
    cargando: boolean;
    motivo: string;
    notas: string;
    error: string | null;
    onSeleccionarHora: (h: Horario) => void;
    onMotivo: (m: string) => void;
    onNotas: (n: string) => void;
    onAtras: () => void;
    onConfirmar: (e: FormEvent) => void;
    dependientes: Dependiente[];
    dependienteSel: number | null;
    onElegirDependiente: (id: number) => void;
    creandoDep: boolean;
    onToggleCrear: (v: boolean) => void;
    depNombres: string; onDepNombres: (v: string) => void;
    depApellidos: string; onDepApellidos: (v: string) => void;
    depDni: string; onDepDni: (v: string) => void;
    depFechaNac: string; onDepFechaNac: (v: string) => void;
    depParentesco: string; onDepParentesco: (v: string) => void;
    guardandoDep: boolean;
    errorDep: string | null;
    onGuardarDep: () => void;
}) => {
    const requiereMenor = !!especialidad.requiere_datos_menor;
    // Si requiere menor, no se puede confirmar sin uno elegido
    const bloqueoMenor = requiereMenor && !dependienteSel;

    return (
    <Card className="p-8">
        <h2 className="text-xl font-extrabold text-blue-deep mb-2">Elige la hora y describe el motivo</h2>
        <p className="text-sm text-mute mb-2">{especialidad.nombre} · {formatearFecha(fecha)}</p>
        <p className="text-xs text-sky-deep font-semibold mb-6">👨‍⚕️ Dr. {medico.nombres} {medico.apellidos}</p>

        <div className="mb-6">
            <p className="text-xs font-bold text-ink-soft mb-3">HORARIOS DISPONIBLES</p>
            {cargando && <p className="text-mute text-sm py-6 text-center">Cargando horarios...</p>}
            {!cargando && horarios.length === 0 && (
                <div className="bg-warning-soft border border-warning rounded-lg p-4 text-center">
                    <p className="text-sm text-warning font-semibold">No hay horarios para esta fecha. Prueba otra.</p>
                </div>
            )}
            {!cargando && horarios.length > 0 && (
                <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                    {horarios.map(h => {
                        const activo = horaSel?.hora === h.hora;
                        const ocupado = !h.disponible;
                        return (
                            <button key={h.hora} onClick={() => !ocupado && onSeleccionarHora(h)} disabled={ocupado}
                                aria-pressed={activo}
                                className={`p-3 rounded-lg border-2 text-sm font-bold transition-all
                                    ${activo ? 'border-blue-deep bg-sky-main text-white shadow-cta ring-2 ring-offset-2 ring-blue-deep' : ''}
                                    ${!activo && !ocupado ? 'border-gray-200 text-ink-soft hover:border-sky-main hover:bg-sky-soft' : ''}
                                    ${ocupado ? 'border-gray-100 bg-gray-100 text-gray-400 cursor-not-allowed line-through' : ''}`}>
                                {activo && <span aria-hidden="true">✓ </span>}{formatearHora(h.hora)}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>

        {horaSel && (
            <form onSubmit={onConfirmar} className="space-y-4 border-t pt-6">
                {/* ===== SECCIÓN DATOS DEL MENOR (solo si la especialidad lo requiere) ===== */}
                {requiereMenor && (
                    <div className="bg-blue-50 border border-sky-main/30 rounded-lg p-4">
                        <p className="text-xs font-bold text-sky-deep mb-1">👶 DATOS DEL MENOR</p>
                        <p className="text-[11px] text-mute mb-3">Esta especialidad es para menores. Indica de quién es la cita.</p>

                        {/* Lista de dependientes guardados */}
                        {dependientes.length > 0 && !creandoDep && (
                            <div className="space-y-2 mb-3">
                                {dependientes.map(d => {
                                    const activo = dependienteSel === d.id_dependiente;
                                    return (
                                        <button type="button" key={d.id_dependiente}
                                            onClick={() => onElegirDependiente(d.id_dependiente)}
                                            className={`w-full text-left p-3 rounded-lg border-2 transition-all
                                                ${activo ? 'border-sky-main bg-sky-soft' : 'border-gray-200 hover:border-sky-main bg-white'}`}>
                                            <p className="text-sm font-bold text-ink">{d.nombres} {d.apellidos}</p>
                                            <p className="text-[11px] text-mute">
                                                DNI: {d.dni ?? '—'} · {d.parentesco ?? ''}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Botón para alternar "agregar nuevo" */}
                        {!creandoDep && (
                            <button type="button" onClick={() => onToggleCrear(true)}
                                className="text-xs font-bold text-sky-main hover:text-sky-deep">
                                + Registrar otro menor
                            </button>
                        )}

                        {/* Formulario de nuevo menor */}
                        {creandoDep && (
                            <div className="space-y-3 bg-white rounded-lg p-3 border border-gray-200">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    <input value={depNombres} onChange={(e) => onDepNombres(filtrarLetras(e.target.value))}
                                        placeholder="Nombres" maxLength={100}
                                        className="px-3 py-2 text-sm bg-white rounded-lg border border-gray-200 focus:border-sky-main outline-none" />
                                    <input value={depApellidos} onChange={(e) => onDepApellidos(filtrarLetras(e.target.value))}
                                        placeholder="Apellidos" maxLength={100}
                                        className="px-3 py-2 text-sm bg-white rounded-lg border border-gray-200 focus:border-sky-main outline-none" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    <input value={depDni} onChange={(e) => onDepDni(e.target.value.replace(/\D/g, '').slice(0, 8))}
                                        placeholder="DNI (8 dígitos)" maxLength={8}
                                        className="px-3 py-2 text-sm bg-white rounded-lg border border-gray-200 focus:border-sky-main outline-none" />
                                    <input type="date" value={depFechaNac} onChange={(e) => onDepFechaNac(e.target.value)}
                                        className="px-3 py-2 text-sm bg-white rounded-lg border border-gray-200 focus:border-sky-main outline-none" />
                                </div>
                                <select value={depParentesco} onChange={(e) => onDepParentesco(e.target.value)}
                                    className="w-full px-3 py-2 text-sm bg-white rounded-lg border border-gray-200 focus:border-sky-main outline-none">
                                    <option value="">¿Qué eres del menor?</option>
                                    {PARENTESCOS.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                                {errorDep && <p className="text-[11px] text-danger font-semibold">⚠ {errorDep}</p>}
                                <div className="flex gap-2">
                                    <Boton type="button" variante="secondary" tamano="sm" onClick={() => onToggleCrear(false)}>Cancelar</Boton>
                                    <Boton type="button" tamano="sm" onClick={onGuardarDep} disabled={guardandoDep}>
                                        {guardandoDep ? 'Guardando...' : 'Guardar menor'}
                                    </Boton>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div>
                    <label className="block text-xs font-semibold text-ink-soft mb-2">Motivo de la consulta *</label>
                    <textarea value={motivo} onChange={(e) => onMotivo(e.target.value)}
                        placeholder="Ej: Dolor de cabeza recurrente desde hace 3 días"
                        rows={3} required maxLength={500}
                        className="w-full px-4 py-3 text-sm bg-white rounded-lg border border-gray-200 focus:border-sky-main outline-none resize-none" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-ink-soft mb-2">Notas adicionales (opcional)</label>
                    <textarea value={notas} onChange={(e) => onNotas(e.target.value)}
                        placeholder="Información extra para el médico" rows={2} maxLength={1000}
                        className="w-full px-4 py-3 text-sm bg-white rounded-lg border border-gray-200 focus:border-sky-main outline-none resize-none" />
                </div>
                <div className="bg-sky-soft rounded-lg p-4">
                    <p className="text-xs font-bold text-sky-deep mb-2">RESUMEN DE TU CITA</p>
                    <ul className="text-sm text-ink-soft space-y-1">
                        <li>📋 <strong>Especialidad:</strong> {especialidad.nombre}</li>
                        <li>👨‍⚕️ <strong>Médico:</strong> Dr. {medico.nombres} {medico.apellidos}</li>
                        <li>📅 <strong>Fecha:</strong> {formatearFecha(fecha)}</li>
                        <li>⏰ <strong>Hora:</strong> {formatearHora(horaSel.hora)}</li>
                    </ul>
                </div>
                {error && <div className="bg-danger-soft border border-danger-border rounded-lg p-3"><p className="text-xs text-danger font-semibold">⚠ {error}</p></div>}
                {bloqueoMenor && <p className="text-[11px] text-warning font-semibold">⚠ Selecciona o registra los datos del menor para continuar.</p>}
                <div className="flex gap-3">
                    <Boton type="button" variante="secondary" onClick={onAtras}>← Atrás</Boton>
                    <Boton type="submit" disabled={!motivo.trim() || cargando || bloqueoMenor} fullWidth>
                        {cargando ? 'Reservando...' : '✓ Confirmar reserva'}
                    </Boton>
                </div>
            </form>
        )}

        {!horaSel && horarios.length > 0 && (
            <div className="flex gap-3 border-t pt-6">
                <Boton variante="secondary" onClick={onAtras}>← Atrás</Boton>
                <p className="flex-1 text-center text-sm text-mute self-center">Selecciona un horario para continuar</p>
            </div>
        )}
    </Card>
    );
};

// ============== ÉXITO ==============
const ExitoReserva = ({ especialidad, fecha, hora }: { especialidad: string; fecha: string; hora: string }) => (
    <Card className="p-12 text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-success flex items-center justify-center">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                <path d="M5 12 L10 17 L19 8" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        </div>
        <h2 className="text-3xl font-extrabold text-blue-deep mb-2">¡Cita reservada!</h2>
        <p className="text-sm text-mute mb-6">Te esperamos en el Policlínico CareNest</p>
        <div className="inline-block bg-sky-soft rounded-2xl px-6 py-4 mb-6">
            <p className="text-lg font-bold text-sky-deep">{especialidad}</p>
            <p className="text-sm text-ink-soft mt-1">{formatearFecha(fecha)} · {formatearHora(hora)}</p>
        </div>
        <p className="text-xs text-mute">Redirigiendo a tu inicio...</p>
    </Card>
);