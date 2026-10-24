// =================================================================
// CAPA: Domain / Repositories
// CONTRATO de persistencia del módulo Pagos.
// =================================================================
import { EstadoPago, Pago } from '../entities/pago.entity';

export interface CitaParaPago {
    id_cita: number;
    id_usuario: number;
    estado: string;
    especialidad: string;
    precio: number;
    fecha: string;
    hora: string;
    correo: string | null;
}

export interface ResultadoPago {
    estado: EstadoPago;
    payment_id: string | null;
    metodo: string | null;
    detalle_estado: string | null;
}

export interface IPagoRepository {
    obtenerCitaParaPago(idCita: number): Promise<CitaParaPago | null>;
    existePagoAprobado(idCita: number): Promise<boolean>;
    crear(pago: Pago): Promise<Pago>;
    asignarPreferencia(idPago: number, preferenceId: string): Promise<void>;
    obtenerPorId(idPago: number): Promise<Pago | null>;
    /**
     * Guarda el resultado y, si quedó APROBADO, pasa la cita
     * de RESERVADA a CONFIRMADA. Todo en una transacción.
     */
    aplicarResultado(idPago: number, resultado: ResultadoPago): Promise<void>;
    listarPorUsuario(idUsuario: number): Promise<Pago[]>;
    listarTodos(): Promise<any[]>;
}
