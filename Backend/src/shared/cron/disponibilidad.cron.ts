// =================================================================
// CAPA: Shared / Cron
// Job diario de disponibilidad (Fase 3).
//
// Frecuencia: cada día a las 00:05 ('5 0 * * *').
// Revisa las fechas programadas de especialidades y médicos:
//   - Activa inhabilitaciones que llegaron (y cancela citas afectadas)
//   - Envía avisos de reapertura 5 días antes (a todos los pacientes)
//   - Reactiva habilitaciones que llegaron
// =================================================================
import cron from 'node-cron';

import { DisponibilidadService } from '../../modules/administracion/application/services/disponibilidad.service';

const service = new DisponibilidadService();

export const iniciarCronDisponibilidad = () => {
    // '5 0 * * *' = todos los días a las 00:05
    cron.schedule('5 0 * * *', async () => {
        const hora = new Date().toLocaleString('es-PE');
        console.log(`[CRON DISPONIBILIDAD ${hora}] Revisando fechas programadas...`);

        try {
            const result = await service.ejecutarRevisionDiaria();
            console.log(`[CRON DISPONIBILIDAD] Citas canceladas: ${result.citasCanceladas}, avisos enviados: ${result.avisosEnviados}`);
        } catch (error) {
            console.error('[CRON DISPONIBILIDAD] Error:', error);
        }
    });

    console.log('Cron de disponibilidad iniciado (diario 00:05)');
};