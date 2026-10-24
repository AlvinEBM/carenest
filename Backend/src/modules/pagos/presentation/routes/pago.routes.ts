// =================================================================
// CAPA: Presentation / Routes
// Rutas del módulo Pagos (Mercado Pago Checkout Pro).
//
//   GET  /pagos/estado          → ¿pagos habilitados? (autenticado)
//   POST /pagos/preferencia     → PACIENTE crea el pago de su cita
//   POST /pagos/:id/verificar   → PACIENTE consulta el resultado
//   GET  /pagos/mis-pagos       → PACIENTE
//   GET  /pagos                 → ADMIN (todos los pagos)
//   POST /pagos/webhook         → Mercado Pago (público, con firma)
// =================================================================
import { Router } from 'express';

import { PagoController } from '../controllers/pago.controller';
import { authHandler } from '../../../../shared/middlewares/auth.handler';
import { CrearPreferenciaDTO } from '../../application/dto/crear-preferencia.dto';

const router = Router();
const controller = new PagoController();

router.post('/webhook', controller.webhook);

router.get('/estado', authHandler(), controller.estado);

router.post(
    '/preferencia',
    authHandler({ roles: ['PACIENTE'], dto: CrearPreferenciaDTO }),
    controller.crearPreferencia,
);

router.post('/:id/verificar', authHandler({ roles: ['PACIENTE'] }), controller.verificar);

router.get('/mis-pagos', authHandler({ roles: ['PACIENTE'] }), controller.misPagos);

router.get('/', authHandler({ roles: ['ADMIN'] }), controller.listarTodos);

export default router;
