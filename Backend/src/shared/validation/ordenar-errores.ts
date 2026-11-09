// =================================================================
// CAPA: Shared / Validation
// Ordena los mensajes de error de un campo para que el PRIMERO
// (el que muestra la pantalla) sea el más útil para el usuario.
//
// Problema que corrige (detectado en las pruebas unitarias):
// class-validator devuelve los mensajes en un orden que no elegimos.
// Con un campo vacío mostraba «Los nombres solo pueden contener letras»
// en vez de «Los nombres son obligatorios»; con «ana@@gmail.com»
// mostraba «formato válido» en vez de «debe tener una sola @»; y con
// un precio «abc» mostraba «El precio máximo es S/ 999.99».
//
// Orden de prioridad:
//   1. Campo vacío            (isNotEmpty, isDefined)
//   2. Tipo de dato incorrecto (isString, isNumber, isInt, isIn…)
//   3. Formato propio          (matches: nuestras reglas específicas)
//   4. Longitud                (minLength, maxLength, length)
//   5. Formato genérico        (isEmail)
//   6. Rango                   (min, max, isPositive)
//   7. Cualquier otro
// =================================================================

const PRIORIDAD: string[] = [
    'isNotEmpty', 'isDefined',
    'isString', 'isNumber', 'isInt', 'isBoolean', 'isIn', 'isEnum', 'isDateString',
    'matches',
    'minLength', 'maxLength', 'length',
    'isEmail',
    'min', 'max', 'isPositive',
];

const posicion = (regla: string): number => {
    const i = PRIORIDAD.indexOf(regla);
    return i === -1 ? PRIORIDAD.length : i;
};

/** Devuelve los mensajes del campo, del más importante al menos importante. */
export function mensajesOrdenados(constraints: Record<string, string> | undefined): string[] {
    return Object.entries(constraints ?? {})
        .sort(([a], [b]) => posicion(a) - posicion(b))
        .map(([, mensaje]) => mensaje);
}