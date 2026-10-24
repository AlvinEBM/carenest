// =================================================================
// Caso de uso: AUTENTICAR un usuario (login) con suspensión real.
// =================================================================
import bcrypt from 'bcrypt';

import { TokenBuilder } from '../../../../shared/builders/token.builder';

import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { UserRepository } from '../../infrastructure/repositories/user.repository';
import { LoginDTO } from '../dtos/login.dto';

const DIAS_SUSPENSION_DEFAULT = 15;

export class AuthService {

    private repo: IUserRepository = new UserRepository();

    async login(data: LoginDTO): Promise<
        | { ok: true; token: string; id_usuario: number; correo: string; nombres: string; apellidos: string; rol: string }
        | { ok: false; motivo: 'CREDENCIALES' | 'BLOQUEADA'; mensaje: string }
    > {
        const user = await this.repo.findCredentials(data.correo);
        if (!user) {
            return { ok: false, motivo: 'CREDENCIALES', mensaje: 'Correo o contraseña incorrectos' };
        }
        // línea del bcrypt.compare:
        const valid = await bcrypt.compare(data.contrasena, user.contrasena!);
        if (!valid) {
            return { ok: false, motivo: 'CREDENCIALES', mensaje: 'Correo o contraseña incorrectos' };
        }

        // Suspensión por inasistencias
        // Suspensión por inasistencias O cancelaciones
        if (user.cuenta_bloqueada) {
            // Determinar qué días de suspensión aplicar según el motivo del bloqueo
            const limiteFaltas = Number(await this.repo.obtenerConfiguracion('limite_inasistencias')) || 3;
            const limiteCancel = Number(await this.repo.obtenerConfiguracion('limite_cancelaciones')) || 3;

            const inasistencias = Number((user as any).inasistencias ?? 0);
            const cancelaciones = Number((user as any).cancelaciones ?? 0);

            // Si llegó al límite de cancelaciones, usa los días de cancelaciones; si no, los de faltas
            let clavesDias = 'dias_suspension';
            let motivoTexto = 'inasistencias';
            if (cancelaciones >= limiteCancel && inasistencias < limiteFaltas) {
                clavesDias = 'dias_suspension_cancelaciones';
                motivoTexto = 'cancelaciones de último momento';
            }

            const diasSuspension = await this.obtenerDias(clavesDias, DIAS_SUSPENSION_DEFAULT);
            const fechaBloqueo = user.fecha_bloqueo as string | null;

            if (fechaBloqueo) {
                const diasTranscurridos = this.diasDesde(fechaBloqueo);
                if (diasTranscurridos >= diasSuspension) {
                    await this.repo.desbloquearCuenta(user.id_usuario);
                } else {
                    const diasRestantes = diasSuspension - diasTranscurridos;
                    return {
                        ok: false,
                        motivo: 'BLOQUEADA',
                        mensaje: `Tu cuenta está suspendida por ${motivoTexto}. Podrás ingresar en ${diasRestantes} día(s).`,
                    };
                }
            } else {
                return {
                    ok: false,
                    motivo: 'BLOQUEADA',
                    mensaje: 'Tu cuenta está suspendida. Contacta a admisión.',
                };
            }
        }

        const token = new TokenBuilder()
            .conUsuario(user.id_usuario)
            .conRol(user.rol as 'PACIENTE' | 'ADMIN' | 'ADMISION' | 'MEDICO')
            .conExpiracion('1d')
            .firmar();

        return {
            ok: true,
            token,
            id_usuario: user.id_usuario,
            correo: user.correo!,
            nombres: user.nombres,
            apellidos: user.apellidos,
            rol: user.rol,
        };
    }
    
    // ------------------------------------------------------------
    // Con JWT el token es stateless. Este método confirma el cierre
    // de sesión del usuario autenticado. El middleware authHandler
    // ya verificó que el token era válido antes de llegar aquí, por
    // lo que basta con registrar/confirmar el cierre.
    // ============================================================
    async logout(idUsuario: number): Promise<{ ok: true; mensaje: string }> {
        // Punto único donde, a futuro, se podría invalidar la sesión
        // en una lista negra o en la tabla 'sesiones' si se decide
        // llevar registro de sesiones activas.
        void idUsuario;

        return {
            ok: true,
            mensaje: 'Sesión cerrada correctamente',
        };
    }

    private async obtenerDias(clave: string, porDefecto: number): Promise<number> {
        const valor = await this.repo.obtenerConfiguracion(clave);
        return valor ? Number(valor) : porDefecto;
    }

    private diasDesde(fechaStr: string): number {
        const fecha = new Date(fechaStr + 'T00:00:00');
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const ms = hoy.getTime() - fecha.getTime();
        return Math.floor(ms / (1000 * 60 * 60 * 24));
    }
}