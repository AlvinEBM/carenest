// =================================================================
// Ventana «Reprogramar cita» (Mis citas).
// El paciente elige otra fecha y otra hora con el MISMO médico.
// Las reglas las valida el backend (PUT /citas/:id/reprogramar):
//   - la cita actual debe estar a 24 horas o más,
//   - la nueva hora debe estar libre y a más de 2 horas.
// =================================================================
import { useEffect, useState } from 'react';
import axios from 'axios';

import { Modal } from '../../components/common/Modal';
import { Boton } from '../../components/common/Boton';
import { citasApi } from '../../api/citasApi';
import { CitaConDetalles, Horario } from '../../types';
import { formatearFecha, formatearHora } from '../../utils/formatters';
import { hoyLocal } from '../../utils/fechas';

interface Props {
    cita: CitaConDetalles | null;
    onCerrar: () => void;
    onReprogramada: (mensaje: string) => void;
}

const sumarDias = (dias: number) => {
    const d = new Date();
    d.setDate(d.getDate() + dias);
    return hoyLocal(d);
};

export const ReprogramarCita = ({ cita, onCerrar, onReprogramada }: Props) => {
    const [fecha, setFecha]         = useState('');
    const [horarios, setHorarios]   = useState<Horario[]>([]);
    const [hora, setHora]           = useState('');
    const [cargando, setCargando]   = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [error, setError]         = useState('');

    // Al abrir otra cita, se limpia la ventana
    useEffect(() => { setFecha(''); setHorarios([]); setHora(''); setError(''); }, [cita?.id_cita]);

    // Al elegir una fecha, se cargan los horarios del mismo médico
    useEffect(() => {
        if (!cita?.id_medico || !fecha) return;
        setCargando(true); setHora(''); setError('');
        citasApi.listarHorarios(fecha, cita.id_medico)
            .then(setHorarios)
            .catch(() => { setHorarios([]); setError('No se pudieron cargar los horarios de ese día.'); })
            .finally(() => setCargando(false));
    }, [fecha, cita?.id_medico]);

    const confirmar = async () => {
        if (!cita || !fecha || !hora) return;
        setGuardando(true); setError('');
        try {
            const r = await citasApi.reprogramar(cita.id_cita, fecha, hora);
            onReprogramada(r.mensaje);
        } catch (e) {
            const msg = axios.isAxiosError(e) ? e.response?.data?.mensaje : null;
            setError(msg ?? 'No se pudo reprogramar la cita. Intenta de nuevo.');
        } finally {
            setGuardando(false);
        }
    };

    const libres = horarios.filter(h => h.disponible && !(fecha === cita?.fecha && h.hora === cita?.hora));

    return (
        <Modal
            abierto={cita !== null}
            onCerrar={onCerrar}
            titulo="Reprogramar cita"
            subtitulo={cita ? `${cita.especialidad ?? ''} · Dr(a). ${cita.medico_nombres ?? ''} ${cita.medico_apellidos ?? ''}` : ''}
        >
            {cita && (
                <div className="space-y-4">
                    <p className="text-sm text-ink-soft">
                        Cita actual: <span className="font-bold">{cita.fecha ? formatearFecha(cita.fecha) : ''} · {cita.hora ? formatearHora(cita.hora) : ''}</span>
                    </p>
                    <p className="text-xs text-mute">
                        Puedes reprogramar hasta 24 horas antes de tu cita. Se mantiene el mismo médico y el mismo pago.
                    </p>

                    <div>
                        <label htmlFor="reprogramar-fecha" className="block text-xs font-bold text-mute mb-1">Nueva fecha</label>
                        <input
                            id="reprogramar-fecha"
                            type="date"
                            value={fecha}
                            min={sumarDias(0)}
                            max={sumarDias(60)}
                            onChange={(e) => setFecha(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:border-sky-main"
                        />
                    </div>

                    {fecha && (
                        <fieldset>
                            <legend className="block text-xs font-bold text-mute mb-2">Nueva hora</legend>
                            {cargando ? (
                                <p className="text-sm text-mute">Cargando horarios...</p>
                            ) : libres.length === 0 ? (
                                <p className="text-sm text-mute">No hay horarios libres ese día. Elige otra fecha.</p>
                            ) : (
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                    {libres.map(h => (
                                        <button
                                            key={h.hora}
                                            type="button"
                                            aria-pressed={hora === h.hora}
                                            onClick={() => setHora(h.hora)}
                                            className={`px-2 py-2 rounded-lg border text-sm font-semibold transition
                                                ${hora === h.hora ? 'bg-sky-main border-sky-main text-white' : 'bg-white border-gray-200 text-ink-soft hover:border-sky-main'}`}
                                        >
                                            {formatearHora(h.hora)}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </fieldset>
                    )}

                    {error && (
                        <p role="alert" className="text-sm font-semibold text-danger bg-danger-soft rounded-lg px-3 py-2">{error}</p>
                    )}

                    <div className="flex gap-3 pt-2">
                        <Boton variante="secondary" fullWidth onClick={onCerrar}>Volver</Boton>
                        <Boton fullWidth disabled={!fecha || !hora || guardando} onClick={confirmar}>
                            {guardando ? 'Reprogramando...' : 'Confirmar cambio'}
                        </Boton>
                    </div>
                </div>
            )}
        </Modal>
    );
};
