import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { usuarioActual } from '@/lib/auth/session';

export async function GET() {
  const usuario = await usuarioActual();
  if (!usuario || !usuario.vivienda) return NextResponse.json({ ok: false }, { status: 401 });

  const posts = await prisma.post.findMany({
    where: { fraccionamientoId: usuario.vivienda.fraccionamientoId },
    orderBy: { createdAt: 'desc' },
    take: 30,
    include: {
      autor: { select: { id: true, nombreCompleto: true, rol: true } },
      _count: { select: { likes: true, comentarios: true } },
      likes: { where: { usuarioId: usuario.id }, select: { id: true } },
    },
  });

  return NextResponse.json({
    ok: true,
    posts: posts.map((p) => ({
      id: p.id,
      titulo: p.titulo,
      contenido: p.contenido,
      tipo: p.tipo,
      imagenPath: p.imagenPath,
      createdAt: p.createdAt.toISOString(),
      autor: p.autor ? { id: p.autor.id, nombre: p.autor.nombreCompleto, rol: p.autor.rol } : null,
      likes: p._count.likes,
      comentarios: p._count.comentarios,
      yaDiLike: p.likes.length > 0,
    })),
  });
}
