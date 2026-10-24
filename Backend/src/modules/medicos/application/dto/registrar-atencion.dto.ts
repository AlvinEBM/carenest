// =================================================================
// CAPA: Application / DTOs
// DTO de entrada para PUT /medico/citas/:id/atender.
//
// Clases de equivalencia (diagnóstico):
//   válida:   texto de 5 a 1000 caracteres (sin contar espacios extremos)
//   inválidas: vacío, solo espacios, < 5 caracteres, > 1000 caracteres
// =================================================================
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

const recortar = ({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value;

export class RegistrarAtencionDTO {
    @Transform(recortar)
    @IsNotEmpty({ message: 'El diagnóstico es obligatorio' })
    @IsString({ message: 'El diagnóstico debe ser texto' })
    @MinLength(5, { message: 'El diagnóstico debe tener al menos 5 caracteres' })
    @MaxLength(1000, { message: 'El diagnóstico no puede exceder 1000 caracteres' })
    diagnostico!: string;

    @Transform(recortar)
    @IsOptional()
    @IsString({ message: 'Las indicaciones deben ser texto' })
    @MaxLength(1000, { message: 'Las indicaciones no pueden exceder 1000 caracteres' })
    indicaciones?: string;
}
