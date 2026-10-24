// =================================================================
// CAPA: Presentation / Controllers
// Endpoints de autenticación y registro.
// =================================================================
import { Request, Response } from 'express';

import { AuthService } from '../../application/services/auth.service';
import { UserService } from '../../application/services/user.service';
import { LoginDTO } from '../../application/dtos/login.dto';
import { RegisterDTO } from '../../application/dtos/register.dto';

export class AuthController {
    private authService: AuthService;
    private userService: UserService;

    constructor() {
        this.authService = new AuthService();
        this.userService = new UserService();
    }

    // ============================================================
    // POST /auth/login
    // ============================================================
    login = async (req: Request, res: Response) => {
        const data = req.dto as LoginDTO;

        const result = await this.authService.login(data);

        if (result.ok === false) {
            const status = result.motivo === 'BLOQUEADA' ? 403 : 401;
            return res.status(status).json({ ok: false, mensaje: result.mensaje });
        }

        return res.status(200).json(result);
    };

    // ============================================================
    // POST /auth/register
    // ============================================================
    register = async (req: Request, res: Response) => {
        const data = req.dto as RegisterDTO;

        const result = await this.userService.register(data);

        if (!result.ok) {
            return res.status(409).json(result);
        }

        return res.status(201).json(result);
    };

    // ============================================================
    // POST /auth/logout
    // Requiere token (authHandler). Cierra la sesión del usuario
    // autenticado que viaja en req.jwt.
    // ============================================================
    logout = async (req: Request, res: Response) => {
        // authHandler garantiza que req.jwt existe en este punto.
        const idUsuario = req.jwt!.id;

        const result = await this.authService.logout(idUsuario);

        return res.status(200).json(result);
    };
}