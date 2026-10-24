// =================================================================
// CAPA: Shared / Middlewares
// Manejador de errores GLOBAL (última red de seguridad).
// Express reconoce este middleware como "de errores" por tener
// CUATRO parámetros (err, req, res, next). Cualquier excepción no
// controlada termina aquí y responde JSON limpio, sin filtrar
// stack traces al cliente.
// =================================================================
import { Request, Response, NextFunction } from 'express';

// Errores esperables del cliente → mensaje claro (no "error inesperado")
const MENSAJES_CLIENTE: Record<string, { status: number; mensaje: string }> = {
    'entity.too.large':  { status: 413, mensaje: 'La solicitud es demasiado grande' },
    'entity.parse.failed': { status: 400, mensaje: 'El cuerpo de la solicitud no es un JSON válido' },
};

export function errorHandler(
    err: any,
    _req: Request,
    res: Response,
    next: NextFunction,
) {
    // Si ya se empezó a enviar la respuesta, delega en Express.
    if (res.headersSent) {
        return next(err);
    }

    const conocido = MENSAJES_CLIENTE[err?.type as string];
    if (conocido) {
        return res.status(conocido.status).json({ ok: false, mensaje: conocido.mensaje });
    }

    // El detalle completo queda en la consola del servidor (para depurar).
    console.error('[ERROR NO CONTROLADO]', err);

    const status = typeof err?.status === 'number' ? err.status : 500;

    res.status(status).json({
        ok: false,
        mensaje: 'Ocurrió un error inesperado. Intenta nuevamente.',
    });
}
