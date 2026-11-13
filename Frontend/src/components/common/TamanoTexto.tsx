// =================================================================
// Control de tamaño de texto (accesibilidad, ODS 10 · WCAG 1.4.4).
// Botón flotante «Aa» en todas las pantallas. Cambia el tamaño base
// de la página (font-size de <html>); como Tailwind usa rem, todo el
// texto y los espacios crecen juntos y la página se reacomoda sin
// cortar contenido. La elección se recuerda en este navegador.
// El propio control usa medidas en px para no crecer ni tapar contenido.
// El mismo panel tiene «Leer esta página en voz alta» (Web Speech API).
// =================================================================
import { useEffect, useRef, useState } from 'react';
import { detenerVoz, leerEnVoz, textoDeLaPagina, vozDisponible } from '../../utils/lectorVoz';

const NIVELES = [
    { id: 'normal',  etiqueta: 'A',    nombre: 'Normal',         porcentaje: 100 },
    { id: 'grande',  etiqueta: 'A+',   nombre: 'Grande',         porcentaje: 115 },
    { id: 'mayor',   etiqueta: 'A++',  nombre: 'Más grande',     porcentaje: 130 },
    { id: 'maximo',  etiqueta: 'A+++', nombre: 'Muy grande',     porcentaje: 150 },
] as const;

type Nivel = typeof NIVELES[number]['id'];
const CLAVE = 'carenest.tamanoTexto';

const leerGuardado = (): Nivel => {
    try {
        const v = localStorage.getItem(CLAVE);
        return NIVELES.some(n => n.id === v) ? (v as Nivel) : 'normal';
    } catch {
        return 'normal';
    }
};

export const TamanoTexto = () => {
    const [nivel, setNivel]     = useState<Nivel>(leerGuardado);
    const [abierto, setAbierto] = useState(false);
    const [leyendo, setLeyendo] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);
    const botonRef = useRef<HTMLButtonElement>(null);

    // Aplica el tamaño a toda la página y lo recuerda
    useEffect(() => {
        const n = NIVELES.find(x => x.id === nivel) ?? NIVELES[0];
        document.documentElement.style.fontSize = n.porcentaje === 100 ? '' : `${n.porcentaje}%`;
        try { localStorage.setItem(CLAVE, nivel); } catch { /* sin almacenamiento: solo esta visita */ }
    }, [nivel]);

    // Esc o clic fuera cierra el panel
    useEffect(() => {
        if (!abierto) return;
        const alTeclado = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { setAbierto(false); botonRef.current?.focus(); }
        };
        const alClic = (e: MouseEvent) => {
            if (!panelRef.current?.contains(e.target as Node) && !botonRef.current?.contains(e.target as Node)) setAbierto(false);
        };
        document.addEventListener('keydown', alTeclado);
        document.addEventListener('mousedown', alClic);
        return () => { document.removeEventListener('keydown', alTeclado); document.removeEventListener('mousedown', alClic); };
    }, [abierto]);

    const actual = NIVELES.find(x => x.id === nivel) ?? NIVELES[0];

    const leerPagina = () => {
        if (leyendo) { detenerVoz(); setLeyendo(false); return; }
        const texto = textoDeLaPagina();
        if (!texto) return;
        setLeyendo(true);
        leerEnVoz(texto, () => setLeyendo(false));
    };

    return (
        <div className="fixed z-50 print:hidden" style={{ left: 16, bottom: 16 }}>
            {abierto && (
                <div
                    ref={panelRef}
                    id="panel-tamano-texto"
                    role="group"
                    aria-label="Opciones de accesibilidad"
                    className="rounded-xl bg-white shadow-xl border border-gray-200"
                    style={{ width: 296, padding: 16, marginBottom: 8 }}
                >
                    <p className="font-bold text-ink" style={{ fontSize: 14, marginBottom: 12 }}>Tamaño del texto</p>
                    <div className="grid grid-cols-4" style={{ gap: 8 }}>
                        {NIVELES.map((n, i) => (
                            <button
                                key={n.id}
                                type="button"
                                onClick={() => setNivel(n.id)}
                                aria-pressed={nivel === n.id}
                                aria-label={`${n.nombre} (${n.porcentaje} %)`}
                                className={`rounded-lg border-2 font-bold text-ink transition whitespace-nowrap
                                    ${nivel === n.id ? 'border-blue-deep bg-sky-soft ring-2 ring-blue-deep' : 'border-gray-200 hover:border-sky-main'}`}
                                style={{ fontSize: 14 + i * 2, height: 44 }}
                            >
                                {n.etiqueta}
                            </button>
                        ))}
                    </div>
                    <p className="text-slate-600" style={{ fontSize: 12, marginTop: 12, lineHeight: 1.4 }}>
                        Actual: <b>{actual.nombre} ({actual.porcentaje} %)</b>. Se recuerda en este navegador.
                    </p>
                    {vozDisponible() && (
                        <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #E5E7EB' }}>
                            <p className="font-bold text-ink" style={{ fontSize: 14, marginBottom: 8 }}>Leer en voz alta</p>
                            <button
                                type="button"
                                onClick={leerPagina}
                                aria-pressed={leyendo}
                                className={`w-full rounded-lg border-2 font-bold transition
                                    ${leyendo ? 'border-blue-deep bg-blue-deep text-white' : 'border-gray-200 text-ink hover:border-sky-main'}`}
                                style={{ fontSize: 14, height: 44 }}
                            >
                                <span aria-hidden="true">{leyendo ? '■ ' : '🔊 '}</span>
                                {leyendo ? 'Detener la lectura' : 'Leer esta página'}
                            </button>
                        </div>
                    )}
                </div>
            )}
            <button
                ref={botonRef}
                type="button"
                onClick={() => setAbierto(a => !a)}
                aria-expanded={abierto}
                aria-controls="panel-tamano-texto"
                aria-label="Accesibilidad: tamaño del texto y lectura en voz alta"
                title="Accesibilidad: tamaño del texto y lectura en voz alta"
                className="flex items-center justify-center rounded-full bg-blue-deep text-white shadow-lg font-extrabold hover:bg-sky-deep focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-bright"
                style={{ width: 48, height: 48, fontSize: 18 }}
            >
                Aa
            </button>
        </div>
    );
};
