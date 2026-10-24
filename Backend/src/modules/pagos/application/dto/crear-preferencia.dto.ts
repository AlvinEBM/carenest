// =================================================================
// CAPA: Application / DTOs
// DTO para POST /pagos/preferencia
//
// IMPORTANTE: el cliente SOLO envía el id de la cita. El monto se
// calcula en el servidor con el precio de la especialidad, para
// que nadie pueda pagar S/ 0.01 editando la petición.
// =================================================================
import { IsInt, IsNotEmpty, IsPositive } from 'class-validator';

export class CrearPreferenciaDTO {
    @IsNotEmpty({ message: 'El id de la cita es obligatorio' })
    @IsInt({ message: 'El id de la cita debe ser un entero' })
    @IsPositive({ message: 'El id de la cita debe ser positivo' })
    id_cita!: number;
}
