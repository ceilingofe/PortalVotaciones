import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { usuarioActual } from '@/lib/auth/session';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';
import { fmtFecha } from '@/lib/dates';

// Paleta de colores — debe coincidir con la gráfica de recharts
const COLORES = ['#F5C518','#6366F1','#10B981','#EF4444','#8B5CF6','#F97316'];

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#',''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Dibuja una gráfica de pastel en pdfkit usando path SVG.
 * cx, cy = centro; r = radio; data = [{nombre, valor, color}]
 */
function drawPieChart(
  doc: PDFKit.PDFDocument,
  cx: number, cy: number, r: number,
  data: { nombre: string; valor: number; color: string }[]
) {
  const total = data.reduce((s, d) => s + d.valor, 0);
  if (total === 0) return;

  let startAngle = -Math.PI / 2; // Empezar arriba

  for (const item of data) {
    const angle     = (item.valor / total) * 2 * Math.PI;
    const endAngle  = startAngle + angle;
    const largeArc  = angle > Math.PI ? 1 : 0;

    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);

    const [R, G, B] = hexToRgb(item.color);

    doc
      .save()
      .moveTo(cx, cy)
      .lineTo(x1, y1)
      .arc(cx, cy, r, startAngle, endAngle, false)
      // Cerrar el sector
      .closePath()
      .fillColor([R, G, B] as any)
      .fill()
      .restore();

    // Borde blanco entre sectores
    doc
      .save()
      .moveTo(cx, cy)
      .lineTo(x1, y1)
      .arc(cx, cy, r, startAngle, endAngle, false)
      .closePath()
      .strokeColor('white')
      .lineWidth(0.8)
      .stroke()
      .restore();

    startAngle = endAngle;
  }
}

/* ── PDF header ──────────────────────────────────────────── */
function headerPDF(doc: PDFKit.PDFDocument) {
  const W = doc.page.width;
  const M = 55;

  doc.rect(0, 0, W, 6).fill('#F5C518');

  const logoPath = path.join(process.cwd(), 'public', 'logo-ieepc.png');
  if (fs.existsSync(logoPath)) {
    try { doc.image(logoPath, M, 14, { height: 44, fit: [110, 44] }); } catch {}
  }

  const tx = M + 130;
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#1A1A1A')
    .text('INSTITUTO ESTATAL ELECTORAL Y DE PARTICIPACION CIUDADANA DE NUEVO LEON', tx, 16, { width: W - tx - M, lineBreak: false });
  doc.fontSize(7).font('Helvetica').fillColor('#555')
    .text('ForumNL — Plataforma de Participacion Vecinal', tx, 28, { width: W - tx - M, lineBreak: false });

  const lineY = 64;
  doc.moveTo(M, lineY).lineTo(W - M, lineY).lineWidth(2).stroke('#F5C518');
  doc.y = lineY + 10;
}

function footerPDF(doc: PDFKit.PDFDocument) {
  const pages = (doc as any).bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    doc.rect(0, doc.page.height - 22, doc.page.width, 22).fill('#F5C518');
    doc.fontSize(7).fillColor('#1A1A1A').font('Helvetica')
      .text(
        `ForumNL | IEEPCNL | Generado: ${new Date().toLocaleString('es-MX')} | Pag. ${i + 1} de ${pages.count}`,
        55, doc.page.height - 13,
        { width: doc.page.width - 110, align: 'center' }
      );
  }
}

function seccion(doc: PDFKit.PDFDocument, titulo: string) {
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#1A1A1A').text(titulo);
  doc.moveTo(55, doc.y + 2).lineTo(doc.page.width - 55, doc.y + 2).lineWidth(0.5).stroke('#F5C518');
  doc.moveDown(0.4);
}

function par(doc: PDFKit.PDFDocument, k: string, v: string) {
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#1A1A1A').text(k, { indent: 14, continued: true });
  doc.font('Helvetica').fillColor('#444').text(' ' + v);
}

