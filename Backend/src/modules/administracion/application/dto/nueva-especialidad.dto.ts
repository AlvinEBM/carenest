// =================================================================
// CAPA: Application / DTOs
// DTO de entrada para POST /admin/especialidad.
// =================================================================
import {
    IsNumber,
    Max,
    Min,
    IsBoolean,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
} from 'class-validator';

export class NuevaEspecialidadDTO {
    @IsNotEmpty({ message: 'El nombre de la especialidad es obligatorio' })
    @IsString()
    @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
    @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres' })
    nombre!: string;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    descripcion?: string;

    @IsOptional()
    @IsBoolean()
    requiere_datos_menor?: boolean;

    // Precio de la consulta en soles (opcional, por defecto S/ 30.00)
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El precio debe ser un número con máximo 2 decimales' })
    @Min(1, { message: 'El precio mínimo es S/ 1.00' })
    @Max(999.99, { message: 'El precio máximo es S/ 999.99' })
    precio?: number;
}