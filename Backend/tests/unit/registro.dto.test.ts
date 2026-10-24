// =================================================================
// PRUEBAS UNITARIAS — Registro de paciente (RegisterDTO)
// Técnica: Clases de equivalencia + Valores límite.
// Regla del curso: un caso inválido = UNA sola clase inválida;
// los demás campos se llenan con valores válidos.
// =================================================================
import { erroresDe } from '../helpers/validar';
import { RegisterDTO } from '../../src/modules/usuarios/application/dtos/register.dto';
import { CrearFamiliarDTO } from '../../src/modules/usuarios/application/dtos/crear-familiar.dto';

const valido = {
    correo: 'ana.quispe@gmail.com', contrasena: 'Clinica2026', dni: '12345678',
    nombres: 'Ana María', apellidos: 'Quispe Ñahui', telefono: '987654321', genero: 'Femenino',
};

const con = (cambios: Record<string, unknown>) => erroresDe(RegisterDTO, { ...valido, ...cambios });

describe('RegisterDTO — datos completos', () => {
    test('CP-REG-01 [CE válida] todos los campos correctos → sin errores', async () => {
        expect(await erroresDe(RegisterDTO, valido)).toEqual({});
    });
});

describe('RegisterDTO — nombres y apellidos (solo letras)', () => {
    test.each([
        ['José', 'tilde'],
        ['Ñusta', 'ñ'],
        ["D'Angelo", 'apóstrofo'],
        ['Ana María', 'nombre compuesto'],
        ['Al', 'VL: 2 letras (mínimo)'],
    ])('CP-REG-02 [CE válida] nombres "%s" (%s) → sin error', async (nombres) => {
        expect((await con({ nombres })).nombres).toBeUndefined();
    });

    test.each([
        ['Ana3', 'letras con número'],
        ['12345', 'solo números'],
        ['Ana_María', 'símbolo'],
        ['<script>', 'intento de XSS'],
        ['A', 'VL: 1 letra'],
        ['', 'vacío'],
        ['   ', 'solo espacios'],
    ])('CP-REG-03 [CE inválida] nombres "%s" (%s) → error', async (nombres) => {
        expect((await con({ nombres })).nombres).toBeDefined();
    });

    test.each([
        ['Quispe2', 'letras con número'],
        ['García-López', 'guion'],
        ['', 'vacío'],
    ])('CP-REG-04 [CE inválida] apellidos "%s" (%s) → error', async (apellidos) => {
        expect((await con({ apellidos })).apellidos).toBeDefined();
    });
});

describe('RegisterDTO — DNI (8 dígitos, solo números)', () => {
    test.each([
        ['1234567', 'VL: 7 dígitos'],
        ['123456789', 'VL: 9 dígitos'],
        ['1234567A', 'contiene letra'],
        ['1234-567', 'contiene símbolo'],
        ['', 'vacío'],
    ])('CP-REG-05 [CE inválida] dni "%s" (%s) → error', async (dni) => {
        expect((await con({ dni })).dni).toBeDefined();
    });
});

describe('RegisterDTO — teléfono (9 dígitos, empieza con 9)', () => {
    test.each([
        ['912345678', 'empieza con 9, 9 dígitos'],
        ['999999999', 'todos 9'],
    ])('CP-REG-06 [CE válida] telefono "%s" (%s) → sin error', async (telefono) => {
        expect((await con({ telefono })).telefono).toBeUndefined();
    });

    test.each([
        ['812345678', 'no empieza con 9'],
        ['012345678', 'empieza con 0'],
        ['91234567', 'VL: 8 dígitos'],
        ['9123456789', 'VL: 10 dígitos'],
        ['91234567a', 'contiene letra'],
        ['912 345 678', 'contiene espacios'],
        ['+51912345678', 'con prefijo +51'],
        ['', 'vacío'],
    ])('CP-REG-07 [CE inválida] telefono "%s" (%s) → error', async (telefono) => {
        expect((await con({ telefono })).telefono).toBeDefined();
    });
});

describe('RegisterDTO — correo (sin espacios, una sola @)', () => {
    test('CP-REG-08 [CE válida] espacios al inicio/fin y mayúsculas se normalizan', async () => {
        expect((await con({ correo: '  Ana.Quispe@Gmail.com ' })).correo).toBeUndefined();
    });

    test.each([
        ['ana quispe@gmail.com', 'espacio en el medio'],
        ['ana@@gmail.com', 'dos @ seguidas'],
        ['ana@quispe@gmail.com', 'dos @ separadas'],
        ['ana.gmail.com', 'sin @'],
        ['ana@gmail', 'dominio sin punto'],
        ['@gmail.com', 'sin usuario'],
        ['', 'vacío'],
    ])('CP-REG-09 [CE inválida] correo "%s" (%s) → error', async (correo) => {
        expect((await con({ correo })).correo).toBeDefined();
    });
});

describe('RegisterDTO — contraseña (8 a 50, letras y números)', () => {
    test.each([
        ['Abcdef12', 'VL: 8 caracteres'],
        ['a1' + 'b'.repeat(48), 'VL: 50 caracteres'],
        ['clave segura 2026', 'con espacios'],
    ])('CP-REG-10 [CE válida] contrasena "%s" (%s) → sin error', async (contrasena) => {
        expect((await con({ contrasena })).contrasena).toBeUndefined();
    });

    test.each([
        ['Abcde12', 'VL: 7 caracteres'],
        ['a1' + 'b'.repeat(49), 'VL: 51 caracteres'],
        ['12345678', 'solo números'],
        ['abcdefgh', 'solo letras'],
        ['ABCDEFGHIJ', 'solo mayúsculas'],
        ['!!!!@@@@', 'solo símbolos'],
        ['', 'vacío'],
    ])('CP-REG-11 [CE inválida] contrasena "%s" (%s) → error', async (contrasena) => {
        expect((await con({ contrasena })).contrasena).toBeDefined();
    });
});

describe('CrearFamiliarDTO — nombres del familiar', () => {
    const familiar = { nombres: 'Luis', apellidos: 'Quispe', dni: '87654321', parentesco: 'Hermano' };
    test('CP-REG-12 [CE válida] familiar correcto → sin errores', async () => {
        expect(await erroresDe(CrearFamiliarDTO, familiar)).toEqual({});
    });
    test('CP-REG-13 [CE inválida] nombres con número "Luis2" → error', async () => {
        expect((await erroresDe(CrearFamiliarDTO, { ...familiar, nombres: 'Luis2' })).nombres).toBeDefined();
    });
});