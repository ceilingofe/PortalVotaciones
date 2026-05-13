import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { usuarioActual } from '@/lib/auth/session';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';
import { fmtFecha, fmtFechaHora } from '@/lib/dates';

function getLogo() {
  const p = path.join(process.cwd(), 'public', 'logo-ieepc.png');
  return fs.existsSync(p) ? p : null;
}

const TIPO_LABEL: Record<string, string> = {
  inicio: 'Inicio', avance: 'Avance', completado: 'Completado',
  incidencia: 'Incidencia', presupuesto: 'Presupuesto', foto: 'Evidencia',
};
const TIPO_EMOJI: Record<string, string> = {
  inicio: '🚀', avance: '🔄', completado: '✅',
  incidencia: '⚠️', presupuesto: '💰', foto: '📸',
};
const ESTATUS_LABEL: Record<string, string> = {
  pendiente: 'Pendiente', en_proceso: 'En proceso',
  completado: 'Completado', bloqueado: 'Bloqueado',
};

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ ok: false }, { status: 401 });

  const asamblea = await prisma.asamblea.findUnique({
    where: { id: params.id },
    include: {
      fraccionamiento: true,
      seguimiento: {
        orderBy: { prioridad: 'asc' },
        include: {
          actualizaciones: {
            orderBy: { createdAt: 'asc' },
            include: { autor: { select: { nombreCompleto: true } } },
          },
        },
      },
      procesos: { where: { tipo: 'PRIORIZACION_PUNTAJE' }, include: { _count: { select: { votos: true } } } },
    },
  });

  if (!asamblea) return NextResponse.json({ ok: false }, { status: 404 });

  const pdfBuf = await generarPDF(asamblea);
  const filename = `trazabilidad-${asamblea.titulo.replace(/\s+/g, '-').toLowerCase().replace(/[^a-z0-9-]/g, '')}.pdf`;

  return new NextResponse(pdfBuf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
    },
  });
}

