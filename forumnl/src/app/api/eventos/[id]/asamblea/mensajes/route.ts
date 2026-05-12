import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { usuarioActual } from '@/lib/auth/session';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const mensajes = await prisma.mensajeAsamblea.findMany({
    where: { asambleaId: params.id },
    orderBy: { createdAt: 'asc' },
    take: 200,
    include: { usuario: { select: { nombreCompleto: true, rol: true } } },
  });
  return NextResponse.json({
    ok: true,
    mensajes: mensajes.map((m) => ({
      id: m.id,
      autor: m.usuario.nombreCompleto,
      esModerador: m.usuario.rol === 'COMITE' || m.usuario.rol === 'ADMIN',
      contenido: m.contenido,
      createdAt: m.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ ok: false }, { status: 401 });
  const { contenido } = await req.json();
  if (!contenido || typeof contenido !== 'string') return NextResponse.json({ ok: false }, { status: 400 });

  const m = await prisma.mensajeAsamblea.create({
    data: { asambleaId: params.id, usuarioId: usuario.id, contenido: contenido.slice(0, 500) },
    include: { usuario: { select: { nombreCompleto: true, rol: true } } },
  });
  return NextResponse.json({
    ok: true,
    mensaje: {
      id: m.id,
      autor: m.usuario.nombreCompleto,
      esModerador: m.usuario.rol === 'COMITE' || m.usuario.rol === 'ADMIN',
      contenido: m.contenido,
      createdAt: m.createdAt.toISOString(),
    },
  });
}
