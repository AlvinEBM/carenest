import { Router } from 'express';

import { authHandler } from '../../../../shared/middlewares/auth.handler';
import { FamiliarController } from '../controllers/familiar.controller';
import { CrearFamiliarDTO } from '../../application/dtos/crear-familiar.dto';

const router = Router();
const controller = new FamiliarController();

router.get(
    '/familiares',
    authHandler({ roles: ['PACIENTE'] }),
    controller.listar,
);

router.post(
    '/familiares',
    authHandler({ roles: ['PACIENTE'], dto: CrearFamiliarDTO }),
    controller.crear,
);

export default router;