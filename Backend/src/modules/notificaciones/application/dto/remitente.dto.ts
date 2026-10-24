import {
    IsBoolean, IsEmail, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min,
} from 'class-validator';

export class RemitenteDTO {
    @IsNotEmpty({ message: 'El correo es obligatorio' })
    @IsEmail({}, { message: 'El correo no es válido' })
    @MaxLength(150)
    correo!: string;

    @IsNotEmpty({ message: 'La contraseña de aplicación es obligatoria' })
    @IsString()
    @MaxLength(255)
    app_password!: string;

    @IsOptional() @IsString() @MaxLength(150)
    nombre_remitente?: string;

    @IsOptional() @IsString() @MaxLength(150)
    host?: string;

    @IsOptional() @IsInt() @Min(1)
    puerto?: number;

    @IsOptional() @IsBoolean()
    activo?: boolean;

    @IsOptional() @IsInt() @Min(0)
    prioridad?: number;
}