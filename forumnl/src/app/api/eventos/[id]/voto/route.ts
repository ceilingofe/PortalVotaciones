import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { usuarioActual } from '@/lib/auth/session';

/** Parsea contenido de voto sin lanzar excepción. */
function parseContenido(raw: unknown): Record<string, unknown> {
  if (raw == null) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, unknown>;
  if (typeof raw === 'string') { try { return JSON.parse(raw); } catch { return {}; } }
  return {};
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ ok: false }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { contenido } = body;
  if (!contenido) return NextResponse.json({ ok: false, message: 'Contenido requerido.' }, { status: 400 });

  const procesoId = params.id;

  const proceso = await prisma.proceso.findUnique({
    where: { id: procesoId },
    include: { asamblea: { include: { fraccionamiento: true } } },
  });

  if (!proceso) return NextResponse.json({ ok: false, message: 'Proceso no encontrado.' }, { status: 404 });
  if (proceso.estatus !== 'ABIERTO') return NextResponse.json({ ok: false, message: 'La votación está cerrada.' }, { status: 400 });

  const asamblea = proceso.asamblea;

  // Verificar padrón
  const enPadron = await prisma.padronAsamblea.findFirst({
    where: { asambleaId: asamblea.id, usuarioId: usuario.id },
  });
  if (!enPadron) return NextResponse.json({ ok: false, message: 'No estás en el padrón.' }, { status: 403 });

  // Verificar que no ha votado
  const yaEmitio = await prisma.emisionPadron.findUnique({
    where: { procesoId_folioAnonimo: { procesoId, folioAnonimo: enPadron.folioAnonimo } },
  });
  if (yaEmitio) return NextResponse.json({ ok: false, message: 'Ya emitiste tu voto.' }, { status: 400 });

  // Parsear el contenido del voto de forma defensiva
  const c = parseContenido(contenido);

  // Validar según tipo (el voto nulo siempre es válido)
  if (c.tipo !== 'nulo') {
    const opciones = await prisma.opcion.findMany({ where: { procesoId }, select: { id: true } });
    const opcionIds = new Set(opciones.map(o => o.id));

    if ((proceso.tipo === 'ELECCION_PLANILLA' || proceso.tipo === 'SI_NO')) {
      const opcionId = c.opcionId as string | undefined;
      if (!opcionId || !opcionIds.has(opcionId)) {
        return NextResponse.json({ ok: false, message: 'Opción inválida.' }, { status: 400 });
      }
    }

    if (proceso.tipo === 'PRIORIZACION_PUNTAJE') {
      const ppal = c.principal  as string | undefined;
      const sec  = c.secundaria as string | undefined;
      if (!ppal || !opcionIds.has(ppal)) return NextResponse.json({ ok: false, message: 'Prioridad principal inválida.' }, { status: 400 });
      if (!sec  || !opcionIds.has(sec))  return NextResponse.json({ ok: false, message: 'Prioridad secundaria inválida.' }, { status: 400 });
      if (ppal === sec) return NextResponse.json({ ok: false, message: 'Principal y secundaria deben ser diferentes.' }, { status: 400 });
    }
  }

  // Registrar voto y emisión
  await prisma.$transaction([
    prisma.voto.create({ data: { procesoId, folioAnonimo: enPadron.folioAnonimo, contenido } }),
    prisma.emisionPadron.create({ data: { procesoId, folioAnonimo: enPadron.folioAnonimo } }),
  ]);

  // Verificar auto-cierre
  const [totalEmisiones, totalPadron] = await Promise.all([
    prisma.emisionPadron.count({ where: { procesoId } }),
    prisma.padronAsamblea.count({ where: { asambleaId: asamblea.id } }),
  ]);

  const debeAutoClose = totalPadron > 0 && totalEmisiones >= totalPadron;

  if (debeAutoClose) {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.proceso.update({ where: { id: procesoId }, data: { estatus: 'CON_ACTA' } });

        if (proceso.tipo === 'PRIORIZACION_PUNTAJE') {
          const votos    = await tx.voto.findMany({ where: { procesoId } });
          const opciones = await tx.opcion.findMany({ where: { procesoId } });
          const puntos: Record<string, number> = {};
          opciones.forEach(o => { puntos[o.id] = 0; });

          for (const v of votos) {
            const vc = parseContenido(v.contenido);
            if (vc.tipo === 'nulo') continue;
            const ppal = vc.principal  as string | undefined;
            const sec  = vc.secundaria as string | undefined;
            if (ppal && ppal in puntos) puntos[ppal] += 2;
            if (sec  && sec  in puntos) puntos[sec]  += 1;
          }

          const ordenadas = opciones
            .map(o => ({ ...o, puntos: puntos[o.id] ?? 0 }))
            .sort((a, b) => b.puntos - a.puntos);

          for (let i = 0; i < ordenadas.length; i++) {
            const op  = ordenadas[i];
            const seg = await tx.seguimiento.create({
              data: {
                asambleaId: asamblea.id, opcionNombre: op.nombre,
                opcionId: op.id, prioridad: i + 1, puntos: op.puntos, estatus: 'pendiente',
              },
            });
            await tx.actualizacionSeguimiento.create({
              data: { seguimientoId: seg.id, mensaje: `Prioridad #${i+1} — ${op.puntos} pts. Cierre automático: padrón completo.`, tipo: 'inicio' },
            });
          }
        }

        await tx.asamblea.update({ where: { id: asamblea.id }, data: { estatus: 'CON_ACTA' } });

        await tx.post.create({
          data: {
            fraccionamientoId: asamblea.fraccionamientoId,
            autorId: null,
            tipo: 'auto_resultado',
            titulo: `Cierre automatico: ${asamblea.titulo}`,
            contenido: `La votacion cerro automaticamente al alcanzar el 100% de participacion del padron (${totalPadron} votos). Resultados disponibles en Historico.`,
            asambleaId: asamblea.id,
          },
        });
      });
    } catch (err) {
      console.error('[voto] Error en auto-cierre:', err);
      // El voto ya se guardó — no fallar la respuesta por el auto-cierre
    }

    return NextResponse.json({ ok: true, autoCerrado: true });
  }

  return NextResponse.json({ ok: true, autoCerrado: false });
}
