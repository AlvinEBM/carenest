// =================================================================
// Fecha de HOY en hora local (Perú).
// BUG CORREGIDO: new Date().toISOString().slice(0, 10) usa UTC y
// después de las 19:00 devolvía la fecha de mañana.
// =================================================================
export const hoyLocal = (ahora: Date = new Date()): string => {
    const a = ahora.getFullYear();
    const m = String(ahora.getMonth() + 1).padStart(2, '0');
    const d = String(ahora.getDate()).padStart(2, '0');
    return `${a}-${m}-${d}`;
};

/** 30 → "S/ 30.00" */
export const formatearSoles = (monto: number | null | undefined): string =>
    `S/ ${Number(monto ?? 0).toFixed(2)}`;
