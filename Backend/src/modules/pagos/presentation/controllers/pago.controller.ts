// =================================================================
// CAPA: Presentation / Controllers
// Endpoints del módulo Pagos.
// =================================================================
import { Request, Response } from 'express';

import { PagoService } from '../../application/services/pago.service';
import { CrearPreferenciaDTO } from '../../application/dto/crear-preferencia.dto';
import { validarFirmaWebhook } from '../../domain/firma-webhook';

export class PagoController {
    constructor(private service: PagoService = new PagoService()) {}

    private responder(res: Response, result: { codigo: number } & Record<string, unknown>) {
        const { codigo, ...resto } = result;
        return res.status(codigo).json(resto);
    }

    // GET /pagos/estado
    estado = async (_req: Request, res: Response) => {
        return res.status(200).json(this.service.estado());
    };

    // POST /pagos/preferencia
    crearPreferencia = async (req: Request, res: Response) => {
        const dto = req.dto as CrearPreferenciaDTO;
        const result = await this.service.crearPreferencia(req.jwt!.id, dto.id_cita);
        return this.responder(res, result as any);
    };

    // POST /pagos/:id/verificar
    verificar = async (req: Request, res: Response) => {
        const idPago = Number(req.params.id);
        if (!Number.isInteger(idPago) || idPago <= 0) {
            return res.status(400).json({ ok: false, mensaje: 'ID de pago inválido' });
        }
        const result = await this.service.verificarPago(req.jwt!.id, idPago);
        return this.responder(res, result as any);
    };

    // GET /pagos/mis-pagos
    misPagos = async (req: Request, res: Response) => {
        return res.status(200).json(await this.service.misPagos(req.jwt!.id));
    };

    // GET /pagos  (ADMIN)
    listarTodos = async (_req: Request, res: Response) => {
        return res.status(200).json(await this.service.listarTodos());
    };

    // POST /pagos/webhook  (público, lo llama Mercado Pago)
    webhook = async (req: Request, res: Response) => {
        const tipo = String(req.body?.type ?? req.query.type ?? req.query.topic ?? '');
        const paymentId = String(req.body?.data?.id ?? req.query['data.id'] ?? req.query.id ?? '');

        // Si se configuró la clave secreta, la firma es obligatoria
        const secreto = process.env.MP_WEBHOOK_SECRET;
        if (secreto) {
            const firmaOk = validarFirmaWebhook({
                xSignature: req.header('x-signature'),
                xRequestId: req.header('x-request-id'),
                dataId: String(req.query['data.id'] ?? paymentId),
                secreto,
            });
            if (!firmaOk) {
                return res.status(401).json({ ok: false, mensaje: 'Firma inválida' });
            }
        }

        if (tipo !== 'payment' || !paymentId) {
            // Otros eventos (merchant_order, etc.) se ignoran pero se responde 200
            return res.status(200).json({ ok: true, ignorado: true });
        }

        try {
            const r = await this.service.procesarNotificacion(paymentId);
            return res.status(200).json({ ok: true, ...r });
        } catch (e: any) {
            console.error('[Webhook] Error procesando pago', paymentId, e?.message);
            // 500 → Mercado Pago reintentará más tarde
            return res.status(500).json({ ok: false });
        }
    };
}
