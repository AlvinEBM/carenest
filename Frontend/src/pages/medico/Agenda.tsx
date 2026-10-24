// =================================================================
// Vista MÉDICO — Agenda del día, registro de atención e historial.
//
//   - El médico solo ve SUS citas (el backend usa el JWT, no un id
//     enviado por el cliente).
//   - "Atender" registra diagnóstico + indicaciones y deja la cita
//     COMPLETADA. Solo para citas de hoy o pasadas, no atendidas.
//   - "Historial" muestra las atenciones previas del paciente.
// =================================================================
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';

import { HeaderAdmin } from '../../components/layout/HeaderAdmin';
import { Card } from '../../components/common/Card';
import { Boton } from '../../components/common/Boton';
import { Modal } from '../../components/common/Modal';
import { BadgeEstadoCita, BadgePago, Badge } from '../../components/common/Badge';

import { medicoApi } from '../../api/medicoApi';
import { AtencionHistorial, CitaAgenda, PerfilMedico, ResumenAgenda } from '../../types';
import { formatearFecha, formatearHora, obtenerIniciales } from '../../utils/formatters';
import { hoyLocal } from '../../utils/fechas';

const ESTADOS_ATENDIBLES = ['RESERVADA', 'CONFIRMADA', 'RECORDATORIO', 'COMPLETADA'];
const DIAG_MIN = 5;
const DIAG_MAX = 1000;

const sumarDias = (fecha: string, dias: number) => {
    const [a, m, d] = fecha.split('-').map(Number);
    return hoyLocal(new Date(a, m - 1, d + dias));
};

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

