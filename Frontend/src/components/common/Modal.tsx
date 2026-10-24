// =================================================================
// Modal accesible reutilizable (WCAG 2.1 / Ley N° 29973).
//   - role="dialog" + aria-modal + aria-labelledby
//   - Se cierra con la tecla Escape
//   - Lleva el foco al primer campo al abrir y lo devuelve al cerrar
// =================================================================
import { ReactNode, useEffect, useId, useRef } from 'react';

interface ModalProps {
    abierto: boolean;
    titulo: string;
    subtitulo?: string;
    onCerrar: () => void;
    children: ReactNode;
    ancho?: 'sm' | 'md' | 'lg';
}

export const Modal = ({ abierto, titulo, subtitulo, onCerrar, children, ancho = 'md' }: ModalProps) => {
    const idTitulo = useId();
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!abierto) return;
        const previo = document.activeElement as HTMLElement | null;

        const enfocable = panelRef.current?.querySelector<HTMLElement>(
            'textarea, input, select, button:not([data-cerrar])',
        );
        enfocable?.focus();

        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onCerrar();
        };
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('keydown', onKey);
            previo?.focus?.();
        };
    }, [abierto, onCerrar]);

    if (!abierto) return null;

    const anchos = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onMouseDown={(e) => { if (e.target === e.currentTarget) onCerrar(); }}
        >
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={idTitulo}
                className={`bg-white rounded-2xl shadow-dropdown w-full ${anchos[ancho]} max-h-[90vh] overflow-y-auto`}
            >
                <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-gray-100">
                    <div>
                        <h2 id={idTitulo} className="text-lg font-bold text-ink">{titulo}</h2>
                        {subtitulo && <p className="text-xs text-mute mt-0.5">{subtitulo}</p>}
                    </div>
                    <button
                        type="button"
                        data-cerrar
                        onClick={onCerrar}
                        aria-label="Cerrar ventana"
                        className="w-8 h-8 rounded-lg text-mute hover:bg-smoke hover:text-ink flex items-center justify-center"
                    >
                        ✕
                    </button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
};
