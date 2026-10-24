// =================================================================
// CAPA: Presentation / Routes
// Rutas del módulo Administración.
//
// TODAS las rutas están protegidas con:
//   authHandler({ roles: ['ADMIN'], dto: ... })
//
// Esto garantiza que solo un usuario autenticado con rol ADMIN
// puede ejecutar acciones administrativas, y que cada DTO está
// validado antes de llegar al controller.
// =================================================================
import { Router } from 'express';

import { AdminController } from '../controllers/admin.controller';
import { authHandler } from '../../../../shared/middlewares/auth.handler';

import { CancelacionMasivaDTO } from '../../application/dto/cancelacion-masiva.dto';
import { NuevaEspecialidadDTO } from '../../application/dto/nueva-especialidad.dto';
import { InhabilitarEspecialidadDTO } from '../../application/dto/inhabilitar-especialidad.dto';
import { ConfigurarSancionesDTO } from '../../application/dto/configurar-sanciones.dto';
import { CrearAdmisionDTO } from '../../application/dto/crear-admision.dto';
import { CrearMedicoDTO } from '../../application/dto/crear-medico.dto';
import { CrearCuentaMedicoDTO } from '../../application/dto/crear-cuenta-medico.dto';
import { PrecioEspecialidadDTO } from '../../application/dto/precio-especialidad.dto';
import { ProgramarDisponibilidadDTO } from '../../application/dto/programar-disponibilidad.dto';
import { ReporteController } from '../controllers/reporte.controller';

const router = Router();
const controller = new AdminController();

// ============================================================
// 1) Cancelación masiva de citas
//    POST /admin/cancelacion-masiva
// ============================================================
router.post(
    '/cancelacion-masiva',
    authHandler({
        roles: ['ADMIN'],
        dto: CancelacionMasivaDTO,
    }),
    controller.cancelarMasivo,
);

// ============================================================
// 2) Crear nueva especialidad
//    POST /admin/especialidad
// ============================================================
router.post(
    '/especialidad',
    authHandler({
        roles: ['ADMIN'],
        dto: NuevaEspecialidadDTO,
    }),
    controller.crearEspecialidad,
);

// ============================================================
// 3) Inhabilitar especialidad temporalmente
//    PUT /admin/especialidad/inhabilitar
// ============================================================
router.put(
    '/especialidad/inhabilitar',
    authHandler({
        roles: ['ADMIN'],
        dto: InhabilitarEspecialidadDTO,
    }),
    controller.inhabilitarEspecialidad,
);

// ============================================================
// 4) Configuración de sanciones
//    GET  /admin/sanciones    (consultar configuración actual)
//    PUT  /admin/sanciones    (actualizar)
// ============================================================
router.get(
    '/sanciones',
    authHandler({ roles: ['ADMIN'] }),
    controller.obtenerSanciones,
);

router.put(
    '/sanciones',
    authHandler({
        roles: ['ADMIN'],
        dto: ConfigurarSancionesDTO,
    }),
    controller.configurarSanciones,
);

// ============================================================
// 5) Crear cuenta de personal de admisión
//    POST /admin/usuario-admision
// ============================================================
router.post(
    '/usuario-admision',
    authHandler({
        roles: ['ADMIN'],
        dto: CrearAdmisionDTO,
    }),
    controller.crearUsuarioAdmision,
);// ============================================================
// 6) Listados para las vistas del admin
// ============================================================
router.get(
    '/especialidades',
    authHandler({ roles: ['ADMIN'] }),
    controller.listarEspecialidades,
);

router.get(
    '/usuarios-admision',
    authHandler({ roles: ['ADMIN'] }),
    controller.listarUsuariosAdmision,
);

// ============================================================
// 7) Gestión de médicos
// ============================================================
router.post(
    '/medico',
    authHandler({
        roles: ['ADMIN'],
        dto: CrearMedicoDTO,
    }),
    controller.crearMedico,
);

router.get(
    '/medicos',
    authHandler({ roles: ['ADMIN'] }),
    controller.listarMedicos,
);

// Dar cuenta de acceso a un médico registrado sin cuenta
router.post(
    '/medico/:id/cuenta',
    authHandler({ roles: ['ADMIN'], dto: CrearCuentaMedicoDTO }),
    controller.crearCuentaMedico,
);

// Precio de la consulta por especialidad (lo usa la pasarela de pagos)
router.put(
    '/especialidad/:id/precio',
    authHandler({ roles: ['ADMIN'], dto: PrecioEspecialidadDTO }),
    controller.actualizarPrecioEspecialidad,
);

router.post('/programar-especialidad', authHandler({ roles: ['ADMIN'], dto: ProgramarDisponibilidadDTO }), controller.programarEspecialidad);
router.post('/programar-medico',       authHandler({ roles: ['ADMIN'], dto: ProgramarDisponibilidadDTO }), controller.programarMedico);
router.post('/ejecutar-revision', authHandler({ roles: ['ADMIN'] }), controller.ejecutarRevision);
router.post('/cancelar-programacion-especialidad', authHandler({ roles: ['ADMIN'] }), controller.cancelarProgramacionEspecialidad);
router.post('/cancelar-programacion-medico',       authHandler({ roles: ['ADMIN'] }), controller.cancelarProgramacionMedico);
router.get('/cancelaciones-config', authHandler({ roles: ['ADMIN'] }), controller.obtenerCancelaciones);
router.put('/cancelaciones-config', authHandler({ roles: ['ADMIN'] }), controller.configurarCancelaciones);
// ----- Reportes -----
const reporteController = new ReporteController();
router.get('/reportes/citas', authHandler({ roles: ['ADMIN'] }), reporteController.reporteCitas);

export default router;