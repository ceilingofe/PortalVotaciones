import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { usuarioActual } from '@/lib/auth/session';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ ok: false }, { status: 401 });

  const mensajes = await prisma.mensajeAsamblea.findMany({
    where: { asambleaId: params.id },
    orderBy: { createdAt: 'asc' },
    include: { usuario: { select: { nombreCompleto: true, rol: true } } },
  });

  return NextResponse.json({
    ok: true,
    mensajes: mensajes.map(m => ({
      id:        m.id,
      contenido: m.contenido,
      esAnonimo: (m as any).esAnonimo ?? false,
      // Si es anónimo: mostrar "Vecino anónimo". Rol y nombre se ocultan.
      autor:     (m as any).esAnonimo ? 'Vecino anónimo' : m.usuario.nombreCompleto,
      rol:       (m as any).esAnonimo ? null              : m.usuario.rol,
      esMio:     m.usuarioId === usuario.id,
      createdAt: m.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ ok: false }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const contenido  = (body.contenido as string)?.trim();
  const esAnonimo  = body.esAnonimo === true;

  if (!contenido) return NextResponse.json({ ok: false, message: 'Mensaje vacío.' }, { status: 400 });
  if (contenido.length > 1000) return NextResponse.json({ ok: false, message: 'Mensaje muy largo (máx. 1000 chars).' }, { status: 400 });

  // Verificar que la asamblea existe y está abierta
  const asamblea = await prisma.asamblea.findUnique({
    where: { id: params.id },
    select: { estatus: true, fraccionamientoId: true },
  });
  if (!asamblea) return NextResponse.json({ ok: false }, { status: 404 });
  if (asamblea.estatus === 'CERRADA' || asamblea.estatus === 'CON_ACTA') {
    return NextResponse.json({ ok: false, message: 'La asamblea está cerrada.' }, { status: 400 });
  }

  // Verificar asistente o agregarlo
  await prisma.asistenteAsamblea.upsert({
    where: { asambleaId_usuarioId: { asambleaId: params.id, usuarioId: usuario.id } },
    update: {},
    create: { asambleaId: params.id, usuarioId: usuario.id },
  });

  const msg = await prisma.mensajeAsamblea.create({
    data: {
      asambleaId: params.id,
      usuarioId: usuario.id,
      contenido,
      // esAnonimo se guarda si el campo existe en el schema
      ...(typeof (prisma.mensajeAsamblea as any).fields?.esAnonimo !== 'undefined' || true
        ? { esAnonimo }
        : {}),
    } as any,
    include: { usuario: { select: { nombreCompleto: true, rol: true } } },
  });

  return NextResponse.json({
    ok: true,
    mensaje: {
      id:        msg.id,
      contenido: msg.contenido,
      esAnonimo,
      autor:     esAnonimo ? 'Vecino anónimo' : msg.usuario.nombreCompleto,
      rol:       esAnonimo ? null : msg.usuario.rol,
      esMio:     true,
      createdAt: msg.createdAt.toISOString(),
    },
  });
}
