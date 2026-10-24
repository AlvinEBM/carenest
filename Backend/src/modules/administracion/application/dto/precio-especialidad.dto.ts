// =================================================================
// CAPA: Application / DTOs
// DTO para PUT /admin/especialidad/:id/precio
//
// Valores límite del precio (soles):
//   0.99 ✗ | 1.00 ✓ | 1.01 ✓ ... 999.98 ✓ | 999.99 ✓ | 1000.00 ✗
//   Máximo 2 decimales.
// =================================================================
import { IsNotEmpty, IsNumber, Max, Min } from 'class-validator';

export const PRECIO_MIN = 1;
export const PRECIO_MAX = 999.99;

export class PrecioEspecialidadDTO {
    @IsNotEmpty({ message: 'El precio es obligatorio' })
    @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El precio debe ser un número con máximo 2 decimales' })
    @Min(PRECIO_MIN, { message: `El precio mínimo es S/ ${PRECIO_MIN.toFixed(2)}` })
    @Max(PRECIO_MAX, { message: `El precio máximo es S/ ${PRECIO_MAX.toFixed(2)}` })
    precio!: number;
}
