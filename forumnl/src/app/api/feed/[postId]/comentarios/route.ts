import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { usuarioActual } from '@/lib/auth/session';

export async function GET(_req: Request, { params }: { params: { postId: string } }) {
  const comentarios = await prisma.comentario.findMany({
    where: { postId: params.postId },
    orderBy: { createdAt: 'asc' },
    include: { usuario: { select: { nombreCompleto: true } } },
    take: 50,
  });
  return NextResponse.json({
    ok: true,
    comentarios: comentarios.map((c) => ({
      id: c.id,
      autor: c.usuario.nombreCompleto,
      contenido: c.contenido,
      createdAt: c.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: Request, { params }: { params: { postId: string } }) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ ok: false }, { status: 401 });
  const { contenido } = await req.json();
  if (!contenido || typeof contenido !== 'string') {
    return NextResponse.json({ ok: false, error: 'Contenido requerido' }, { status: 400 });
  }
  const c = await prisma.comentario.create({
    data: { postId: params.postId, usuarioId: usuario.id, contenido: contenido.slice(0, 500) },
    include: { usuario: { select: { nombreCompleto: true } } },
  });
  return NextResponse.json({
    ok: true,
    comentario: { id: c.id, autor: c.usuario.nombreCompleto, contenido: c.contenido, createdAt: c.createdAt.toISOString() },
  });
}
