import * as nodemailer from 'nodemailer';
import { AppDataSource } from '../../../../config/datasource';
import { NotificacionModel } from '../../infrastructure/models/notificacion.model';
import { CorreoRemitenteModel } from '../../infrastructure/models/correo-remitente.model';
import { CorreoRemitenteRepository } from '../../infrastructure/repositories/correo-remitente.repository';
import { construirCorreoHTML, asuntoCorreo, NOMBRE_INSTITUCION } from './mailer.template';

interface Pendiente {
    id_notificacion: number;
    tipo: string;
    mensaje: string;
    correo: string | null;
    nombre: string;
}

export class MailerService {
    private remitenteRepo = new CorreoRemitenteRepository();
    private notifRepo = AppDataSource.getRepository(NotificacionModel);

    private crearTransporter(r: CorreoRemitenteModel) {
        const host = r.host || 'smtp.gmail.com';
        const port = r.puerto || 587;
        return nodemailer.createTransport({
            host,
            port,
            secure: port === 465,   // 465 = SSL directo; 587 = STARTTLS
            auth: { user: r.correo, pass: r.app_password },
        });
    }

    private async obtenerPendientes(): Promise<Pendiente[]> {
        const rows = await this.notifRepo.manager.query(
            `SELECT n.id_notificacion, n.tipo, n.mensaje,
                    u.correo,
                    TRIM(CONCAT(COALESCE(u.nombres,''),' ',COALESCE(u.apellidos,''))) AS nombre
             FROM notificaciones n
             INNER JOIN usuarios u ON u.id_usuario = n.id_usuario
             WHERE n.correo_enviado = 0
               AND n.fecha_programada <= NOW()
             ORDER BY n.fecha_programada ASC`,
        );
        return rows.map((r: any) => ({
            id_notificacion: Number(r.id_notificacion),
            tipo: String(r.tipo),
            mensaje: String(r.mensaje),
            correo: r.correo ? String(r.correo) : null,
            nombre: r.nombre ? String(r.nombre) : '',
        }));
    }

    private async marcarEnviado(idNotificacion: number): Promise<void> {
        await this.notifRepo.update({ id_notificacion: idNotificacion }, { correo_enviado: true });
    }

    async enviarPendientes(): Promise<{ enviados: number; fallidos: number; sinCorreo: number; remitentesActivos: number; }> {
        const remitentes = await this.remitenteRepo.listarActivosOrdenados();
        if (remitentes.length === 0) {
            return { enviados: 0, fallidos: 0, sinCorreo: 0, remitentesActivos: 0 };
        }

        const pendientes = await this.obtenerPendientes();

        const transporters = new Map<number, nodemailer.Transporter>();
        const getTransporter = (r: CorreoRemitenteModel) => {
            if (!transporters.has(r.id_remitente)) {
                transporters.set(r.id_remitente, this.crearTransporter(r));
            }
            return transporters.get(r.id_remitente)!;
        };

        let enviados = 0, fallidos = 0, sinCorreo = 0;

        for (const n of pendientes) {
            if (!n.correo) { sinCorreo++; continue; }

            const html = construirCorreoHTML(n.nombre, n.mensaje);
            const asunto = asuntoCorreo(n.tipo);

            // FAILOVER: intenta con cada remitente activo hasta que uno funcione
            let ok = false;
            for (const r of remitentes) {
                try {
                    const transporter = getTransporter(r);
                    await transporter.sendMail({
                        from: `"${r.nombre_remitente || NOMBRE_INSTITUCION}" <${r.correo}>`,
                        to: n.correo,
                        subject: asunto,
                        html,
                    });
                    ok = true;
                    break;
                } catch (err: any) {
                    console.error(`[MAILER] Falló remitente ${r.correo}: ${err?.message}`);
                }
            }

            if (ok) { await this.marcarEnviado(n.id_notificacion); enviados++; }
            else { fallidos++; }
        }

        return { enviados, fallidos, sinCorreo, remitentesActivos: remitentes.length };
    }

    async contarPendientes(): Promise<number> {
        const rows = await this.notifRepo.manager.query(
            `SELECT COUNT(*) AS total FROM notificaciones
             WHERE correo_enviado = 0 AND fecha_programada <= NOW()`,
        );
        return rows && rows.length > 0 ? Number(rows[0].total) : 0;
    }
}