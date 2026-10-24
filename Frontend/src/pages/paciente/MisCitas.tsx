// =================================================================
// Mis Citas — Historial del paciente con filtros y paginación.
//   - Filtro por estado (Todas / Próximas / Completadas / Faltas / Canceladas)
//   - Filtro por especialidad
//   - Filtro por rango de fechas (desde / hasta)
//   - Paginación (6 por página)
//   - NUEVO: pago de la cita con Mercado Pago y verificación del pago
// =================================================================
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Header } from '../../components/layout/Header';
import { Card } from '../../components/common/Card';
import { Boton } from '../../components/common/Boton';
import { BadgeEstadoCita, BadgePago } from '../../components/common/Badge';
import axios from 'axios';

import { citasApi } from '../../api/citasApi';
import { pagosApi } from '../../api/pagosApi';
import { CitaConDetalles, EstadoCita } from '../../types';
import { formatearFecha, formatearHora, diasDesdeHoy } from '../../utils/formatters';
import { formatearSoles } from '../../utils/fechas';

// BUG CORREGIDO: "Próximas" filtraba solo RESERVADA; las citas
// CONFIRMADA (pagadas) o en RECORDATORIO desaparecían del filtro.
type Filtro = 'TODAS' | 'PROXIMAS' | EstadoCita;
const ESTADOS_PROXIMOS: EstadoCita[] = ['RESERVADA', 'CONFIRMADA', 'RECORDATORIO'];

const POR_PAGINA = 6;

