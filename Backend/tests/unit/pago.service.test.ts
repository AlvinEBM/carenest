// =================================================================
// PRUEBAS UNITARIAS — PagoService
// Repositorio y pasarela reemplazados por dobles: se prueba la
// lógica de negocio sin BD ni Mercado Pago.
// =================================================================
import { PagoService } from '../../src/modules/pagos/application/services/pago.service';
import { IPagoRepository, CitaParaPago } from '../../src/modules/pagos/domain/repositories/IPagoRepository';
import { IPasarelaPago, PagoExterno } from '../../src/modules/pagos/domain/gateways/IPasarelaPago';
import { Pago } from '../../src/modules/pagos/domain/entities/pago.entity';

const CITA: CitaParaPago = {
    id_cita: 5, id_usuario: 3, estado: 'RESERVADA', especialidad: 'Medicina General',
    precio: 30, fecha: '2026-10-20', hora: '09:00:00', correo: 'juan@gmail.com',
};
const pago = (over: Partial<Pago> = {}) =>
    Object.assign(new Pago(77, 5, 3, 30, 'PEN', 'PENDIENTE', 'pref-1', null, null, null), over);
const externo = (over: Partial<PagoExterno> = {}): PagoExterno => ({
    paymentId: '123456', status: 'approved', statusDetail: 'accredited', externalReference: '77', monto: 30, metodo: 'visa', ...over,
});

function dobles(repoOver: Partial<jest.Mocked<IPagoRepository>> = {}, pasarelaOver: Partial<jest.Mocked<IPasarelaPago>> = {}) {
    const repo = {
        obtenerCitaParaPago: jest.fn().mockResolvedValue(CITA),
        existePagoAprobado: jest.fn().mockResolvedValue(false),
        crear: jest.fn().mockImplementation(async (p: Pago) => Object.assign(p, { id_pago: 77 })),
        asignarPreferencia: jest.fn().mockResolvedValue(undefined),
        obtenerPorId: jest.fn().mockResolvedValue(pago()),
        aplicarResultado: jest.fn().mockResolvedValue(undefined),
        listarPorUsuario: jest.fn().mockResolvedValue([]),
        listarTodos: jest.fn().mockResolvedValue([]),
        ...repoOver,
    } as jest.Mocked<IPagoRepository>;
    const pasarela = {
        estaConfigurada: jest.fn().mockReturnValue(true),
        crearPreferencia: jest.fn().mockResolvedValue({ preferenceId: 'pref-1', urlPago: 'https://www.mercadopago.com.pe/checkout/v1/redirect?pref_id=pref-1' }),
        obtenerPago: jest.fn().mockResolvedValue(externo()),
        buscarPagoPorReferencia: jest.fn().mockResolvedValue(externo()),
        ...pasarelaOver,
    } as jest.Mocked<IPasarelaPago>;
    return { repo, pasarela, svc: new PagoService(repo, pasarela) };
}

beforeAll(() => jest.spyOn(console, 'error').mockImplementation(() => undefined));
beforeAll(() => jest.spyOn(console, 'warn').mockImplementation(() => undefined));

describe('PagoService.crearPreferencia', () => {
    test('CP-SPAG-01 flujo feliz: crea pago PENDIENTE con el precio de la BD y devuelve la URL', async () => {
        const { svc, repo, pasarela } = dobles();
        const r = await svc.crearPreferencia(3, 5);
        expect(r).toMatchObject({ ok: true, codigo: 201, id_pago: 77, monto: 30 });
        expect(repo.crear.mock.calls[0][0]).toMatchObject({ monto: 30, estado: 'PENDIENTE', moneda: 'PEN' });
        expect(pasarela.crearPreferencia).toHaveBeenCalledWith(expect.objectContaining({ idPago: 77, monto: 30, moneda: 'PEN' }));
        expect(repo.asignarPreferencia).toHaveBeenCalledWith(77, 'pref-1');
    });

    test('CP-SPAG-02 pasarela no configurada → 503', async () => {
        const { svc } = dobles({}, { estaConfigurada: jest.fn().mockReturnValue(false) });
        expect(await svc.crearPreferencia(3, 5)).toMatchObject({ ok: false, codigo: 503 });
    });

    test('CP-SPAG-03 cita inexistente → 404', async () => {
        const { svc } = dobles({ obtenerCitaParaPago: jest.fn().mockResolvedValue(null) });
        expect(await svc.crearPreferencia(3, 5)).toMatchObject({ ok: false, codigo: 404 });
    });

    test('CP-SPAG-04 [A01] pagar la cita de otro paciente → 403', async () => {
        const { svc, repo } = dobles();
        expect(await svc.crearPreferencia(99, 5)).toMatchObject({ ok: false, codigo: 403 });
        expect(repo.crear).not.toHaveBeenCalled();
    });

    test.each(['CANCELADA', 'COMPLETADA', 'FALTA'])('CP-SPAG-05 cita %s → 409', async (estado) => {
        const { svc } = dobles({ obtenerCitaParaPago: jest.fn().mockResolvedValue({ ...CITA, estado }) });
        expect(await svc.crearPreferencia(3, 5)).toMatchObject({ ok: false, codigo: 409 });
    });

    test('CP-SPAG-06 cita ya pagada → 409 (no se cobra dos veces)', async () => {
        const { svc } = dobles({ existePagoAprobado: jest.fn().mockResolvedValue(true) });
        expect(await svc.crearPreferencia(3, 5)).toMatchObject({ ok: false, codigo: 409, mensaje: 'Esta cita ya fue pagada' });
    });

    test('CP-SPAG-07 precio de especialidad inválido (0) → 422', async () => {
        const { svc } = dobles({ obtenerCitaParaPago: jest.fn().mockResolvedValue({ ...CITA, precio: 0 }) });
        expect(await svc.crearPreferencia(3, 5)).toMatchObject({ ok: false, codigo: 422 });
    });

    test('CP-SPAG-08 Mercado Pago caído → 502 y el intento queda CANCELADO', async () => {
        const { svc, repo } = dobles({}, { crearPreferencia: jest.fn().mockRejectedValue(new Error('timeout')) });
        expect(await svc.crearPreferencia(3, 5)).toMatchObject({ ok: false, codigo: 502 });
        expect(repo.aplicarResultado).toHaveBeenCalledWith(77, expect.objectContaining({ estado: 'CANCELADO' }));
    });
});