function generarPDF(asamblea: any): Promise<Buffer> {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 55, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    const W = doc.page.width;
    const M = 55;
    const INNER = W - M * 2;

    // ── ENCABEZADO ────────────────────────────────────────────
    doc.rect(0, 0, W, 8).fill('#F5C518');
    const logo = getLogo();
    if (logo) { try { doc.image(logo, M, 16, { height: 48, fit: [120, 48] }); } catch {} }

    doc.fillColor('#1A1A1A').fontSize(9).font('Helvetica-Bold')
       .text('INSTITUTO ESTATAL ELECTORAL Y DE PARTICIPACIÓN CIUDADANA DE NUEVO LEÓN', M + 130, 20, { width: INNER - 130 });
    doc.fontSize(7).font('Helvetica').fillColor('#666')
       .text('Reporte de Trazabilidad — FórumNL', M + 130, 31, { width: INNER - 130 });

    doc.y = 80;
    doc.moveTo(M, 76).lineTo(W - M, 76).lineWidth(2).stroke('#F5C518');

    // Título del reporte
    doc.fontSize(16).font('Helvetica-Bold').fillColor('#1A1A1A')
       .text('REPORTE DE TRAZABILIDAD', { align: 'center' });
    doc.fontSize(11).font('Helvetica').fillColor('#444')
       .text('Seguimiento de problemas priorizados', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(9).font('Helvetica').fillColor('#666')
       .text(`Generado el ${fmtFechaHora(new Date())}  ·  ${asamblea.fraccionamiento.nombre}`, { align: 'center' });
    doc.moveDown(1);
    doc.moveTo(M, doc.y).lineTo(W - M, doc.y).lineWidth(0.5).stroke('#E5E7EB');
    doc.moveDown(0.5);

    // ── DATOS GENERALES ───────────────────────────────────────
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#1A1A1A').text('DATOS DE LA ASAMBLEA');
    doc.moveDown(0.3);
    const totalVotos = asamblea.procesos[0]?._count?.votos ?? 0;
    const datosPares = [
      ['Título:', asamblea.titulo],
      ['Fraccionamiento:', `${asamblea.fraccionamiento.nombre}, ${asamblea.fraccionamiento.municipio}`],
      ['Fecha de votación:', fmtFecha(asamblea.jornadaInicio)],
      ['Fecha de cierre:', fmtFecha(asamblea.jornadaFin)],
      ['Participantes:', `${totalVotos} votos emitidos`],
      ['Problemas priorizados:', `${asamblea.seguimiento.length}`],
    ];
    for (const [k, v] of datosPares) {
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#1A1A1A')
         .text(k, { indent: 10, continued: true });
      doc.font('Helvetica').fillColor('#444').text(' ' + v);
    }
    doc.moveDown(0.8);

    // ── DASHBOARD GENERAL DE PRESUPUESTO ─────────────────────
    const presTotal     = asamblea.seguimiento.reduce((s: number, sg: any) => s + (sg.presupuestoTotal ?? 0), 0);
    const presEjecutado = asamblea.seguimiento.reduce((s: number, sg: any) => s + (sg.presupuestoEjecutado ?? 0), 0);
    const completados   = asamblea.seguimiento.filter((s: any) => s.estatus === 'completado').length;
    const pct = presTotal > 0 ? ((presEjecutado / presTotal) * 100).toFixed(1) : '—';

    doc.fontSize(11).font('Helvetica-Bold').fillColor('#1A1A1A').text('RESUMEN EJECUTIVO');
    doc.moveTo(M, doc.y + 2).lineTo(W - M, doc.y + 2).lineWidth(0.5).stroke('#F5C518');
    doc.moveDown(0.4);

    // Caja de KPIs
    const kpis = [
      { l: 'Problemas', v: String(asamblea.seguimiento.length) },
      { l: 'Completados', v: `${completados}/${asamblea.seguimiento.length}` },
      { l: 'Presupuesto total', v: presTotal > 0 ? `$${presTotal.toLocaleString('es-MX')} MXN` : 'N/A' },
      { l: 'Ejecutado', v: `$${presEjecutado.toLocaleString('es-MX')} MXN` },
      { l: '% Ejecutado', v: `${pct}%` },
    ];

    const kpiW = INNER / kpis.length;
    const kpiY = doc.y + 4;
    doc.rect(M, kpiY, INNER, 46).fill('#FFFBEB');
    doc.rect(M, kpiY, INNER, 46).lineWidth(0.5).stroke('#F5C518');
    kpis.forEach((kpi, i) => {
      const x = M + i * kpiW;
      if (i > 0) doc.moveTo(x, kpiY).lineTo(x, kpiY + 46).lineWidth(0.3).stroke('#F5C518');
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#1A1A1A')
         .text(kpi.v, x, kpiY + 6, { width: kpiW, align: 'center' });
      doc.fontSize(7).font('Helvetica').fillColor('#92400E')
         .text(kpi.l, x, kpiY + 26, { width: kpiW, align: 'center' });
    });
    doc.y = kpiY + 50;
    doc.moveDown(0.8);

    // ── DETALLE POR PROBLEMA ──────────────────────────────────
    for (const seg of asamblea.seguimiento) {
      // Verificar si hay espacio suficiente para el header del problema
      if (doc.y > doc.page.height - 120) {
        doc.addPage();
        doc.y = 60;
      }

      const posEmoji = seg.prioridad === 1 ? '1ro' : seg.prioridad === 2 ? '2do' : seg.prioridad === 3 ? '3ro' : `${seg.prioridad}ro`;
      const presSegEj = seg.presupuestoEjecutado ?? 0;
      const presSegTot = seg.presupuestoTotal ?? 0;
      const pctSeg = presSegTot > 0 ? ((presSegEj / presSegTot) * 100).toFixed(1) : '—';

      // Header del problema — caja negra
      const hY = doc.y;
      doc.rect(M, hY, INNER, 28).fill('#1A1A1A');
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#F5C518')
         .text(`[${posEmoji} Lugar — ${seg.puntos} pts]`, M + 6, hY + 4, { width: INNER - 12, continued: true });
      doc.fillColor('white').text(`  ${seg.opcionNombre}`, { continued: false });
      doc.fontSize(8).font('Helvetica').fillColor('#9CA3AF')
         .text(`Estatus: ${ESTATUS_LABEL[seg.estatus] ?? seg.estatus}${seg.responsable ? '  ·  Responsable: ' + seg.responsable : ''}`, M + 6, hY + 18, { width: INNER - 12 });
      doc.y = hY + 32;
      doc.moveDown(0.3);

      // Mini dashboard de presupuesto del problema
      if (presSegTot > 0 || presSegEj > 0) {
        const presLineas = [
          `Total asignado: $${presSegTot.toLocaleString('es-MX')} MXN`,
          `Ejecutado: $${presSegEj.toLocaleString('es-MX')} MXN`,
          `Disponible: $${(presSegTot - presSegEj).toLocaleString('es-MX')} MXN`,
          `% Ejecutado: ${pctSeg}%`,
        ];
        const bY = doc.y;
        doc.rect(M, bY, INNER, 18).fill('#F9FAFB');
        doc.fontSize(8).font('Helvetica').fillColor('#374151');
        presLineas.forEach((l, i) => {
          doc.text(l, M + 8 + i * (INNER / 4), bY + 4, { width: INNER / 4 - 4 });
        });
        doc.y = bY + 20;

        // Barra de progreso textual
        if (presSegTot > 0) {
          const barW = Math.round((INNER - 10) * Math.min(1, presSegEj / presSegTot));
          const barY = doc.y;
          doc.rect(M + 5, barY, INNER - 10, 6).fill('#E5E7EB');
          if (barW > 0) doc.rect(M + 5, barY, barW, 6).fill('#F5C518');
          doc.y = barY + 10;
        }
        doc.moveDown(0.3);
      }

      // Tabla de actualizaciones
      if (seg.actualizaciones.length === 0) {
        doc.fontSize(9).font('Helvetica-Oblique').fillColor('#9CA3AF')
           .text('Sin actualizaciones registradas.', { indent: 10 });
      } else {
        // Header de tabla
        const cols = [80, 80, 100, INNER - 80 - 80 - 100 - 80, 80]; // Fecha, Tipo, Autor, Mensaje, Monto
        const colHeaders = ['Fecha', 'Tipo', 'Autor', 'Mensaje / Descripción', 'Monto MXN'];
        const tHdrY = doc.y;
        doc.rect(M, tHdrY, INNER, 16).fill('#374151');
        doc.fontSize(7.5).font('Helvetica-Bold').fillColor('white');
        let cx = M + 4;
        colHeaders.forEach((h, i) => {
          doc.text(h, cx, tHdrY + 4, { width: cols[i] - 4, align: i === 4 ? 'right' : 'left' });
          cx += cols[i];
        });
        doc.y = tHdrY + 16;

        seg.actualizaciones.forEach((act: any, ai: number) => {
          const rowH = 22;
          if (doc.y + rowH > doc.page.height - 80) { doc.addPage(); doc.y = 60; }

          const rowY = doc.y;
          doc.rect(M, rowY, INNER, rowH).fill(ai % 2 === 0 ? '#FFFFFF' : '#F9FAFB');
          doc.moveTo(M, rowY + rowH).lineTo(W - M, rowY + rowH).lineWidth(0.3).stroke('#E5E7EB');

          const vals = [
            fmtFecha(act.createdAt),
            `${TIPO_EMOJI[act.tipo] ?? ''} ${TIPO_LABEL[act.tipo] ?? act.tipo}`,
            act.autorId ? (act.autor?.nombreCompleto ?? '—') : 'FórumNL',
            act.mensaje.slice(0, 120) + (act.mensaje.length > 120 ? '…' : ''),
            act.presupuesto && act.presupuesto > 0 ? `$${act.presupuesto.toLocaleString('es-MX')}` : '—',
          ];

          doc.fontSize(7.5).font('Helvetica').fillColor('#1A1A1A');
          cx = M + 4;
          vals.forEach((v, i) => {
            doc.text(v, cx, rowY + 4, {
              width: cols[i] - 4,
              height: rowH - 4,
              align: i === 4 ? 'right' : 'left',
              lineBreak: false,
            });
            cx += cols[i];
          });
          doc.y = rowY + rowH;
        });
      }

      doc.moveDown(0.8);
    }

    // ── FIRMAS ────────────────────────────────────────────────
    if (doc.y > doc.page.height - 100) { doc.addPage(); doc.y = 60; }
    doc.moveDown(1);
    doc.moveTo(M, doc.y).lineTo(W - M, doc.y).lineWidth(0.5).stroke('#E5E7EB');
    doc.moveDown(1);
    const linY = doc.y;
    [[M + 20, 'Elaboró'], [W - M - 170, 'Autorizó']].forEach(([x, label]) => {
      doc.moveTo(x as number, linY).lineTo((x as number) + 150, linY).lineWidth(0.8).stroke('#1A1A1A');
      doc.fontSize(8).font('Helvetica').fillColor('#666')
         .text(label as string, (x as number), linY + 5, { width: 150, align: 'center' });
    });

    // ── FOOTER ────────────────────────────────────────────────
    const pages = (doc as any).bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc.rect(0, doc.page.height - 24, W, 24).fill('#F5C518');
      doc.fontSize(7).fillColor('#1A1A1A').font('Helvetica')
         .text(
           `FórumNL — IEEPCNL  |  Reporte de Trazabilidad  |  ${fmtFechaHora(new Date())}  |  Pág. ${i + 1} de ${pages.count}`,
           M, doc.page.height - 15, { width: W - M * 2, align: 'center' }
         );
    }

    doc.end();
  });
}
