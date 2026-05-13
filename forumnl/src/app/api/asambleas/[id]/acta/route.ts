import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { usuarioActual } from '@/lib/auth/session';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ ok: false }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const procesoId = searchParams.get('procesoId');

  const asamblea = await prisma.asamblea.findUnique({
    where: { id: params.id },
    include: {
      fraccionamiento: true,
      mesa: { include: { usuario: { select: { nombreCompleto: true } } } },
      incidencias: true,
      _count: { select: { padron: true } },
      procesos: {
        where: procesoId ? { id: procesoId } : undefined,
        include: { opciones: { orderBy: { orden: 'asc' } }, votos: true, acta: true },
      },
    },
  });

  if (!asamblea || asamblea.procesos.length === 0) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const proceso = asamblea.procesos[0];
  const filename = `acta-${asamblea.titulo.replace(/\s+/g, '-').toLowerCase().replace(/[^a-z0-9-]/g, '')}.pdf`;
  let pdfBuf: Buffer;

  if (proceso.tipo === 'ASAMBLEA_DELIBERATIVA') {
    const resultados = proceso.acta?.resultados as any;
    if (!resultados) {
      return NextResponse.json({ ok: false, error: 'Sin acta generada todavía. Cierra la asamblea primero.' }, { status: 404 });
    }
    pdfBuf = await generarActaDeliberativa({ asamblea, proceso, resultados });
  } else {
    const resultados = computar(proceso.tipo, proceso.opciones, proceso.votos);
    pdfBuf = await generarActaVotacion({
      asamblea, proceso, resultados,
      integrantesMesa: asamblea.mesa.map(m => m.usuario.nombreCompleto),
      incidencias: asamblea.incidencias.map(i => i.descripcion),
      totalPadron: asamblea._count.padron,
    });
  }

  return new NextResponse(pdfBuf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
    },
  });
}

/* ── Cómputo votos ────────────────────────────────────────── */
function computar(tipo: string, opciones: any[], votos: any[]) {
  if (tipo === 'PRIORIZACION_PUNTAJE') {
    const puntos: Record<string, number> = {};
    opciones.forEach(o => (puntos[o.id] = 0));
    votos.forEach(v => {
      const c = v.contenido as any;
      if (c?.principal && puntos[c.principal] !== undefined) puntos[c.principal] += 2;
      if (c?.secundaria && puntos[c.secundaria] !== undefined) puntos[c.secundaria] += 1;
    });
    const detalle = opciones.map(o => ({ nombre: o.nombre, puntos: puntos[o.id] })).sort((a, b) => b.puntos - a.puntos);
    return { tipo: 'puntaje', total: votos.length, detalle, ganador: detalle[0]?.nombre ?? '—' };
  }
  const conteo: Record<string, number> = {};
  opciones.forEach(o => (conteo[o.id] = 0));
  votos.forEach(v => { const id = (v.contenido as any)?.opcionId; if (id && conteo[id] !== undefined) conteo[id]++; });
  const total = votos.length;
  const detalle = opciones.map(o => ({ nombre: o.nombre, votos: conteo[o.id], pct: total > 0 ? ((conteo[o.id]/total)*100).toFixed(2) : '0.00' })).sort((a, b) => b.votos - a.votos);
  return { tipo: 'votos', total, detalle, ganador: detalle[0]?.nombre ?? '—' };
}

/* ── Helpers PDF ──────────────────────────────────────────── */
function getLogo() {
  const p = path.join(process.cwd(), 'public', 'logo-ieepc.png');
  return fs.existsSync(p) ? p : null;
}

