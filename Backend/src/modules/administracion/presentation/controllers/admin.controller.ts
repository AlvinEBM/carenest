// =================================================================
// CAPA: Presentation / Controllers
// Endpoints del módulo Administración.
//
// Patrón:
//   - req.dto → DTO ya validado por authHandler
//   - req.jwt → datos del admin autenticado (id, rol)
//
// Cada método delega al AdminService y devuelve la respuesta
// en formato JSON con códigos HTTP semánticos.
// =================================================================
import { Request, Response } from 'express';

import { AdminService } from '../../application/services/admin.service';

import { CancelacionMasivaDTO } from '../../application/dto/cancelacion-masiva.dto';
import { NuevaEspecialidadDTO } from '../../application/dto/nueva-especialidad.dto';
import { InhabilitarEspecialidadDTO } from '../../application/dto/inhabilitar-especialidad.dto';
import { ConfigurarSancionesDTO } from '../../application/dto/configurar-sanciones.dto';
import { CrearAdmisionDTO } from '../../application/dto/crear-admision.dto';
import { CrearMedicoDTO } from '../../application/dto/crear-medico.dto';
import { CrearCuentaMedicoDTO } from '../../application/dto/crear-cuenta-medico.dto';
import { PrecioEspecialidadDTO } from '../../application/dto/precio-especialidad.dto';
import { ProgramarDisponibilidadDTO } from '../../application/dto/programar-disponibilidad.dto';
import { DisponibilidadService } from '../../application/services/disponibilidad.service';

export class AdminController {
    private service: AdminService;
    private disponibilidadService = new DisponibilidadService();

    // POST /admin/ejecutar-revision  (disparo manual del cron, para pruebas)
    ejecutarRevision = async (_req: Request, res: Response) => {
        const result = await this.disponibilidadService.ejecutarRevisionDiaria();
        return res.status(200).json({ ok: true, ...result });
    };
    
    constructor() {
        this.service = new AdminService();
    }

    // ============================================================
    // POST /admin/cancelacion-masiva
    // ============================================================
    cancelarMasivo = async (req: Request, res: Response) => {
        const dto = req.dto as CancelacionMasivaDTO;
        const adminId = req.jwt!.id;

        const result = await this.service.cancelarMasivo(adminId, dto);

        // 404 si no había citas para cancelar
        if (!result.ok) {
            return res.status(404).json(result);
        }

        return res.status(200).json(result);
    };

    // ============================================================
    // POST /admin/especialidad
    // ============================================================
    crearEspecialidad = async (req: Request, res: Response) => {
        const dto = req.dto as NuevaEspecialidadDTO;

        const result = await this.service.crearEspecialidad(dto);

        if (!result.ok) {
            return res.status(409).json(result);
        }
        return res.status(201).json(result);
    };

    // ============================================================
    // PUT /admin/especialidad/inhabilitar
    // ============================================================
    inhabilitarEspecialidad = async (req: Request, res: Response) => {
        const dto = req.dto as InhabilitarEspecialidadDTO;
        const adminId = req.jwt!.id;

        const result = await this.service.inhabilitarEspecialidad(adminId, dto);

        if (!result.ok) {
            return res.status(400).json(result);
        }
        return res.status(200).json(result);
    };

    // ============================================================
    // GET /admin/sanciones
    // ============================================================
    obtenerSanciones = async (_req: Request, res: Response) => {
        const result = await this.service.obtenerSanciones();
        return res.status(200).json(result);
    };

    // ============================================================
    // PUT /admin/sanciones
    // ============================================================
    configurarSanciones = async (req: Request, res: Response) => {
        const dto = req.dto as ConfigurarSancionesDTO;

        const result = await this.service.configurarSanciones(dto);
        return res.status(200).json(result);
    };

