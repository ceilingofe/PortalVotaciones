import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { usuarioActual } from '@/lib/auth/session';

// POST — Reabrir sin borrar votos (solo cambia estatus, borra actas)
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const usuario = await usuarioActual();
  if (!usuario || usuario.rol !== 'ADMIN') {
    return NextResponse.json({ ok: false, error: 'SOLO_ADMIN' }, { status: 403 });
  }

  const asamblea = await prisma.asamblea.findUnique({
    where: { id: params.id },
    include: { procesos: { include: { acta: true } } },
  });
  if (!asamblea) return NextResponse.json({ ok: false }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    for (const proceso of asamblea.procesos) {
      if (proceso.acta) await tx.acta.delete({ where: { procesoId: proceso.id } });
      await tx.proceso.update({ where: { id: proceso.id }, data: { estatus: 'ABIERTO' } });
    }
    await tx.incidencia.deleteMany({ where: { asambleaId: params.id } });
    await tx.post.deleteMany({ where: { asambleaId: params.id, tipo: 'auto_resultado' } });
    await tx.asamblea.update({ where: { id: params.id }, data: { estatus: 'EN_JORNADA' } });
  });

  return NextResponse.json({ ok: true, message: 'Votación reabierta. Los votos anteriores se conservan.' });
}

// DELETE — Reseteo completo: borra votos + actas + seguimientos + actualizaciones
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const usuario = await usuarioActual();
  if (!usuario || usuario.rol !== 'ADMIN') {
    return NextResponse.json({ ok: false, error: 'SOLO_ADMIN' }, { status: 403 });
  }

  const asamblea = await prisma.asamblea.findUnique({
    where: { id: params.id },
    include: {
      procesos: true,
      seguimiento: { select: { id: true } },
    },
  });
  if (!asamblea) return NextResponse.json({ ok: false }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    // 1. Borrar actualizaciones de seguimiento (son hijos de Seguimiento)
    const segIds = asamblea.seguimiento.map(s => s.id);
    if (segIds.length > 0) {
      await tx.actualizacionSeguimiento.deleteMany({
        where: { seguimientoId: { in: segIds } },
      });
    }

    // 2. Borrar Seguimiento del histórico
    await tx.seguimiento.deleteMany({ where: { asambleaId: params.id } });

    // 3. Borrar votos, emisiones y actas por proceso
    for (const proceso of asamblea.procesos) {
      await tx.acta.deleteMany({ where: { procesoId: proceso.id } });
      await tx.voto.deleteMany({ where: { procesoId: proceso.id } });
      await tx.emisionPadron.deleteMany({ where: { procesoId: proceso.id } });
      await tx.proceso.update({ where: { id: proceso.id }, data: { estatus: 'ABIERTO' } });
    }

    // 4. Borrar incidencias y posts automáticos
    await tx.incidencia.deleteMany({ where: { asambleaId: params.id } });
    await tx.post.deleteMany({
      where: { asambleaId: params.id, tipo: { in: ['auto_resultado', 'auto_seguimiento'] } },
    });

    // 5. Reabrir la asamblea
    await tx.asamblea.update({ where: { id: params.id }, data: { estatus: 'EN_JORNADA' } });
  });

  return NextResponse.json({ ok: true, message: 'Votación y seguimiento reseteados completamente.' });
}
