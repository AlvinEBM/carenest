import { Router } from 'express';
import { CorreoRemitenteController } from '../controllers/correo-remitente.controller';
import { authHandler } from '../../../../shared/middlewares/auth.handler';
import { RemitenteDTO } from '../../application/dto/remitente.dto';

const router = Router();
const controller = new CorreoRemitenteController();

router.get('/remitentes', authHandler({ roles: ['ADMIN'] }), controller.listar);
router.post('/remitentes', authHandler({ roles: ['ADMIN'], dto: RemitenteDTO }), controller.crear);
router.put('/remitentes/:id', authHandler({ roles: ['ADMIN'], dto: RemitenteDTO }), controller.actualizar);
router.delete('/remitentes/:id', authHandler({ roles: ['ADMIN'] }), controller.eliminar);

router.post('/enviar-correos', authHandler({ roles: ['ADMIN'] }), controller.enviarPendientes);
router.get('/correos-pendientes', authHandler({ roles: ['ADMIN'] }), controller.resumen);

export default router;