function headerPDF(doc: PDFKit.PDFDocument, titulo: string) {
  const W = doc.page.width, M = 55;
  doc.rect(0, 0, W, 8).fill('#F5C518');
  const logo = getLogo();
  if (logo) { try { doc.image(logo, M, 16, { height: 50, fit: [130, 50] }); } catch {} }
  doc.fillColor('#1A1A1A').fontSize(9).font('Helvetica-Bold')
     .text('INSTITUTO ESTATAL ELECTORAL Y DE PARTICIPACIÓN CIUDADANA DE NUEVO LEÓN', M + 140, 20, { width: W - M * 2 - 140 });
  doc.fontSize(7).font('Helvetica').fillColor('#666')
     .text('IEEPCNL · FórumNL', M + 140, 31, { width: W - M * 2 - 140 });
  doc.y = 80;
  doc.moveTo(M, 76).lineTo(W - M, 76).lineWidth(2).stroke('#F5C518');
  doc.moveTo(M, 79).lineTo(W - M, 79).lineWidth(0.5).stroke('#E6B800');
  doc.y = 90;
  doc.fontSize(14).font('Helvetica-Bold').fillColor('#1A1A1A').text(titulo, { align: 'center' });
  doc.moveDown(1.2);
}

function footerPDF(doc: PDFKit.PDFDocument) {
  const pages = (doc as any).bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    doc.rect(0, doc.page.height - 24, doc.page.width, 24).fill('#F5C518');
    doc.fontSize(7).fillColor('#1A1A1A').font('Helvetica')
       .text(`FórumNL — IEEPCNL  |  Generada: ${new Date().toLocaleString('es-MX')}  |  Pág. ${i+1} de ${pages.count}`,
         55, doc.page.height - 15, { width: doc.page.width - 110, align: 'center' });
  }
}

function seccion(doc: PDFKit.PDFDocument, t: string) {
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#1A1A1A').text(t);
  doc.moveTo(55, doc.y + 2).lineTo(doc.page.width - 55, doc.y + 2).lineWidth(0.5).stroke('#F5C518');
  doc.fontSize(10).font('Helvetica').fillColor('#333');
  doc.moveDown(0.4);
}
function par(doc: PDFKit.PDFDocument, k: string, v: string) {
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#1A1A1A').text(k, { indent: 16, continued: true });
  doc.font('Helvetica').fillColor('#444').text(' ' + v);
}

