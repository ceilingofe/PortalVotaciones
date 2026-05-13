import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { usuarioActual } from '@/lib/auth/session';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';
import { fmtFecha } from '@/lib/dates';

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
    if (!resultados) return NextResponse.json({ ok: false, error: 'Sin acta. Cierra la asamblea primero.' }, { status: 404 });
    pdfBuf = await generarActaDeliberativa({ asamblea, proceso, resultados });
  } else {
    pdfBuf = await generarActaVotacion({
      asamblea, proceso,
      resultados: computar(proceso.tipo, proceso.opciones, proceso.votos),
      integrantesMesa: asamblea.mesa.map(m => m.usuario.nombreCompleto),
      incidencias: asamblea.incidencias.map(i => i.descripcion),
      totalPadron: asamblea._count.padron,
    });
  }

  return new NextResponse(pdfBuf, {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${filename}"` },
  });
}

function computar(tipo: string, opciones: any[], votos: any[]) {
  if (tipo === 'PRIORIZACION_PUNTAJE') {
    const p: Record<string,number> = {}; opciones.forEach(o=>(p[o.id]=0));
    votos.forEach(v=>{const c=v.contenido as any; if(c?.principal&&p[c.principal]!==undefined) p[c.principal]+=2; if(c?.secundaria&&p[c.secundaria]!==undefined) p[c.secundaria]+=1;});
    const d=opciones.map(o=>({nombre:o.nombre,puntos:p[o.id]})).sort((a,b)=>b.puntos-a.puntos);
    return { tipo:'puntaje', total:votos.length, detalle:d, ganador:d[0]?.nombre??'--' };
  }
  const c: Record<string,number>={};
  opciones.forEach(o=>(c[o.id]=0));
  votos.forEach(v=>{const id=(v.contenido as any)?.opcionId; if(id&&c[id]!==undefined) c[id]++;});
  const total=votos.length;
  const d=opciones.map(o=>({nombre:o.nombre,votos:c[o.id],pct:total>0?((c[o.id]/total)*100).toFixed(2):'0.00'})).sort((a,b)=>b.votos-a.votos);
  return { tipo:'votos', total, detalle:d, ganador:d[0]?.nombre??'--' };
}

/* ── Header común ─────────────────────────────────────────── */
function headerPDF(doc: PDFKit.PDFDocument, subtitulo: string) {
  const W = doc.page.width;
  const M = 55;

  // Franja amarilla superior — altura reducida para dar espacio al header
  doc.rect(0, 0, W, 6).fill('#F5C518');

  // Logo en la esquina superior izquierda
  const logoPath = path.join(process.cwd(), 'public', 'logo-ieepc.png');
  let logoW = 0;
  if (fs.existsSync(logoPath)) {
    try {
      doc.image(logoPath, M, 14, { height: 44, fit: [110, 44] });
      logoW = 120; // ancho reservado para logo + padding
    } catch { logoW = 0; }
  }

  // Texto del encabezado a la derecha del logo (con margen seguro)
  const textX   = M + logoW + 10;
  const textW   = W - textX - M;
  const lineaTop = 16;

  doc.fontSize(8).font('Helvetica-Bold').fillColor('#1A1A1A')
     .text('INSTITUTO ESTATAL ELECTORAL Y DE PARTICIPACION', textX, lineaTop, { width: textW, lineBreak: false });
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#1A1A1A')
     .text('CIUDADANA DE NUEVO LEON (IEEPCNL)', textX, lineaTop + 11, { width: textW, lineBreak: false });
  doc.fontSize(7).font('Helvetica').fillColor('#555')
     .text('ForumNL — Plataforma de Participacion Vecinal', textX, lineaTop + 23, { width: textW, lineBreak: false });

  // Línea separadora amarilla
  const lineY = 64;
  doc.moveTo(M, lineY).lineTo(W - M, lineY).lineWidth(2).stroke('#F5C518');
  doc.moveTo(M, lineY + 3).lineTo(W - M, lineY + 3).lineWidth(0.4).stroke('#E6B800');

  // Subtítulo del documento
  doc.y = lineY + 10;
  doc.fontSize(13).font('Helvetica-Bold').fillColor('#1A1A1A').text(subtitulo, { align: 'center' });
  doc.moveDown(1);
}

function footerPDF(doc: PDFKit.PDFDocument) {
  const pages = (doc as any).bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    doc.rect(0, doc.page.height - 22, doc.page.width, 22).fill('#F5C518');
    doc.fontSize(7).fillColor('#1A1A1A').font('Helvetica')
       .text(`ForumNL  |  IEEPCNL  |  Generada: ${new Date().toLocaleString('es-MX')}  |  Pag. ${i+1} de ${pages.count}`,
         55, doc.page.height - 13, { width: doc.page.width - 110, align: 'center' });
  }
}

function seccion(doc: PDFKit.PDFDocument, t: string) {
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#1A1A1A').text(t);
  doc.moveTo(55, doc.y + 2).lineTo(doc.page.width - 55, doc.y + 2).lineWidth(0.5).stroke('#F5C518');
  doc.moveDown(0.4);
}
function par(doc: PDFKit.PDFDocument, k: string, v: string) {
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#1A1A1A').text(k, { indent: 14, continued: true });
  doc.font('Helvetica').fillColor('#444').text(' ' + v);
}