    // ============================================================
    // POST /admin/usuario-admision
    // ============================================================
    crearUsuarioAdmision = async (req: Request, res: Response) => {
        const dto = req.dto as CrearAdmisionDTO;

        const result = await this.service.crearUsuarioAdmision(dto);

        if (!result.ok) {
            return res.status(409).json(result);
        }
        return res.status(201).json(result);
    };
    // ============================================================
    // GET /admin/especialidades
    // ============================================================
    listarEspecialidades = async (_req: Request, res: Response) => {
        const result = await this.service.listarEspecialidades();
        return res.status(200).json(result);
    };

    // ============================================================
    // GET /admin/usuarios-admision
    // ============================================================
    listarUsuariosAdmision = async (_req: Request, res: Response) => {
        const result = await this.service.listarUsuariosAdmision();
        return res.status(200).json(result);
    };

    // ============================================================
    // POST /admin/medico
    // ============================================================
    crearMedico = async (req: Request, res: Response) => {
        const dto = req.dto as CrearMedicoDTO;
        const result = await this.service.crearMedico(dto);

        if (!result.ok) {
            return res.status(409).json(result);
        }
        return res.status(201).json(result);
    };

    // ============================================================
    // POST /admin/medico/:id/cuenta
    // ============================================================
    crearCuentaMedico = async (req: Request, res: Response) => {
        const { codigo, ...result } = await this.service.crearCuentaMedico(
            Number(req.params.id),
            req.dto as CrearCuentaMedicoDTO,
        );
        return res.status(codigo).json(result);
    };

    // ============================================================
    // PUT /admin/especialidad/:id/precio
    // ============================================================
    actualizarPrecioEspecialidad = async (req: Request, res: Response) => {
        const { codigo, ...result } = await this.service.actualizarPrecioEspecialidad(
            Number(req.params.id),
            req.dto as PrecioEspecialidadDTO,
        );
        return res.status(codigo).json(result);
    };

    // ============================================================
    // GET /admin/medicos
    // ============================================================
    listarMedicos = async (_req: Request, res: Response) => {
        const result = await this.service.listarMedicos();
        return res.status(200).json(result);
    };

    // POST /admin/programar-especialidad
    programarEspecialidad = async (req: Request, res: Response) => {
        const dto = req.dto as ProgramarDisponibilidadDTO;
        const result = await this.service.programarEspecialidad(dto);
        if (!result.ok) return res.status(400).json(result);
        return res.status(200).json(result);
    };

    // POST /admin/programar-medico
    programarMedico = async (req: Request, res: Response) => {
        const dto = req.dto as ProgramarDisponibilidadDTO;
        const result = await this.service.programarMedico(dto);
        if (!result.ok) return res.status(400).json(result);
        return res.status(200).json(result);
    };
    // POST /admin/cancelar-programacion-especialidad
    cancelarProgramacionEspecialidad = async (req: Request, res: Response) => {
        const { id, cual } = req.body;
        const result = await this.service.cancelarProgramacionEspecialidad(Number(id), cual);
        return res.status(200).json(result);
    };

    // POST /admin/cancelar-programacion-medico
    cancelarProgramacionMedico = async (req: Request, res: Response) => {
        const { id, cual } = req.body;
        const result = await this.service.cancelarProgramacionMedico(Number(id), cual);
        return res.status(200).json(result);
    };
    // GET /admin/cancelaciones-config
    obtenerCancelaciones = async (_req: Request, res: Response) => {
        const result = await this.service.obtenerCancelaciones();
        return res.status(200).json(result);
    };

    // PUT /admin/cancelaciones-config
    configurarCancelaciones = async (req: Request, res: Response) => {
        const { limite_cancelaciones, dias_suspension_cancelaciones } = req.body;
        const result = await this.service.configurarCancelaciones({
            limite_cancelaciones: Number(limite_cancelaciones),
            dias_suspension_cancelaciones: Number(dias_suspension_cancelaciones),
        });
        return res.status(200).json(result);
    };
}