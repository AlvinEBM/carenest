// =================================================================
// Pantalla «Pagos» del administrador.
// Corrige el defecto D-14 (prueba de sistema CA006-5): antes los pagos
// solo se podían ver por la API GET /pagos; ahora el administrador ve
// la lista, el estado de cada pago y el total recaudado.
// =================================================================
import { useEffect, useMemo, useState } from 'react';

import { HeaderAdmin } from '../../components/layout/HeaderAdmin';
import { Sidebar } from '../../components/layout/Sidebar';
import { Card } from '../../components/common/Card';
import { BadgePago } from '../../components/common/Badge';

import { pagosApi } from '../../api/pagosApi';
import { EstadoPago, PagoAdmin } from '../../types';
import { formatearFecha, formatearHora } from '../../utils/formatters';
import { formatearSoles } from '../../utils/fechas';

const ESTADOS: { value: '' | EstadoPago; label: string }[] = [
    { value: '', label: 'Todos' },
    { value: 'APROBADO', label: 'Aprobado' },
    { value: 'PENDIENTE', label: 'Pendiente' },
    { value: 'RECHAZADO', label: 'Rechazado' },
    { value: 'CANCELADO', label: 'Cancelado' },
    { value: 'REEMBOLSADO', label: 'Reembolsado' },
];

export const Pagos = () => {
    const [pagos, setPagos]         = useState<PagoAdmin[]>([]);
    const [recaudado, setRecaudado] = useState(0);
    const [estado, setEstado]       = useState<'' | EstadoPago>('');
    const [busqueda, setBusqueda]   = useState('');
    const [cargando, setCargando]   = useState(true);
    const [error, setError]         = useState('');

    useEffect(() => {
        (async () => {
            try {
                const data = await pagosApi.listarTodos();
                setPagos(data.pagos);
                setRecaudado(data.recaudado);
            } catch (e) {
                console.error(e);
                setError('No se pudieron cargar los pagos. Intenta de nuevo.');
            } finally {
                setCargando(false);
            }
        })();
    }, []);

    const filtrados = useMemo(() => {
        const texto = busqueda.trim().toLowerCase();
        return pagos.filter(p =>
            (!estado || p.estado === estado) &&
            (!texto || p.paciente.toLowerCase().includes(texto) || p.dni.includes(texto)),
        );
    }, [pagos, estado, busqueda]);

    const contar = (e: EstadoPago) => pagos.filter(p => p.estado === e).length;

    return (
        <div className="min-h-screen bg-smoke">
            <HeaderAdmin />
            <div className="flex">
                <Sidebar />
                <main className="flex-1 p-8">
                    <h1 className="text-2xl font-extrabold text-ink">Pagos</h1>
                    <p className="text-sm text-mute mt-1 mb-6">Pagos de citas hechos con Mercado Pago</p>

                    {/* Totales */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                        <StatCard label="TOTAL RECAUDADO" valor={formatearSoles(recaudado)} color="text-success" />
                        <StatCard label="APROBADOS" valor={contar('APROBADO')} color="text-success" />
                        <StatCard label="PENDIENTES" valor={contar('PENDIENTE')} color="text-warning" />
                        <StatCard label="RECHAZADOS" valor={contar('RECHAZADO')} color="text-danger" />
                    </div>

                    {/* Filtros */}
                    <Card className="p-4 mb-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label htmlFor="pagos-buscar" className="block text-xs font-bold text-mute mb-1">Paciente o DNI</label>
                                <input
                                    id="pagos-buscar"
                                    type="text"
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                    placeholder="Ej: Juan o 12345678"
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:border-sky-main"
                                />
                            </div>
                            <div>
                                <label htmlFor="pagos-estado" className="block text-xs font-bold text-mute mb-1">Estado del pago</label>
                                <select
                                    id="pagos-estado"
                                    value={estado}
                                    onChange={(e) => setEstado(e.target.value as '' | EstadoPago)}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:border-sky-main"
                                >
                                    {ESTADOS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                </select>
                            </div>
                        </div>
                    </Card>

                    {/* Lista */}
                    <Card className="p-0 overflow-x-auto">
                        {cargando ? (
                            <p className="p-6 text-sm text-mute">Cargando pagos...</p>
                        ) : error ? (
                            <p role="alert" className="p-6 text-sm text-danger font-semibold">{error}</p>
                        ) : filtrados.length === 0 ? (
                            <p className="p-6 text-sm text-mute">
                                {pagos.length === 0 ? 'Todavía no hay pagos registrados.' : 'Ningún pago coincide con los filtros.'}
                            </p>
                        ) : (
                            <table className="w-full text-sm">
                                <caption className="sr-only">Lista de pagos</caption>
                                <thead className="bg-gray-50 text-left text-xs text-mute uppercase">
                                    <tr>
                                        <th scope="col" className="px-4 py-3">N.º</th>
                                        <th scope="col" className="px-4 py-3">Paciente</th>
                                        <th scope="col" className="px-4 py-3">Especialidad</th>
                                        <th scope="col" className="px-4 py-3">Cita</th>
                                        <th scope="col" className="px-4 py-3 text-right">Monto</th>
                                        <th scope="col" className="px-4 py-3">Estado</th>
                                        <th scope="col" className="px-4 py-3">Método</th>
                                        <th scope="col" className="px-4 py-3">Fecha del pago</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtrados.map(p => (
                                        <tr key={p.id_pago} className="border-t border-gray-100">
                                            <td className="px-4 py-3 font-semibold text-ink">{p.id_pago}</td>
                                            <td className="px-4 py-3">
                                                <p className="font-semibold text-ink">{p.paciente}</p>
                                                <p className="text-xs text-mute">DNI {p.dni}</p>
                                            </td>
                                            <td className="px-4 py-3 text-ink-soft">{p.especialidad}</td>
                                            <td className="px-4 py-3 text-ink-soft">{formatearFecha(p.fecha)} · {formatearHora(p.hora)}</td>
                                            <td className="px-4 py-3 text-right font-bold text-ink">{formatearSoles(Number(p.monto))}</td>
                                            <td className="px-4 py-3"><BadgePago estado={p.estado} /></td>
                                            <td className="px-4 py-3 text-ink-soft">{p.metodo ?? '—'}</td>
                                            <td className="px-4 py-3 text-ink-soft">{new Date(p.fecha_creacion).toLocaleString('es-PE')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </Card>
                </main>
            </div>
        </div>
    );
};

const StatCard = ({ label, valor, color }: { label: string; valor: number | string; color: string }) => (
    <Card className="px-4 py-3 text-center">
        <p className="text-[10px] font-bold text-mute tracking-wider">{label}</p>
        <p className={`text-2xl font-extrabold ${color}`}>{valor}</p>
    </Card>
);
