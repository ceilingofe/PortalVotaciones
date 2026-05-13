import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { usuarioActual } from '@/lib/auth/session';

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
  if (!asamblea) return NextResponse.json({ ok: false, error: 'NOT_FOUND' }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    // Hijos de Seguimiento (ActualizacionSeguimiento) no tienen cascade en algunos setups
    const segIds = asamblea.seguimiento.map(s => s.id);
    if (segIds.length > 0) {
      await tx.actualizacionSeguimiento.deleteMany({
        where: { seguimientoId: { in: segIds } },
      });
    }

    // Posts referenciando esta asamblea (no tienen FK cascade automático)
    await tx.post.deleteMany({ where: { asambleaId: params.id } });

    // Ahora borrar la asamblea — cascade se encarga del resto:
    // Proceso → Opcion → PlanillaIntegrante
    //        → Voto, EmisionPadron, Acta
    // MesaOrganizadora, PadronAsamblea
    // Seguimiento, Incidencia
    // AsistenteAsamblea, MensajeAsamblea
    await tx.asamblea.delete({ where: { id: params.id } });
  });

  return NextResponse.json({ ok: true });
}
