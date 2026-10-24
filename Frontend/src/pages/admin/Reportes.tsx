import { useEffect, useMemo, useState } from 'react';

import { HeaderAdmin } from '../../components/layout/HeaderAdmin';
import { Sidebar } from '../../components/layout/Sidebar';
import { Card } from '../../components/common/Card';
import { Boton } from '../../components/common/Boton';
import { Badge, BadgeEstadoCita } from '../../components/common/Badge';

import { adminApi } from '../../api/adminApi';
import { Especialidad, Medico, ReporteCita, ReporteTotales } from '../../types';
import { formatearFecha, formatearHora } from '../../utils/formatters';
import { exportarReporteCSV, exportarReportePDF } from '../../utils/exportarReporte';

const ESTADOS = [
    { value: '', label: 'Todos' },
    { value: 'RESERVADA', label: 'Reservada' },
    { value: 'CONFIRMADA', label: 'Confirmada' },
    { value: 'RECORDATORIO', label: 'Recordatorio' },
    { value: 'COMPLETADA', label: 'Completada' },
    { value: 'CANCELADA', label: 'Cancelada' },
    { value: 'FALTA', label: 'Falta' },
];

export const Reportes = () => {
    const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
    const [medicos, setMedicos]               = useState<Medico[]>([]);

    const [desde, setDesde]       = useState('');
    const [hasta, setHasta]       = useState('');
    const [idEsp, setIdEsp]       = useState('');
    const [idMedico, setIdMedico] = useState('');
    const [estado, setEstado]     = useState('');

    const [citas, setCitas]     = useState<ReporteCita[]>([]);
    const [totales, setTotales] = useState<ReporteTotales | null>(null);
    const [generando, setGenerando] = useState(false);
    const [yaGenero, setYaGenero]   = useState(false);
    const [error, setError]         = useState('');
    // Descarga
    const [formato, setFormato]     = useState<'PDF' | 'CSV'>('PDF');
    const [metaTexto, setMetaTexto] = useState('');

    useEffect(() => {
        (async () => {
            try {
                const [esps, meds] = await Promise.all([
                    adminApi.listarEspecialidades(),
                    adminApi.listarMedicos(),
                ]);
                setEspecialidades(esps);
                setMedicos(meds);
            } catch (e) { console.error(e); }
        })();
    }, []);

    const medicosFiltrados = useMemo(
        () => (idEsp ? medicos.filter(m => m.id_especialidad === Number(idEsp)) : medicos),
        [medicos, idEsp],
    );

    useEffect(() => { setIdMedico(''); }, [idEsp]);

    const generar = async () => {
        setError('');
        if (desde && hasta && desde > hasta) {
            setError('La fecha "Desde" no puede ser mayor que "Hasta".');
            return;
        }
        setGenerando(true);
        try {
            const res = await adminApi.reporteCitas({
                desde: desde || undefined,
                hasta: hasta || undefined,
                id_especialidad: idEsp ? Number(idEsp) : undefined,
                id_medico: idMedico ? Number(idMedico) : undefined,
                estado: estado || undefined,
            });
            setCitas(res.citas);
            setTotales(res.totales);
            setYaGenero(true);

            // Texto de filtros para el encabezado del PDF (capturado al generar)
            const espNombre = idEsp
                ? (especialidades.find(x => x.id_especialidad === Number(idEsp))?.nombre ?? idEsp)
                : 'Todas';
            const medObj = idMedico ? medicos.find(x => x.id_medico === Number(idMedico)) : null;
            const medNombre = medObj ? `${medObj.nombres} ${medObj.apellidos}` : 'Todos';
            const estLabel = ESTADOS.find(s => s.value === estado)?.label ?? 'Todos';
            setMetaTexto(
                `Periodo: ${desde || 'inicio'} a ${hasta || 'hoy'}   |   Especialidad: ${espNombre}   |   Médico: ${medNombre}   |   Estado: ${estLabel}`,
            );
        } catch {
            setError('No se pudo generar el reporte.');
        } finally {
            setGenerando(false);
        }
    };

    const descargar = () => {
        if (citas.length === 0 || !totales) return;
        if (formato === 'CSV') exportarReporteCSV(citas);
        else exportarReportePDF(citas, totales, metaTexto);
    };
    
    return (
        <div className="min-h-screen bg-smoke">
            <HeaderAdmin />
            <div className="flex">
                <Sidebar />
                <main className="flex-1 p-8">
                    <h1 className="text-3xl font-extrabold text-ink mb-1">Reportes de citas</h1>
                    <p className="text-sm text-mute mb-6">Filtra y genera el reporte de citas del centro de salud</p>

                    {/* Filtros */}
                    <Card className="p-5 mb-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-mute mb-1">Desde</label>
                                <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:border-sky-main" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-mute mb-1">Hasta</label>
                                <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:border-sky-main" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-mute mb-1">Especialidad</label>
                                <select value={idEsp} onChange={(e) => setIdEsp(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:border-sky-main">
                                    <option value="">Todas</option>
                                    {especialidades.map(e => (
                                        <option key={e.id_especialidad} value={e.id_especialidad}>{e.nombre}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-mute mb-1">Médico</label>
                                <select value={idMedico} onChange={(e) => setIdMedico(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:border-sky-main">
                                    <option value="">Todos</option>
                                    {medicosFiltrados.map(m => (
                                        <option key={m.id_medico} value={m.id_medico}>{m.nombres} {m.apellidos}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-mute mb-1">Estado</label>
                                <select value={estado} onChange={(e) => setEstado(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:border-sky-main">
                                    {ESTADOS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                </select>
                            </div>
                        </div>

                        {error && <p className="text-xs text-danger font-semibold mt-3">{error}</p>}

                        <div className="mt-4">
                            <Boton onClick={generar} disabled={generando}>
                                {generando ? 'Generando...' : 'Generar reporte'}
                            </Boton>
                        </div>
                    </Card>

                    {/* Totales */}
                    {totales && (
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
                            <StatCard label="TOTAL" valor={totales.total} color="text-ink" />
                            <StatCard label="COMPLETADAS" valor={totales.completadas} color="text-success" />
                            <StatCard label="RESERVADAS" valor={totales.reservadas} color="text-sky-main" />
                            <StatCard label="CANCELADAS" valor={totales.canceladas} color="text-danger" />
                            <StatCard label="FALTAS" valor={totales.faltas} color="text-warning" />
                        </div>
                    )}

                    {/* Tabla */}
                    {yaGenero && citas.length === 0 && (
                        <Card className="p-12 text-center">
                            <p className="text-mute text-sm">No se encontraron citas con esos filtros.</p>
                        </Card>
                    )}

                    {citas.length > 0 && (
                        <>
                        <div className="flex items-center justify-end gap-2 mb-3">
                            <span className="text-xs font-bold text-mute">Descargar como:</span>
                            <select
                                value={formato}
                                onChange={(e) => setFormato(e.target.value as 'PDF' | 'CSV')}
                                className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:border-sky-main"
                            >
                                <option value="PDF">PDF</option>
                                <option value="CSV">CSV</option>
                            </select>
                            <Boton tamano="sm" onClick={descargar}>Descargar</Boton>
                        </div>

                        <Card className="p-0 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-smoke text-left text-xs text-mute uppercase tracking-wider">
                                            <th className="px-4 py-3 font-bold">Fecha</th>
                                            <th className="px-4 py-3 font-bold">Hora</th>
                                            <th className="px-4 py-3 font-bold">Especialidad</th>
                                            <th className="px-4 py-3 font-bold">Médico</th>
                                            <th className="px-4 py-3 font-bold">Paciente</th>
                                            <th className="px-4 py-3 font-bold">Reservado por</th>
                                            <th className="px-4 py-3 font-bold">Estado</th>
                                            <th className="px-4 py-3 font-bold">Motivo</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {citas.map(c => (
                                            <tr key={c.id_cita} className="border-t border-gray-100 hover:bg-smoke/50">
                                                <td className="px-4 py-3 text-ink-soft whitespace-nowrap">{formatearFecha(c.fecha)}</td>
                                                <td className="px-4 py-3 text-mute whitespace-nowrap">{formatearHora(c.hora)}</td>
                                                <td className="px-4 py-3 text-ink-soft">{c.especialidad}</td>
                                                <td className="px-4 py-3 text-ink-soft">Dr. {c.medico}</td>
                                                <td className="px-4 py-3">
                                                    <span className="text-ink font-semibold">{c.paciente}</span>
                                                    {c.es_menor && (
                                                        <span className="ml-2 inline-block align-middle">
                                                            <Badge variante="sky">{c.parentesco ?? 'Menor'}</Badge>
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="text-ink-soft">{c.reservado_por}</span>
                                                    <span className="block text-xs text-mute">DNI {c.reservado_por_dni}</span>
                                                </td>
                                                <td className="px-4 py-3"><BadgeEstadoCita estado={c.estado} /></td>
                                                <td className="px-4 py-3 text-mute max-w-[200px] truncate">{c.motivo ?? '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                        </>
                    )}
                </main>
            </div>
        </div>
    );
};

const StatCard = ({ label, valor, color }: { label: string; valor: number; color: string }) => (
    <Card className="px-4 py-3 text-center">
        <p className="text-[10px] font-bold text-mute tracking-wider">{label}</p>
        <p className={`text-2xl font-extrabold ${color}`}>{valor}</p>
    </Card>
);