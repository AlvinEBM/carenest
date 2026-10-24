import { Request, Response } from 'express';

import { FamiliarService } from '../../application/services/familiar.service';
import { CrearFamiliarDTO } from '../../application/dtos/crear-familiar.dto';

export class FamiliarController {
    private service = new FamiliarService();

    // GET /usuarios/familiares
    listar = async (req: Request, res: Response) => {
        const idTutor = req.jwt!.id;
        const result = await this.service.listar(idTutor);
        return res.status(200).json(result);
    };

    // POST /usuarios/familiares
    crear = async (req: Request, res: Response) => {
        const idTutor = req.jwt!.id;
        const dto = req.dto as CrearFamiliarDTO;
        const result = await this.service.registrar(idTutor, dto);
        return res.status(result.ok ? 201 : 400).json(result);
    };
}