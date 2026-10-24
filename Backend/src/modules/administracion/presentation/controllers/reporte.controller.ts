import { Request, Response } from 'express';
import { ReporteService } from '../../application/services/reporte.service';

const ESTADOS_VALIDOS = ['RESERVADA', 'CONFIRMADA', 'RECORDATORIO', 'COMPLETADA', 'CANCELADA', 'FALTA'];
const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;

export class ReporteController {
    private service = new ReporteService();

    reporteCitas = async (req: Request, res: Response) => {
        const { desde, hasta, id_especialidad, id_medico, estado } = req.query;

        if (desde && !RE_FECHA.test(String(desde))) {
            return res.status(400).json({ ok: false, mensaje: 'La fecha "desde" no es válida' });
        }
        if (hasta && !RE_FECHA.test(String(hasta))) {
            return res.status(400).json({ ok: false, mensaje: 'La fecha "hasta" no es válida' });
        }
        if (desde && hasta && String(desde) > String(hasta)) {
            return res.status(400).json({ ok: false, mensaje: 'La fecha "desde" no puede ser mayor que "hasta"' });
        }
        if (estado && !ESTADOS_VALIDOS.includes(String(estado))) {
            return res.status(400).json({ ok: false, mensaje: 'El estado no es válido' });
        }

        const filtros = {
            desde:           desde ? String(desde) : undefined,
            hasta:           hasta ? String(hasta) : undefined,
            id_especialidad: id_especialidad ? Number(id_especialidad) : undefined,
            id_medico:       id_medico ? Number(id_medico) : undefined,
            estado:          estado ? String(estado) : undefined,
        };

        const data = await this.service.reporteCitas(filtros);
        res.json({ ok: true, ...data });
    };
}