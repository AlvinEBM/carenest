import { Request, Response } from 'express';
import { CorreoRemitenteRepository } from '../../infrastructure/repositories/correo-remitente.repository';
import { MailerService } from '../../application/services/mailer.service';

const remitenteRepo = new CorreoRemitenteRepository();
const mailer = new MailerService();

// No exponemos la contraseña al frontend; solo un flag de si tiene.
function aVista(r: any) {
    return {
        id_remitente: r.id_remitente,
        correo: r.correo,
        nombre_remitente: r.nombre_remitente,
        host: r.host,
        puerto: r.puerto,
        activo: !!r.activo,
        prioridad: r.prioridad,
        tiene_password: !!r.app_password,
    };
}

export class CorreoRemitenteController {
    listar = async (_req: Request, res: Response) => {
        const lista = await remitenteRepo.listarTodos();
        res.json({ ok: true, remitentes: lista.map(aVista) });
    };

    crear = async (req: Request, res: Response) => {
        const existe = await remitenteRepo.buscarPorCorreo(req.body.correo);
        if (existe) {
            return res.status(400).json({ ok: false, mensaje: 'Ese correo remitente ya está registrado' });
        }
        const creado = await remitenteRepo.crear({
            correo: req.body.correo,
            app_password: req.body.app_password,
            nombre_remitente: req.body.nombre_remitente ?? null,
            host: req.body.host ?? null,
            puerto: req.body.puerto ?? null,
            activo: req.body.activo ?? true,
            prioridad: req.body.prioridad ?? 0,
        });
        res.status(201).json({ ok: true, mensaje: 'Remitente agregado', remitente: aVista(creado) });
    };

    actualizar = async (req: Request, res: Response) => {
        const id = Number(req.params.id);
        const cambios: any = {
            correo: req.body.correo,
            nombre_remitente: req.body.nombre_remitente ?? null,
            host: req.body.host ?? null,
            puerto: req.body.puerto ?? null,
            activo: req.body.activo ?? true,
            prioridad: req.body.prioridad ?? 0,
        };
        if (req.body.app_password) cambios.app_password = req.body.app_password;
        await remitenteRepo.actualizar(id, cambios);
        res.json({ ok: true, mensaje: 'Remitente actualizado' });
    };

    eliminar = async (req: Request, res: Response) => {
        await remitenteRepo.eliminar(Number(req.params.id));
        res.json({ ok: true, mensaje: 'Remitente eliminado' });
    };

    enviarPendientes = async (_req: Request, res: Response) => {
        const r = await mailer.enviarPendientes();
        res.json({
            ok: true,
            mensaje: `Envío ejecutado: ${r.enviados} enviado(s), ${r.fallidos} fallido(s), ${r.sinCorreo} sin correo.`,
            resultado: r,
        });
    };

    resumen = async (_req: Request, res: Response) => {
        const pendientes = await mailer.contarPendientes();
        res.json({ ok: true, pendientes });
    };
}