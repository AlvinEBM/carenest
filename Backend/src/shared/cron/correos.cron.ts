import cron from 'node-cron';
import { MailerService } from '../../modules/notificaciones/application/services/mailer.service';

const mailer = new MailerService();

export const iniciarCronCorreos = () => {
    // '*/2 * * * *' = cada 2 minutos
    cron.schedule('*/2 * * * *', async () => {
        try {
            const r = await mailer.enviarPendientes();
            if (r.enviados > 0 || r.fallidos > 0) {
                console.log(`[CRON CORREOS] Enviados: ${r.enviados}, fallidos: ${r.fallidos}, sin correo: ${r.sinCorreo}`);
            }
        } catch (error) {
            console.error('[CRON CORREOS] Error:', error);
        }
    });
    console.log('Cron de correos iniciado (cada 2 minutos)');
};