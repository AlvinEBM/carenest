// =================================================================
// CAPA: Presentation / Routes
// Rutas del módulo Médicos. TODAS exigen JWT con rol MEDICO.
//
//   GET /medico/perfil                    → datos del médico logueado
//   GET /medico/agenda?fecha=YYYY-MM-DD   → citas del día (default hoy)
//   PUT /medico/citas/:id/atender         → registra diagnóstico
//   GET /medico/pacientes/:id/historial   → atenciones previas
// =================================================================
import { Router } from 'express';

import { MedicoController } from '../controllers/medico.controller';
import { authHandler } from '../../../../shared/middlewares/auth.handler';
import { RegistrarAtencionDTO } from '../../application/dto/registrar-atencion.dto';

const router = Router();
const controller = new MedicoController();

router.get('/perfil', authHandler({ roles: ['MEDICO'] }), controller.perfil);

router.get('/agenda', authHandler({ roles: ['MEDICO'] }), controller.agenda);

router.put(
    '/citas/:id/atender',
    authHandler({ roles: ['MEDICO'], dto: RegistrarAtencionDTO }),
    controller.atender,
);

router.get('/pacientes/:id/historial', authHandler({ roles: ['MEDICO'] }), controller.historial);

export default router;
