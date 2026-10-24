// CSV (separador ';' + BOM UTF-8 para Excel) y PDF (jsPDF + autotable).
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { ReporteCita, ReporteTotales } from '../types';

function hoyStr(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function descargarArchivo(contenido: BlobPart, tipo: string, nombre: string) {
    const blob = new Blob([contenido], { type: tipo });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ---------- CSV ----------
function csvCampo(v: any): string {
    const s = v === null || v === undefined ? '' : String(v);
    return `"${s.replace(/"/g, '""')}"`;
}

export function exportarReporteCSV(citas: ReporteCita[]) {
    const sep = ';';
    const headers = ['Fecha', 'Hora', 'Especialidad', 'Médico', 'Paciente', 'Parentesco', 'Reservado por', 'DNI', 'Estado', 'Motivo'];

    const lineas = [headers.map(csvCampo).join(sep)];

    for (const c of citas) {
        lineas.push([
            c.fecha,
            c.hora,
            c.especialidad,
            `Dr. ${c.medico}`,
            c.paciente,
            c.es_menor ? (c.parentesco ?? 'Menor') : '',
            c.reservado_por,
            c.reservado_por_dni,
            c.estado,
            c.motivo ?? '',
        ].map(csvCampo).join(sep));
    }

    const contenido = '\uFEFF' + lineas.join('\r\n');   // BOM para acentos en Excel
    descargarArchivo(contenido, 'text/csv;charset=utf-8;', `reporte_citas_${hoyStr()}.csv`);
}

// ---------- PDF ----------
export function exportarReportePDF(
    citas: ReporteCita[],
    totales: ReporteTotales,
    infoFiltros: string,
) {
    const doc = new jsPDF({ orientation: 'landscape' });

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('CENTRO PSICOLÓGICO FELIZMENTE', 14, 15);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Reporte de citas', 14, 21);

    doc.setFontSize(8);
    doc.text(infoFiltros, 14, 27);
    doc.text(
        `Total: ${totales.total}   |   Completadas: ${totales.completadas}   |   Reservadas: ${totales.reservadas}   |   Canceladas: ${totales.canceladas}   |   Faltas: ${totales.faltas}`,
        14, 32,
    );

    autoTable(doc, {
        startY: 37,
        head: [['Fecha', 'Hora', 'Especialidad', 'Médico', 'Paciente', 'Reservado por', 'Estado', 'Motivo']],
        body: citas.map(c => [
            c.fecha,
            c.hora,
            c.especialidad,
            `Dr. ${c.medico}`,
            c.es_menor ? `${c.paciente} (${c.parentesco ?? 'Menor'})` : c.paciente,
            `${c.reservado_por} - DNI ${c.reservado_por_dni}`,
            c.estado,
            c.motivo ?? '',
        ]),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [11, 124, 140] },
        alternateRowStyles: { fillColor: [244, 250, 251] },
    });

    doc.save(`reporte_citas_${hoyStr()}.pdf`);
}