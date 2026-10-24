// =================================================================
// CAPA: Presentation / Controllers
// Endpoints del rol MEDICO. Traduce el resultado del service a
// códigos HTTP:
//   DATOS → 400 · PROHIBIDO → 403 · NO_ENCONTRADO → 404 · REGLA → 409
// =================================================================
import { Request, Response } from 'express';

import { MedicoService, CodigoError } from '../../application/services/medico.service';
import { RegistrarAtencionDTO } from '../../application/dto/registrar-atencion.dto';

const STATUS: Record<CodigoError, number> = {
    DATOS: 400,
    PROHIBIDO: 403,
    NO_ENCONTRADO: 404,
    REGLA: 409,
};

export class MedicoController {
    constructor(private service: MedicoService = new MedicoService()) {}

    private responder(res: Response, result: any, okStatus = 200) {
        if (!result.ok) {
            const { codigo, ...resto } = result;
            return res.status(STATUS[codigo as CodigoError] ?? 400).json(resto);
        }
        return res.status(okStatus).json(result);
    }

    // GET /medico/perfil
    perfil = async (req: Request, res: Response) => {
        const result = await this.service.perfil(req.jwt!.id);
        return this.responder(res, result);
    };

    // GET /medico/agenda?fecha=YYYY-MM-DD
    agenda = async (req: Request, res: Response) => {
        const fecha = typeof req.query.fecha === 'string' ? req.query.fecha : undefined;
        const result = await this.service.agenda(req.jwt!.id, fecha);
        return this.responder(res, result);
    };

    // PUT /medico/citas/:id/atender
    atender = async (req: Request, res: Response) => {
        const idCita = Number(req.params.id);
        const result = await this.service.registrarAtencion(req.jwt!.id, idCita, req.dto as RegistrarAtencionDTO);
        return this.responder(res, result, 201);
    };

    // GET /medico/pacientes/:id/historial
    historial = async (req: Request, res: Response) => {
        const idPaciente = Number(req.params.id);
        const result = await this.service.historialPaciente(req.jwt!.id, idPaciente);
        return this.responder(res, result);
    };
}
