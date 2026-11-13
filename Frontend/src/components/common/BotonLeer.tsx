// =================================================================
// Botón «Escuchar» (accesibilidad, ODS 10).
// Lee en voz alta el texto que recibe; un segundo clic detiene la
// lectura. Si el navegador no tiene síntesis de voz, no se muestra.
// =================================================================
import { useEffect, useState } from 'react';
import { detenerVoz, leerEnVoz, vozDisponible } from '../../utils/lectorVoz';

interface Props {
    texto: string;
    etiqueta?: string;      // texto visible del botón
    descripcion?: string;   // qué se va a leer, para el lector de pantalla
}

export const BotonLeer = ({ texto, etiqueta = 'Escuchar', descripcion }: Props) => {
    const [leyendo, setLeyendo] = useState(false);

    // Al salir de la pantalla se detiene la lectura
    useEffect(() => () => { if (leyendo) detenerVoz(); }, [leyendo]);

    if (!vozDisponible()) return null;

    const alternar = () => {
        if (leyendo) { detenerVoz(); setLeyendo(false); return; }
        setLeyendo(true);
        leerEnVoz(texto, () => setLeyendo(false));
    };

    return (
        <button
            type="button"
            data-no-leer
            onClick={alternar}
            aria-pressed={leyendo}
            aria-label={leyendo ? 'Detener la lectura' : `${etiqueta}${descripcion ? `: ${descripcion}` : ''}`}
            className={`inline-flex items-center gap-1.5 rounded-lg border-2 px-3 py-1.5 text-xs font-bold transition
                ${leyendo ? 'border-blue-deep bg-blue-deep text-white' : 'border-gray-200 bg-white text-ink-soft hover:border-sky-main'}`}
        >
            <span aria-hidden="true">{leyendo ? '■' : '🔊'}</span>
            {leyendo ? 'Detener' : etiqueta}
        </button>
    );
};
