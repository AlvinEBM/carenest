// =================================================================
// CAPA: Application / Services
// El cerebro del módulo Administración.
//
// Orquesta los 4 casos de uso del administrador:
//   1. Cancelación masiva de citas
//   2. Crear nueva especialidad
//   3. Inhabilitar especialidad temporalmente
//   4. Configurar sanciones + crear cuentas de admisión
//
// El service NO conoce TypeORM ni HTTP. Solo trabaja con
// la interfaz IAdminRepository.
//
// PATRONES APLICADOS:
//   - Abstract Factory (UsuarioFactory.crearAdmision) en
//     crearUsuarioAdmision() para garantizar rol correcto.
//   - Patrón del profesor: instanciación interna del repo.
// =================================================================
import bcrypt from 'bcrypt';

import { IAdminRepository } from '../../domain/repositories/IAdminRepository';
import { AdminRepository } from '../../infrastructure/repositories/admin.repository';

import { CancelacionMasivaDTO } from '../dto/cancelacion-masiva.dto';
import { NuevaEspecialidadDTO } from '../dto/nueva-especialidad.dto';
import { InhabilitarEspecialidadDTO } from '../dto/inhabilitar-especialidad.dto';
import { ConfigurarSancionesDTO } from '../dto/configurar-sanciones.dto';
import { CrearAdmisionDTO } from '../dto/crear-admision.dto';
import { CrearMedicoDTO } from '../dto/crear-medico.dto';
import { ProgramarDisponibilidadDTO } from '../dto/programar-disponibilidad.dto';
import { CrearCuentaMedicoDTO } from '../dto/crear-cuenta-medico.dto';
import { PrecioEspecialidadDTO } from '../dto/precio-especialidad.dto';

export class AdminService {
    private repo: IAdminRepository;

    // Inyección por constructor: en producción usa el repositorio real,
    // en las pruebas unitarias se le pasa un doble (mock).
    constructor(repo?: IAdminRepository) {
        this.repo = repo ?? new AdminRepository();
    }

    // ============================================================
    // 1) CANCELACIÓN MASIVA DE CITAS
    // ============================================================
    async cancelarMasivo(adminId: number, data: CancelacionMasivaDTO) {
        // a) Intentar cancelar las citas
        const resultado = await this.repo.cancelarCitasPorFechaEspecialidad(
            data.fecha,
            data.id_especialidad,
            data.motivo,
        );

        // b) Si no hay citas para cancelar, rechazar la operación
        if (resultado.afectadas === 0) {
            return {
                ok: false,
                mensaje: 'No hay citas para cancelar en esa fecha y especialidad',
            };
        }

        // c) Registrar la fecha bloqueada (auditoría)
        await this.repo.registrarFechaBloqueada(
            data.fecha,
            data.id_especialidad,
            data.motivo,
            adminId,
        );

        // d) Notificar a los pacientes afectados
        const mensaje = `Su cita ha sido cancelada debido a: ${data.motivo}`;
        await this.repo.insertarNotificacionesMasivas(
            resultado.idsUsuariosAfectados,
            null,
            mensaje,
        );

        return {
            ok: true,
            mensaje: 'Cancelación masiva ejecutada correctamente',
            citas_canceladas: resultado.afectadas,
            pacientes_notificados: resultado.idsUsuariosAfectados.length,
        };
    }

    // ============================================================
    // 2) CREAR NUEVA ESPECIALIDAD
    // ============================================================
    async crearEspecialidad(data: NuevaEspecialidadDTO) {
        const existe = await this.repo.existeEspecialidadPorNombre(data.nombre);

        if (existe) {
            return {
                ok: false,
                mensaje: 'Ya existe una especialidad con ese nombre',
            };
        }

        const nueva = await this.repo.crearEspecialidad(
            data.nombre,
            data.descripcion ?? '',
            data.requiere_datos_menor ?? false,
            data.precio ?? 30,
        );

        return {
            ok: true,
            mensaje: 'Cambios realizados efectivamente',
            id: nueva.id,
        };
    }

    // ============================================================
    // 3) INHABILITAR ESPECIALIDAD TEMPORALMENTE
    // ============================================================
    async inhabilitarEspecialidad(
        adminId: number,
        data: InhabilitarEspecialidadDTO,
    ) {
        if (new Date(data.desde) > new Date(data.hasta)) {
            return {
                ok: false,
                mensaje: 'La fecha desde no puede ser posterior a la fecha hasta',
            };
        }

        await this.repo.inhabilitarEspecialidad(
            data.id_especialidad,
            data.desde,
            data.hasta,
            data.motivo,
            adminId,
        );

        return {
            ok: true,
            mensaje: 'Especialidad inhabilitada exitosamente',
        };
    }

