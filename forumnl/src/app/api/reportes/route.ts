import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { usuarioActual } from '@/lib/auth/session';
import { CategoriaReporte, EstatusReporte } from '@prisma/client';
import { randomUUID } from 'crypto';
import { subirArchivo, obtenerUrlPublica } from '@/lib/storage/supabase';

const EMOJI_CAT: Record<string, string> = {
  SEGURIDAD: '🛡️', AGUA_DRENAJE: '💧', PARQUES: '🌳',
  BANQUETAS: '🚶', ALUMBRADO: '💡', BASURA: '🗑️', OTROS: '📌',
};
const LABEL_CAT: Record<string, string> = {
  SEGURIDAD: 'Seguridad', AGUA_DRENAJE: 'Agua y drenaje', PARQUES: 'Parques',
  BANQUETAS: 'Banquetas', ALUMBRADO: 'Alumbrado', BASURA: 'Basura', OTROS: 'Otros',
};

// ── GET /api/reportes?estatus=ABIERTO ─────────────────────────
export async function GET(req: NextRequest) {
  const usuario = await usuarioActual();
  if (!usuario?.vivienda) return NextResponse.json({ ok: false }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const estatus = searchParams.get('estatus');

  const where: any = { fraccionamientoId: usuario.vivienda.fraccionamientoId };
  if (estatus) where.estatus = estatus;

  const reportes = await prisma.reporte.findMany({
    where,
    select: {
      id: true,
      titulo: true,
      categoria: true,
      descripcion: true,
      estatus: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return NextResponse.json({
    ok: true,
    reportes: reportes.map((r) => ({
      id: r.id,
      titulo: r.titulo,
      categoria: r.categoria,
      descripcion: r.descripcion,
      estatus: r.estatus,
      emoji: EMOJI_CAT[r.categoria] ?? '📌',
    })),
  });
}

// ── POST /api/reportes ─────────────────────────────────────────
export async function POST(req: NextRequest) {
  const usuario = await usuarioActual();
  if (!usuario?.vivienda) return NextResponse.json({ ok: false }, { status: 401 });

  const formData = await req.formData();
  const categoria = formData.get('categoria') as CategoriaReporte;
  const titulo    = formData.get('titulo') as string;
  const descripcion = formData.get('descripcion') as string;
  const lat  = formData.get('lat') as string | null;
  const lng  = formData.get('lng') as string | null;
  const imagen = formData.get('imagen') as File | null;

  if (!categoria || !titulo || !descripcion) {
    return NextResponse.json({ ok: false, message: 'Datos incompletos' }, { status: 400 });
  }

  let imagenPath: string | null = null;
  if (imagen && imagen.size > 0 && imagen.size < 10 * 1024 * 1024) {
    const ext = imagen.name.split('.').pop() || 'jpg';
    const storagePath = `${randomUUID()}.${ext}`;
    await subirArchivo('reportes', storagePath, imagen, imagen.type);
    imagenPath = await obtenerUrlPublica('reportes', storagePath);
  }

  const fraccionamientoId = usuario.vivienda.fraccionamientoId;
  const emoji = EMOJI_CAT[categoria] ?? '📌';
  const label = LABEL_CAT[categoria] ?? 'Otros';

  const reporte = await prisma.reporte.create({
    data: {
      fraccionamientoId,
      autorId:     usuario.id,
      categoria,
      titulo:      titulo.slice(0, 100),
      descripcion: descripcion.slice(0, 500),
      imagenPath,
      ubicacionLat: lat ? parseFloat(lat) : null,
      ubicacionLng: lng ? parseFloat(lng) : null,
    },
    include: { autor: { select: { nombreCompleto: true } } },
  });

  // Post automático en el feed
  await prisma.post.create({
    data: {
      fraccionamientoId,
      autorId: null,
      tipo: 'auto_seguimiento',
      titulo: `${emoji} Reporte vecinal: ${titulo}`,
      contenido: `${emoji} Nuevo reporte en tu comunidad\n\n📋 Categoría: ${label}\n📌 ${titulo}\n\n${descripcion}\n\nReportado por un vecino de Las Lomas del Sur.${lat ? '\n📍 Con ubicación compartida.' : ''}`,
      imagenPath,
      reporteId: reporte.id,
    },
  });

  return NextResponse.json({
    ok: true,
    reporte: {
      id:           reporte.id,
      categoria:    reporte.categoria,
      titulo:       reporte.titulo,
      descripcion:  reporte.descripcion,
      imagenPath:   reporte.imagenPath,
      ubicacionLat: reporte.ubicacionLat,
      ubicacionLng: reporte.ubicacionLng,
      estatus:      reporte.estatus,
      autor:        reporte.autor.nombreCompleto,
      createdAt:    reporte.createdAt.toISOString(),
    },
  });
}
