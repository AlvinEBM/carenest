// =================================================================
// Página de retorno desde Mercado Pago.
//
// Mercado Pago redirige aquí (si se configuró FRONTEND_PUBLIC_URL)
// con ?external_reference=<id_pago>&status=...&payment_id=...
//
// NO confiamos en el "status" de la URL (se puede editar a mano):
// le pedimos al backend que consulte el pago real en Mercado Pago.
// =================================================================
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { Header } from '../../components/layout/Header';
import { Card } from '../../components/common/Card';
import { Boton } from '../../components/common/Boton';
import { pagosApi } from '../../api/pagosApi';
import { EstadoPago } from '../../types';

export const PagoResultado = () => {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const idPago = Number(params.get('external_reference'));

    const [estado, setEstado]   = useState<EstadoPago | null>(null);
    const [mensaje, setMensaje] = useState('Verificando tu pago con Mercado Pago...');
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        if (!Number.isInteger(idPago) || idPago <= 0) {
            setMensaje('No encontramos la referencia del pago. Revisa el estado en "Mis citas".');
            setCargando(false);
            return;
        }
        pagosApi.verificar(idPago)
            .then(r => { setEstado(r.estado ?? null); setMensaje(r.mensaje); })
            .catch(() => setMensaje('No pudimos verificar el pago. Puedes reintentarlo desde "Mis citas".'))
            .finally(() => setCargando(false));
    }, [idPago]);

    const icono = estado === 'APROBADO' ? '✓' : estado === 'RECHAZADO' ? '✕' : '💳';
    const fondo = estado === 'APROBADO' ? 'bg-success-soft' : estado === 'RECHAZADO' ? 'bg-danger-soft' : 'bg-sky-soft';
    const titulo = cargando ? 'Verificando pago'
        : estado === 'APROBADO' ? '¡Pago aprobado!'
        : estado === 'RECHAZADO' ? 'Pago rechazado'
        : 'Estado del pago';

    return (
        <div className="min-h-screen bg-smoke">
            <Header />
            <main className="max-w-md mx-auto px-6 py-16">
                <Card className="p-8 text-center">
                    <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${fondo}`}>
                        <span className="text-3xl" aria-hidden="true">{cargando ? '⏳' : icono}</span>
                    </div>
                    <h1 className="text-2xl font-extrabold text-ink mb-2">{titulo}</h1>
                    <p className="text-sm text-mute mb-6" role="status" aria-live="polite">{mensaje}</p>
                    <Boton fullWidth onClick={() => navigate('/paciente/mis-citas')} disabled={cargando}>
                        Ver mis citas
                    </Boton>
                </Card>
            </main>
        </div>
    );
};
