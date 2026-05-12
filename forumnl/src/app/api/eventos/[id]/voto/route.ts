import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { usuarioActual } from '@/lib/auth/session';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 });

  const { contenido } = await req.json();
  const procesoId = params.id;

  const proceso = await prisma.proceso.findUnique({
    where: { id: procesoId },
    include: { asamblea: { include: { padron: { where: { usuarioId: usuario.id } } } } },
  });

  if (!proceso) return NextResponse.json({ ok: false, error: 'PROCESO_NO_ENCONTRADO' }, { status: 404 });
  if (proceso.estatus !== 'ABIERTO') {
    return NextResponse.json({ ok: false, error: 'PROCESO_CERRADO', message: 'El proceso no está abierto.' }, { status: 400 });
  }

  const entradaPadron = proceso.asamblea.padron[0];
  if (!entradaPadron) {
    return NextResponse.json({ ok: false, error: 'NO_PADRON', message: 'No estás en el padrón.' }, { status: 403 });
  }

  const folio = entradaPadron.folioAnonimo;

  // Transacción crítica: el Voto y la EmisionPadron se escriben juntos.
  // Si el folio ya votó, abortamos.
  try {
    await prisma.$transaction(async (tx) => {
      const yaVoto = await tx.emisionPadron.findUnique({
        where: { procesoId_folioAnonimo: { procesoId, folioAnonimo: folio } },
      });
      if (yaVoto) throw new Error('YA_VOTO');

      await tx.voto.create({
        data: { procesoId, folioAnonimo: folio, contenido, canal: 'digital' },
      });
      await tx.emisionPadron.create({
        data: { procesoId, folioAnonimo: folio, canal: 'digital' },
      });
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.message === 'YA_VOTO') {
      return NextResponse.json({ ok: false, error: 'YA_VOTO', message: 'Ya emitiste tu voto.' }, { status: 409 });
    }
    console.error('[voto]', e);
    return NextResponse.json({ ok: false, error: 'ERROR', message: e?.message }, { status: 500 });
  }
}
