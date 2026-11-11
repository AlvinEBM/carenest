// =================================================================
// PUNTO DE ENTRADA del backend.
// Valida la configuración, conecta a MySQL, arranca los cron jobs
// y levanta el servidor HTTP. La app Express vive en app.ts.
// =================================================================
import 'reflect-metadata';
import dotenv from 'dotenv';

dotenv.config();

import { crearApp } from './app';
import { AppDataSource } from './config/datasource';
import { obtenerJwtSecret } from './shared/config/jwt';

// Cron jobs
import { iniciarCronRecordatorios } from './jobs/recordatorios.cron';
import { iniciarCronDisponibilidad } from './jobs/disponibilidad.cron';
import { iniciarCronCorreos } from './jobs/correos.cron';

// Falla rápido si falta el secreto JWT (no arrancar inseguro)
obtenerJwtSecret();

if (!process.env.MP_ACCESS_TOKEN) {
    console.warn('[Pagos] MP_ACCESS_TOKEN no configurado: el botón de pago quedará deshabilitado.');
}

const app = crearApp();
const PORT = Number(process.env.PORT) || 3000;

AppDataSource.initialize()
    .then(() => {
        console.log('Conexión a MySQL establecida');

        // ⭐ Activar cron de recordatorios de citas 24h antes
        iniciarCronRecordatorios();
        iniciarCronDisponibilidad();
        iniciarCronCorreos();

        app.listen(PORT, () => {
            console.log(`Servidor escuchando en http://localhost:${PORT}`);
        });
    })
    .catch((error) => {
        console.error('Error al conectar a la base de datos:', error);
        process.exit(1);
    });
