// =================================================================
// Lectura en voz alta (accesibilidad, ODS 10).
// Usa la síntesis de voz que ya trae el navegador (Web Speech API):
// no necesita internet ni librerías y funciona en Chrome, Edge,
// Firefox y Safari, también en el celular.
// =================================================================

export const vozDisponible = (): boolean =>
    typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

// Prefiere una voz en español de Latinoamérica; si no hay, cualquier voz en español
const elegirVoz = (): SpeechSynthesisVoice | undefined => {
    const voces = window.speechSynthesis.getVoices().filter(v => v.lang.toLowerCase().startsWith('es'));
    const preferidas = ['es-pe', 'es-419', 'es-us', 'es-mx', 'es-co', 'es-es'];
    for (const p of preferidas) {
        const v = voces.find(x => x.lang.toLowerCase() === p);
        if (v) return v;
    }
    return voces[0];
};

// Cambia símbolos que la voz leería mal
const prepararTexto = (texto: string): string =>
    texto
        .replace(/S\/\s?(\d+)(?:\.00)?/g, '$1 soles')
        .replace(/\bDr\(a\)\.\s?/g, 'doctor ')
        .replace(/\bDr\.\s?/g, 'doctor ')
        .replace(/[✓✕✗↻←→·•]/g, ' ')
        .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, ' ')
        .replace(/\s+\n/g, '\n')
        .trim();

// Chrome corta las frases muy largas: se lee por oraciones o líneas
const partir = (texto: string): string[] =>
    texto.split(/(?<=[.!?])\s+|\n+/).map(t => t.trim()).filter(Boolean);

export const detenerVoz = (): void => {
    if (vozDisponible()) window.speechSynthesis.cancel();
};

export const leerEnVoz = (texto: string, alTerminar?: () => void): void => {
    if (!vozDisponible()) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    const partes = partir(prepararTexto(texto));
    if (partes.length === 0) { alTerminar?.(); return; }
    const voz = elegirVoz();
    partes.forEach((parte, i) => {
        const u = new SpeechSynthesisUtterance(parte);
        u.lang = voz?.lang ?? 'es-PE';
        if (voz) u.voice = voz;
        u.rate = 0.95;
        if (i === partes.length - 1 && alTerminar) {
            u.onend = alTerminar;
            u.onerror = alTerminar;
        }
        synth.speak(u);
    });
};

// Texto del contenido principal de la página, línea por línea, sin los
// botones «Escuchar» ni los íconos decorativos (marcados con data-no-leer
// o aria-hidden). Se usa el texto visible tal como lo muestra la pantalla.
export const textoDeLaPagina = (): string => {
    const main = document.querySelector('main');
    if (!main) return '';
    const omitir = new Set(
        Array.from(main.querySelectorAll<HTMLElement>('[data-no-leer], [aria-hidden="true"]'))
            .map(n => (n.innerText || n.textContent || '').trim())
            .filter(Boolean),
    );
    return main.innerText
        .split('\n')
        .map(l => l.trim())
        .filter(l => l && !omitir.has(l))
        .join('\n');
};
