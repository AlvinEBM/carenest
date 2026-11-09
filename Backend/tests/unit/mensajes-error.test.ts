// =================================================================
// PRUEBAS UNITARIAS — Primer mensaje de error (el que ve el usuario)
// Origen: en la matriz de pruebas unitarias, 13 casos rechazaban bien
// el dato pero mostraban un mensaje distinto al esperado.
// Estas pruebas fijan el mensaje correcto para cada uno (re-test).
// =================================================================
import { erroresDe } from '../helpers/validar';
import { mensajesOrdenados } from '../../src/shared/validation/ordenar-errores';
import { RegisterDTO } from '../../src/modules/usuarios/application/dtos/register.dto';
import { RegistrarAtencionDTO } from '../../src/modules/medicos/application/dto/registrar-atencion.dto';
import { PrecioEspecialidadDTO } from '../../src/modules/administracion/application/dto/precio-especialidad.dto';

const paciente = {
    correo: 'ana.quispe@gmail.com', contrasena: 'Clinica2026', dni: '12345678',
    nombres: 'Ana María', apellidos: 'Quispe Ñahui', telefono: '987654321', genero: 'Femenino',
};

const primero = async (cambios: Record<string, unknown>, campo: string) =>
    (await erroresDe(RegisterDTO, { ...paciente, ...cambios }))[campo]?.[0];

describe('mensajesOrdenados — prioridad de los mensajes', () => {
    test('CP-MSG-01 «obligatorio» va antes que formato y longitud', () => {
        expect(mensajesOrdenados({ matches: 'formato', minLength: 'longitud', isNotEmpty: 'obligatorio' }))
            .toEqual(['obligatorio', 'formato', 'longitud']);
    });
    test('CP-MSG-02 nuestra regla (matches) va antes que isEmail', () => {
        expect(mensajesOrdenados({ isEmail: 'genérico', matches: 'una sola @' })).toEqual(['una sola @', 'genérico']);
    });
    test('CP-MSG-03 sin errores devuelve una lista vacía', () => {
        expect(mensajesOrdenados(undefined)).toEqual([]);
    });
});

describe('Registro — campo vacío muestra «obligatorio»', () => {
    test.each([
        ['nombres', '   ', 'Los nombres son obligatorios'],
        ['apellidos', '', 'Los apellidos son obligatorios'],
        ['dni', '', 'El DNI es obligatorio'],
        ['telefono', '', 'El teléfono es obligatorio'],
        ['correo', '', 'El correo es obligatorio'],
        ['contrasena', '', 'La contraseña es obligatoria'],
    ])('CP-MSG-04 %s vacío → «%s»', async (campo, valor, esperado) => {
        expect(await primero({ [campo]: valor }, campo)).toBe(esperado);
    });
});

describe('Registro — correo inválido muestra la regla específica', () => {
    test.each([
        ['ana quispe@gmail.com'], ['ana@@gmail.com'], ['ana.gmail.com'], ['ana@gmail'], ['@gmail.com'],
    ])('CP-MSG-05 correo "%s" → «…una sola @…»', async (correo) => {
        expect(await primero({ correo }, 'correo')).toContain('una sola @');
    });
});

describe('Diagnóstico y precio', () => {
    test('CP-MSG-06 diagnóstico vacío → «El diagnóstico es obligatorio»', async () => {
        expect((await erroresDe(RegistrarAtencionDTO, { diagnostico: '' })).diagnostico[0]).toBe('El diagnóstico es obligatorio');
    });
    test('CP-MSG-07 precio "abc" → «…número con máximo 2 decimales»', async () => {
        expect((await erroresDe(PrecioEspecialidadDTO, { precio: 'abc' })).precio[0])
            .toBe('El precio debe ser un número con máximo 2 decimales');
    });
});