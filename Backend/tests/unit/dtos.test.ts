// =================================================================
// PRUEBAS UNITARIAS — Validación de entradas (DTOs)
// Técnica: Clases de equivalencia + Valores límite, siguiendo el
// formato del curso (una clase inválida por caso de prueba).
// =================================================================
import { erroresDe } from '../helpers/validar';
import { RegisterDTO } from '../../src/modules/usuarios/application/dtos/register.dto';
import { CrearMedicoDTO } from '../../src/modules/administracion/application/dto/crear-medico.dto';
import { RegistrarAtencionDTO } from '../../src/modules/medicos/application/dto/registrar-atencion.dto';
import { PrecioEspecialidadDTO } from '../../src/modules/administracion/application/dto/precio-especialidad.dto';
import { CrearPreferenciaDTO } from '../../src/modules/pagos/application/dto/crear-preferencia.dto';

const pacienteValido = {
    correo: 'ana@gmail.com', contrasena: 'secreta1', dni: '12345678',
    nombres: 'Ana', apellidos: 'Quispe', telefono: '987654321', genero: 'Femenino',
};

describe('RegisterDTO — campo DNI (registro de paciente)', () => {
    test('CP-DNI-01 [CE válida] 12345678 → sin error', async () => {
        expect((await erroresDe(RegisterDTO, pacienteValido)).dni).toBeUndefined();
    });
    test.each([
        ['1234567', '7 dígitos (VL inferior - 1)'],
        ['123456789', '9 dígitos (VL superior + 1)'],
        ['', 'vacío'],
        ['        ', 'espacios en blanco'],
        ['abcd1234', 'letras y números'],
        ['#$%&/()=', 'caracteres especiales'],
    ])('CP-DNI-02 [CE inválida] "%s" (%s) → error en dni', async (dni) => {
        const e = await erroresDe(RegisterDTO, { ...pacienteValido, dni });
        expect(e.dni).toBeDefined();
    });
});

const medicoValido = {
    nombres: 'Andrea', apellidos: 'Torres', id_especialidad: 1,
    correo: 'andrea@carenest.pe', contrasena: 'Medico2026', dni: '41234567', colegiatura: '045123',
};

describe('CrearMedicoDTO — alta de médico con cuenta', () => {
    test('CP-MED-01 [CE válida] datos completos → sin errores', async () => {
        expect(await erroresDe(CrearMedicoDTO, medicoValido)).toEqual({});
    });

    test.each([
        ['1234', true, 'VL: 4 dígitos'],
        ['12345', false, 'VL: 5 dígitos'],
        ['123456', false, 'VL: 6 dígitos'],
        ['1234567', true, 'VL: 7 dígitos'],
        ['04512A', true, 'CE: contiene letra'],
    ])('CP-MED-02 colegiatura "%s" → error: %p (%s)', async (colegiatura, conError) => {
        const e = await erroresDe(CrearMedicoDTO, { ...medicoValido, colegiatura });
        expect(!!e.colegiatura).toBe(conError);
    });

    test.each([
        ['Abc1234', true, 'VL: 7 caracteres'],
        ['Abcd1234', false, 'VL: 8 caracteres'],
        ['abcdefgh', true, 'CE: sin número'],
        ['12345678', true, 'CE: sin letra'],
        ['A1' + 'x'.repeat(48), false, 'VL: 50 caracteres'],
        ['A1' + 'x'.repeat(49), true, 'VL: 51 caracteres'],
    ])('CP-MED-03 contraseña "%s" → error: %p (%s)', async (contrasena, conError) => {
        const e = await erroresDe(CrearMedicoDTO, { ...medicoValido, contrasena });
        expect(!!e.contrasena).toBe(conError);
    });

    test.each([
        ['A', true, 'VL: 1 carácter'],
        ['Al', false, 'VL: 2 caracteres'],
        ['María José', false, 'CE: tildes y espacio'],
        ['Andrea2', true, 'CE: contiene número'],
        ['<script>', true, 'CE: símbolos (XSS)'],
    ])('CP-MED-04 nombres "%s" → error: %p (%s)', async (nombres, conError) => {
        const e = await erroresDe(CrearMedicoDTO, { ...medicoValido, nombres });
        expect(!!e.nombres).toBe(conError);
    });

    test('CP-MED-05 [CE inválida] correo sin dominio', async () => {
        expect((await erroresDe(CrearMedicoDTO, { ...medicoValido, correo: 'andrea@' })).correo).toBeDefined();
    });

    test.each([
        ['987654321', false],
        ['887654321', true],
        ['98765432', true],
    ])('CP-MED-06 teléfono opcional "%s" → error: %p', async (telefono, conError) => {
        const e = await erroresDe(CrearMedicoDTO, { ...medicoValido, telefono });
        expect(!!e.telefono).toBe(conError);
    });
});

describe('RegistrarAtencionDTO — diagnóstico del médico', () => {
    test.each([
        ['abcd', true, 'VL: 4 caracteres'],
        ['abcde', false, 'VL: 5 caracteres'],
        ['   abc   ', true, 'CE: espacios no cuentan'],
        ['x'.repeat(1000), false, 'VL: 1000 caracteres'],
        ['x'.repeat(1001), true, 'VL: 1001 caracteres'],
        ['', true, 'CE: vacío'],
    ])('CP-DIA-01 diagnóstico (%#) → error: %p (%s)', async (diagnostico, conError) => {
        const e = await erroresDe(RegistrarAtencionDTO, { diagnostico });
        expect(!!e.diagnostico).toBe(conError);
    });

    test('CP-DIA-02 indicaciones son opcionales pero máximo 1000', async () => {
        expect(await erroresDe(RegistrarAtencionDTO, { diagnostico: 'Gripe común' })).toEqual({});
        expect((await erroresDe(RegistrarAtencionDTO, { diagnostico: 'Gripe común', indicaciones: 'x'.repeat(1001) })).indicaciones).toBeDefined();
    });
});

describe('PrecioEspecialidadDTO — valores límite', () => {
    test.each([
        [0.99, true], [1, false], [1.01, false], [999.98, false], [999.99, false], [1000, true], [45.555, true], ['abc', true],
    ])('CP-PRE-01 precio %p → error: %p', async (precio, conError) => {
        const e = await erroresDe(PrecioEspecialidadDTO, { precio });
        expect(!!e.precio).toBe(conError);
    });
});

describe('CrearPreferenciaDTO', () => {
    test.each([[1, false], [0, true], [-5, true], [1.5, true], [undefined, true]])(
        'CP-PRE-02 id_cita %p → error: %p',
        async (id_cita, conError) => {
            const e = await erroresDe(CrearPreferenciaDTO, { id_cita });
            expect(!!e.id_cita).toBe(conError);
        },
    );
});
