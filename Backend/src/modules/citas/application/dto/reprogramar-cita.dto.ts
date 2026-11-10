// =================================================================
// CAPA: Application / DTOs
// DTO de entrada para PUT /citas/:id/reprogramar.
// Solo se cambia la fecha y la hora; el médico y la especialidad
// se mantienen (así el precio y el pago de la cita siguen valiendo).
// =================================================================
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class ReprogramarCitaDTO {
    @IsNotEmpty({ message: 'La fecha es obligatoria' })
    @IsString()
    @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'La fecha debe tener formato YYYY-MM-DD' })
    fecha!: string;

    @IsNotEmpty({ message: 'La hora es obligatoria' })
    @IsString()
    @Matches(/^\d{2}:\d{2}:\d{2}$/, { message: 'La hora debe tener formato HH:MM:SS' })
    hora!: string;
}