/* ── PDF Asamblea Deliberativa ─────────────────────────────── */
function generarActaDeliberativa({ asamblea, proceso, resultados }: any): Promise<Buffer> {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 55, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    const W = doc.page.width, M = 55;

    headerPDF(doc, 'ACTA DE ASAMBLEA VECINAL DELIBERATIVA');
    doc.fontSize(11).font('Helvetica').fillColor('#444').text(asamblea.titulo, { align: 'center' });
    doc.moveDown(1.5);

    // I. Datos generales
    seccion(doc, 'I. DATOS GENERALES');
    par(doc, 'Fraccionamiento:', asamblea.fraccionamiento.nombre);
    par(doc, 'Municipio:', asamblea.fraccionamiento.municipio);
    par(doc, 'Fecha de apertura:', new Date(asamblea.jornadaInicio).toLocaleDateString('es-MX', { year:'numeric', month:'long', day:'numeric' }));
    par(doc, 'Fecha de cierre:', new Date(asamblea.jornadaFin).toLocaleDateString('es-MX', { year:'numeric', month:'long', day:'numeric' }));
    par(doc, 'Lugar:', asamblea.lugarPresencial || 'Modalidad digital — Plataforma FórumNL');
    par(doc, 'Total de intervenciones:', String(resultados.totalMensajes));
    par(doc, 'Participantes únicos:', String(resultados.participantes?.length ?? 0));
    doc.moveDown(0.8);

    // II. Participantes
    seccion(doc, 'II. PARTICIPANTES');
    const participantes: string[] = resultados.participantes ?? [];
    if (participantes.length === 0) {
      doc.fontSize(10).font('Helvetica').fillColor('#444').text('No se registraron participantes.', { indent: 20 });
    } else {
      // En columnas de 2
      const mitad = Math.ceil(participantes.length / 2);
      const col1 = participantes.slice(0, mitad);
      const col2 = participantes.slice(mitad);
      const colW = (W - M * 2 - 10) / 2;
      let y = doc.y;
      col1.forEach((p, i) => {
        doc.fontSize(9).font('Helvetica').fillColor('#333').text(`• ${p}`, M + 16, y + i * 14, { width: colW });
      });
      col2.forEach((p, i) => {
        doc.fontSize(9).font('Helvetica').fillColor('#333').text(`• ${p}`, M + colW + 20, y + i * 14, { width: colW });
      });
      doc.y = y + Math.max(col1.length, col2.length) * 14 + 4;
    }
    doc.moveDown(0.8);

    // III. Resumen de la deliberación
    seccion(doc, 'III. RESUMEN DE LA DELIBERACIÓN');
    doc.fontSize(9).font('Helvetica-Oblique').fillColor('#666')
       .text('Resumen generado automáticamente por inteligencia artificial a partir de las intervenciones registradas en la plataforma.', { indent: 16 });
    doc.moveDown(0.5);

    const resumenLineas = (resultados.resumen ?? 'Sin resumen.').split('\n');
    for (const linea of resumenLineas) {
      if (!linea.trim()) { doc.moveDown(0.3); continue; }
      if (linea.startsWith('##') || linea.startsWith('PUNTOS') || linea.startsWith('CONSENSO') || linea.startsWith('DESACUERD') || linea.startsWith('ACCION')) {
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#1A1A1A').text(linea.replace(/^#+\s*/, ''), { indent: 16 });
      } else if (linea.startsWith('- ')) {
        doc.fontSize(9.5).font('Helvetica').fillColor('#333').text(`• ${linea.slice(2)}`, { indent: 24 });
      } else {
        doc.fontSize(9.5).font('Helvetica').fillColor('#333').text(linea, { indent: 16 });
      }
    }
    doc.moveDown(0.8);

    // IV. Acuerdos y resolutivos
    seccion(doc, 'IV. ACUERDOS Y RESOLUTIVOS');
    const acuerdosLineas = (resultados.acuerdos ?? 'Sin acuerdos formales.').split('\n');
    for (const linea of acuerdosLineas) {
      if (!linea.trim()) { doc.moveDown(0.3); continue; }
      doc.fontSize(9.5).font('Helvetica').fillColor('#333').text(linea, { indent: 16 });
    }
    doc.moveDown(0.8);

    // V. Incidencias
    seccion(doc, 'V. INCIDENCIAS');
    if (resultados.incidencias) {
      doc.fontSize(9.5).font('Helvetica').fillColor('#333').text(resultados.incidencias, { indent: 16 });
    } else {
      doc.fontSize(9.5).font('Helvetica').fillColor('#444').text('La asamblea transcurrió sin incidencias.', { indent: 16 });
    }
    doc.moveDown(0.8);

    // VI. Firmas
    seccion(doc, 'VI. FIRMAS');
    doc.moveDown(1.5);
    const lineY = doc.y;
    const lineW = 140;
    [[M + 20, 'Moderador de asamblea'], [W - M - lineW - 20, 'Representante vecinal']].forEach(([x, label]) => {
      doc.moveTo(x as number, lineY).lineTo((x as number) + lineW, lineY).lineWidth(0.8).stroke('#1A1A1A');
      doc.fontSize(8).font('Helvetica').fillColor('#666').text(label as string, (x as number), lineY + 5, { width: lineW, align: 'center' });
    });

    footerPDF(doc);
    doc.end();
  });
}

