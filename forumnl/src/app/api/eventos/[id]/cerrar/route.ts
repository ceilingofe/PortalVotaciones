import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { usuarioActual } from '@/lib/auth/session';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

function parseContenido(raw: unknown): Record<string, unknown> {
  if (raw == null) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, unknown>;
  if (typeof raw === 'string') { try { return JSON.parse(raw); } catch { return {}; } }
  return {};
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  // ── Siempre devolver JSON válido — el try/catch envuelve TODO ──
  try {
    const usuario = await usuarioActual();
    if (!usuario || (usuario.rol !== 'ADMIN' && usuario.rol !== 'COMITE')) {
      return NextResponse.json({ ok: false, error: 'FORBIDDEN' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const incidencias: string = body.incidencias?.trim() ?? '';

    const asamblea = await prisma.asamblea.findUnique({
      where: { id: params.id },
      include: {
        fraccionamiento: true,
        procesos: {
          include: {
            opciones: true,
            votos:    true,
          },
        },
        _count: { select: { padron: true } },
      },
    });

    if (!asamblea) {
      return NextResponse.json({ ok: false, error: 'NOT_FOUND' }, { status: 404 });
    }
    if (asamblea.estatus === 'CON_ACTA' || asamblea.estatus === 'CERRADA') {
      return NextResponse.json({ ok: false, error: 'YA_CERRADA' }, { status: 400 });
    }

    // ─────────────────────────────────────────────────────────────
    // PASO 1: Operaciones de BD en una transacción RÁPIDA
    //         SIN llamadas externas (Groq se hace después)
    // ─────────────────────────────────────────────────────────────
    const datosAsamblea: {
      esDeliberativa: boolean;
      asambleaId: string;
      procesoId: string;
      transcripcion: string;
    } = { esDeliberativa: false, asambleaId: asamblea.id, procesoId: '', transcripcion: '' };

    await prisma.$transaction(async (tx) => {
      for (const proceso of asamblea.procesos) {

        // ── Elección o Sí/No ─────────────────────────────────────
        if (proceso.tipo === 'ELECCION_PLANILLA' || proceso.tipo === 'SI_NO') {
          const conteo: Record<string, number> = {};
          proceso.opciones.forEach(o => { conteo[o.id] = 0; });

          for (const v of proceso.votos) {
            const c = parseContenido(v.contenido);
            if (c.tipo === 'nulo') continue;
            const id = c.opcionId as string | undefined;
            if (id && id in conteo) conteo[id]++;
          }

          const ordenadas = proceso.opciones
            .map(o => ({ ...o, votos: conteo[o.id] ?? 0 }))
            .sort((a, b) => b.votos - a.votos);
          const ganador = ordenadas[0];
          const total   = proceso.votos.length;

          await tx.post.create({
            data: {
              fraccionamientoId: asamblea.fraccionamientoId,
              autorId:   null,
              tipo:      'auto_resultado',
              titulo:    `Resultado: ${proceso.titulo}`,
              contenido: [
                `La votacion "${proceso.titulo}" ha cerrado.`,
                ganador && total > 0
                  ? `Resultado: ${ganador.nombre} con ${ganador.votos} de ${total} votos (${((ganador.votos / total) * 100).toFixed(1)}%).`
                  : 'Sin votos registrados.',
                incidencias ? `Incidencias: ${incidencias}` : '',
              ].filter(Boolean).join('\n'),
              asambleaId: asamblea.id,
            },
          });
        }

        // ── Priorización ─────────────────────────────────────────
        if (proceso.tipo === 'PRIORIZACION_PUNTAJE') {
          const puntos: Record<string, number> = {};
          proceso.opciones.forEach(o => { puntos[o.id] = 0; });

          for (const v of proceso.votos) {
            const c = parseContenido(v.contenido);
            if (c.tipo === 'nulo') continue;
            const ppal = c.principal  as string | undefined;
            const sec  = c.secundaria as string | undefined;
            if (ppal && ppal in puntos) puntos[ppal] += 2;
            if (sec  && sec  in puntos) puntos[sec]  += 1;
          }

          const ordenadas = proceso.opciones
            .map(o => ({ ...o, puntos: puntos[o.id] ?? 0 }))
            .sort((a, b) => b.puntos - a.puntos);

          for (let i = 0; i < ordenadas.length; i++) {
            const op  = ordenadas[i];
            const seg = await tx.seguimiento.create({
              data: {
                asambleaId:   asamblea.id,
                opcionNombre: op.nombre,
                opcionId:     op.id,
                prioridad:    i + 1,
                puntos:       op.puntos,
                estatus:      'pendiente',
              },
            });
            await tx.actualizacionSeguimiento.create({
              data: {
                seguimientoId: seg.id,
                mensaje: `Problema registrado como prioridad #${i + 1} con ${op.puntos} puntos en la votacion.`,
                tipo:    'inicio',
              },
            });
          }

          const ranking = ordenadas
            .map((o, i) => `${i + 1}. ${o.nombre} — ${o.puntos} pts`)
            .join('\n');

          await tx.post.create({
            data: {
              fraccionamientoId: asamblea.fraccionamientoId,
              autorId:   null,
              tipo:      'auto_resultado',
              titulo:    `Priorizacion cerrada: ${proceso.titulo}`,
              contenido: `La priorizacion cerro con ${proceso.votos.length} participantes.\n\nRanking:\n${ranking}\n\nEl seguimiento esta disponible en Historico.`,
              asambleaId: asamblea.id,
            },
          });
        }

        // ── Asamblea deliberativa — recopilar datos para Groq ─────
        if (proceso.tipo === 'ASAMBLEA_DELIBERATIVA') {
          datosAsamblea.esDeliberativa = true;
          datosAsamblea.procesoId      = proceso.id;

          const mensajes = await tx.mensajeAsamblea.findMany({
            where:   { asambleaId: asamblea.id },
            orderBy: { createdAt: 'asc' },
            include: { usuario: { select: { nombreCompleto: true } } },
          });

          datosAsamblea.transcripcion = mensajes
            .map(m => `${(m as any).esAnonimo ? 'Vecino anonimo' : m.usuario.nombreCompleto}: ${m.contenido}`)
            .join('\n');

          // Guardar acta preliminar — Groq la enriquece en el Paso 2
          await tx.actaAsamblea.upsert({
            where:  { procesoId: proceso.id },
            create: {
              procesoId: proceso.id,
              resultados: {
                resumen:       'Generando resumen...',
                acuerdos:      'Procesando...',
                incidencias:   incidencias || 'Sin incidencias.',
                totalMensajes: mensajes.length,
                participantes: [...new Set(mensajes.map(m =>
                  (m as any).esAnonimo ? 'Vecino anonimo' : m.usuario.nombreCompleto
                ))],
              },
            },
            update: {
              resultados: {
                resumen:       'Generando resumen...',
                acuerdos:      'Procesando...',
                incidencias:   incidencias || 'Sin incidencias.',
                totalMensajes: mensajes.length,
                participantes: [...new Set(mensajes.map(m =>
                  (m as any).esAnonimo ? 'Vecino anonimo' : m.usuario.nombreCompleto
                ))],
              },
            },
          });
        }

        // Marcar proceso como CON_ACTA
        await tx.proceso.update({
          where: { id: proceso.id },
          data:  { estatus: 'CON_ACTA' },
        });
      }

      // Registrar incidencia
      if (incidencias) {
        await tx.incidenciaAsamblea.create({
          data: { asambleaId: asamblea.id, descripcion: incidencias, reportadoPor: usuario.id },
        });
      }

      // Cerrar asamblea
      await tx.asamblea.update({
        where: { id: asamblea.id },
        data:  { estatus: 'CON_ACTA' },
      });
    });

    // ─────────────────────────────────────────────────────────────
    // PASO 2: Llamar a Groq FUERA de la transacción
    //         Si falla, el cierre ya ocurrió — no afecta al usuario
    // ─────────────────────────────────────────────────────────────
    if (datosAsamblea.esDeliberativa && datosAsamblea.transcripcion) {
      // Fire-and-forget con un timeout de seguridad
      const groqPromise = (async () => {
        try {
          const prompt = `Eres secretario de asamblea vecinal. Con la transcripcion siguiente, genera un acta.
Responde UNICAMENTE con JSON valido (sin markdown, sin backticks, sin texto extra):
{"resumen":"3-5 oraciones sobre los temas discutidos","acuerdos":"lista de acuerdos, uno por linea"}

TRANSCRIPCION:
${datosAsamblea.transcripcion.slice(0, 3500)}`;

          const completion = await groq.chat.completions.create({
            model:       'llama-3.3-70b-versatile',
            max_tokens:  500,
            temperature: 0.3,
            messages: [{ role: 'user', content: prompt }],
          });

          const raw     = completion.choices[0]?.message?.content ?? '';
          const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();

          let parsed: { resumen?: string; acuerdos?: string } = {};
          try { parsed = JSON.parse(cleaned); } catch { parsed = { resumen: cleaned.slice(0, 800) }; }

          // Actualizar el acta con el contenido de Groq
          const actaActual = await prisma.actaAsamblea.findUnique({
            where: { procesoId: datosAsamblea.procesoId },
          });
          if (actaActual) {
            const actual = (actaActual.resultados as Record<string, unknown>) ?? {};
            await prisma.actaAsamblea.update({
              where: { procesoId: datosAsamblea.procesoId },
              data: {
                resultados: {
                  ...actual,
                  resumen:  parsed.resumen  ?? 'Sin resumen.',
                  acuerdos: parsed.acuerdos ?? 'Sin acuerdos.',
                },
              },
            });
          }
        } catch (err) {
          console.error('[cerrar] Groq falló (no crítico):', err);
        }
      })();

      // No esperamos a Groq — respondemos al cliente ya
      groqPromise.catch(() => {}); // silenciar unhandled rejection
    }

    // ── Siempre respondemos JSON válido ───────────────────────────
    return NextResponse.json({ ok: true });

  } catch (err: any) {
    console.error('[cerrar] Error inesperado:', err);
    // Garantizar que SIEMPRE se devuelve JSON válido
    return NextResponse.json(
      { ok: false, message: err?.message ?? 'Error interno al cerrar la asamblea.' },
      { status: 500 }
    );
  }
}
