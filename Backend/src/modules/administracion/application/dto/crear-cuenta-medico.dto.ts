// =================================================================
// CAPA: Application / DTOs
// DTO para POST /admin/medico/:id/cuenta
// Da acceso al sistema a un médico que fue registrado sin cuenta.
// =================================================================
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, Length, Matches, MaxLength, MinLength } from 'class-validator';
import { REGEX_CONTRASENA_SEGURA } from './crear-medico.dto';

const recortar = ({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value;

export class CrearCuentaMedicoDTO {
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
}