describe('PagoService.verificarPago', () => {
    test('CP-SPAG-09 pago aprobado en Mercado Pago → APROBADO', async () => {
        const { svc, repo } = dobles();
        const r = await svc.verificarPago(3, 77);
        expect(r).toMatchObject({ ok: true, estado: 'APROBADO', id_cita: 5 });
        expect(repo.aplicarResultado).toHaveBeenCalledWith(77, { estado: 'APROBADO', payment_id: '123456', metodo: 'visa', detalle_estado: 'accredited' });
    });

    test('CP-SPAG-10 [A08] monto pagado distinto al registrado → RECHAZADO (monto_inconsistente)', async () => {
        const { svc, repo } = dobles({}, { buscarPagoPorReferencia: jest.fn().mockResolvedValue(externo({ monto: 0.01 })) });
        expect(await svc.verificarPago(3, 77)).toMatchObject({ estado: 'RECHAZADO' });
        expect(repo.aplicarResultado).toHaveBeenCalledWith(77, expect.objectContaining({ estado: 'RECHAZADO', detalle_estado: 'monto_inconsistente' }));
    });

    test('CP-SPAG-11 tarjeta rechazada (OTHE) → RECHAZADO', async () => {
        const { svc } = dobles({}, { buscarPagoPorReferencia: jest.fn().mockResolvedValue(externo({ status: 'rejected', statusDetail: 'cc_rejected_other_reason' })) });
        expect(await svc.verificarPago(3, 77)).toMatchObject({ estado: 'RECHAZADO' });
    });

    test('CP-SPAG-12 aún no hay pago en Mercado Pago → sigue PENDIENTE', async () => {
        const { svc, repo } = dobles({}, { buscarPagoPorReferencia: jest.fn().mockResolvedValue(null) });
        expect(await svc.verificarPago(3, 77)).toMatchObject({ ok: true, estado: 'PENDIENTE' });
        expect(repo.aplicarResultado).not.toHaveBeenCalled();
    });

    test('CP-SPAG-13 [A01] verificar el pago de otro paciente → 403', async () => {
        const { svc } = dobles();
        expect(await svc.verificarPago(99, 77)).toMatchObject({ ok: false, codigo: 403 });
    });

    test('CP-SPAG-14 pago ya aprobado no vuelve a consultar a la pasarela', async () => {
        const { svc, pasarela } = dobles({ obtenerPorId: jest.fn().mockResolvedValue(pago({ estado: 'APROBADO' })) });
        expect(await svc.verificarPago(3, 77)).toMatchObject({ estado: 'APROBADO' });
        expect(pasarela.buscarPagoPorReferencia).not.toHaveBeenCalled();
    });
});

describe('PagoService.procesarNotificacion (webhook)', () => {
    test.each(['', 'abc', '12a', "1 OR 1=1"])('CP-SPAG-15 payment_id inválido "%s" → no procesa', async (id) => {
        const { svc, pasarela } = dobles();
        expect(await svc.procesarNotificacion(id)).toMatchObject({ procesado: false });
        expect(pasarela.obtenerPago).not.toHaveBeenCalled();
    });

    test('CP-SPAG-16 notificación válida → consulta el pago real y lo aplica', async () => {
        const { svc, pasarela, repo } = dobles();
        expect(await svc.procesarNotificacion('123456')).toEqual({ procesado: true });
        expect(pasarela.obtenerPago).toHaveBeenCalledWith('123456');
        expect(repo.aplicarResultado).toHaveBeenCalledWith(77, expect.objectContaining({ estado: 'APROBADO' }));
    });

    test('CP-SPAG-17 idempotencia: un pago APROBADO no retrocede a PENDIENTE', async () => {
        const { svc, repo } = dobles(
            { obtenerPorId: jest.fn().mockResolvedValue(pago({ estado: 'APROBADO' })) },
            { obtenerPago: jest.fn().mockResolvedValue(externo({ status: 'pending' })) },
        );
        await svc.procesarNotificacion('123456');
        expect(repo.aplicarResultado).not.toHaveBeenCalled();
    });

    test('CP-SPAG-18 external_reference que no existe en la BD → no procesa', async () => {
        const { svc } = dobles({ obtenerPorId: jest.fn().mockResolvedValue(null) });
        expect(await svc.procesarNotificacion('123456')).toMatchObject({ procesado: false });
    });
});
