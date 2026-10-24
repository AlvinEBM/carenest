// =================================================================
// CAPA: Domain / Config
// Reglas de negocio para la generación automática de horarios.
//
// Los horarios NO se guardan en BD: se generan al vuelo según
// estas reglas y se filtran contra las citas ya reservadas.
// =================================================================

export const HORARIO_CONFIG = {
    horaInicio: 8,        // 08:00
    horaFin: 18,          // 18:00 (la última cita es a las 17:30)
    duracionMinutos: 30,
    refrigerioInicio: 12, // 12:00
    refrigerioFin: 13,    // 13:00
    diasLaborables: [1, 2, 3, 4, 5, 6], // Lunes a Sábado
    ventanaDias: 60,      // ~2 meses
};

/**
 * Determina si una fecha está dentro de la ventana de reserva permitida.
 */
export function fechaEsReservable(fecha: string): { ok: boolean; motivo?: string } {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const objetivo = new Date(fecha + 'T00:00:00');
    objetivo.setHours(0, 0, 0, 0);

    if (isNaN(objetivo.getTime())) {
        return { ok: false, motivo: 'Fecha inválida' };
    }

    if (objetivo < hoy) {
        return { ok: false, motivo: 'No se puede reservar en fechas pasadas' };
    }

    const limite = new Date(hoy);
    limite.setDate(limite.getDate() + HORARIO_CONFIG.ventanaDias);
    if (objetivo > limite) {
        return {
            ok: false,
            motivo: `Solo puedes reservar hasta ${HORARIO_CONFIG.ventanaDias} días en adelante`,
        };
    }

    if (!HORARIO_CONFIG.diasLaborables.includes(objetivo.getDay())) {
        return { ok: false, motivo: 'Ese día no hay atención (no laborable)' };
    }

    return { ok: true };
}

/**
 * Genera todos los slots horarios de un día según la configuración.
 * Devuelve array de strings "HH:MM:SS".
 */
export function generarSlotsDelDia(): string[] {
    const slots: string[] = [];
    const { horaInicio, horaFin, duracionMinutos, refrigerioInicio, refrigerioFin } = HORARIO_CONFIG;

    let minutos = horaInicio * 60;
    const finMinutos = horaFin * 60;
    const refInicioMin = refrigerioInicio * 60;
    const refFinMin = refrigerioFin * 60;

    while (minutos < finMinutos) {
        if (minutos >= refInicioMin && minutos < refFinMin) {
            minutos += duracionMinutos;
            continue;
        }

        const h = Math.floor(minutos / 60);
        const m = minutos % 60;
        const hh = h.toString().padStart(2, '0');
        const mm = m.toString().padStart(2, '0');
        slots.push(`${hh}:${mm}:00`);

        minutos += duracionMinutos;
    }

    return slots;
}
/**
 * Indica si una hora ya no es reservable hoy.
 * Regla: no se puede reservar dentro de las próximas 2 horas.
 * Solo aplica cuando la fecha es HOY; las fechas futuras no se restringen.
 * @param fecha formato "YYYY-MM-DD"
 * @param hora  formato "HH:MM" o "HH:MM:SS"
 */
export function esHoraPasada(fecha: string, hora: string): boolean {
    // Anticipación mínima: no se puede reservar dentro de las próximas 2 horas.
    const ANTICIPACION_MINUTOS = 120;

    const ahora = new Date();
    const hoyStr = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;

    // Las fechas futuras no tienen restricción de hora; solo aplica a HOY
    if (fecha !== hoyStr) return false;

    const [hh, mm] = hora.split(':').map(Number);
    const minutosSlot  = hh * 60 + mm;
    const minutosCorte = ahora.getHours() * 60 + ahora.getMinutes() + ANTICIPACION_MINUTOS;

    return minutosSlot <= minutosCorte;
}