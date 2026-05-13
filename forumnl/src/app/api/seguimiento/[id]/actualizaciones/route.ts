import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { usuarioActual } from '@/lib/auth/session';
import { fmtFechaHora } from '@/lib/dates';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ ok: false }, { status: 401 });

  const actualizaciones = await prisma.actualizacionSeguimiento.findMany({
    where: { seguimientoId: params.id },
    orderBy: { createdAt: 'asc' },
    include: { autor: { select: { nombreCompleto: true, rol: true } } },
  });

  return NextResponse.json({
    ok: true,
    actualizaciones: actualizaciones.map((a) => ({
      id:          a.id,
      mensaje:     a.mensaje,
      imagenPath:  a.imagenPath,
      presupuesto: a.presupuesto,
      tipo:        a.tipo,
      autor:       a.autor?.nombreCompleto ?? 'FórumNL',
      esSistema:   !a.autorId,
      createdAt:   a.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const usuario = await usuarioActual();
  if (!usuario || (usuario.rol !== 'ADMIN' && usuario.rol !== 'COMITE')) {
    return NextResponse.json({ ok: false, error: 'FORBIDDEN' }, { status: 403 });
  }

  const formData       = await req.formData();
  const mensaje        = (formData.get('mensaje') as string)?.trim();
  const tipo           = (formData.get('tipo')    as string) || 'avance';
  const nuevoEstatus   = (formData.get('estatus') as string) || null;
  const presupuestoRaw = formData.get('presupuesto') as string | null;
  const presupuesto    = presupuestoRaw && presupuestoRaw.trim() !== '' ? parseFloat(presupuestoRaw) : null;
  const imagen         = formData.get('imagen') as File | null;

  if (!mensaje) {
    return NextResponse.json({ ok: false, message: 'El mensaje es requerido.' }, { status: 400 });
  }

  // Leer el seguimiento actual (necesitamos presupuestoEjecutado para sumar)
  const segActual = await prisma.seguimiento.findUnique({
    where: { id: params.id },
    include: { asamblea: { include: { fraccionamiento: true } } },
  });
  if (!segActual) return NextResponse.json({ ok: false }, { status: 404 });

  let imagenPath: string | null = null;
  if (imagen && imagen.size > 0) {
    const { randomUUID } = await import('crypto');
    const ext = imagen.name.split('.').pop() || 'jpg';
    imagenPath = `/uploads/seguimiento/${randomUUID()}.${ext}`;
  }

  const EMOJIS: Record<string, string> = {
    avance: '🔄', inicio: '🚀', completado: '✅',
    incidencia: '⚠️', presupuesto: '💰', foto: '📸',
  };
  const LABELS: Record<string, string> = {
    avance: 'Avance', inicio: 'Inicio de actividades',
    completado: 'Completado', incidencia: 'Incidencia',
    presupuesto: 'Asignación de presupuesto', foto: 'Evidencia fotográfica',
  };

  // ── TRANSACCIÓN INTERACTIVA (evita el bug NULL + number = NULL) ──────
  let segActualizado: any;

  await prisma.$transaction(async (tx) => {
    // 1. Crear la actualización
    await tx.actualizacionSeguimiento.create({
      data: {
        seguimientoId: params.id,
        autorId:   usuario.id,
        mensaje,
        imagenPath,
        presupuesto,
        tipo,
      },
    });

    // 2. Actualizar Seguimiento si hay cambios
    const hayActualizacion = nuevoEstatus || (presupuesto !== null && presupuesto > 0);
    if (hayActualizacion) {
      const updateData: any = {};
      if (nuevoEstatus) updateData.estatus = nuevoEstatus;

      if (presupuesto !== null && presupuesto > 0) {
        // ── FIX CRÍTICO: leer valor actual para evitar NULL + number = NULL ──
        // En PostgreSQL: NULL + 2000 = NULL — por eso increment falla si el campo es null
        const valorActual = segActual.presupuestoEjecutado ?? 0;
        updateData.presupuestoEjecutado = valorActual + presupuesto;
      }

      await tx.seguimiento.update({
        where: { id: params.id },
        data: updateData,
      });
    }

    // 3. Leer seguimiento actualizado para devolver al cliente
    segActualizado = await tx.seguimiento.findUnique({
      where: { id: params.id },
      select: {
        estatus: true,
        presupuestoTotal: true,
        presupuestoEjecutado: true,
      },
    });

    // 4. Post en el feed con imagen
    const emoji = EMOJIS[tipo] || '🔄';
    await tx.post.create({
      data: {
        fraccionamientoId: segActual.asamblea.fraccionamientoId,
        autorId: null,
        tipo: 'auto_seguimiento',
        titulo: `${emoji} Seguimiento: ${segActual.opcionNombre}`,
        contenido: [
          `📋 Actualización en problema priorizado:`,
          `🎯 ${segActual.opcionNombre} (Prioridad #${segActual.prioridad})`,
          ``,
          `${LABELS[tipo] || tipo}: ${mensaje}`,
          presupuesto && presupuesto > 0
            ? `💰 Monto registrado: $${presupuesto.toLocaleString('es-MX')} MXN`
            : '',
          nuevoEstatus ? `📌 Estatus actualizado: ${nuevoEstatus}` : '',
          ``,
          `Ver seguimiento completo en Histórico.`,
        ].filter(Boolean).join('\n').trim(),
        imagenPath,
        asambleaId: segActual.asambleaId,
        seguimientoId: params.id,
      },
    });
  });

  return NextResponse.json({ ok: true, segActualizado });
}
