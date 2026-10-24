// =================================================================
// PRUEBAS UNITARIAS — MedicoService (con repositorio simulado)
// El repositorio se reemplaza por un doble (jest.fn) para probar
// SOLO la lógica del caso de uso, sin base de datos.
// =================================================================
import { MedicoService } from '../../src/modules/medicos/application/services/medico.service';
import { IMedicoRepository } from '../../src/modules/medicos/domain/repositories/IMedicoRepository';
import { Atencion } from '../../src/modules/medicos/domain/entities/atencion.entity';

const AHORA = new Date(2026, 9, 14, 10, 0); // miércoles 14-oct-2026 10:00
const PERFIL = { id_medico: 1, nombres: 'Carlos', apellidos: 'Lopez', colegiatura: '045123', id_especialidad: 1, especialidad: 'Medicina General' };

function crearRepo(over: Partial<jest.Mocked<IMedicoRepository>> = {}): jest.Mocked<IMedicoRepository> {
    return {
        obtenerPerfilPorUsuario: jest.fn().mockResolvedValue(PERFIL),
        agenda: jest.fn().mockResolvedValue([]),
        obtenerCitaDeMedico: jest.fn().mockResolvedValue({ id_cita: 10, id_medico: 1, estado: 'CONFIRMADA', fecha: '2026-10-14' }),
        existeAtencion: jest.fn().mockResolvedValue(false),
        registrarAtencion: jest.fn().mockImplementation(async (a: Atencion) => ({ ...a, id_atencion: 99 })),
        medicoAtiendeAPaciente: jest.fn().mockResolvedValue(true),
        historialPaciente: jest.fn().mockResolvedValue([]),
        datosPaciente: jest.fn().mockResolvedValue({ nombres: 'Juan', apellidos: 'Perez', dni: '76543210', fecha_nacimiento: null }),
        ...over,
    } as jest.Mocked<IMedicoRepository>;
}

describe('MedicoService', () => {
    test('CP-SMED-01 usuario MEDICO no vinculado a la tabla médicos → NO_ENCONTRADO', async () => {
        const svc = new MedicoService(crearRepo({ obtenerPerfilPorUsuario: jest.fn().mockResolvedValue(null) }), () => AHORA);
        expect(await svc.perfil(4)).toMatchObject({ ok: false, codigo: 'NO_ENCONTRADO' });
    });

    test('CP-SMED-02 agenda sin fecha usa HOY (hora local) y busca con el id del médico de la sesión', async () => {
        const repo = crearRepo();
        const r = await new MedicoService(repo, () => AHORA).agenda(4);
        expect(r).toMatchObject({ ok: true, fecha: '2026-10-14' });
        expect(repo.obtenerPerfilPorUsuario).toHaveBeenCalledWith(4);
        expect(repo.agenda).toHaveBeenCalledWith(1, '2026-10-14');
    });

    test.each(['14/10/2026', '2026-02-30', "2026-10-14' OR 1=1 --"])('CP-SMED-03 fecha inválida "%s" → DATOS sin consultar BD', async (fecha) => {
        const repo = crearRepo();
        expect(await new MedicoService(repo, () => AHORA).agenda(4, fecha)).toMatchObject({ ok: false, codigo: 'DATOS' });
        expect(repo.agenda).not.toHaveBeenCalled();
    });

    test('CP-SMED-04 resumen de la agenda cuenta atendidas, pendientes, faltas y canceladas', async () => {
        const cita = (estado: string, atendida = false) => ({ estado, atendida } as any);
        const repo = crearRepo({ agenda: jest.fn().mockResolvedValue([
            cita('COMPLETADA', true), cita('CONFIRMADA'), cita('RESERVADA'), cita('FALTA'), cita('CANCELADA'),
        ]) });
        const r: any = await new MedicoService(repo, () => AHORA).agenda(4, '2026-10-14');
        expect(r.resumen).toEqual({ total: 5, atendidas: 1, pendientes: 2, canceladas: 1, faltas: 1 });
    });

    test('CP-SMED-05 registrar atención válida guarda diagnóstico sin espacios extremos', async () => {
        const repo = crearRepo();
        const r = await new MedicoService(repo, () => AHORA).registrarAtencion(4, 10, { diagnostico: '  Cefalea tensional  ', indicaciones: '   ' });
        expect(r).toMatchObject({ ok: true, mensaje: 'Atención registrada correctamente' });
        const guardada = repo.registrarAtencion.mock.calls[0][0];
        expect(guardada).toMatchObject({ id_cita: 10, id_medico: 1, diagnostico: 'Cefalea tensional', indicaciones: null });
    });

    test('CP-SMED-06 [A01] cita de otro médico → PROHIBIDO y no se guarda nada', async () => {
        const repo = crearRepo({ obtenerCitaDeMedico: jest.fn().mockResolvedValue({ id_cita: 10, id_medico: 2, estado: 'CONFIRMADA', fecha: '2026-10-14' }) });
        const r = await new MedicoService(repo, () => AHORA).registrarAtencion(4, 10, { diagnostico: 'Cefalea tensional' });
        expect(r).toMatchObject({ ok: false, codigo: 'PROHIBIDO' });
        expect(repo.registrarAtencion).not.toHaveBeenCalled();
    });

    test('CP-SMED-07 cita inexistente → NO_ENCONTRADO', async () => {
        const repo = crearRepo({ obtenerCitaDeMedico: jest.fn().mockResolvedValue(null) });
        expect(await new MedicoService(repo, () => AHORA).registrarAtencion(4, 999, { diagnostico: 'Cefalea tensional' }))
            .toMatchObject({ ok: false, codigo: 'NO_ENCONTRADO' });
    });

    test.each([0, -1, 1.5, Number.NaN])('CP-SMED-08 id de cita inválido %p → DATOS', async (id) => {
        expect(await new MedicoService(crearRepo(), () => AHORA).registrarAtencion(4, id, { diagnostico: 'Cefalea tensional' }))
            .toMatchObject({ ok: false, codigo: 'DATOS' });
    });

    test('CP-SMED-09 cita ya atendida → REGLA', async () => {
        const repo = crearRepo({ existeAtencion: jest.fn().mockResolvedValue(true) });
        expect(await new MedicoService(repo, () => AHORA).registrarAtencion(4, 10, { diagnostico: 'Cefalea tensional' }))
            .toMatchObject({ ok: false, codigo: 'REGLA' });
    });

    test('CP-SMED-10 [A01] historial de paciente que no es suyo → PROHIBIDO', async () => {
        const repo = crearRepo({ medicoAtiendeAPaciente: jest.fn().mockResolvedValue(false) });
        expect(await new MedicoService(repo, () => AHORA).historialPaciente(4, 3)).toMatchObject({ ok: false, codigo: 'PROHIBIDO' });
        expect(repo.historialPaciente).not.toHaveBeenCalled();
    });

    test('CP-SMED-11 historial autorizado devuelve paciente y atenciones', async () => {
        const repo = crearRepo({ historialPaciente: jest.fn().mockResolvedValue([{ id_atencion: 1 } as any]) });
        expect(await new MedicoService(repo, () => AHORA).historialPaciente(4, 3)).toMatchObject({ ok: true, total: 1 });
    });
});