/* ── PDF Votación/Priorización (existente) ─────────────────── */
function generarActaVotacion({ asamblea, proceso, resultados, integrantesMesa, incidencias, totalPadron }: any): Promise<Buffer> {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 55, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    const W = doc.page.width, M = 55;

    headerPDF(doc, 'ACTA DE JORNADA Y CÓMPUTO');
    doc.fontSize(11).font('Helvetica').fillColor('#444').text(asamblea.titulo, { align: 'center' });
    doc.moveDown(1.5);

    seccion(doc, 'I. DATOS GENERALES');
    par(doc, 'Fraccionamiento:', asamblea.fraccionamiento.nombre);
    par(doc, 'Municipio:', asamblea.fraccionamiento.municipio);
    par(doc, 'Fecha de jornada:', new Date(asamblea.jornadaInicio).toLocaleDateString('es-MX', { year:'numeric', month:'long', day:'numeric' }));
    par(doc, 'Hora de apertura:', new Date(asamblea.jornadaInicio).toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit' }));
    par(doc, 'Hora de cierre:', new Date(asamblea.jornadaFin).toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit' }));
    par(doc, 'Lugar:', asamblea.lugarPresencial || 'Modalidad digital (FórumNL)');
    par(doc, 'Total en padrón:', String(totalPadron));
    doc.moveDown(0.8);

    seccion(doc, 'II. MESA ORGANIZADORA');
    if (!integrantesMesa.length) {
      doc.fontSize(10).font('Helvetica').fillColor('#444').text('Sin mesa formal registrada.', { indent: 20 });
    } else {
      integrantesMesa.forEach((n: string) => doc.fontSize(10).font('Helvetica').fillColor('#333').text(`• ${n}`, { indent: 20 }));
    }
    doc.moveDown(0.8);

    seccion(doc, 'III. TIPO DE PROCESO');
    par(doc, 'Tipo:', proceso.tipo === 'ELECCION_PLANILLA' ? 'Elección de Planilla — Mayoría Simple' : 'Priorización por Puntaje (2pts principal / 1pt secundaria)');
    par(doc, 'Proceso:', proceso.titulo);
    doc.moveDown(0.8);

    seccion(doc, 'IV. RESULTADOS');
    par(doc, 'Votos emitidos:', String(resultados.total));
    par(doc, 'Participación:', `${totalPadron > 0 ? ((resultados.total / totalPadron) * 100).toFixed(1) : 0}%`);
    par(doc, 'Resultado:', resultados.ganador);
    doc.moveDown(0.5);

    // Tabla de resultados
    const headers = resultados.tipo === 'votos'
      ? ['Opción / Planilla', 'Votos', '%']
      : ['Opción', 'Puntos'];
    const rows = resultados.tipo === 'votos'
      ? resultados.detalle.map((d: any) => [d.nombre, String(d.votos), `${d.pct}%`])
      : resultados.detalle.map((d: any) => [d.nombre, String(d.puntos)]);

    const colW = (W - M * 2) / headers.length;
    let y = doc.y + 4;
    doc.rect(M, y, W - M * 2, 18).fill('#1A1A1A');
    doc.fontSize(9).font('Helvetica-Bold').fillColor('white');
    headers.forEach((h, i) => doc.text(h, M + i * colW + 4, y + 4, { width: colW - 6, align: i === 0 ? 'left' : 'right' }));
    y += 18;
    rows.forEach((row: string[], ri: number) => {
      const esGanador = row[0] === resultados.ganador;
      doc.rect(M, y, W - M * 2, 16).fill(esGanador ? '#FEF3C7' : ri % 2 === 0 ? '#F9FAFB' : 'white');
      if (esGanador) doc.rect(M, y, 3, 16).fill('#F5C518');
      doc.fontSize(9).font(esGanador ? 'Helvetica-Bold' : 'Helvetica').fillColor('#1A1A1A');
      row.forEach((c, i) => doc.text(i === 0 && esGanador ? `🏆 ${c}` : c, M + i * colW + (i===0?8:4), y + 3, { width: colW - 10, align: i === 0 ? 'left' : 'right' }));
      y += 16;
    });
    doc.moveTo(M, y).lineTo(W - M, y).lineWidth(0.5).stroke('#E5E7EB');
    doc.y = y + 8;
    doc.moveDown(0.8);

    seccion(doc, 'V. INCIDENCIAS');
    if (!incidencias.length) {
      doc.fontSize(10).font('Helvetica').fillColor('#444').text('La jornada transcurrió sin incidencias.', { indent: 20 });
    } else {
      incidencias.forEach((inc: string, i: number) => {
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#333').text(`Incidencia ${i + 1}:`, { indent: 20, continued: true });
        doc.font('Helvetica').fillColor('#444').text(` ${inc}`);
      });
    }
    doc.moveDown(0.8);

    seccion(doc, 'VI. FIRMAS');
    doc.moveDown(1.5);
    const lineY2 = doc.y;
    [[M + 20, 'Responsable de mesa'], [W - M - 160, 'Vocal organizador']].forEach(([x, label]) => {
      doc.moveTo(x as number, lineY2).lineTo((x as number) + 150, lineY2).lineWidth(0.8).stroke('#1A1A1A');
      doc.fontSize(8).font('Helvetica').fillColor('#666').text(label as string, (x as number), lineY2 + 5, { width: 150, align: 'center' });
    });

    footerPDF(doc);
    doc.end();
  });
}
