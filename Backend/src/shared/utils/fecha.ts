// =================================================================
// CAPA: Shared / Utils
// Helpers de fecha en HORA LOCAL (Perú, UTC-5).
//
// MOTIVO (bug corregido): new Date().toISOString().slice(0, 10)
// devuelve la fecha en UTC. Desde las 19:00 hora de Lima eso ya es
// "mañana", y la vista de admisión mostraba las citas del día
// siguiente. Todas las fechas "de hoy" deben salir de aquí.
// =================================================================

/** Convierte un Date a "YYYY-MM-DD" usando la hora LOCAL. */
export function aFechaLocal(fecha: Date): string {
    const a = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');
    return `${a}-${m}-${d}`;
}

/** Fecha de hoy "YYYY-MM-DD" en hora local. */
export function hoyLocal(ahora: Date = new Date()): string {
    return aFechaLocal(ahora);
}

/**
 * Normaliza lo que devuelve MySQL (Date o string) a "YYYY-MM-DD".
 * Devuelve null si no hay valor.
 */
export function fechaBDaTexto(valor: unknown): string | null {
    if (valor === null || valor === undefined || valor === '') return null;
    if (valor instanceof Date) return aFechaLocal(valor);
    return String(valor).slice(0, 10);
}

/** Valida formato "YYYY-MM-DD" y que la fecha exista en el calendario. */
export function esFechaValida(texto: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
    const [a, m, d] = texto.split('-').map(Number);
    const f = new Date(a, m - 1, d);
    return f.getFullYear() === a && f.getMonth() === m - 1 && f.getDate() === d;
}
