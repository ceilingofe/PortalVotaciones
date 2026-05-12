import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { usuarioActual } from '@/lib/auth/session';
import { subirArchivo } from '@/lib/storage/supabase';
import { CategoriaReporte } from '@prisma/client';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  const usuario = await usuarioActual();
  if (!usuario?.vivienda) return NextResponse.json({ ok: false }, { status: 401 });

  const formData = await req.formData();
  const categoria = formData.get('categoria') as CategoriaReporte;
  const titulo = formData.get('titulo') as string;
  const descripcion = formData.get('descripcion') as string;
  const lat = formData.get('lat') as string | null;
  const lng = formData.get('lng') as string | null;
  const imagen = formData.get('imagen') as File | null;

  if (!categoria || !titulo || !descripcion) {
    return NextResponse.json({ ok: false, message: 'Datos incompletos' }, { status: 400 });
  }

  let imagenPath: string | null = null;
  if (imagen && imagen.size > 0) {
    try {
      const buffer = Buffer.from(await imagen.arrayBuffer());
      const ext = imagen.name.split('.').pop() || 'jpg';
      const path = `reportes/${usuario.id}/${randomUUID()}.${ext}`;
      await subirArchivo('reportes', path, buffer, imagen.type);
      imagenPath = path;
    } catch (e) {
      console.warn('No se pudo subir imagen:', e);
    }
  }

  const reporte = await prisma.reporte.create({
    data: {
      fraccionamientoId: usuario.vivienda.fraccionamientoId,
      autorId: usuario.id,
      categoria,
      titulo: titulo.slice(0, 100),
      descripcion: descripcion.slice(0, 500),
      imagenPath,
      ubicacionLat: lat ? parseFloat(lat) : null,
      ubicacionLng: lng ? parseFloat(lng) : null,
    },
    include: { autor: { select: { nombreCompleto: true } } },
  });

  return NextResponse.json({
    ok: true,
    reporte: {
      id: reporte.id,
      categoria: reporte.categoria,
      titulo: reporte.titulo,
      descripcion: reporte.descripcion,
      imagenPath: reporte.imagenPath,
      ubicacionLat: reporte.ubicacionLat,
      ubicacionLng: reporte.ubicacionLng,
      estatus: reporte.estatus,
      autor: reporte.autor.nombreCompleto,
      createdAt: reporte.createdAt.toISOString(),
    },
  });
}
