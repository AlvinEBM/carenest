// =================================================================
// CAPA: Domain
// FUNCIÓN CENTRAL DE DISPONIBILIDAD (cerebro de la Fase 3)
//
// Decide si una especialidad o médico está disponible en una
// fecha concreta, combinando:
//   - su estado actual (ACTIVA/INACTIVA, ACTIVO/INACTIVO)
//   - su fecha de inhabilitación programada (deja de atender)
//   - su fecha de habilitación programada (vuelve a atender)
//
// Esta lógica es idéntica para especialidades y médicos, por eso
// se centraliza aquí y la usan el calendario, la generación de
// horarios y los listados.
// =================================================================

// Datos de disponibilidad que comparten especialidades y médicos
export interface DatosDisponibilidad {
    // Estado base: true si está activo/a en este momento.
    activo: boolean;
    // Fecha desde la cual deja de atender (YYYY-MM-DD) o null.
    fecha_inhabilitacion: string | null;
    // Fecha desde la cual vuelve a atender (YYYY-MM-DD) o null.
    fecha_habilitacion: string | null;
}

// Días que antes de la fecha de habilitación ya se permite reservar
export const DIAS_ANTICIPACION_HABILITACION = 5;

/**
 * Normaliza una fecha a string YYYY-MM-DD sin desfase horario.
 */
function aFechaStr(fecha: Date): string {
    const a = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');
    return `${a}-${m}-${d}`;
}

/**
 * Compara dos fechas YYYY-MM-DD como strings (orden lexicográfico
 * funciona porque el formato es year-month-day con padding).
 * Devuelve: -1 si a<b, 0 si iguales, 1 si a>b.
 */
function compararFechas(a: string, b: string): number {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
}

/**
 * Resta días a una fecha YYYY-MM-DD y devuelve el resultado YYYY-MM-DD.
 */
export function restarDias(fechaStr: string, dias: number): string {
    const d = new Date(fechaStr + 'T00:00:00');
    d.setDate(d.getDate() - dias);
    return aFechaStr(d);
}

/**
 * ¿Está disponible para reservar en una fecha objetivo?
 *
 * Reglas:
 *  1. Si hay fecha_inhabilitacion y la fecha objetivo es >= a ella
 *     → NO disponible (ya entró en periodo inhabilitado), salvo que
 *     una habilitación posterior la reactive desde fecha_habilitacion.
 *  2. Si hay fecha_habilitacion, solo está disponible para fechas
 *     >= fecha_habilitacion (y dentro de la ventana de anticipación
 *     ya se puede ver, pero solo para reservar del día de vuelta en
 *     adelante).
 *  3. Si no hay fechas programadas, depende solo de `activo`.
 *
 * @param datos     fechas y estado de la especialidad/médico
 * @param fechaObjetivo  la fecha de la cita que el paciente quiere (YYYY-MM-DD)
 * @param hoyStr    fecha de hoy (YYYY-MM-DD)
 */
export function estaDisponibleEnFecha(
    datos: DatosDisponibilidad,
    fechaObjetivo: string,
    hoyStr: string,
): boolean {
    const { activo, fecha_inhabilitacion, fecha_habilitacion } = datos;

    // ---- Cierre programado (con o sin reapertura) ----
    if (fecha_inhabilitacion) {
        const dentroDelCierre =
            compararFechas(fechaObjetivo, fecha_inhabilitacion) >= 0 &&
            (!fecha_habilitacion || compararFechas(fechaObjetivo, fecha_habilitacion) < 0);

        // La fecha cae dentro del periodo cerrado [inhabilitacion, habilitacion)
        if (dentroDelCierre) {
            return false;
        }
        // Desde la reapertura en adelante: disponible (aunque el estado
        // siga INACTIVA mientras no llegue ese día).
        if (fecha_habilitacion && compararFechas(fechaObjetivo, fecha_habilitacion) >= 0) {
            return true;
        }
        // Antes de que empiece el cierre: disponible según el estado base.
        return activo;
    }

    // ---- Solo reapertura (cierre manual sin fecha de corte) ----
    if (fecha_habilitacion) {
        return compararFechas(fechaObjetivo, fecha_habilitacion) >= 0;
    }

    // ---- Sin fechas programadas: depende del estado base ----
    return activo;
}

/**
 * ¿Debe MOSTRARSE en la lista de especialidades/médicos para reservar?
 *
 * Una especialidad/médico se oculta de la lista cuando su periodo
 * de inhabilitación ya llegó (hoy >= fecha_inhabilitacion) y no hay
 * una habilitación que ya esté vigente o próxima.
 *
 * Reaparece cuando faltan DIAS_ANTICIPACION_HABILITACION días o menos
 * para su fecha de habilitación.
 */
export function debeMostrarseParaReservar(
    datos: DatosDisponibilidad,
    hoyStr: string,
): boolean {
    const { activo, fecha_inhabilitacion, fecha_habilitacion } = datos;

    // El cierre solo OCULTA cuando su fecha ya llegó (hoy >= inhabilitacion).
    // Antes de esa fecha, la especialidad/médico sigue mostrándose.
    if (fecha_inhabilitacion && compararFechas(hoyStr, fecha_inhabilitacion) >= 0) {
        // Con reapertura programada: reaparece 5 días antes de volver a abrir.
        if (fecha_habilitacion) {
            const fechaReaparicion = restarDias(fecha_habilitacion, DIAS_ANTICIPACION_HABILITACION);
            return compararFechas(hoyStr, fechaReaparicion) >= 0;
        }
        // Cierre sin reapertura: permanece oculto.
        return false;
    }

    // El cierre aún no empieza (o no hay cierre): según el estado base.
    return activo;
}