/* ── Route handler ───────────────────────────────────────── */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
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
    },
  });

  if (!asamblea) return NextResponse.json({ ok: false }, { status: 404 });
  if (!asamblea.seguimiento.length) return NextResponse.json({ ok: false, error: 'Sin seguimientos.' }, { status: 404 });

  const W = 612; // Letter width
  const M = 55;
  const INNER = W - M * 2;

  const buf = await new Promise<Buffer>((resolve) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: M, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end',  () => resolve(Buffer.concat(chunks)));

    // ── Portada / encabezado ──────────────────────────────
    headerPDF(doc);
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#1A1A1A').text('REPORTE DE TRAZABILIDAD Y SEGUIMIENTO', { align: 'center' });
    doc.fontSize(10).font('Helvetica').fillColor('#444').text(asamblea.titulo, { align: 'center' });
    doc.moveDown(0.4);
    doc.fontSize(9).fillColor('#666').text(`${asamblea.fraccionamiento.nombre}, ${asamblea.fraccionamiento.municipio}  |  ${fmtFecha(asamblea.jornadaFin)}`, { align:'center' });
    doc.moveDown(1.2);

    // ── KPIs globales ─────────────────────────────────────
    seccion(doc, 'I. RESUMEN EJECUTIVO');
    const totalProblemas  = asamblea.seguimiento.length;
    const completados     = asamblea.seguimiento.filter(s => s.estatus === 'completado').length;
    const presTotal       = asamblea.seguimiento.reduce((s, x) => s + Number(x.presupuestoTotal   ?? 0), 0);
    const presEjec        = asamblea.seguimiento.reduce((s, x) => s + Number(x.presupuestoEjecutado ?? 0), 0);
    const pctAvance       = totalProblemas > 0 ? ((completados / totalProblemas) * 100).toFixed(1) : '0';
    const pctGasto        = presTotal      > 0 ? ((presEjec    / presTotal)      * 100).toFixed(1) : '0';

    par(doc, 'Problemas priorizados:',   `${totalProblemas} (${completados} completados, ${pctAvance}% de avance)`);
    par(doc, 'Presupuesto total:',        `$${presTotal.toLocaleString('es-MX')} MXN`);
    par(doc, 'Presupuesto ejecutado:',    `$${presEjec.toLocaleString('es-MX')} MXN (${pctGasto}%)`);
    doc.moveDown(0.8);

    // ── Gráfica de pastel (manual con pdfkit paths) ───────
    const datosGrafica = asamblea.seguimiento
      .map((s, i) => ({
        nombre:  s.opcionNombre,
        valor:   Number(s.presupuestoEjecutado ?? 0),
        color:   COLORES[i % COLORES.length],
      }))
      .filter(d => d.valor > 0);

    if (datosGrafica.length > 0) {
      seccion(doc, 'II. DISTRIBUCION DEL GASTO POR PROBLEMA');

      const yGrafica  = doc.y + 10;
      const cx        = M + 110;
      const cy        = yGrafica + 85;
      const r         = 75;

      drawPieChart(doc, cx, cy, r, datosGrafica);

      // Leyenda a la derecha de la gráfica
      const leyX = cx + r + 30;
      let leyY   = yGrafica + 15;
      const totalG = datosGrafica.reduce((s, d) => s + d.valor, 0);

      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#1A1A1A').text('Leyenda:', leyX, leyY);
      leyY += 14;

      for (const item of datosGrafica) {
        const [R2, G2, B2] = hexToRgb(item.color);
        doc.rect(leyX, leyY + 1, 10, 10).fillColor([R2, G2, B2] as any).fill();
        const pct = ((item.valor / totalG) * 100).toFixed(1);
        const label = item.nombre.length > 22 ? item.nombre.slice(0, 20) + '...' : item.nombre;
        doc.fontSize(7.5).font('Helvetica').fillColor('#1A1A1A')
          .text(`${label}`, leyX + 14, leyY + 1, { width: W - leyX - M - 14, lineBreak: false });
        doc.fontSize(7).fillColor('#666')
          .text(`  $${item.valor.toLocaleString('es-MX')} (${pct}%)`, { continued: false });
        leyY += 18;
      }

      doc.y = Math.max(doc.y, cy + r + 20);
      doc.moveDown(0.8);
    }

    // ── Detalle por problema ──────────────────────────────
    const numSection = datosGrafica.length > 0 ? 'III' : 'II';
    seccion(doc, `${numSection}. DETALLE POR PROBLEMA`);

    for (const seg of asamblea.seguimiento) {
      if (doc.y > doc.page.height - 150) doc.addPage();

      const presEjecSeg = Number(seg.presupuestoEjecutado ?? 0);
      const presTotSeg  = Number(seg.presupuestoTotal    ?? 0);

      // Encabezado del problema
      doc.rect(M, doc.y, INNER, 16).fill('#1A1A1A');
      doc.fontSize(9).font('Helvetica-Bold').fillColor('white')
        .text(`  ${seg.prioridad}. ${seg.opcionNombre}`, M + 4, doc.y + 4, { width: INNER - 8, lineBreak: false });
      doc.y += 16;

      doc.rect(M, doc.y, INNER, 14).fill('#F9FAFB');
      const estatusLabel: Record<string, string> = {
        pendiente:'Pendiente', en_proceso:'En proceso', completado:'Completado', bloqueado:'Bloqueado'
      };
      const info = `Estatus: ${estatusLabel[seg.estatus] ?? seg.estatus}   Puntos: ${seg.puntos ?? 0}   Presupuesto: $${presEjecSeg.toLocaleString('es-MX')}${presTotSeg > 0 ? ` / $${presTotSeg.toLocaleString('es-MX')} MXN` : ' MXN'}`;
      doc.fontSize(8).font('Helvetica').fillColor('#444').text(info, M + 8, doc.y + 3, { width: INNER - 16, lineBreak: false });
      doc.y += 14;
      doc.moveDown(0.3);

      // Actualizaciones
      if (seg.actualizaciones.length === 0) {
        doc.fontSize(8.5).font('Helvetica-Oblique').fillColor('#9CA3AF').text('Sin actualizaciones registradas.', { indent: 14 });
      } else {
        for (const act of seg.actualizaciones) {
          if (doc.y > doc.page.height - 80) doc.addPage();
          const fecha = new Date(act.createdAt).toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' });
          const autor = act.autor?.nombreCompleto ?? 'FórumNL';
          doc.fontSize(8).font('Helvetica-Bold').fillColor('#374151')
            .text(`[${act.tipo.toUpperCase()}] ${fecha} — ${autor}`, { indent: 14 });
          doc.fontSize(8).font('Helvetica').fillColor('#444')
            .text(act.mensaje, { indent: 22 });
          if (act.presupuesto && Number(act.presupuesto) > 0) {
            doc.fontSize(8).font('Helvetica-Oblique').fillColor('#6B21A8')
              .text(`Monto: $${Number(act.presupuesto).toLocaleString('es-MX')} MXN`, { indent: 22 });
          }
          doc.moveDown(0.3);
        }
      }
      doc.moveDown(0.5);
    }

    footerPDF(doc);
    doc.end();
  });

  const filename = `trazabilidad-${asamblea.titulo.replace(/\s+/g,'-').toLowerCase().replace(/[^a-z0-9-]/g,'')}.pdf`;
  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
    },
  });
}
