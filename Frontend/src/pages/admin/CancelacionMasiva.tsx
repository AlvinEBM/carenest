// =================================================================
// Vista ADMIN — Cancelación masiva de citas.
// =================================================================
import { useEffect, useState, FormEvent } from 'react';

import { HeaderAdmin } from '../../components/layout/HeaderAdmin';
import { Sidebar } from '../../components/layout/Sidebar';
import { Card } from '../../components/common/Card';
import { Boton } from '../../components/common/Boton';
import { Input } from '../../components/common/Input';

import { adminApi } from '../../api/adminApi';
import { Especialidad } from '../../types';

export const CancelacionMasiva = () => {
    const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
    const [fecha, setFecha]   = useState('');
    const [esp, setEsp]       = useState<number>(0);
    const [motivo, setMotivo] = useState('');
    const [procesando, setProcesando] = useState(false);
    const [msg, setMsg]       = useState<{ texto: string; ok: boolean } | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const data = await adminApi.listarEspecialidades();
                setEspecialidades(data.filter(e => e.estado === 'ACTIVA'));
            } catch (e) { console.error(e); }
        })();
    }, []);

    const cancelar = async (e: FormEvent) => {
        e.preventDefault();
        setMsg(null);
        if (!fecha || !esp || !motivo.trim()) {
            setMsg({ texto: 'Completa todos los campos', ok: false });
            return;
        }
        if (!window.confirm('¿Cancelar TODAS las citas de esa fecha y especialidad? Esta acción es irreversible.')) return;

        setProcesando(true);
        try {
            const res = await adminApi.cancelacionMasiva({ fecha, id_especialidad: esp, motivo: motivo.trim() });
            if (res.ok) {
                setMsg({ texto: `✓ ${res.afectadas ?? 0} cita(s) cancelada(s) y pacientes notificados`, ok: true });
                setFecha(''); setEsp(0); setMotivo('');
            } else {
                setMsg({ texto: res.mensaje, ok: false });
            }
        } catch {
            setMsg({ texto: 'Error al procesar la cancelación', ok: false });
        } finally {
            setProcesando(false);
        }
    };

    return (
        <div className="min-h-screen bg-smoke">
            <HeaderAdmin />
            <div className="flex">
                <Sidebar />
                <main className="flex-1 p-8 max-w-2xl">
                    <h1 className="text-3xl font-extrabold text-ink mb-1">Cancelación masiva</h1>
                    <p className="text-sm text-mute mb-6">Cancela todas las citas de una fecha y especialidad (ej. feriado)</p>

                    <Card bordeLateral="danger" className="p-6">
                        <div className="bg-warning-soft border border-warning rounded-lg p-3 mb-5">
                            <p className="text-xs text-warning font-semibold">
                                ⚠ Esta acción cancela TODAS las citas activas de la fecha y especialidad seleccionadas. Los pacientes serán notificados automáticamente.
                            </p>
                        </div>

                        <form onSubmit={cancelar} className="space-y-4">
                            <Input label="Fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />

                            <div>
                                <label className="block text-xs font-semibold text-ink-soft mb-2">Especialidad</label>
                                <select value={esp} onChange={(e) => setEsp(Number(e.target.value))}
                                    className="w-full px-4 py-3 text-sm bg-white rounded-lg border border-gray-200 focus:border-sky-main outline-none">
                                    <option value={0}>Selecciona...</option>
                                    {especialidades.map(e => <option key={e.id_especialidad} value={e.id_especialidad}>{e.nombre}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-ink-soft mb-2">Motivo de la cancelación</label>
                                <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)}
                                    placeholder="Ej: Feriado nacional, el centro permanecerá cerrado"
                                    rows={3} maxLength={300}
                                    className="w-full px-4 py-3 text-sm bg-white rounded-lg border border-gray-200 focus:border-sky-main outline-none resize-none" />
                            </div>

                            {msg && (
                                <div className={`p-3 rounded-lg ${msg.ok ? 'bg-success-soft' : 'bg-danger-soft'}`}>
                                    <p className={`text-xs font-semibold ${msg.ok ? 'text-success-deep' : 'text-danger'}`}>{msg.texto}</p>
                                </div>
                            )}

                            <Boton type="submit" variante="danger" fullWidth disabled={procesando}>
                                {procesando ? 'Procesando...' : 'Cancelar citas'}
                            </Boton>
                        </form>
                    </Card>
                </main>
            </div>
        </div>
    );
};