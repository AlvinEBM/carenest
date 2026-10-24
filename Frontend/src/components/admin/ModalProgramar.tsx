// =================================================================
// Modal para programar habilitación/inhabilitación con fecha.
// Muestra lo ya programado y permite cancelarlo.
// =================================================================
import { useState } from 'react';
import { Boton } from '../common/Boton';

interface ModalProgramarProps {
    abierto: boolean;
    titulo: string;
    // Fechas que YA están programadas (vienen de la BD)
    fechaInhabActual: string | null;
    fechaHabActual: string | null;
    onCerrar: () => void;
    onConfirmar: (accion: 'INHABILITAR' | 'HABILITAR', fecha: string) => Promise<void>;
    onCancelarProgramacion: (cual: 'INHABILITAR' | 'HABILITAR') => Promise<void>;
}

export const ModalProgramar = ({
    abierto, titulo, fechaInhabActual, fechaHabActual,
    onCerrar, onConfirmar, onCancelarProgramacion,
}: ModalProgramarProps) => {
    const [accion, setAccion] = useState<'INHABILITAR' | 'HABILITAR'>('INHABILITAR');
    const [fechaInhabilitar, setFechaInhabilitar] = useState('');
    const [fechaHabilitar, setFechaHabilitar]     = useState('');
    const [guardando, setGuardando] = useState(false);
    const [error, setError]         = useState<string | null>(null);

    const hoy = new Date();
    const [anio, setAnio] = useState(hoy.getFullYear());
    const [mes, setMes]   = useState(hoy.getMonth() + 1);

    if (!abierto) return null;

    const fechaSel = accion === 'INHABILITAR' ? fechaInhabilitar : fechaHabilitar;
    const setFechaSel = (f: string) => {
        if (accion === 'INHABILITAR') setFechaInhabilitar(f);
        else setFechaHabilitar(f);
    };

    const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
    const nombresMes = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const primerDiaSemana = new Date(anio, mes - 1, 1).getDay();
    const totalDias = new Date(anio, mes, 0).getDate();

    const cambiarMes = (delta: number) => {
        let nuevoMes = mes + delta, nuevoAnio = anio;
        if (nuevoMes > 12) { nuevoMes = 1; nuevoAnio++; }
        if (nuevoMes < 1)  { nuevoMes = 12; nuevoAnio--; }
        setMes(nuevoMes); setAnio(nuevoAnio);
    };

    const celdas: (string | null)[] = [];
    for (let i = 0; i < primerDiaSemana; i++) celdas.push(null);
    for (let d = 1; d <= totalDias; d++) {
        celdas.push(`${anio}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    }

    const confirmar = async () => {
        setError(null);
        if (!fechaSel) { setError('Selecciona una fecha en el calendario'); return; }
        setGuardando(true);
        try {
            await onConfirmar(accion, fechaSel);
            setFechaInhabilitar(''); setFechaHabilitar('');
        } catch {
            setError('No se pudo programar');
        } finally {
            setGuardando(false);
        }
    };

    const cancelar = async (cual: 'INHABILITAR' | 'HABILITAR') => {
        setGuardando(true);
        try {
            await onCancelarProgramacion(cual);
        } catch {
            setError('No se pudo cancelar la programación');
        } finally {
            setGuardando(false);
        }
    };

    const colorAccion = accion === 'INHABILITAR' ? 'danger' : 'success';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-2xl shadow-dropdown w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-extrabold text-blue-deep mb-1">Programar disponibilidad</h3>
                <p className="text-sm text-mute mb-5">{titulo}</p>

                {/* PROGRAMACIÓN EXISTENTE (lo que ya está en la BD) */}
                {(fechaInhabActual || fechaHabActual) && (
                    <div className="bg-smoke rounded-lg p-4 mb-5">
                        <p className="text-[10px] font-bold text-mute tracking-wider mb-2">PROGRAMACIÓN ACTUAL</p>
                        {fechaInhabActual && (
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs text-ink-soft">🔴 <strong>Inhabilitar</strong> desde: {fechaInhabActual}</p>
                                <button onClick={() => cancelar('INHABILITAR')} disabled={guardando}
                                    className="text-[11px] font-bold text-danger hover:underline">
                                    Cancelar
                                </button>
                            </div>
                        )}
                        {fechaHabActual && (
                            <div className="flex items-center justify-between">
                                <p className="text-xs text-ink-soft">🟢 <strong>Habilitar</strong> desde: {fechaHabActual}</p>
                                <button onClick={() => cancelar('HABILITAR')} disabled={guardando}
                                    className="text-[11px] font-bold text-danger hover:underline">
                                    Cancelar
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Acción */}
                <p className="text-xs font-bold text-ink-soft mb-2">Nueva programación</p>
                <div className="grid grid-cols-2 gap-2 mb-5">
                    <button onClick={() => setAccion('INHABILITAR')}
                        className={`p-3 rounded-lg border-2 text-sm font-bold transition-all
                            ${accion === 'INHABILITAR' ? 'border-danger bg-danger-soft text-danger' : 'border-gray-200 text-mute hover:border-danger'}`}>
                        Inhabilitar
                    </button>
                    <button onClick={() => setAccion('HABILITAR')}
                        className={`p-3 rounded-lg border-2 text-sm font-bold transition-all
                            ${accion === 'HABILITAR' ? 'border-success bg-success-soft text-success-deep' : 'border-gray-200 text-mute hover:border-success'}`}>
                        Habilitar
                    </button>
                </div>

                <p className="text-xs font-bold text-ink-soft mb-3">
                    {accion === 'INHABILITAR' ? '¿Desde qué fecha deja de atender?' : '¿Desde qué fecha vuelve a atender?'}
                </p>

                {/* CALENDARIO */}
                <div className="border border-gray-100 rounded-xl p-4 mb-4">
                    <div className="flex items-center justify-between mb-3">
                        <button onClick={() => cambiarMes(-1)} className="w-8 h-8 rounded-lg bg-smoke hover:bg-sky-soft text-mute font-bold">‹</button>
                        <h4 className="text-sm font-bold text-ink">{nombresMes[mes - 1]} {anio}</h4>
                        <button onClick={() => cambiarMes(1)} className="w-8 h-8 rounded-lg bg-smoke hover:bg-sky-soft text-mute font-bold">›</button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 mb-1">
                        {['D','L','M','M','J','V','S'].map((d, i) => (
                            <div key={i} className="text-center text-[10px] font-bold text-mute py-1">{d}</div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                        {celdas.map((fechaCelda, i) => {
                            if (!fechaCelda) return <div key={i} />;
                            const dia = Number(fechaCelda.split('-')[2]);
                            const esPasado = fechaCelda < hoyStr;
                            const seleccionada = fechaSel === fechaCelda;
                            if (esPasado) {
                                return <div key={i} className="aspect-square flex items-center justify-center text-sm text-gray-300">{dia}</div>;
                            }
                            return (
                                <button key={i} onClick={() => setFechaSel(fechaCelda)}
                                    className={`aspect-square rounded-lg flex items-center justify-center text-sm font-semibold transition-all
                                        ${seleccionada && colorAccion === 'danger' ? 'bg-danger text-white shadow-cta' : ''}
                                        ${seleccionada && colorAccion === 'success' ? 'bg-success text-white shadow-cta' : ''}
                                        ${!seleccionada ? 'bg-sky-soft text-sky-deep hover:bg-sky-bright hover:text-white' : ''}`}>
                                    {dia}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className={`rounded-lg p-3 mb-4 text-xs ${accion === 'INHABILITAR' ? 'bg-warning-soft text-warning' : 'bg-success-soft text-success-deep'}`}>
                    {accion === 'INHABILITAR'
                        ? 'Los pacientes podrán reservar hasta un día antes. Desde esa fecha se bloquea, y las citas posteriores se cancelan automáticamente con aviso.'
                        : 'Reaparecerá para reservas 5 días antes de la fecha elegida, y se notificará a todos los pacientes.'}
                </div>

                {error && <p className="text-xs text-danger font-semibold mb-3">⚠ {error}</p>}

                <div className="flex gap-3">
                    <Boton variante="secondary" fullWidth onClick={onCerrar} disabled={guardando}>Cerrar</Boton>
                    <Boton fullWidth onClick={confirmar} disabled={guardando}>
                        {guardando ? 'Guardando...' : `Confirmar ${accion === 'INHABILITAR' ? 'inhabilitación' : 'habilitación'}`}
                    </Boton>
                </div>
            </div>
        </div>
    );
};