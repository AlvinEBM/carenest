import { ReporteRepository, FiltrosReporte } from '../../infrastructure/repositories/reporte.repository';

export class ReporteService {
    private repo = new ReporteRepository();

    async reporteCitas(filtros: FiltrosReporte) {
        const citas = await this.repo.reporteCitas(filtros);

        const totales = {
            total:       citas.length,
            completadas: citas.filter(c => c.estado === 'COMPLETADA').length,
            canceladas:  citas.filter(c => c.estado === 'CANCELADA').length,
            faltas:      citas.filter(c => c.estado === 'FALTA').length,
            reservadas:  citas.filter(c => ['RESERVADA', 'CONFIRMADA', 'RECORDATORIO'].includes(c.estado)).length,
        };

        return { citas, totales };
    }
}