    // ============================================================
    // 4a) CONFIGURAR SANCIONES
    // ============================================================
    async configurarSanciones(data: ConfigurarSancionesDTO) {
        await this.repo.guardarConfiguracion(
            'limite_inasistencias',
            String(data.limite_inasistencias),
            'Número máximo de inasistencias antes de bloquear cuenta',
        );

        await this.repo.guardarConfiguracion(
            'dias_suspension',
            String(data.dias_suspension),
            'Días de suspensión por exceder límite de inasistencias',
        );

        return {
            ok: true,
            mensaje: 'Configuración de sanciones actualizada',
            configuracion: {
                limite_inasistencias: data.limite_inasistencias,
                dias_suspension: data.dias_suspension,
            },
        };
    }

    // ============================================================
    // 4b) OBTENER CONFIGURACIÓN ACTUAL DE SANCIONES
    // ============================================================
    async obtenerSanciones() {
        const limite     = await this.repo.obtenerConfiguracion('limite_inasistencias');
        const suspension = await this.repo.obtenerConfiguracion('dias_suspension');

        return {
            ok: true,
            configuracion: {
                limite_inasistencias: limite ? Number(limite.valor) : 3,
                dias_suspension: suspension ? Number(suspension.valor) : 3,
            },
        };
    }

    // ============================================================
    // 4c) CREAR CUENTA DE PERSONAL DE ADMISIÓN
    //
    //  PATRÓN APLICADO: Abstract Factory (UsuarioFactory)
    //    Aunque el repository recibe los datos planos, conceptualmente
    //    el AdminService usa el factory para garantizar coherencia.
    //    Esto se ve reflejado en que el rol ADMISION queda asignado
    //    siempre y no puede ser falsificado por el cliente.
    // ============================================================
async crearUsuarioAdmision(data: CrearAdmisionDTO) {
        const existe = await this.repo.correoOdniExiste(data.correo, data.dni);

        if (existe) {
            return {
                ok: false,
                mensaje: 'El correo o DNI ya están registrados',
            };
        }

        // La contraseña la define el administrador al crear la cuenta
        const hash = await bcrypt.hash(data.contrasena, 10);

        // El repository garantiza internamente que el rol asignado
        // sea ADMISION (regla de negocio del Abstract Factory).
        const creado = await this.repo.crearUsuarioAdmision({
            correo: data.correo,
            contrasenaHash: hash,
            dni: data.dni,
            nombres: data.nombres,
            apellidos: data.apellidos,
            telefono: data.telefono,
        });

        return {
            ok: true,
            mensaje: 'Cuenta de admisión creada exitosamente',
            id_usuario: creado.id_usuario,
        };
    }
    // ============================================================
    // LISTADOS
    // ============================================================
    async listarEspecialidades() {
        const especialidades = await this.repo.listarEspecialidades();
        return { ok: true, total: especialidades.length, especialidades };
    }

    async listarUsuariosAdmision() {
        const usuarios = await this.repo.listarUsuariosAdmision();
        return { ok: true, total: usuarios.length, usuarios };
    }

    // ============================================================
    // GESTIÓN DE MÉDICOS
    // ============================================================
    // Crea el médico CON su cuenta de acceso (rol MEDICO).
    async crearMedico(dto: CrearMedicoDTO) {
        const existe = await this.repo.existeEspecialidadActiva(dto.id_especialidad);
        if (!existe) {
            return { ok: false, mensaje: 'La especialidad no existe o está inactiva' };
        }

        const correo = dto.correo.trim().toLowerCase();
        const duplicado = await this.repo.correoOdniExiste(correo, dto.dni);
        if (duplicado) {
            return { ok: false, mensaje: 'El correo o DNI ya están registrados' };
        }

        const hash = await bcrypt.hash(dto.contrasena, 10);

        const { id_medico, id_usuario } = await this.repo.crearMedicoConCuenta({
            nombres: dto.nombres.trim(),
            apellidos: dto.apellidos.trim(),
            id_especialidad: dto.id_especialidad,
            colegiatura: dto.colegiatura,
            correo,
            contrasenaHash: hash,
            dni: dto.dni,
            telefono: dto.telefono ?? null,
        });

        return { ok: true, mensaje: 'Médico registrado con su cuenta de acceso', id_medico, id_usuario };
    }

