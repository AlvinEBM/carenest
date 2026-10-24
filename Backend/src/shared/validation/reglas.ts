// =================================================================
// CAPA: Shared / Validation
// Reglas de validación ÚNICAS para todo el sistema.
// Las usan los DTO del registro de pacientes, de familiares y del
// alta de médicos, así una regla se cambia en un solo lugar.
//
// Clases de equivalencia (ver tests/unit/registro.dto.test.ts):
//   nombres / apellidos → válida: solo letras (con tildes, ñ, ü,
//                          apóstrofo y espacios), 2 a 100
//                          inválidas: números, símbolos, < 2
//   dni        → válida: exactamente 8 dígitos
//   telefono   → válida: 9 dígitos que empiezan con 9 (celular Perú)
//   correo     → válida: sin espacios y con UNA sola @
//   contrasena → válida: 8 a 50, con al menos una letra y un número
// =================================================================

/** Solo letras (incluye tildes, ñ, ü), apóstrofo y espacios. */
export const REGEX_SOLO_LETRAS = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü' ]+$/;

/** Exactamente 8 dígitos. */
export const REGEX_DNI = /^\d{8}$/;

/** Celular peruano: empieza con 9 y tiene 9 dígitos en total. */
export const REGEX_TELEFONO = /^9\d{8}$/;

/** Sin espacios, una sola @, y un dominio con punto (usuario@dominio.com). */
export const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Al menos una letra y al menos un número (no solo letras ni solo números). */
export const REGEX_CONTRASENA_SEGURA = /^(?=.*[A-Za-zÁÉÍÓÚáéíóúÑñÜü])(?=.*\d).+$/;

/** Longitud de la contraseña: un solo lugar para cambiarla. */
export const CONTRASENA_MIN = 8;
export const CONTRASENA_MAX = 50;

export const MSG = {
    nombres: 'Los nombres solo pueden contener letras',
    apellidos: 'Los apellidos solo pueden contener letras',
    dni: 'El DNI debe tener exactamente 8 dígitos (solo números)',
    telefono: 'El teléfono debe tener 9 dígitos y empezar con 9',
    correo: 'El correo no debe tener espacios y debe tener una sola @ (ej. nombre@correo.com)',
    contrasenaMin: `La contraseña debe tener al menos ${CONTRASENA_MIN} caracteres`,
    contrasenaMax: `La contraseña no puede exceder ${CONTRASENA_MAX} caracteres`,
    contrasenaMixta: 'La contraseña debe combinar letras y números (no puede ser solo letras ni solo números)',
};

/** Quita espacios al inicio y al final de un texto (para @Transform). */
export const recortar = ({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value;

/** Recorta y pasa a minúsculas (para el correo). */
export const normalizarCorreo = ({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value;

/** Recorta y une espacios repetidos ("Juan   Carlos" → "Juan Carlos"). */
export const normalizarNombre = ({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;