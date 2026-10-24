// =================================================================
// PRUEBAS UNITARIAS — AdminService: alta de médicos con cuenta
// =================================================================
import bcrypt from 'bcrypt';
import { AdminService } from '../../src/modules/administracion/application/services/admin.service';
import { IAdminRepository } from '../../src/modules/administracion/domain/repositories/IAdminRepository';
import { CrearMedicoDTO } from '../../src/modules/administracion/application/dto/crear-medico.dto';

const dto = (): CrearMedicoDTO => Object.assign(new CrearMedicoDTO(), {
    nombres: ' Andrea ', apellidos: 'Torres', id_especialidad: 1, correo: 'Andrea.Torres@CareNest.pe',
    contrasena: 'Medico2026', dni: '41234567', colegiatura: '045123',
});

function repoDoble(over: Partial<Record<keyof IAdminRepository, jest.Mock>> = {}) {
    return {
        existeEspecialidadActiva: jest.fn().mockResolvedValue(true),
        correoOdniExiste: jest.fn().mockResolvedValue(false),
        crearMedicoConCuenta: jest.fn().mockResolvedValue({ id_medico: 6, id_usuario: 9 }),
        obtenerMedico: jest.fn().mockResolvedValue({ id_medico: 2, nombres: 'Maria', apellidos: 'Gonzales', id_usuario: null }),
        crearCuentaParaMedico: jest.fn().mockResolvedValue({ id_usuario: 10 }),
        actualizarPrecioEspecialidad: jest.fn().mockResolvedValue(true),
        ...over,
    } as unknown as jest.Mocked<IAdminRepository>;
}

describe('AdminService — médicos', () => {
    test('CP-SADM-01 crea médico con cuenta: correo en minúsculas y contraseña hasheada (bcrypt)', async () => {
        const repo = repoDoble();
        const r = await new AdminService(repo).crearMedico(dto());
        expect(r).toMatchObject({ ok: true, id_medico: 6, id_usuario: 9 });
        const datos = (repo.crearMedicoConCuenta as jest.Mock).mock.calls[0][0];
        expect(datos.correo).toBe('andrea.torres@carenest.pe');
        expect(datos.nombres).toBe('Andrea');
        expect(datos.contrasenaHash).not.toBe('Medico2026');
        expect(await bcrypt.compare('Medico2026', datos.contrasenaHash)).toBe(true);
    });

    test('CP-SADM-02 especialidad inactiva → rechazado', async () => {
        const repo = repoDoble({ existeEspecialidadActiva: jest.fn().mockResolvedValue(false) });
        expect(await new AdminService(repo).crearMedico(dto())).toMatchObject({ ok: false });
        expect(repo.crearMedicoConCuenta).not.toHaveBeenCalled();
    });

    test('CP-SADM-03 correo o DNI duplicado → rechazado', async () => {
        const repo = repoDoble({ correoOdniExiste: jest.fn().mockResolvedValue(true) });
        expect(await new AdminService(repo).crearMedico(dto())).toEqual({ ok: false, mensaje: 'El correo o DNI ya están registrados' });
    });

    test('CP-SADM-04 crear acceso a médico existente sin cuenta → 201', async () => {
        const repo = repoDoble();
        const r = await new AdminService(repo).crearCuentaMedico(2, { correo: 'maria@carenest.pe', contrasena: 'Pediatra1', dni: '40000009' });
        expect(r).toMatchObject({ ok: true, codigo: 201, id_usuario: 10 });
    });

    test('CP-SADM-05 médico que YA tiene cuenta → 409', async () => {
        const repo = repoDoble({ obtenerMedico: jest.fn().mockResolvedValue({ id_medico: 2, nombres: 'M', apellidos: 'G', id_usuario: 5 }) });
        expect(await new AdminService(repo).crearCuentaMedico(2, { correo: 'm@c.pe', contrasena: 'Pediatra1', dni: '40000009' })).toMatchObject({ codigo: 409 });
    });

    test('CP-SADM-06 médico inexistente → 404', async () => {
        const repo = repoDoble({ obtenerMedico: jest.fn().mockResolvedValue(null) });
        expect(await new AdminService(repo).crearCuentaMedico(999, { correo: 'm@c.pe', contrasena: 'Pediatra1', dni: '40000009' })).toMatchObject({ codigo: 404 });
    });

    test('CP-SADM-07 precio de especialidad inexistente → 404', async () => {
        const repo = repoDoble({ actualizarPrecioEspecialidad: jest.fn().mockResolvedValue(false) });
        expect(await new AdminService(repo).actualizarPrecioEspecialidad(999, { precio: 40 })).toMatchObject({ codigo: 404 });
    });
});