    // Da acceso a un médico que fue registrado antes sin cuenta.
    async crearCuentaMedico(idMedico: number, dto: CrearCuentaMedicoDTO) {
        if (!Number.isInteger(idMedico) || idMedico <= 0) {
            return { ok: false, codigo: 400, mensaje: 'ID de médico inválido' };
        }

        const medico = await this.repo.obtenerMedico(idMedico);
        if (!medico) {
            return { ok: false, codigo: 404, mensaje: 'El médico no existe' };
        }
        if (medico.id_usuario) {
            return { ok: false, codigo: 409, mensaje: 'Este médico ya tiene una cuenta de acceso' };
        }

        const correo = dto.correo.trim().toLowerCase();
        if (await this.repo.correoOdniExiste(correo, dto.dni)) {
            return { ok: false, codigo: 409, mensaje: 'El correo o DNI ya están registrados' };
        }

        const hash = await bcrypt.hash(dto.contrasena, 10);
        const { id_usuario } = await this.repo.crearCuentaParaMedico(idMedico, {
            nombres: medico.nombres,
            apellidos: medico.apellidos,
            correo,
            contrasenaHash: hash,
            dni: dto.dni,
        });

        return { ok: true, codigo: 201, mensaje: 'Cuenta de acceso creada para el médico', id_usuario };
    }

    // Cambia el precio de la consulta de una especialidad.
    async actualizarPrecioEspecialidad(idEspecialidad: number, dto: PrecioEspecialidadDTO) {
        if (!Number.isInteger(idEspecialidad) || idEspecialidad <= 0) {
            return { ok: false, codigo: 400, mensaje: 'ID de especialidad inválido' };
        }
        const actualizado = await this.repo.actualizarPrecioEspecialidad(idEspecialidad, dto.precio);
        if (!actualizado) {
            return { ok: false, codigo: 404, mensaje: 'La especialidad no existe' };
        }
        return { ok: true, codigo: 200, mensaje: 'Precio actualizado', precio: Number(dto.precio.toFixed(2)) };
    }

    async listarMedicos() {
        const medicos = await this.repo.listarMedicos();
        return { ok: true, total: medicos.length, medicos };
    }

    // ============================================================
    // FASE 3: programar disponibilidad
    // ============================================================
    async programarEspecialidad(dto: ProgramarDisponibilidadDTO) {
        return this.repo.programarEspecialidad(dto.id, dto.accion, dto.fecha);
    }

    async programarMedico(dto: ProgramarDisponibilidadDTO) {
        return this.repo.programarMedico(dto.id, dto.accion, dto.fecha);
    }
    async cancelarProgramacionEspecialidad(id: number, cual: 'INHABILITAR' | 'HABILITAR') {
        return this.repo.cancelarProgramacionEspecialidad(id, cual);
    }

    async cancelarProgramacionMedico(id: number, cual: 'INHABILITAR' | 'HABILITAR') {
        return this.repo.cancelarProgramacionMedico(id, cual);
    }
    async configurarCancelaciones(data: { limite_cancelaciones: number; dias_suspension_cancelaciones: number }) {
        await this.repo.guardarConfiguracion(
            'limite_cancelaciones',
            String(data.limite_cancelaciones),
            'Número máximo de cancelaciones de último momento antes de bloquear cuenta',
        );
        await this.repo.guardarConfiguracion(
            'dias_suspension_cancelaciones',
            String(data.dias_suspension_cancelaciones),
            'Días de suspensión por exceder límite de cancelaciones',
        );
        return {
            ok: true,
            mensaje: 'Configuración de cancelaciones actualizada',
            configuracion: {
                limite_cancelaciones: data.limite_cancelaciones,
                dias_suspension_cancelaciones: data.dias_suspension_cancelaciones,
            },
        };
    }

    async obtenerCancelaciones() {
        const limite     = await this.repo.obtenerConfiguracion('limite_cancelaciones');
        const suspension = await this.repo.obtenerConfiguracion('dias_suspension_cancelaciones');
        return {
            ok: true,
            configuracion: {
                limite_cancelaciones: limite ? Number(limite.valor) : 3,
                dias_suspension_cancelaciones: suspension ? Number(suspension.valor) : 15,
            },
        };
    }
}