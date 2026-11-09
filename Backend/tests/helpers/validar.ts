// Ayudante: valida un objeto plano contra una clase DTO igual que
// lo hace el middleware authHandler, y devuelve los campos con error.
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { mensajesOrdenados } from '../../src/shared/validation/ordenar-errores';

export async function erroresDe<T extends object>(Clase: new () => T, datos: Record<string, unknown>) {
    const instancia = plainToInstance(Clase, datos, { enableImplicitConversion: true });
    const errores = await validate(instancia as object, { whitelist: true });
    return Object.fromEntries(errores.map(e => [e.property, mensajesOrdenados(e.constraints)]));
}