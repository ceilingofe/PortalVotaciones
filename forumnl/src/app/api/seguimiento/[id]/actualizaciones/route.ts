import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { usuarioActual } from '@/lib/auth/session';
import { subirArchivo, obtenerUrlPublica } from '@/lib/storage/supabase';

const MIME_IMAGENES  = ['image/jpeg','image/png','image/gif','image/webp'];
const EXT_DOCUMENTOS = ['.pdf','.doc','.docx','.xlsx','.xls','.ppt','.pptx','.txt'];

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ ok: false }, { status: 401 });

  const actualizaciones = await prisma.actualizacionSeguimiento.findMany({
    where: { seguimientoId: params.id },
    orderBy: { createdAt: 'asc' },
    include: { autor: { select: { nombreCompleto: true, rol: true } } },
  });

  return NextResponse.json({
    ok: true,
    actualizaciones: actualizaciones.map(a => ({
      id:          a.id,
      mensaje:     a.mensaje,
      imagenPath:  a.imagenPath,
      presupuesto: a.presupuesto,
      tipo:        a.tipo,
      autor:       a.autor?.nombreCompleto ?? 'FórumNL',
      esSistema:   !a.autorId,
      createdAt:   a.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const usuario = await usuarioActual();
  if (!usuario || (usuario.rol !== 'ADMIN' && usuario.rol !== 'COMITE')) {
    return NextResponse.json({ ok: false, error: 'FORBIDDEN' }, { status: 403 });
  }

  const formData       = await req.formData();
  const mensaje        = (formData.get('mensaje') as string)?.trim();
  const tipo           = (formData.get('tipo')    as string) || 'avance';
  const nuevoEstatus   = (formData.get('estatus') as string) || null;
  const presupuestoRaw = formData.get('presupuesto') as string | null;
  const presupuesto    = presupuestoRaw?.trim() ? parseFloat(presupuestoRaw) : null;
  const archivo        = formData.get('archivo') as File | null;  // imagen O documento

  if (!mensaje) return NextResponse.json({ ok: false, message: 'El mensaje es requerido.' }, { status: 400 });

  const segActual = await prisma.seguimiento.findUnique({
    where: { id: params.id },
    include: { asamblea: { include: { fraccionamiento: true } } },
  });
  if (!segActual) return NextResponse.json({ ok: false }, { status: 404 });

  // Guardar archivo (imagen o documento)
  let archivoPath: string | null = null;
  if (archivo && archivo.size > 0 && archivo.size < 20 * 1024 * 1024) {
    const { randomUUID } = await import('crypto');
    const ext = '.' + (archivo.name.split('.').pop() || 'bin').toLowerCase();
    const esImagen = MIME_IMAGENES.includes(archivo.type) || ['.jpg','.jpeg','.png','.gif','.webp'].includes(ext);
    const carpeta  = esImagen ? 'seguimiento' : 'seguimiento/docs';
    const storagePath = `${carpeta}/${randomUUID()}${ext}`;
    const bucket = esImagen ? 'reportes' : 'publico';
    await subirArchivo(bucket, storagePath, archivo, archivo.type);
    archivoPath = await obtenerUrlPublica(bucket, storagePath);
  }

  const EMOJIS: Record<string,string> = { avance:'🔄', inicio:'🚀', completado:'✅', incidencia:'⚠️', presupuesto:'💰', foto:'📸', documento:'📄' };

  let segActualizado: any;
  await prisma.$transaction(async tx => {
    await tx.actualizacionSeguimiento.create({
      data: {
        seguimientoId: params.id,
        autorId:       usuario.id,
        mensaje,
        imagenPath:    archivoPath,
        presupuesto,
        tipo,
      },
    });

    const updateData: any = {};
    if (nuevoEstatus) updateData.estatus = nuevoEstatus;
    if (presupuesto && presupuesto > 0) {
      const valorActual = segActual.presupuestoEjecutado ?? 0;
      updateData.presupuestoEjecutado = valorActual + presupuesto;
    }
    if (Object.keys(updateData).length > 0) {
      await tx.seguimiento.update({ where: { id: params.id }, data: updateData });
    }

    segActualizado = await tx.seguimiento.findUnique({
      where: { id: params.id },
      select: { estatus: true, presupuestoTotal: true, presupuestoEjecutado: true },
    });

    const emoji = EMOJIS[tipo] || '🔄';
    await tx.post.create({
      data: {
        fraccionamientoId: segActual.asamblea.fraccionamientoId,
        autorId: null,
        tipo: 'auto_seguimiento',
        titulo: `${emoji} Seguimiento: ${segActual.opcionNombre}`,
        contenido: [
          `Actualización en problema priorizado: ${segActual.opcionNombre} (Prioridad #${segActual.prioridad})`,
          ``,
          `${tipo}: ${mensaje}`,
          presupuesto && presupuesto > 0 ? `Monto: $${presupuesto.toLocaleString('es-MX')} MXN` : '',
          nuevoEstatus ? `Estatus: ${nuevoEstatus}` : '',
        ].filter(Boolean).join('\n').trim(),
        imagenPath: archivoPath,
        asambleaId: segActual.asambleaId,
        seguimientoId: params.id,
      },
    });
  });

  return NextResponse.json({ ok: true, segActualizado });
}
