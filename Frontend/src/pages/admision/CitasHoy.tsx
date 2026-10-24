// =================================================================
// Vista de ADMISIÓN — Citas del día con marcado de asistencia.
// =================================================================
import { useEffect, useMemo, useState } from 'react';

import { HeaderAdmin } from '../../components/layout/HeaderAdmin';
import { Card } from '../../components/common/Card';
import { Boton } from '../../components/common/Boton';
import { BadgeEstadoCita, BadgePago } from '../../components/common/Badge';
import { hoyLocal } from '../../utils/fechas';

import { admisionApi } from '../../api/admisionApi';
import { CitaDelDia } from '../../types';
import { formatearFecha, formatearHora, obtenerIniciales } from '../../utils/formatters';

const POR_PAGINA = 8;

export const CitasHoy = () => {
    const hoy = hoyLocal(); // antes: toISOString() (UTC) → mostraba el día siguiente después de las 19:00
    const [fecha, setFecha]       = useState(hoy);
    const [citas, setCitas]       = useState<CitaDelDia[]>([]);
    const [cargando, setCargando] = useState(true);
    const [procesando, setProcesando] = useState<number | null>(null);
    const [filtroEsp, setFiltroEsp] = useState('');
    const [pagina, setPagina] = useState(1);

    const cargar = async (f: string) => {
        setCargando(true);
        try {
            const data = await admisionApi.citasDelDia(f);
            setCitas(data.citas ?? []);
        } catch (e) {
            console.error('Error cargando citas del día:', e);
            setCitas([]);
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargar(fecha);
    }, [fecha]);

    // Al cambiar fecha o especialidad, volvemos a la página 1
    useEffect(() => { setPagina(1); }, [fecha, filtroEsp]);

    const handleAsistio = async (idCita: number) => {
        setProcesando(idCita);
        try {
            const res = await admisionApi.marcarAsistio(idCita);
            if (res.ok) await cargar(fecha);
            else alert(res.mensaje);
        } catch {
            alert('No se pudo marcar la asistencia');
        } finally {
            setProcesando(null);
        }
    };

    const handleFalta = async (idCita: number) => {
        setProcesando(idCita);
        try {
            const res = await admisionApi.marcarFalta(idCita);
            if (res.ok) await cargar(fecha);
            else alert(res.mensaje);
        } catch {
            alert('No se pudo marcar la falta');
        } finally {
            setProcesando(null);
        }
    };

    // Especialidades presentes en las citas del día (para el dropdown)
    const especialidadesUnicas = useMemo(
        () => Array.from(new Set(citas.map(c => c.especialidad).filter(Boolean))).sort() as string[],
        [citas],
    );

    // Filtro por especialidad
    const filtradas = useMemo(
        () => (filtroEsp ? citas.filter(c => c.especialidad === filtroEsp) : citas),
        [citas, filtroEsp],
    );

    // Paginación
    const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
    const paginaSegura = Math.min(pagina, totalPaginas);
    const visibles = filtradas.slice((paginaSegura - 1) * POR_PAGINA, paginaSegura * POR_PAGINA);

    // Contadores rápidos (sobre lo filtrado, para que cuadren con lo que se ve)
    const asistieron = filtradas.filter(c => c.cita.estado === 'COMPLETADA').length;
    const faltaron   = filtradas.filter(c => c.cita.estado === 'FALTA').length;
    const pendientes = filtradas.filter(c => ['RESERVADA','CONFIRMADA','RECORDATORIO'].includes(c.cita.estado)).length;

    return (
        <div className="min-h-screen bg-smoke">
            <HeaderAdmin />

            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Título + stats */}
                <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-extrabold text-ink">Citas del día</h1>
                        <p className="text-sm text-mute mt-1 capitalize">{formatearFecha(fecha)}</p>
                    </div>
                    <div className="flex gap-3">
                        <StatMini label="ASISTIERON" valor={asistieron} color="text-success" />
                        <StatMini label="FALTARON" valor={faltaron} color="text-danger" />
                        <StatMini label="PENDIENTES" valor={pendientes} color="text-sky-main" />
                    </div>
                </div>

                {/* Filtros: fecha + especialidad */}
                <Card className="p-4 mb-6">
                    <div className="flex flex-wrap items-center gap-3">
                        <label className="text-sm font-semibold text-ink-soft">Fecha:</label>
                        <input
                            type="date"
                            value={fecha}
                            onChange={(e) => setFecha(e.target.value)}
                            className="px-4 py-2 text-sm bg-white rounded-lg border border-gray-200 focus:border-sky-main outline-none"
                        />
                        <Boton tamano="sm" variante="secondary" onClick={() => setFecha(hoy)}>Hoy</Boton>

                        <label className="text-sm font-semibold text-ink-soft ml-2">Especialidad:</label>
                        <select
                            value={filtroEsp}
                            onChange={(e) => setFiltroEsp(e.target.value)}
                            className="px-4 py-2 text-sm bg-white rounded-lg border border-gray-200 focus:border-sky-main outline-none"
                        >
                            <option value="">Todas</option>
                            {especialidadesUnicas.map(esp => (
                                <option key={esp} value={esp}>{esp}</option>
                            ))}
                        </select>
                    </div>
                </Card>

                {/* Tabla */}
                {cargando ? (
                    <Card className="p-8 text-center"><p className="text-mute text-sm">Cargando citas...</p></Card>
                ) : filtradas.length === 0 ? (
                    <Card className="p-12 text-center"><p className="text-mute text-sm">No hay citas {filtroEsp ? 'de esa especialidad' : 'para esta fecha'}</p></Card>
                ) : (
                    <div className="space-y-3">
                        {visibles.map(c => {
                            const esPendiente = ['RESERVADA','CONFIRMADA','RECORDATORIO'].includes(c.cita.estado);
                            return (
                                <Card
                                    key={c.cita.id_cita}
                                    bordeLateral={
                                        c.cita.estado === 'COMPLETADA' ? 'success' :
                                        c.cita.estado === 'FALTA' ? 'danger' : 'sky'
                                    }
                                    className="p-5"
                                >
                                    <div className="flex flex-wrap items-center gap-4">
                                        {/* Hora */}
                                        <div className="text-center min-w-[70px]">
                                            <p className="text-lg font-extrabold text-sky-deep">{formatearHora(c.hora)}</p>
                                        </div>

                                        {/* Paciente */}
                                        <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                                            <div className="w-10 h-10 rounded-full bg-sky-soft flex items-center justify-center text-xs font-bold text-sky-deep">
                                                {obtenerIniciales(c.paciente_nombres, c.paciente_apellidos)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-ink text-sm">{c.paciente_nombres} {c.paciente_apellidos}</p>
                                                <p className="text-xs text-mute">DNI {c.paciente_dni}</p>
                                            </div>
                                        </div>

                                        {/* Especialidad */}
                                        <div className="min-w-[160px]">
                                            <p className="text-sm font-semibold text-ink-soft">{c.especialidad}</p>
                                            <p className="text-xs text-mute">Dr. {c.medico_nombres} {c.medico_apellidos}</p>
                                        </div>

                                        {/* Estado */}
                                        <div className="min-w-[110px] flex flex-col items-start gap-1">
                                            <BadgeEstadoCita estado={c.cita.estado} />
                                            <BadgePago estado={c.estado_pago} />
                                        </div>

                                        {/* Acciones */}
                                        <div className="flex gap-2">
                                            {esPendiente ? (
                                                <>
                                                    <Boton
                                                        tamano="sm"
                                                        variante="success"
                                                        disabled={procesando === c.cita.id_cita}
                                                        onClick={() => handleAsistio(c.cita.id_cita)}
                                                    >
                                                        ✓ Asistió
                                                    </Boton>
                                                    <Boton
                                                        tamano="sm"
                                                        variante="danger"
                                                        disabled={procesando === c.cita.id_cita}
                                                        onClick={() => handleFalta(c.cita.id_cita)}
                                                    >
                                                        ✗ Falta
                                                    </Boton>
                                                </>
                                            ) : (
                                                <span className="text-xs text-mute italic">— ya registrado —</span>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                )}

                {/* Controles de paginación */}
                {!cargando && totalPaginas > 1 && (
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
            </main>
        </div>
    );
};

const StatMini = ({ label, valor, color }: { label: string; valor: number; color: string }) => (
    <Card className="px-5 py-3 text-center">
        <p className="text-[10px] font-bold text-mute tracking-wider">{label}</p>
        <p className={`text-2xl font-extrabold ${color}`}>{valor}</p>
    </Card>
);