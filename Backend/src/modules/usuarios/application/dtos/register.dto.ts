// =================================================================
// CAPA: Application / DTOs
// DTO de entrada para POST /auth/register.
//
// Define los campos obligatorios y opcionales para registrar
// un nuevo paciente, con sus reglas de validación. Las reglas
// (expresiones regulares y mensajes) vienen de shared/validation,
// las mismas que usa el alta de médicos.
// =================================================================
import { Transform } from 'class-transformer';
import {
    IsEmail,
    IsIn,
    IsNotEmpty,
    IsOptional,
    IsString,
    Matches,
    MaxLength,
    MinLength,
} from 'class-validator';

import {
    CONTRASENA_MAX,
    CONTRASENA_MIN,
    MSG,
    REGEX_CONTRASENA_SEGURA,
    REGEX_CORREO,
    REGEX_DNI,
    REGEX_SOLO_LETRAS,
    REGEX_TELEFONO,
    normalizarCorreo,
    normalizarNombre,
    recortar,
} from '../../../../shared/validation/reglas';

export class RegisterDTO {
    // ----- Correo: sin espacios y con una sola @ -----
    @Transform(normalizarCorreo)
    @IsNotEmpty({ message: 'El correo es obligatorio' })
    @IsString()
    @MaxLength(100, { message: 'El correo no puede exceder 100 caracteres' })
    @Matches(REGEX_CORREO, { message: MSG.correo })
    @IsEmail({}, { message: 'El correo debe tener un formato válido' })
    correo!: string;

    // ----- Contraseña: 8 a 50, con letras Y números -----
    // No se recorta: los espacios forman parte de la contraseña.
    @IsNotEmpty({ message: 'La contraseña es obligatoria' })
    @IsString()
    @MinLength(CONTRASENA_MIN, { message: MSG.contrasenaMin })
    @MaxLength(CONTRASENA_MAX, { message: MSG.contrasenaMax })
    @Matches(REGEX_CONTRASENA_SEGURA, { message: MSG.contrasenaMixta })
    contrasena!: string;

    // ----- DNI: exactamente 8 dígitos -----
    @Transform(recortar)
    @IsNotEmpty({ message: 'El DNI es obligatorio' })
    @Matches(REGEX_DNI, { message: MSG.dni })
    dni!: string;

    // ----- Nombres y apellidos: solo letras -----
    @Transform(normalizarNombre)
    @IsNotEmpty({ message: 'Los nombres son obligatorios' })
    @IsString()
    @MinLength(2, { message: 'Los nombres deben tener al menos 2 letras' })
    @MaxLength(100, { message: 'Los nombres no pueden exceder 100 caracteres' })
    @Matches(REGEX_SOLO_LETRAS, { message: MSG.nombres })
    nombres!: string;

    @Transform(normalizarNombre)
    @IsNotEmpty({ message: 'Los apellidos son obligatorios' })
    @IsString()
    @MinLength(2, { message: 'Los apellidos deben tener al menos 2 letras' })
    @MaxLength(100, { message: 'Los apellidos no pueden exceder 100 caracteres' })
    @Matches(REGEX_SOLO_LETRAS, { message: MSG.apellidos })
    apellidos!: string;

    // ----- Teléfono: 9 dígitos que empiezan con 9 -----
    @Transform(recortar)
    @IsNotEmpty({ message: 'El teléfono es obligatorio' })
    @IsString()
    @Matches(REGEX_TELEFONO, { message: MSG.telefono })
    telefono!: string;

    @IsNotEmpty({ message: 'El género es obligatorio' })
    @IsIn(['Masculino', 'Femenino', 'Otros'], {
        message: 'Género debe ser Masculino, Femenino u Otros',
    })
    genero!: 'Masculino' | 'Femenino' | 'Otros';

    @Transform(recortar)
    @IsOptional()
    @IsString()
    @MaxLength(200, { message: 'La dirección no puede exceder 200 caracteres' })
    direccion?: string;

    @IsOptional()
    @Matches(/^(\d{4}-\d{2}-\d{2})?$/, { message: 'La fecha debe tener formato AAAA-MM-DD' })
    fecha_nacimiento?: string;
}