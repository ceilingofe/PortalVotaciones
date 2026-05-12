import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { usuarioActual } from '@/lib/auth/session';
import { resumirAsamblea } from '@/lib/groq/groq';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const usuario = await usuarioActual();
  if (!usuario || (usuario.rol !== 'ADMIN' && usuario.rol !== 'COMITE')) {
    return NextResponse.json({ ok: false, error: 'FORBIDDEN' }, { status: 403 });
  }

  const asamblea = await prisma.asamblea.findUnique({
    where: { id: params.id },
    include: {
      mensajes: {
        orderBy: { createdAt: 'asc' },
        include: { usuario: { select: { nombreCompleto: true } } },
      },
    },
  });
  if (!asamblea) return NextResponse.json({ ok: false }, { status: 404 });

  try {
    const resumen = await resumirAsamblea(
      asamblea.titulo,
      asamblea.mensajes.map((m) => ({
        autor: m.usuario.nombreCompleto,
        texto: m.contenido,
        createdAt: m.createdAt,
      }))
    );
    return NextResponse.json({ ok: true, resumen });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Error con Groq' }, { status: 500 });
  }
}
