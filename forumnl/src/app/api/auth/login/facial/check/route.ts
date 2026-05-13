import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { telefono } = body;

  if (!telefono) return NextResponse.json({ ok: false, message: 'Teléfono requerido.' }, { status: 400 });

  const usuario = await prisma.usuario.findUnique({
    where: { telefono },
    select: { id: true, estatus: true, embeddingFacial: true },
  });

  if (!usuario) {
    return NextResponse.json({ ok: false, error: 'NO_REGISTRADO' }, { status: 404 });
  }
  if (usuario.estatus !== 'VERIFICADO') {
    return NextResponse.json({ ok: false, error: 'NO_VERIFICADO', message: 'Esta cuenta no está verificada.' }, { status: 403 });
  }

  return NextResponse.json({
    ok: true,
    tieneEmbedding: !!usuario.embeddingFacial,
  });
}