/* ── Acta de votación / priorización ──────────────────────── */
function generarActaVotacion({ asamblea, proceso, resultados, integrantesMesa, incidencias, totalPadron }: any): Promise<Buffer> {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 55, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on('data', c => chunks.push(c)); doc.on('end', () => resolve(Buffer.concat(chunks)));
    const W = doc.page.width, M = 55, INNER = W - M * 2;

    const tipoLabel = proceso.tipo === 'ELECCION_PLANILLA' ? 'ELECCION DE PLANILLA — MAYORIA SIMPLE' : 'PRIORIZACION POR PUNTAJE (2 pts principal / 1 pt secundaria)';
    headerPDF(doc, 'ACTA DE JORNADA Y COMPUTO');
    doc.fontSize(10).font('Helvetica').fillColor('#444').text(asamblea.titulo, { align: 'center' });
    doc.moveDown(1.2);

    seccion(doc, 'I. DATOS GENERALES');
    par(doc, 'Fraccionamiento:', `${asamblea.fraccionamiento.nombre}, ${asamblea.fraccionamiento.municipio}, ${asamblea.fraccionamiento.estado}`);
    par(doc, 'Fecha de jornada:', fmtFecha(asamblea.jornadaInicio));
    par(doc, 'Apertura:', `${new Date(asamblea.jornadaInicio).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'})}`);
    par(doc, 'Cierre:', `${new Date(asamblea.jornadaFin).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'})}`);
    par(doc, 'Lugar:', asamblea.lugarPresencial || 'Modalidad digital — Plataforma ForumNL');
    par(doc, 'Total en padron:', String(totalPadron));
    doc.moveDown(0.7);

    seccion(doc, 'II. MESA ORGANIZADORA');
    if (!integrantesMesa.length) {
      doc.fontSize(9.5).font('Helvetica').fillColor('#444').text('Sin mesa formal registrada.', { indent: 14 });
    } else {
      integrantesMesa.forEach((n: string) => doc.fontSize(9.5).font('Helvetica').fillColor('#333').text(`  -  ${n}`, { indent: 14 }));
    }
    doc.moveDown(0.7);

    seccion(doc, 'III. TIPO DE PROCESO');
    par(doc, 'Tipo:', tipoLabel);
    par(doc, 'Proceso:', proceso.titulo);
    if (asamblea.reglas) par(doc, 'Reglas:', asamblea.reglas.slice(0, 180));
    doc.moveDown(0.7);

    seccion(doc, 'IV. RESULTADOS DEL COMPUTO');
    par(doc, 'Votos emitidos:', String(resultados.total));
    par(doc, 'Participacion:', `${totalPadron > 0 ? ((resultados.total/totalPadron)*100).toFixed(1) : 0}%`);
    par(doc, 'Resultado:', resultados.ganador);
    doc.moveDown(0.4);

    // Tabla de resultados — sin emojis
    const colHeaders = resultados.tipo === 'votos' ? ['Opcion / Planilla','Votos','Porcentaje'] : ['Opcion','Puntos Acumulados'];
    const colRows    = resultados.tipo === 'votos'
      ? resultados.detalle.map((d: any) => [d.nombre, String(d.votos), `${d.pct}%`])
      : resultados.detalle.map((d: any, i: number) => [`${i+1}. ${d.nombre}`, String(d.puntos)]);

    const colW = INNER / colHeaders.length;
    let y = doc.y + 4;
    doc.rect(M, y, INNER, 18).fill('#1A1A1A');
    doc.fontSize(9).font('Helvetica-Bold').fillColor('white');
    colHeaders.forEach((h, i) => doc.text(h, M + i * colW + 5, y + 4, { width: colW - 8, align: i===0?'left':'right' }));
    y += 18;
    colRows.forEach((row: string[], ri: number) => {
      const esGanador = row[0].includes(resultados.ganador) || (ri===0 && resultados.tipo==='puntaje');
      doc.rect(M, y, INNER, 16).fill(esGanador ? '#FEF3C7' : ri%2===0?'#F9FAFB':'white');
      if (esGanador) doc.rect(M, y, 3, 16).fill('#F5C518');
      doc.fontSize(9).font(esGanador?'Helvetica-Bold':'Helvetica').fillColor('#1A1A1A');
      row.forEach((c, i) => doc.text(c, M+i*colW+(i===0?8:4), y+3, { width: colW-10, align: i===0?'left':'right', lineBreak: false }));
      y += 16;
    });
    doc.moveTo(M, y).lineTo(W-M, y).lineWidth(0.5).stroke('#E5E7EB');
    doc.y = y + 8;
    doc.moveDown(0.7);

    seccion(doc, 'V. INCIDENCIAS');
    if (!incidencias.length) {
      doc.fontSize(9.5).font('Helvetica').fillColor('#444').text('La jornada transcurrio sin incidencias.', { indent: 14 });
    } else {
      incidencias.forEach((inc: string, i: number) => {
        doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#333').text(`Incidencia ${i+1}:`, { indent: 14, continued: true });
        doc.font('Helvetica').fillColor('#444').text(' ' + inc);
      });
    }
    doc.moveDown(0.7);

    seccion(doc, 'VI. FIRMAS DE LA MESA ORGANIZADORA');
    doc.moveDown(1.5);
    const lY = doc.y;
    [[M+20,'Responsable de mesa'],[W-M-170,'Vocal organizador']].forEach(([x, label]) => {
      doc.moveTo(x as number, lY).lineTo((x as number)+150, lY).lineWidth(0.8).stroke('#1A1A1A');
      doc.fontSize(8).font('Helvetica').fillColor('#666').text(label as string, (x as number), lY+5, { width: 150, align: 'center' });
    });

    footerPDF(doc);
    doc.end();
  });
}

