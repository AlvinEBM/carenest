// =================================================================
// Reglas de validación del frontend.
// Son las MISMAS del backend (Backend/src/shared/validation/reglas.ts):
// el frontend avisa antes de enviar y el backend vuelve a validar,
// porque nunca se confía solo en el navegador.
// =================================================================

export const REGEX_SOLO_LETRAS = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü' ]+$/;
export const REGEX_DNI = /^\d{8}$/;
export const REGEX_TELEFONO = /^9\d{8}$/;
export const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const CONTRASENA_MIN = 8;
export const CONTRASENA_MAX = 50;

// ---------- Filtros para usar en onChange (bloquean lo no permitido) ----------

/** Deja solo letras (con tildes, ñ, ü), apóstrofo y espacios; sin espacios dobles al inicio. */
export const filtrarLetras = (v: string) =>
    v.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñÜü' ]/g, '').replace(/\s{2,}/g, ' ').replace(/^\s+/, '');

/** Deja solo dígitos, hasta `max` caracteres. */
export const filtrarDigitos = (v: string, max: number) => v.replace(/\D/g, '').slice(0, max);

/** Quita todos los espacios (el correo no puede tenerlos). */
export const filtrarCorreo = (v: string) => v.replace(/\s/g, '');

// ---------- Validadores: devuelven el mensaje de error o null ----------

export const validarNombre = (v: string, campo: 'nombres' | 'apellidos'): string | null => {
    const t = v.trim();
    const etiqueta = campo === 'nombres' ? 'Los nombres' : 'Los apellidos';
    if (!t) return `${etiqueta} son obligatorios`;
    if (!REGEX_SOLO_LETRAS.test(t)) return `${etiqueta} solo pueden contener letras`;
    if (t.length < 2) return `${etiqueta} deben tener al menos 2 letras`;
    if (t.length > 100) return `${etiqueta} no pueden exceder 100 caracteres`;
    return null;
};

export const validarDni = (v: string): string | null => {
    if (!v) return 'El DNI es obligatorio';
    if (!REGEX_DNI.test(v)) return 'El DNI debe tener exactamente 8 dígitos (solo números)';
    return null;
};

export const validarTelefono = (v: string): string | null => {
    if (!v) return 'El teléfono es obligatorio';
    if (!v.startsWith('9')) return 'El teléfono debe empezar con 9';
    if (!REGEX_TELEFONO.test(v)) return 'El teléfono debe tener exactamente 9 dígitos';
    return null;
};

export const validarCorreo = (v: string): string | null => {
    const t = v.trim();
    if (!t) return 'El correo es obligatorio';
    if (/\s/.test(t)) return 'El correo no puede tener espacios';
    const arrobas = (t.match(/@/g) || []).length;
    if (arrobas !== 1) return 'El correo debe tener una sola @';
    if (!REGEX_CORREO.test(t)) return 'Ingresa un correo válido (ej. nombre@correo.com)';
    if (t.length > 100) return 'El correo no puede exceder 100 caracteres';
    return null;
};

/** Requisitos de la contraseña, para mostrarlos como lista de verificación. */
export const requisitosContrasena = (v: string) => [
    { texto: `Al menos ${CONTRASENA_MIN} caracteres`, ok: v.length >= CONTRASENA_MIN && v.length <= CONTRASENA_MAX },
    { texto: 'Al menos una letra', ok: /[A-Za-zÁÉÍÓÚáéíóúÑñÜü]/.test(v) },
    { texto: 'Al menos un número', ok: /\d/.test(v) },
];

export const validarContrasena = (v: string): string | null => {
    if (!v) return 'La contraseña es obligatoria';
    if (v.length < CONTRASENA_MIN) return `La contraseña debe tener al menos ${CONTRASENA_MIN} caracteres`;
    if (v.length > CONTRASENA_MAX) return `La contraseña no puede exceder ${CONTRASENA_MAX} caracteres`;
    if (!/[A-Za-zÁÉÍÓÚáéíóúÑñÜü]/.test(v) || !/\d/.test(v)) {
        return 'La contraseña debe combinar letras y números (no solo letras ni solo números)';
    }
    return null;
};