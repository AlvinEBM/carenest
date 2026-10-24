// =================================================================
// CAPA: Application / DTOs
// DTO de entrada para POST /admin/medico.
//
// CAMBIO: ahora el médico se crea CON su cuenta de acceso
// (rol MEDICO), por eso se piden correo, contraseña y DNI.
//
// Clases de equivalencia principales:
//   dni         → válida: 8 dígitos | inválidas: <8, >8, letras, vacío
//   colegiatura → válida: 5 a 6 dígitos | inválidas: <5, >6, letras
//   contrasena  → válida: 8-50 con letra y número | inválidas: <8, sin número, sin letra
// =================================================================
import { Transform } from 'class-transformer';
import {
    IsEmail,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsPositive,
    IsString,
    Length,
    Matches,
    MaxLength,
    MinLength,
} from 'class-validator';

import {
    REGEX_CONTRASENA_SEGURA,
    REGEX_SOLO_LETRAS,
    recortar,
} from '../../../../shared/validation/reglas';

// Se re-exportan para no romper los imports existentes.
export { REGEX_CONTRASENA_SEGURA, REGEX_SOLO_LETRAS };

export class CrearMedicoDTO {
    @Transform(recortar)
    @IsNotEmpty({ message: 'El nombre del médico es obligatorio' })
    @IsString()
    @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
    @MaxLength(100)
    @Matches(REGEX_SOLO_LETRAS, { message: 'El nombre solo puede contener letras' })
    nombres!: string;

    @Transform(recortar)
    @IsNotEmpty({ message: 'El apellido del médico es obligatorio' })
    @IsString()
    @MinLength(2, { message: 'El apellido debe tener al menos 2 caracteres' })
    @MaxLength(100)
    @Matches(REGEX_SOLO_LETRAS, { message: 'El apellido solo puede contener letras' })
    apellidos!: string;

    @IsNotEmpty({ message: 'La especialidad es obligatoria' })
    @IsInt({ message: 'El id_especialidad debe ser un entero' })
    @IsPositive({ message: 'El id_especialidad debe ser positivo' })
    id_especialidad!: number;

    // ----- Cuenta de acceso -----
    @Transform(recortar)
    @IsNotEmpty({ message: 'El correo es obligatorio' })
    @IsEmail({}, { message: 'El correo debe tener un formato válido' })
    @MaxLength(100)
    correo!: string;

    @IsNotEmpty({ message: 'La contraseña es obligatoria' })
    @IsString()
    @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
    @MaxLength(50, { message: 'La contraseña no puede exceder 50 caracteres' })
    @Matches(REGEX_CONTRASENA_SEGURA, { message: 'La contraseña debe incluir al menos una letra y un número' })
    contrasena!: string;

    @Transform(recortar)
    @IsNotEmpty({ message: 'El DNI es obligatorio' })
    @Length(8, 8, { message: 'El DNI debe tener exactamente 8 dígitos' })
    @Matches(/^\d+$/, { message: 'El DNI debe contener solo números' })
    dni!: string;

    @Transform(recortar)
    @IsNotEmpty({ message: 'La colegiatura es obligatoria' })
    @Matches(/^\d{5,6}$/, { message: 'La colegiatura debe tener 5 o 6 dígitos' })
    colegiatura!: string;

    @Transform(recortar)
    @IsOptional()
    @Matches(/^9\d{8}$/, { message: 'El teléfono debe tener 9 dígitos y empezar con 9' })
    telefono?: string;
}
