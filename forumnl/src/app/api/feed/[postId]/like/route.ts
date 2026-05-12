import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { usuarioActual } from '@/lib/auth/session';

export async function POST(_req: Request, { params }: { params: { postId: string } }) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ ok: false }, { status: 401 });

  const existente = await prisma.like.findUnique({
    where: { postId_usuarioId: { postId: params.postId, usuarioId: usuario.id } },
  });

  if (existente) {
    await prisma.like.delete({ where: { id: existente.id } });
    return NextResponse.json({ ok: true, liked: false });
  } else {
    await prisma.like.create({ data: { postId: params.postId, usuarioId: usuario.id } });
    return NextResponse.json({ ok: true, liked: true });
  }
}