export const MisCitas = () => {
    const navigate = useNavigate();
    const [citas, setCitas]       = useState<CitaConDetalles[]>([]);
    const [cargando, setCargando] = useState(true);
    const [cancelandoId, setCancelandoId] = useState<number | null>(null);

    // Filtros
    const [filtro, setFiltro]         = useState<Filtro>('TODAS');
    const [filtroEsp, setFiltroEsp]   = useState('');
    const [fechaDesde, setFechaDesde] = useState('');
    const [fechaHasta, setFechaHasta] = useState('');

    // Paginación
    const [pagina, setPagina] = useState(1);

    // Modales
    const [citaAConfirmar, setCitaAConfirmar] = useState<number | null>(null);
    const [resultado, setResultado] = useState<{ mensaje: string; bloqueada: boolean; sancionada: boolean } | null>(null);

    // Pagos
    const [pagosHabilitados, setPagosHabilitados] = useState(false);
    const [pagandoId, setPagandoId]         = useState<number | null>(null);
    const [verificandoId, setVerificandoId] = useState<number | null>(null);
    const [avisoPago, setAvisoPago] = useState<{ titulo: string; mensaje: string; tipo: 'ok' | 'info' | 'error'; idPago?: number } | null>(null);

    const cargar = async () => {
        try {
            const data = await citasApi.misCitas();
            setCitas(data);
        } catch (e) {
            console.error('Error cargando citas:', e);
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargar();
        pagosApi.estado()
            .then(r => setPagosHabilitados(!!r.habilitado))
            .catch(() => setPagosHabilitados(false));
    }, []);

    // ---------- Pago con Mercado Pago ----------
    const pagar = async (cita: CitaConDetalles) => {
        // Se abre la pestaña en el MISMO clic para que el navegador no la bloquee
        const ventana = window.open('', '_blank');
        setPagandoId(cita.id_cita);
        try {
            const res = await pagosApi.crearPreferencia(cita.id_cita);
            if (ventana) {
                ventana.location.href = res.url_pago;
            } else {
                window.location.href = res.url_pago;
                return;
            }
            await cargar();
            setAvisoPago({
                tipo: 'info',
                titulo: 'Completa tu pago',
                mensaje: 'Se abrió Mercado Pago en otra pestaña. Cuando termines, vuelve aquí y pulsa "Verificar pago".',
                idPago: res.id_pago,
            });
        } catch (e) {
            ventana?.close();
            const msg = axios.isAxiosError(e) ? e.response?.data?.mensaje : null;
            setAvisoPago({ tipo: 'error', titulo: 'No se pudo iniciar el pago', mensaje: msg ?? 'Intenta nuevamente en unos minutos.' });
        } finally {
            setPagandoId(null);
        }
    };

    const verificarPago = async (idPago: number) => {
        setVerificandoId(idPago);
        try {
            const r = await pagosApi.verificar(idPago);
            await cargar();
            setAvisoPago({
                tipo: r.estado === 'APROBADO' ? 'ok' : r.estado === 'RECHAZADO' ? 'error' : 'info',
                titulo: r.estado === 'APROBADO' ? 'Pago aprobado' : r.estado === 'RECHAZADO' ? 'Pago rechazado' : 'Pago en proceso',
                mensaje: r.mensaje,
            });
        } catch (e) {
            const msg = axios.isAxiosError(e) ? e.response?.data?.mensaje : null;
            setAvisoPago({ tipo: 'error', titulo: 'No se pudo verificar', mensaje: msg ?? 'Intenta nuevamente.' });
        } finally {
            setVerificandoId(null);
        }
    };

    // Cada vez que cambia un filtro, volvemos a la página 1
    useEffect(() => { setPagina(1); }, [filtro, filtroEsp, fechaDesde, fechaHasta]);

    const confirmarCancelacion = async () => {
        if (citaAConfirmar === null) return;
        const idCita = citaAConfirmar;
        setCitaAConfirmar(null);
        setCancelandoId(idCita);
        try {
            const res = (await citasApi.cancelar(idCita)) as { mensaje?: string; cuentaBloqueada?: boolean; sancionada?: boolean };
            await cargar();
            setResultado({
                mensaje: res.mensaje ?? 'Cita cancelada correctamente',
                bloqueada: !!res.cuentaBloqueada,
                sancionada: !!res.sancionada,
            });
        } catch {
            setResultado({ mensaje: 'No se pudo cancelar la cita', bloqueada: false, sancionada: false });
        } finally {
            setCancelandoId(null);
        }
    };

    // Especialidades presentes en las citas (para el dropdown)
    const especialidadesUnicas = useMemo(
        () => Array.from(new Set(citas.map(c => c.especialidad).filter(Boolean))).sort() as string[],
        [citas],
    );

    // Aplica TODOS los filtros
    const filtradas = useMemo(() => {
        return citas.filter(c => {
            if (filtro === 'PROXIMAS' && !ESTADOS_PROXIMOS.includes(c.estado)) return false;
            if (filtro !== 'TODAS' && filtro !== 'PROXIMAS' && c.estado !== filtro) return false;
            if (filtroEsp && c.especialidad !== filtroEsp) return false;
            if (fechaDesde && (!c.fecha || c.fecha < fechaDesde)) return false;
            if (fechaHasta && (!c.fecha || c.fecha > fechaHasta)) return false;
            return true;
        });
    }, [citas, filtro, filtroEsp, fechaDesde, fechaHasta]);

    // Paginación
    const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
    const paginaSegura = Math.min(pagina, totalPaginas);
    const visibles = filtradas.slice((paginaSegura - 1) * POR_PAGINA, paginaSegura * POR_PAGINA);

    const limpiarFiltros = () => {
        setFiltro('TODAS'); setFiltroEsp(''); setFechaDesde(''); setFechaHasta('');
    };

    const hayFiltrosActivos = filtro !== 'TODAS' || !!filtroEsp || !!fechaDesde || !!fechaHasta;

    const filtros: { id: Filtro; label: string }[] = [
        { id: 'TODAS', label: 'Todas' },
        { id: 'PROXIMAS', label: 'Próximas' },
        { id: 'COMPLETADA', label: 'Completadas' },
        { id: 'FALTA', label: 'Faltas' },
        { id: 'CANCELADA', label: 'Canceladas' },
    ];

    const esCancelable = (estado: EstadoCita) => ESTADOS_PROXIMOS.includes(estado);

    const citaAConfirmarPagada = citas.find(c => c.id_cita === citaAConfirmar)?.estado_pago === 'APROBADO';

    return (
        <div className="min-h-screen bg-smoke">
            <Header />

            <main className="max-w-6xl mx-auto px-6 py-8">
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-extrabold text-ink">Mis citas</h1>
                        <p className="text-sm text-mute mt-1">Historial completo de tus citas médicas</p>
                    </div>
                    <Boton onClick={() => navigate('/paciente/reservar')}>+ Nueva cita</Boton>
                </div>

                {/* Filtros por estado */}
                <div className="flex flex-wrap gap-2 mb-4">
                    {filtros.map(f => (
                        <button
                            key={f.id}
                            type="button"
                            aria-pressed={filtro === f.id}
                            onClick={() => setFiltro(f.id)}
                            className={`px-4 py-2 rounded-full text-xs font-bold transition-all
                                ${filtro === f.id ? 'bg-sky-main text-white shadow-card' : 'bg-white text-mute hover:bg-sky-soft hover:text-sky-deep'}`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* Filtros por especialidad y fechas */}
                <Card className="p-4 mb-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
                        <div>
                            <label className="block text-xs font-bold text-mute mb-1">Especialidad</label>
                            <select
                                value={filtroEsp}
                                onChange={(e) => setFiltroEsp(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-ink-soft bg-white focus:outline-none focus:border-sky-main"
                            >
                                <option value="">Todas</option>
                                {especialidadesUnicas.map(esp => (
                                    <option key={esp} value={esp}>{esp}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-mute mb-1">Desde</label>
                            <input
                                type="date"
                                value={fechaDesde}
                                onChange={(e) => setFechaDesde(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-ink-soft bg-white focus:outline-none focus:border-sky-main"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-mute mb-1">Hasta</label>
                            <input
                                type="date"
                                value={fechaHasta}
                                onChange={(e) => setFechaHasta(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-ink-soft bg-white focus:outline-none focus:border-sky-main"
                            />
                        </div>
                        <Boton variante="secondary" onClick={limpiarFiltros} disabled={!hayFiltrosActivos}>
                            Limpiar filtros
                        </Boton>
                    </div>
                </Card>

                {cargando && (
                    <Card className="p-8 text-center"><p className="text-mute text-sm">Cargando tus citas...</p></Card>
                )}

                {!cargando && filtradas.length === 0 && (
                    <Card className="p-12 text-center">
                        <p className="text-mute text-sm mb-4">
                            No tienes citas {hayFiltrosActivos ? 'que coincidan con los filtros' : 'registradas'}
                        </p>
                        {hayFiltrosActivos
                            ? <Boton variante="secondary" onClick={limpiarFiltros}>Quitar filtros</Boton>
                            : <Boton onClick={() => navigate('/paciente/reservar')}>Agendar mi primera cita</Boton>
                        }
                    </Card>
                )}

                {!cargando && filtradas.length > 0 && (
                    <>
                        <p className="text-xs text-mute mb-3">
                            {filtradas.length} cita(s) encontrada(s)
                        </p>

                        <div className="space-y-3">
                            {visibles.map(cita => (
                                <Card
                                    key={cita.id_cita}
                                    bordeLateral={
                                        cita.estado === 'COMPLETADA' ? 'success' :
                                        cita.estado === 'FALTA' || cita.estado === 'CANCELADA' ? 'danger' : 'sky'
                                    }
                                    className="p-5"
                                >
                                    <div className="flex flex-wrap items-center gap-4">
                                        <div className="flex-1 min-w-[200px]">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-bold text-ink text-base">
                                                    {cita.especialidad ?? 'Especialidad'}
                                                </h3>
                                                <BadgeEstadoCita estado={cita.estado} />
                                                {(esCancelable(cita.estado) || cita.estado_pago) && (
                                                    <BadgePago estado={cita.estado_pago} />
                                                )}
                                            </div>
                                            {cita.medico_nombres && (
                                                <p className="text-sm text-mute">
                                                    Dr. {cita.medico_nombres} {cita.medico_apellidos}
                                                </p>
                                            )}
                                            {cita.es_para_menor && cita.dependiente_nombres && (
                                                <p className="text-sm text-sky-main font-bold mt-0.5">
                                                    Paciente: {cita.dependiente_nombres} {cita.dependiente_apellidos}
                                                    {cita.dependiente_parentesco && (
                                                        <span className="text-mute font-normal">
                                                            {' '}({cita.dependiente_parentesco})
                                                        </span>
                                                    )}
                                                </p>
                                            )}
                                        </div>

                                        <div className="text-right min-w-[160px]">
                                            <p className="text-sm font-bold text-ink-soft">
                                                {formatearFecha(cita.fecha ?? '')}
                                            </p>
                                            <p className="text-xs text-mute">
                                                {formatearHora(cita.hora ?? '')}
                                                {esCancelable(cita.estado) && cita.fecha && (
                                                    <span className="ml-2 text-sky-main font-bold">
                                                        · {diasDesdeHoy(cita.fecha)}
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    {cita.motivo && (
                                        <div className="mt-3 pt-3 border-t border-gray-100">
                                            <p className="text-xs text-mute">
                                                <span className="font-bold">Motivo:</span> {cita.motivo}
                                            </p>
                                        </div>
                                    )}

                                    {esCancelable(cita.estado) && (
                                        <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                                            {cita.precio != null && cita.estado_pago !== 'APROBADO' && (
                                                <span className="text-xs text-mute mr-auto">
                                                    Costo de la consulta: <span className="font-bold text-ink-soft">{formatearSoles(cita.precio)}</span>
                                                </span>
                                            )}
                                            {cita.estado_pago === 'PENDIENTE' && cita.id_pago && (
                                                <Boton
                                                    variante="secondary"
                                                    tamano="sm"
                                                    disabled={verificandoId === cita.id_pago}
                                                    onClick={() => verificarPago(cita.id_pago!)}
                                                >
                                                    {verificandoId === cita.id_pago ? 'Verificando...' : '↻ Verificar pago'}
                                                </Boton>
                                            )}
                                            {pagosHabilitados && cita.estado_pago !== 'APROBADO' && (
                                                <Boton
                                                    variante="success"
                                                    tamano="sm"
                                                    disabled={pagandoId === cita.id_cita}
                                                    onClick={() => pagar(cita)}
                                                >
                                                    {pagandoId === cita.id_cita ? 'Abriendo Mercado Pago...' : `Pagar ${formatearSoles(cita.precio)}`}
                                                </Boton>
                                            )}
                                            <Boton
                                                variante="danger"
                                                tamano="sm"
                                                disabled={cancelandoId === cita.id_cita}
                                                onClick={() => setCitaAConfirmar(cita.id_cita)}
                                            >
                                                {cancelandoId === cita.id_cita ? 'Cancelando...' : 'Cancelar cita'}
                                            </Boton>
                                        </div>
                                    )}
                                </Card>
                            ))}
                        </div>

                        {/* Controles de paginación */}
                        {totalPaginas > 1 && (
                            <div className="flex items-center justify-center gap-3 mt-6">
                                <Boton
                                    variante="secondary"
                                    tamano="sm"
                                    disabled={paginaSegura <= 1}
                                    onClick={() => setPagina(p => Math.max(1, p - 1))}
                                >
                                    ← Anterior
                                </Boton>
                                <span className="text-sm font-semibold text-mute">
                                    Página {paginaSegura} de {totalPaginas}
                                </span>
                                <Boton
                                    variante="secondary"
                                    tamano="sm"
                                    disabled={paginaSegura >= totalPaginas}
                                    onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                                >
                                    Siguiente →
                                </Boton>
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* MODAL DE CONFIRMACIÓN */}
            {citaAConfirmar !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="bg-white rounded-2xl shadow-dropdown w-full max-w-sm p-6">
                        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-warning-soft flex items-center justify-center">
                            <span className="text-2xl">⚠️</span>
                        </div>
                        <h3 className="text-lg font-bold text-ink text-center mb-2">¿Cancelar esta cita?</h3>
                        <p className="text-sm text-mute text-center mb-2">
                            Si cancelas con menos de 24 horas de anticipación, contará como una cancelación tardía.
                        </p>
                        <p className="text-xs text-warning text-center mb-5 font-semibold">
                            Acumular cancelaciones tardías puede suspender tu cuenta.
                        </p>
                        {citaAConfirmarPagada && (
                            <p className="text-xs text-sky-deep bg-sky-soft rounded-lg p-2 text-center mb-5 font-semibold">
                                Esta cita ya fue pagada. Para solicitar la devolución acércate a admisión.
                            </p>
                        )}
                        <div className="flex gap-3">
                            <Boton variante="secondary" fullWidth onClick={() => setCitaAConfirmar(null)}>
                                No, mantener
                            </Boton>
                            <Boton variante="danger" fullWidth onClick={confirmarCancelacion}>
                                Sí, cancelar
                            </Boton>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE PAGO */}
            {avisoPago !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div role="dialog" aria-modal="true" aria-labelledby="titulo-aviso-pago" className="bg-white rounded-2xl shadow-dropdown w-full max-w-sm p-6">
                        <div className={`w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center
                            ${avisoPago.tipo === 'ok' ? 'bg-success-soft' : avisoPago.tipo === 'error' ? 'bg-danger-soft' : 'bg-sky-soft'}`}>
                            <span className="text-2xl" aria-hidden="true">{avisoPago.tipo === 'ok' ? '✓' : avisoPago.tipo === 'error' ? '✕' : '💳'}</span>
                        </div>
                        <h3 id="titulo-aviso-pago" className="text-lg font-bold text-ink text-center mb-2">{avisoPago.titulo}</h3>
                        <p className="text-sm text-mute text-center mb-5">{avisoPago.mensaje}</p>
                        <div className="flex gap-3">
                            {avisoPago.idPago && (
                                <Boton
                                    variante="secondary"
                                    fullWidth
                                    disabled={verificandoId === avisoPago.idPago}
                                    onClick={() => verificarPago(avisoPago.idPago!)}
                                >
                                    Verificar pago
                                </Boton>
                            )}
                            <Boton fullWidth onClick={() => setAvisoPago(null)}>Entendido</Boton>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE RESULTADO */}
            {resultado !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="bg-white rounded-2xl shadow-dropdown w-full max-w-sm p-6">
                        <div className={`w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center
                            ${resultado.bloqueada ? 'bg-danger-soft' : resultado.sancionada ? 'bg-warning-soft' : 'bg-success-soft'}`}>
                            <span className="text-2xl">{resultado.bloqueada ? '🔒' : resultado.sancionada ? '⚠️' : '✓'}</span>
                        </div>
                        <h3 className="text-lg font-bold text-ink text-center mb-2">
                            {resultado.bloqueada ? 'Cuenta suspendida' : 'Cita cancelada'}
                        </h3>
                        <p className="text-sm text-mute text-center mb-5">{resultado.mensaje}</p>
                        <Boton fullWidth onClick={() => setResultado(null)}>Entendido</Boton>
                    </div>
                </div>
            )}
        </div>
    );
};