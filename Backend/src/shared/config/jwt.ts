// =================================================================
// CAPA: Shared / Config
// Secreto JWT centralizado.
//
// SEGURIDAD (OWASP A02 - Fallas criptográficas):
//   Antes se usaba `process.env.JWT_SECRET || 'secret'`. Si faltaba
//   la variable, cualquiera podía firmar tokens válidos con la clave
//   "secret" y hacerse pasar por ADMIN. Ahora el sistema se niega a
//   arrancar sin un secreto de al menos 16 caracteres.
// =================================================================
export function obtenerJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 16) {
        throw new Error(
            'JWT_SECRET no configurado o muy corto (mínimo 16 caracteres). Revisa el archivo .env',
        );
    }
    return secret;
}
