// =================================================================
// CONFIGURACIÓN DE LA APLICACIÓN EXPRESS
//
// Se separa de main.ts para poder importar la "app" en las pruebas
// de integración (Supertest) sin abrir el puerto ni iniciar crons.
//
// SEGURIDAD (OWASP Top 10:2021):
//   A05 - helmet: cabeceras HTTP seguras (X-Content-Type-Options,
//         X-Frame-Options, etc.) y oculta "X-Powered-By: Express".
//   A05 - CORS restringido al frontend configurado.
//   A07 - Límite de intentos de login (fuerza bruta).
//   A04 - Límite de tamaño del body (evita payloads gigantes).
// =================================================================
import 'reflect-metadata';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Rutas por módulo
import authRoutes            from './modules/usuarios/presentation/routes/auth.routes';
import citaRoutes            from './modules/citas/presentation/routes/cita.routes';
import adminRoutes           from './modules/administracion/presentation/routes/admin.routes';
import asistenciaRoutes      from './modules/asistencias/presentation/routes/asistencia.routes';
import notificacionRoutes    from './modules/notificaciones/presentation/routes/notificacion.routes';
import familiarRoutes        from './modules/usuarios/presentation/routes/familiar.routes';
import correoRemitenteRoutes from './modules/notificaciones/presentation/routes/correo-remitente.routes';
import medicoRoutes          from './modules/medicos/presentation/routes/medico.routes';
import pagoRoutes            from './modules/pagos/presentation/routes/pago.routes';

import { errorHandler } from './shared/middlewares/error.handler';

dotenv.config();

export function crearApp() {
    const app = express();

    app.disable('x-powered-by');
    app.use(helmet());

    const origenes = (process.env.FRONTEND_URL || 'http://localhost:5173')
        .split(',')
        .map(o => o.trim())
        .filter(Boolean);
    app.use(cors({ origin: origenes }));

    app.use(express.json({ limit: '100kb' }));

    // Máximo de intentos de login por IP en 15 minutos
    const limiteLogin = rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: Number(process.env.LOGIN_MAX_INTENTOS) || 10,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        message: {
            ok: false,
            mensaje: 'Demasiados intentos de inicio de sesión. Espera 15 minutos e inténtalo de nuevo.',
        },
    });
    app.use('/auth/login', limiteLogin);

    // Montaje de rutas
    app.use('/auth',           authRoutes);
    app.use('/citas',          citaRoutes);
    app.use('/admin',          adminRoutes);
    app.use('/admision',       asistenciaRoutes);
    app.use('/notificaciones', notificacionRoutes);
    app.use('/usuarios',       familiarRoutes);
    app.use('/notificaciones', correoRemitenteRoutes);
    app.use('/medico',         medicoRoutes);
    app.use('/pagos',          pagoRoutes);

    // Healthcheck
    app.get('/', (_req, res) => {
        res.json({ ok: true, mensaje: 'API CareNest funcionando' });
    });

    // Ruta no encontrada → JSON (no la página HTML por defecto)
    app.use((_req, res) => {
        res.status(404).json({ ok: false, mensaje: 'Recurso no encontrado' });
    });

    // Manejador de errores GLOBAL — va al FINAL
    app.use(errorHandler);

    return app;
}