export const Agenda = () => {
    const hoy = hoyLocal();
    const [fecha, setFecha]       = useState(hoy);
    const [medico, setMedico]     = useState<PerfilMedico | null>(null);
    const [resumen, setResumen]   = useState<ResumenAgenda | null>(null);
    const [citas, setCitas]       = useState<CitaAgenda[]>([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError]       = useState<string | null>(null);

    // Modal atender
    const [citaAtender, setCitaAtender] = useState<CitaAgenda | null>(null);
    const [diagnostico, setDiagnostico] = useState('');
    const [indicaciones, setIndicaciones] = useState('');
    const [guardando, setGuardando]     = useState(false);
    const [errorAtencion, setErrorAtencion] = useState<string | null>(null);
    const [aviso, setAviso] = useState<string | null>(null);

    // Modal historial
    const [citaHistorial, setCitaHistorial] = useState<CitaAgenda | null>(null);
    const [historial, setHistorial] = useState<AtencionHistorial[]>([]);
    const [cargandoHist, setCargandoHist] = useState(false);
    const [errorHist, setErrorHist] = useState<string | null>(null);

    const cargar = useCallback(async (f: string) => {
        setCargando(true);
        setError(null);
        try {
            const data = await medicoApi.agenda(f);
            setMedico(data.medico);
            setResumen(data.resumen);
            setCitas(data.citas ?? []);
        } catch (e) {
            setError(mensajeError(e, 'No se pudo cargar tu agenda'));
            setCitas([]);
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => { cargar(fecha); }, [fecha, cargar]);

    const puedeAtender = (c: CitaAgenda) =>
        !c.atendida && ESTADOS_ATENDIBLES.includes(c.estado) && c.fecha <= hoy;

    // ---------- Atender ----------
    const abrirAtender = (c: CitaAgenda) => {
        setCitaAtender(c);
        setDiagnostico('');
        setIndicaciones('');
        setErrorAtencion(null);
    };
    const cerrarAtender = useCallback(() => setCitaAtender(null), []);

    const diagLimpio = diagnostico.trim();
    const diagValido = diagLimpio.length >= DIAG_MIN && diagLimpio.length <= DIAG_MAX;

    const guardarAtencion = async (e: FormEvent) => {
        e.preventDefault();
        if (!citaAtender || !diagValido) return;
        setGuardando(true);
        setErrorAtencion(null);
        try {
            const res = await medicoApi.atender(citaAtender.id_cita, {
                diagnostico: diagLimpio,
                indicaciones: indicaciones.trim() || undefined,
            });
            setAviso(res.mensaje ?? 'Atención registrada');
            setCitaAtender(null);
            await cargar(fecha);
        } catch (err) {
            setErrorAtencion(mensajeError(err, 'No se pudo registrar la atención'));
        } finally {
            setGuardando(false);
        }
    };

    // ---------- Historial ----------
    const abrirHistorial = async (c: CitaAgenda) => {
        setCitaHistorial(c);
        setHistorial([]);
        setErrorHist(null);
        setCargandoHist(true);
        try {
            const data = await medicoApi.historial(c.id_paciente);
            setHistorial(data.atenciones ?? []);
        } catch (err) {
            setErrorHist(mensajeError(err, 'No se pudo cargar el historial'));
        } finally {
            setCargandoHist(false);
        }
    };
    const cerrarHistorial = useCallback(() => setCitaHistorial(null), []);

    const ordenadas = useMemo(() => [...citas].sort((a, b) => a.hora.localeCompare(b.hora)), [citas]);

    return (
        <div className="min-h-screen bg-smoke">
            <HeaderAdmin />

            <main className="max-w-6xl mx-auto px-6 py-8">
                {/* Encabezado */}
                <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-extrabold text-ink">Mi agenda</h1>
                        {medico && (
                            <p className="text-sm text-mute mt-1">
                                Dr(a). {medico.nombres} {medico.apellidos} · {medico.especialidad}
                                {medico.colegiatura && <> · Colegiatura {medico.colegiatura}</>}
                            </p>
                        )}
                        <p className="text-sm font-semibold text-sky-deep mt-1 capitalize">{formatearFecha(fecha)}</p>
                    </div>
                    {resumen && (
                        <div className="flex flex-wrap gap-3" aria-label="Resumen del día">
                            <StatMini label="CITAS" valor={resumen.total} color="text-ink" />
                            <StatMini label="POR ATENDER" valor={resumen.pendientes} color="text-sky-main" />
                            <StatMini label="ATENDIDAS" valor={resumen.atendidas} color="text-success" />
                            <StatMini label="FALTAS" valor={resumen.faltas} color="text-danger" />
                        </div>
                    )}
                </div>

                {/* Selector de fecha */}
                <Card className="p-4 mb-6">
                    <div className="flex flex-wrap items-center gap-3">
                        <label htmlFor="fecha-agenda" className="text-sm font-semibold text-ink-soft">Fecha:</label>
                        <input
                            id="fecha-agenda"
                            type="date"
                            value={fecha}
                            onChange={(e) => e.target.value && setFecha(e.target.value)}
                            className="px-4 py-2 text-sm bg-white rounded-lg border border-gray-200 focus:border-sky-main outline-none"
                        />
                        <Boton tamano="sm" variante="secondary" onClick={() => setFecha(sumarDias(fecha, -1))} aria-label="Día anterior">← Anterior</Boton>
                        <Boton tamano="sm" variante="secondary" onClick={() => setFecha(hoy)} disabled={fecha === hoy}>Hoy</Boton>
                        <Boton tamano="sm" variante="secondary" onClick={() => setFecha(sumarDias(fecha, 1))} aria-label="Día siguiente">Siguiente →</Boton>
                    </div>
                </Card>

                {aviso && (
                    <div role="status" className="mb-4 flex items-center justify-between rounded-xl bg-success-soft px-4 py-3 text-sm font-semibold text-success-deep">
                        <span>✓ {aviso}</span>
                        <button type="button" onClick={() => setAviso(null)} aria-label="Cerrar aviso" className="text-success-deep">✕</button>
                    </div>
                )}

                {/* Lista */}
                {cargando ? (
                    <Card className="p-8 text-center"><p className="text-mute text-sm">Cargando agenda...</p></Card>
                ) : error ? (
                    <Card className="p-8 text-center" role="alert"><p className="text-danger text-sm font-semibold">{error}</p></Card>
                ) : ordenadas.length === 0 ? (
                    <Card className="p-12 text-center">
                        <p className="text-4xl mb-2" aria-hidden="true">🗓️</p>
                        <p className="text-mute text-sm">No tienes citas programadas para este día</p>
                    </Card>
                ) : (
                    <ul className="space-y-3">
                        {ordenadas.map(c => (
                            <li key={c.id_cita}>
                                <Card
                                    bordeLateral={
                                        c.atendida ? 'success' :
                                        c.estado === 'FALTA' || c.estado === 'CANCELADA' ? 'danger' : 'sky'
                                    }
                                    className="p-5"
                                >
                                    <div className="flex flex-wrap items-center gap-4">
                                        <div className="text-center min-w-[80px]">
                                            <p className="text-lg font-extrabold text-sky-deep">{formatearHora(c.hora)}</p>
                                        </div>

                                        <div className="flex items-center gap-3 flex-1 min-w-[220px]">
                                            <div className="w-10 h-10 rounded-full bg-sky-soft flex items-center justify-center text-xs font-bold text-sky-deep" aria-hidden="true">
                                                {obtenerIniciales(c.paciente_nombres, c.paciente_apellidos)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-ink text-sm">
                                                    {c.paciente_nombres} {c.paciente_apellidos}
                                                    {c.es_menor && <span className="ml-2"><Badge variante="warning">MENOR</Badge></span>}
                                                </p>
                                                <p className="text-xs text-mute">
                                                    {c.paciente_dni ? `DNI ${c.paciente_dni}` : 'Sin DNI'}
                                                    {c.es_menor && <> · {c.parentesco ?? 'Familiar'} de {c.titular_nombres} {c.titular_apellidos}</>}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-start gap-1 min-w-[140px]">
                                            {c.atendida
                                                ? <Badge variante="success">✓ ATENDIDA</Badge>
                                                : <BadgeEstadoCita estado={c.estado} />}
                                            <BadgePago estado={c.estado_pago} />
                                        </div>

                                        <div className="flex gap-2">
                                            <Boton tamano="sm" variante="secondary" onClick={() => abrirHistorial(c)}>
                                                Historial
                                            </Boton>
                                            {puedeAtender(c) && (
                                                <Boton tamano="sm" onClick={() => abrirAtender(c)}>
                                                    Atender
                                                </Boton>
                                            )}
                                        </div>
                                    </div>

                                    {c.motivo && (
                                        <p className="mt-3 pt-3 border-t border-gray-100 text-xs text-mute">
                                            <span className="font-bold">Motivo:</span> {c.motivo}
                                        </p>
                                    )}
                                </Card>
                            </li>
                        ))}
                    </ul>
                )}
            </main>

            {/* ===== MODAL ATENDER ===== */}
            <Modal
                abierto={!!citaAtender}
                titulo="Registrar atención"
                subtitulo={citaAtender ? `${citaAtender.paciente_nombres} ${citaAtender.paciente_apellidos} · ${formatearHora(citaAtender.hora)}` : ''}
                onCerrar={cerrarAtender}
            >
                {citaAtender && (
                    <form onSubmit={guardarAtencion} className="space-y-4" noValidate>
                        {citaAtender.motivo && (
                            <p className="text-xs text-mute bg-smoke rounded-lg p-3">
                                <span className="font-bold">Motivo de consulta:</span> {citaAtender.motivo}
                            </p>
                        )}

                        <div>
                            <label htmlFor="diagnostico" className="block text-xs font-semibold text-ink-soft mb-2">
                                Diagnóstico <span className="text-danger" aria-hidden="true">*</span>
                            </label>
                            <textarea
                                id="diagnostico"
                                value={diagnostico}
                                onChange={(e) => setDiagnostico(e.target.value)}
                                maxLength={DIAG_MAX}
                                rows={4}
                                required
                                aria-required="true"
                                aria-invalid={diagnostico.length > 0 && !diagValido}
                                aria-describedby="diagnostico-ayuda"
                                placeholder="Ej. Cefalea tensional"
                                className="w-full px-4 py-3 text-sm bg-white rounded-lg border border-gray-200 focus:border-sky-main outline-none resize-y"
                            />
                            <p id="diagnostico-ayuda" className={`mt-1 text-[11px] ${diagnostico.length > 0 && !diagValido ? 'text-danger font-semibold' : 'text-mute'}`}>
                                Entre {DIAG_MIN} y {DIAG_MAX} caracteres · {diagLimpio.length}/{DIAG_MAX}
                            </p>
                        </div>

                        <div>
                            <label htmlFor="indicaciones" className="block text-xs font-semibold text-ink-soft mb-2">
                                Indicaciones / tratamiento (opcional)
                            </label>
                            <textarea
                                id="indicaciones"
                                value={indicaciones}
                                onChange={(e) => setIndicaciones(e.target.value)}
                                maxLength={DIAG_MAX}
                                rows={3}
                                placeholder="Ej. Paracetamol 500 mg cada 8 horas por 3 días"
                                className="w-full px-4 py-3 text-sm bg-white rounded-lg border border-gray-200 focus:border-sky-main outline-none resize-y"
                            />
                        </div>

                        {errorAtencion && <p role="alert" className="text-xs text-danger font-semibold">{errorAtencion}</p>}

                        <div className="flex gap-3 pt-2">
                            <Boton type="button" variante="secondary" fullWidth onClick={cerrarAtender}>Cancelar</Boton>
                            <Boton type="submit" fullWidth disabled={!diagValido || guardando}>
                                {guardando ? 'Guardando...' : 'Guardar y completar cita'}
                            </Boton>
                        </div>
                    </form>
                )}
            </Modal>

            {/* ===== MODAL HISTORIAL ===== */}
            <Modal
                abierto={!!citaHistorial}
                titulo="Historial de atenciones"
                subtitulo={citaHistorial ? `${citaHistorial.paciente_nombres} ${citaHistorial.paciente_apellidos}` : ''}
                onCerrar={cerrarHistorial}
                ancho="lg"
            >
                {cargandoHist ? (
                    <p className="text-sm text-mute text-center py-6">Cargando historial...</p>
                ) : errorHist ? (
                    <p role="alert" className="text-sm text-danger font-semibold text-center py-6">{errorHist}</p>
                ) : historial.length === 0 ? (
                    <p className="text-sm text-mute text-center py-6">El paciente aún no tiene atenciones registradas.</p>
                ) : (
                    <ol className="space-y-3">
                        {historial.map(a => (
                            <li key={a.id_atencion} className="rounded-xl border border-gray-100 p-4">
                                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                    <p className="text-sm font-bold text-ink">{a.especialidad}</p>
                                    <p className="text-xs text-mute">{formatearFecha(a.fecha)} · {formatearHora(a.hora)} · Dr(a). {a.medico}</p>
                                </div>
                                <p className="text-sm text-ink-soft"><span className="font-semibold">Diagnóstico:</span> {a.diagnostico}</p>
                                {a.indicaciones && (
                                    <p className="text-sm text-ink-soft mt-1"><span className="font-semibold">Indicaciones:</span> {a.indicaciones}</p>
                                )}
                            </li>
                        ))}
                    </ol>
                )}
            </Modal>
        </div>
    );
};

const StatMini = ({ label, valor, color }: { label: string; valor: number; color: string }) => (
    <Card className="px-5 py-3 text-center">
        <p className="text-[10px] font-bold text-mute tracking-wider">{label}</p>
        <p className={`text-2xl font-extrabold ${color}`}>{valor}</p>
    </Card>
);
