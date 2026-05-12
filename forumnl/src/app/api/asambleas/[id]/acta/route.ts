import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { usuarioActual } from '@/lib/auth/session';
import PDFDocument from 'pdfkit';

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
      procesos: {
        where: procesoId ? { id: procesoId } : undefined,
        include: {
          opciones: { orderBy: { orden: 'asc' } },
          votos: true,
          emisiones: true,
        },
      },
    },
  });
  if (!asamblea || asamblea.procesos.length === 0) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }
  const proceso = asamblea.procesos[0];

  // Cómputo según tipo
  const resultados = computar(proceso.tipo, proceso.opciones, proceso.votos);

  // PDF
  const pdfBuffer = await generarPDF({
    asamblea,
    proceso,
    resultados,
    integrantesMesa: asamblea.mesa.map((m) => m.usuario.nombreCompleto),
  });

  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="acta-${asamblea.titulo.replace(/\s+/g, '-').toLowerCase()}.pdf"`,
    },
  });
}

function computar(tipo: string, opciones: any[], votos: any[]) {
  if (tipo === 'ELECCION_PLANILLA' || tipo === 'SI_NO' || tipo === 'APROBACION_MULTIPLE') {
    const conteo: Record<string, number> = {};
    for (const o of opciones) conteo[o.id] = 0;
    for (const v of votos) {
      const id = (v.contenido as any)?.opcionId;
      if (id && conteo[id] !== undefined) conteo[id]++;
    }
    const total = votos.length;
    return {
      tipo: 'votos',
      total,
      detalle: opciones.map((o) => ({
        nombre: o.nombre,
        votos: conteo[o.id],
        porcentaje: total > 0 ? ((conteo[o.id] / total) * 100).toFixed(2) : '0.00',
      })),
      ganador: opciones.reduce((g: any, o: any) => (conteo[o.id] > (conteo[g?.id] ?? -1) ? o : g), null)?.nombre || '—',
    };
  }
  if (tipo === 'PRIORIZACION_PUNTAJE') {
    const puntos: Record<string, number> = {};
    for (const o of opciones) puntos[o.id] = 0;
    for (const v of votos) {
      const c = v.contenido as any;
      if (c?.principal && puntos[c.principal] !== undefined) puntos[c.principal] += 2;
      if (c?.secundaria && puntos[c.secundaria] !== undefined) puntos[c.secundaria] += 1;
    }
    const total = votos.length;
    return {
      tipo: 'puntaje',
      total,
      detalle: opciones.map((o) => ({ nombre: o.nombre, puntos: puntos[o.id] })),
      ganador: opciones.reduce((g: any, o: any) => (puntos[o.id] > (puntos[g?.id] ?? -1) ? o : g), null)?.nombre || '—',
    };
  }
  return { tipo: 'otro', total: votos.length, detalle: [], ganador: '—' };
}

function generarPDF({ asamblea, proceso, resultados, integrantesMesa }: any): Promise<Buffer> {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 60 });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    // ENCABEZADO
    doc.fontSize(8).fillColor('#666').text('INSTITUTO ESTATAL ELECTORAL Y DE PARTICIPACIÓN CIUDADANA DE NUEVO LEÓN', { align: 'center' });
    doc.fontSize(8).fillColor('#666').text('IEEPCNL', { align: 'center' });
    doc.moveDown(2);

    doc.fontSize(14).fillColor('#000').text('ACTA DE JORNADA Y CÓMPUTO', { align: 'center' });
    doc.fontSize(11).text(asamblea.titulo, { align: 'center' });
    doc.moveDown();

    // Línea amarilla decorativa
    doc.rect(60, doc.y, doc.page.width - 120, 3).fill('#F5C518');
    doc.moveDown();

    // DATOS GENERALES
    doc.fillColor('#000').fontSize(10);
    seccion(doc, 'I. DATOS GENERALES');
    par(doc, `Fraccionamiento:`, asamblea.fraccionamiento.nombre);
    par(doc, `Municipio:`, asamblea.fraccionamiento.municipio);
    par(doc, `Estado:`, asamblea.fraccionamiento.estado);
    par(doc, `Fecha de jornada:`, asamblea.jornadaInicio.toLocaleDateString('es-MX'));
    par(doc, `Hora apertura:`, asamblea.jornadaInicio.toLocaleTimeString('es-MX'));
    par(doc, `Hora cierre:`, asamblea.jornadaFin.toLocaleTimeString('es-MX'));
    par(doc, `Lugar:`, asamblea.lugarPresencial || 'Modalidad digital');
    doc.moveDown();

    // MESA ORGANIZADORA
    seccion(doc, 'II. MESA ORGANIZADORA');
    if (integrantesMesa.length === 0) {
      doc.text('No se registró mesa formal.', { indent: 20 });
    } else {
      integrantesMesa.forEach((n: string) => doc.text(`• ${n}`, { indent: 20 }));
    }
    doc.moveDown();

    // PROCESO
    seccion(doc, 'III. PROCESO');
    par(doc, `Tipo:`, proceso.tipo.replace(/_/g, ' '));
    par(doc, `Título:`, proceso.titulo);
    par(doc, `Descripción:`, proceso.descripcion || '—');
    doc.moveDown();

    // RESULTADOS
    seccion(doc, 'IV. RESULTADOS DEL CÓMPUTO');
    par(doc, `Total de votos emitidos:`, String(resultados.total));
    doc.moveDown(0.5);

    if (resultados.tipo === 'votos') {
      tabla(doc, ['Opción', 'Votos', '%'], resultados.detalle.map((r: any) => [r.nombre, String(r.votos), `${r.porcentaje}%`]));
    } else if (resultados.tipo === 'puntaje') {
      tabla(doc, ['Opción', 'Puntos'], resultados.detalle.map((r: any) => [r.nombre, String(r.puntos)]));
    }
    doc.moveDown();
    par(doc, `Resultado:`, resultados.ganador);
    doc.moveDown();

    // INCIDENCIAS
    seccion(doc, 'V. INCIDENCIAS');
    doc.text('Sin incidencias durante la jornada.', { indent: 20 });
    doc.moveDown();

    // FIRMAS
    seccion(doc, 'VI. FIRMAS');
    doc.moveDown(2);
    const x1 = 80, x2 = doc.page.width - 240, y = doc.y;
    doc.moveTo(x1, y).lineTo(x1 + 160, y).stroke();
    doc.moveTo(x2, y).lineTo(x2 + 160, y).stroke();
    doc.fontSize(8);
    doc.text('Responsable de mesa', x1, y + 5, { width: 160, align: 'center' });
    doc.text('Vocal organizador', x2, y + 5, { width: 160, align: 'center' });

    // Footer
    doc.fontSize(7).fillColor('#999')
       .text(`Generada por FórumNL — ${new Date().toLocaleString('es-MX')}`, 60, doc.page.height - 40, { align: 'center', width: doc.page.width - 120 });

    doc.end();
  });
}

function seccion(doc: any, t: string) {
  doc.fontSize(11).fillColor('#1A1A1A').text(t, { underline: true });
  doc.fontSize(10).fillColor('#000');
  doc.moveDown(0.5);
}
function par(doc: any, k: string, v: string) {
  doc.font('Helvetica-Bold').text(k, { continued: true, indent: 20 }).font('Helvetica').text(` ${v}`);
}
function tabla(doc: any, headers: string[], rows: string[][]) {
  const colW = (doc.page.width - 120) / headers.length;
  let y = doc.y;
  doc.font('Helvetica-Bold').fontSize(9);
  headers.forEach((h, i) => doc.text(h, 60 + i * colW, y, { width: colW, align: i === 0 ? 'left' : 'right' }));
  doc.moveTo(60, y + 14).lineTo(doc.page.width - 60, y + 14).stroke();
  doc.font('Helvetica').fontSize(9);
  y += 18;
  for (const row of rows) {
    row.forEach((c, i) => doc.text(c, 60 + i * colW, y, { width: colW, align: i === 0 ? 'left' : 'right' }));
    y += 14;
  }
  doc.y = y + 4;
}
