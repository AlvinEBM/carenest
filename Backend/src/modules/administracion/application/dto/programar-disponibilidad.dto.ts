// =================================================================
// CAPA: Application / DTOs
// DTO para programar inhabilitación/habilitación con fecha.
// Sirve tanto para especialidades como para médicos.
// =================================================================
import {
    IsInt,
    IsPositive,
    IsNotEmpty,
    IsOptional,
    IsString,
    Matches,
    IsIn,
} from 'class-validator';

export class ProgramarDisponibilidadDTO {
    @IsNotEmpty({ message: 'El id es obligatorio' })
    @IsInt({ message: 'El id debe ser un entero' })
    @IsPositive()
    id!: number;

    // 'INHABILITAR' o 'HABILITAR'
    @IsNotEmpty({ message: 'La acción es obligatoria' })
    @IsIn(['INHABILITAR', 'HABILITAR'], { message: 'Acción inválida' })
    accion!: 'INHABILITAR' | 'HABILITAR';

    // Fecha desde la cual aplica (YYYY-MM-DD)
    @IsNotEmpty({ message: 'La fecha es obligatoria' })
    @IsString()
    @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'La fecha debe tener formato YYYY-MM-DD' })
    fecha!: string;
}