/* ── Acta asamblea deliberativa ───────────────────────────── */
function generarActaDeliberativa({ asamblea, proceso, resultados }: any): Promise<Buffer> {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 55, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on('data', c => chunks.push(c)); doc.on('end', () => resolve(Buffer.concat(chunks)));
    const W = doc.page.width, M = 55;

    headerPDF(doc, 'ACTA DE ASAMBLEA VECINAL DELIBERATIVA');
    doc.fontSize(10).font('Helvetica').fillColor('#444').text(asamblea.titulo, { align:'center' });
    doc.moveDown(1.2);

    seccion(doc, 'I. DATOS GENERALES');
    par(doc, 'Fraccionamiento:', `${asamblea.fraccionamiento.nombre}, ${asamblea.fraccionamiento.municipio}`);
    par(doc, 'Fecha de apertura:', fmtFecha(asamblea.jornadaInicio));
    par(doc, 'Fecha de cierre:', fmtFecha(asamblea.jornadaFin));
    par(doc, 'Lugar:', asamblea.lugarPresencial || 'Modalidad digital — Plataforma ForumNL');
    par(doc, 'Total de intervenciones:', String(resultados.totalMensajes || 0));
    par(doc, 'Participantes unicos:', String(resultados.participantes?.length ?? 0));
    doc.moveDown(0.7);

    seccion(doc, 'II. PARTICIPANTES');
    const parts: string[] = resultados.participantes ?? [];
    if (!parts.length) {
      doc.fontSize(9.5).font('Helvetica').fillColor('#444').text('Sin participantes registrados.', { indent: 14 });
    } else {
      parts.forEach(p => doc.fontSize(9.5).font('Helvetica').fillColor('#333').text(`  -  ${p}`, { indent: 14 }));
    }
    doc.moveDown(0.7);

    seccion(doc, 'III. RESUMEN DE LA DELIBERACION');
    doc.fontSize(8).font('Helvetica-Oblique').fillColor('#777')
       .text('Resumen generado por inteligencia artificial a partir de las intervenciones registradas.', { indent: 14 });
    doc.moveDown(0.4);
    const resumenLineas = (resultados.resumen ?? 'Sin resumen.').replace(/[^\x00-\x7F]/g, c => c).split('\n');
    for (const linea of resumenLineas) {
      if (!linea.trim()) { doc.moveDown(0.2); continue; }
      const esTitle = linea.startsWith('##') || /^[A-Z]{3,}/.test(linea.slice(0,20));
      doc.fontSize(9.5).font(esTitle?'Helvetica-Bold':'Helvetica').fillColor('#333')
         .text(linea.replace(/^#+\s*/, '').replace(/^-\s+/, '    - '), { indent: 14 });
    }
    doc.moveDown(0.7);

    seccion(doc, 'IV. ACUERDOS Y RESOLUTIVOS');
    const acuerdosLineas = (resultados.acuerdos ?? 'Sin acuerdos formales.').split('\n');
    for (const linea of acuerdosLineas) {
      if (!linea.trim()) { doc.moveDown(0.2); continue; }
      doc.fontSize(9.5).font('Helvetica').fillColor('#333').text(linea.replace(/^-\s+/, '    - '), { indent: 14 });
    }
    doc.moveDown(0.7);

    seccion(doc, 'V. INCIDENCIAS');
    doc.fontSize(9.5).font('Helvetica').fillColor('#444')
       .text(resultados.incidencias || 'La asamblea transcurrio sin incidencias.', { indent: 14 });
    doc.moveDown(0.7);

    seccion(doc, 'VI. FIRMAS');
    doc.moveDown(1.5);
    const lY = doc.y;
    [[M+20,'Moderador de asamblea'],[W-M-170,'Representante vecinal']].forEach(([x, label]) => {
      doc.moveTo(x as number, lY).lineTo((x as number)+150, lY).lineWidth(0.8).stroke('#1A1A1A');
      doc.fontSize(8).font('Helvetica').fillColor('#666').text(label as string, (x as number), lY+5, { width: 150, align: 'center' });
    });

    footerPDF(doc);
    doc.end();
  });
}
