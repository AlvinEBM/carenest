// =================================================================
// CAPA: Domain / Gateways
// CONTRATO de la pasarela de pagos (patrón Adapter / Puerto).
//
// El dominio NO conoce a Mercado Pago. Si mañana se cambia de
// pasarela (Culqi, Niubiz, Izipay) solo se escribe otro adaptador.
// En las pruebas se reemplaza por un doble que no usa internet.
// =================================================================
export interface DatosPreferencia {
    idPago: number;          // se envía como external_reference
    titulo: string;          // texto que ve el pagador
    monto: number;           // en soles
    moneda: 'PEN';
    emailPagador?: string | null;
}

export interface PreferenciaCreada {
    preferenceId: string;
    urlPago: string;         // a donde se redirige al paciente
}

export interface PagoExterno {
    paymentId: string;
    status: string;              // status crudo de la pasarela (approved, rejected...)
    statusDetail: string | null;
    externalReference: string | null;
    monto: number;
    metodo: string | null;
}

export interface IPasarelaPago {
    estaConfigurada(): boolean;
    crearPreferencia(datos: DatosPreferencia): Promise<PreferenciaCreada>;
    obtenerPago(paymentId: string): Promise<PagoExterno | null>;
    buscarPagoPorReferencia(externalReference: string): Promise<PagoExterno | null>;
}
