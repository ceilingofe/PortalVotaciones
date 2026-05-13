import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { usuarioActual } from '@/lib/auth/session';
import { resumirAsamblea, redactarAcuerdosActa } from '@/lib/groq/groq';
import { createHash } from 'crypto';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const usuario = await usuarioActual();
  if (!usuario || (usuario.rol !== 'ADMIN' && usuario.rol !== 'COMITE')) {
    return NextResponse.json({ ok: false, error: 'FORBIDDEN' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const incidenciasTexto: string = body.incidencias || '';

  const asamblea = await prisma.asamblea.findUnique({
    where: { id: params.id },
    include: {
      procesos: { include: { opciones: true, votos: true } },
      mensajes: {
        orderBy: { createdAt: 'asc' },
        include: { usuario: { select: { nombreCompleto: true, rol: true } } },
      },
      fraccionamiento: true,
    },
  });

  if (!asamblea) return NextResponse.json({ ok: false, error: 'NOT_FOUND' }, { status: 404 });
  if (asamblea.estatus === 'CERRADA' || asamblea.estatus === 'CON_ACTA') {
    return NextResponse.json({ ok: false, error: 'YA_CERRADA' }, { status: 400 });
  }

  // ── ASAMBLEA DELIBERATIVA: Groq genera el acta ────────────────
  const esDeliberativa = asamblea.procesos.some(p => p.tipo === 'ASAMBLEA_DELIBERATIVA');

  if (esDeliberativa) {
    const proceso = asamblea.procesos.find(p => p.tipo === 'ASAMBLEA_DELIBERATIVA')!;
    const participantes = [...new Set(asamblea.mensajes.map(m => m.usuario.nombreCompleto))];

    let resumen = '(Sin mensajes registrados en la asamblea.)';
    let acuerdos = '(Sin acuerdos detectados.)';

    try {
      // Llamar Groq para el resumen
      resumen = await resumirAsamblea(
        asamblea.titulo,
        asamblea.mensajes.map((m) => ({
          autor: m.usuario.nombreCompleto,
          texto: m.contenido,
          createdAt: m.createdAt,
        }))
      );

      // Llamar Groq para los acuerdos formales
      acuerdos = await redactarAcuerdosActa(asamblea.titulo, { resumen, totalMensajes: asamblea.mensajes.length });
    } catch (e) {
      console.error('Error Groq al generar acta:', e);
      resumen = 'Error al generar el resumen automático. Por favor redacta manualmente.';
      acuerdos = 'Error al generar los acuerdos. Por favor redacta manualmente.';
    }

    const resultados = {
      tipo: 'deliberativa',
      resumen,
      acuerdos,
      participantes,
      totalMensajes: asamblea.mensajes.length,
      incidencias: incidenciasTexto || null,
    };

    await prisma.$transaction(async (tx) => {
      await tx.proceso.update({ where: { id: proceso.id }, data: { estatus: 'CON_ACTA' } });

      // Guardar en Acta el resumen para el PDF
      await tx.acta.create({
        data: {
          procesoId: proceso.id,
          pdfPath: `/actas/deliberativa-${proceso.id}.pdf`, // generado on-demand
          hashSha256: createHash('sha256').update(resumen).digest('hex'),
          resultados,
        },
      });

      if (incidenciasTexto) {
        await tx.incidencia.create({
          data: { asambleaId: asamblea.id, tipo: 'incidencia_jornada', descripcion: incidenciasTexto },
        });
      }

      await tx.asamblea.update({ where: { id: params.id }, data: { estatus: 'CON_ACTA' } });

      // Post en el feed
      await tx.post.create({
        data: {
          fraccionamientoId: asamblea.fraccionamientoId,
          autorId: null,
          tipo: 'auto_resultado',
          titulo: `💬 Asamblea concluida: ${asamblea.titulo}`,
          contenido: [
            `La asamblea vecinal "${asamblea.titulo}" ha sido cerrada.`,
            ``,
            `📊 Participaron: ${participantes.length} vecinos`,
            `📝 Mensajes: ${asamblea.mensajes.length}`,
            ``,
            `El acta oficial con el resumen y los acuerdos está disponible en Histórico.`,
          ].join('\n'),
          asambleaId: asamblea.id,
        },
      });
    });

    return NextResponse.json({ ok: true });
  }

  // ── ELECCION / PRIORIZACION: lógica existente ─────────────────
  const resumenLineas: string[] = [];

  await prisma.$transaction(async (tx) => {
    for (const proceso of asamblea.procesos) {
      if (proceso.tipo === 'PRIORIZACION_PUNTAJE') {
        const puntos: Record<string, number> = {};
        proceso.opciones.forEach((o) => (puntos[o.id] = 0));
        proceso.votos.forEach((v) => {
          const c = v.contenido as any;
          if (c?.principal && puntos[c.principal] !== undefined) puntos[c.principal] += 2;
          if (c?.secundaria && puntos[c.secundaria] !== undefined) puntos[c.secundaria] += 1;
        });
        const opcionesOrdenadas = [...proceso.opciones].sort((a, b) => (puntos[b.id] ?? 0) - (puntos[a.id] ?? 0));
        const emojis = ['🥇', '🥈', '🥉'];
        resumenLineas.push('📊 Priorización:');
        for (let i = 0; i < opcionesOrdenadas.length; i++) {
          const op = opcionesOrdenadas[i];
          const pts = puntos[op.id] ?? 0;
          const emoji = emojis[i] ?? `${i + 1}°`;
          resumenLineas.push(`${emoji} ${op.nombre}: ${pts} pts`);
          const seg = await tx.seguimiento.create({
            data: {
              asambleaId: asamblea.id,
              opcionNombre: op.nombre,
              opcionId: op.id,
              prioridad: i + 1,
              puntos: pts,
              estatus: 'pendiente',
            },
          });
          await tx.actualizacionSeguimiento.create({
            data: {
              seguimientoId: seg.id,
              autorId: null,
              mensaje: `Registrado como prioridad #${i + 1} con ${pts} puntos según votación vecinal.`,
              tipo: 'inicio',
            },
          });
        }
      } else if (proceso.tipo === 'ELECCION_PLANILLA') {
        const conteo: Record<string, number> = {};
        proceso.opciones.forEach((o) => (conteo[o.id] = 0));
        proceso.votos.forEach((v) => {
          const id = (v.contenido as any)?.opcionId;
          if (id && conteo[id] !== undefined) conteo[id]++;
        });
        const total = proceso.votos.length;
        const detalle = proceso.opciones
          .map((o) => ({ nombre: o.nombre, votos: conteo[o.id], pct: total > 0 ? ((conteo[o.id] / total) * 100).toFixed(1) : '0.0' }))
          .sort((a, b) => b.votos - a.votos);
        detalle.forEach((d) => resumenLineas.push(`• ${d.nombre}: ${d.votos} votos (${d.pct}%)`));
        if (detalle[0]) resumenLineas.push(`🏆 Ganador: ${detalle[0].nombre}`);
      }
      await tx.proceso.update({ where: { id: proceso.id }, data: { estatus: 'CON_ACTA' } });
    }

    if (incidenciasTexto) {
      await tx.incidencia.create({
        data: { asambleaId: asamblea.id, tipo: 'incidencia_jornada', descripcion: incidenciasTexto },
      });
    }
    await tx.asamblea.update({ where: { id: params.id }, data: { estatus: 'CON_ACTA' } });

    const totalVotos = asamblea.procesos.reduce((s, p) => s + p.votos.length, 0);
    await tx.post.create({
      data: {
        fraccionamientoId: asamblea.fraccionamientoId,
        autorId: null,
        tipo: 'auto_resultado',
        titulo: `📣 Resultados: ${asamblea.titulo}`,
        contenido: [
          `Se cerraron las votaciones de "${asamblea.titulo}".`,
          '', '📊 Resultados:', ...resumenLineas, '',
          `Total participantes: ${totalVotos} votos`,
          incidenciasTexto ? `⚠️ Incidencias registradas.` : '',
          '', 'Las actas y seguimiento están en Histórico.',
        ].filter(Boolean).join('\n').trim(),
        asambleaId: asamblea.id,
      },
    });
  });

  return NextResponse.json({ ok: true });
}
