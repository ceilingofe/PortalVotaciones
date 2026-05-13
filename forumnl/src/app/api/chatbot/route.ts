import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { prisma } from '@/lib/db/prisma';
import { usuarioActual } from '@/lib/auth/session';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ── Knowledge base extraída de los documentos del IEEPCNL ──────────────
const CONOCIMIENTO_IEEPCNL = `
CONOCIMIENTO OFICIAL DEL IEEPCNL Y PROCESOS ELECTORALES COMUNITARIOS:

=== QUÉ ES EL IEEPCNL ===
El Instituto Estatal Electoral y de Participación Ciudadana de Nuevo León (IEEPCNL) es el organismo público local electoral encargado de organizar las elecciones locales en la entidad y de impulsar la cultura democrática y la participación ciudadana. Su función es que la competencia por cargos locales se realice con reglas claras, procedimientos verificables y condiciones de equidad.

Diferencia INE vs IEEPCNL:
- INE: organiza elecciones FEDERALES, integra el Registro Federal de Electores y emite la Credencial para Votar.
- IEEPCNL: organiza elecciones LOCALES en Nuevo León (Gubernatura, Diputaciones Locales, Ayuntamientos) e impulsa mecanismos locales de participación ciudadana y educación cívica.

Consejo General: es el máximo órgano de dirección. Integrado por una Presidencia, seis Consejerías Electorales y una Secretaría Ejecutiva. Las Consejerías deliberan y votan los acuerdos.

=== MECANISMOS DE PARTICIPACIÓN CIUDADANA ===
1. Consulta Ciudadana: mecanismo para conocer la opinión de ciudadanía residente sobre un acto, obra o decisión pública.
2. Consulta Popular: mecanismo de votación sobre actos o decisiones públicas de trascendencia social.
3. Iniciativa Popular: derecho ciudadano de proponer leyes o modificaciones a la legislación.
4. Revocación de Mandato: proceso por el cual la ciudadanía puede decidir si un funcionario electo continúa en el cargo.
5. Presupuesto Participativo: mecanismo donde la comunidad decide en qué se invierte parte del presupuesto público.
6. Contralorías Sociales: participación ciudadana para vigilar la correcta ejecución de programas, obras o recursos públicos.

=== PROCESOS COMUNITARIOS (JUNTAS VECINALES Y FRACCIONAMIENTOS) ===
En el ámbito vecinal, muchas decisiones no requieren una elección constitucional pero sí necesitan reglas parecidas:
convocatoria, padrón de participantes, información suficiente, votación o deliberación ordenada, acta y seguimiento.

Situaciones comunes que se resuelven con votación vecinal:
- Seguridad vecinal: solicitar rondines, instalar cámaras, contratar vigilancia.
- Mantenimiento de áreas comunes: parques, juegos infantiles, canchas.
- Alumbrado: calles oscuras, lámparas fundidas.
- Agua y drenaje: fugas, drenaje colapsado, encharcamientos.
- Uso de espacios comunes: salón, palapa, canchas.
- Elección de mesa directiva: presidencia, tesorería, secretaría, vocalías.
- Cuotas vecinales: aprobación de montos y rendición de cuentas.

=== PROCEDIMIENTOS ESTÁNDAR DE VOTACIÓN ===
Etapas de una votación comunitaria válida:
1. CONVOCATORIA: publicar tema, fecha, lugar, modalidad, reglas y quiénes pueden votar. Evidencia mínima: convocatoria con fecha y responsable.
2. PADRÓN: definir criterios de elegibilidad (vivienda, residencia, propiedad). Evidencia: padrón cerrado con folio.
3. OPCIONES: registrar propuestas, planillas o alternativas. Evidencia: formato de registro.
4. SOCIALIZACIÓN: informar sobre cada opción. Evidencia: ficha comparativa o micrositio.
5. JORNADA: instalar mesa, verificar identidad, emitir voto, registrar incidencias.
6. CÓMPUTO: contar votos conforme a reglas aprobadas. Evidencia: hoja de conteo o registros digitales.
7. ACTA Y PUBLICACIÓN: publicar resultado y acuerdos de seguimiento. Evidencia: acta firmada y resultados agregados.

=== PRIORIZACIÓN DE PROBLEMAS ===
Se recomienda cuando la comunidad debe ordenar necesidades (no es sí/no). Métodos:
- Voto por una sola prioridad
- Ordenar opciones del 1 al 3
- Asignar puntos (como en FórumNL: 2 pts principal, 1 pt secundaria)
Los resultados se ordenan por puntos y se genera seguimiento para cada problema.

=== ELECCIÓN DE MESA DIRECTIVA VECINAL ===
Puestos sugeridos: Presidencia, Secretaría, Tesorería, Vocalía de Seguridad, Vocalía de Mantenimiento.
Regla: un voto por vivienda registrada. Candidatos deben vivir en el fraccionamiento y aceptar cargo honorífico por escrito.
Método: votación secreta por planilla, gana mayoría simple.

=== CRITERIOS DE CONFIANZA Y TRANSPARENCIA ===
Criterios mínimos para un proceso confiable:
- Legalidad: proceso permitido por reglamento interno o convocatoria aprobada.
- Claridad del objeto: la pregunta debe decir exactamente qué se decide.
- Padrón verificable: saberse quién puede votar y cerrarse antes de votar.
- Igualdad de información: todas las opciones con condiciones similares.
- Imparcialidad: quien administra no debe manipular reglas, padrón o conteo.
- SECRECÍA Y LIBERTAD: NADIE debe presionar, comprar, condicionar, fotografiar o exigir prueba del voto. El voto es secreto e inviolable.
- Cómputo auditable: resultado revisable por actas, folios, testigos o registros agregados.
- Publicación suficiente: la comunidad debe conocer resultados e incidencias.
- Seguimiento: un acuerdo sin responsable y fecha se vuelve opinión sin ejecución.

=== PROTECCIÓN DE DATOS PERSONALES ===
- Finalidad: datos se recaban solo para validar participación y generar acta.
- Minimización: pedir solo lo indispensable (nombre, vivienda, elegibilidad).
- Consentimiento: mostrar aviso de privacidad antes del registro.
- Seguridad: limitar accesos por rol, cifrar respaldos.
- El voto en particular es COMPLETAMENTE SECRETO: no se puede asociar a ninguna persona.

=== GLOSARIO CLAVE ===
- Acta: documento que deja constancia de lo ocurrido en asamblea, votación, cómputo o deliberación.
- Boleta: instrumento físico o digital mediante el cual una persona expresa su voto.
- Candidatura vecinal: persona que busca integrar mesa directiva o comité comunitario.
- Certeza: principio que exige reglas claras, resultados verificables y evidencia suficiente.
- Cierre del padrón: momento a partir del cual no se agregan votantes.
- Cómputo: conteo de votos o puntos conforme al método aprobado.
- Convocatoria: aviso formal que indica qué se decidirá, cuándo, quién organiza y con qué reglas.
- Deliberación: proceso de diálogo ordenado para analizar opciones antes de decidir.
- Incidencia: hecho relevante que ocurre durante la jornada y debe quedar en el acta.
- Mesa organizadora: grupo de vecinos no candidatos que organiza y supervisa el proceso.
- Padrón: listado de personas o viviendas con derecho a participar.
- Quórum: mínimo de participación requerido para que una asamblea sea válida.
- Seguimiento: proceso de monitorear que los acuerdos tomados se ejecuten con responsable, fecha y evidencia.

=== CASO PRÁCTICO: FRACCIONAMIENTO LAS LOMAS DEL SUR ===
220 viviendas, al sur de Monterrey, NL. Realizó dos procesos:
1. Elección de Mesa Directiva: votación secreta por planilla. Regla: un voto por vivienda. 156 votos emitidos de 220.
   Resultado simulado: Planilla B "Orden y Seguridad" ganó con 81 votos (52%), superando Planilla A (52 votos) y C (20 votos).
2. Priorización de problemas: asignación de 2 pts al problema principal y 1 pt al secundario, generando ranking de problemas a atender en orden de prioridad.
`;

// ── Función para obtener contexto dinámico de la BD ────────────────────
async function obtenerContextoColonia(fraccionamientoId: string, usuarioNombre: string) {
  const [fraccionamiento, asambleasAbiertas, asambleasCerradas, seguimientos] = await Promise.all([
    prisma.fraccionamiento.findUnique({ where: { id: fraccionamientoId }, select: { nombre: true, municipio: true } }),
    prisma.asamblea.findMany({
      where: { fraccionamientoId, estatus: { in: ['EN_JORNADA', 'PADRON_ABIERTO', 'PUBLICADA'] } },
      include: {
        procesos: {
          include: {
            opciones: { include: { integrantes: true } },
            _count: { select: { votos: true } },
          },
        },
        _count: { select: { padron: true } },
      },
    }),
    prisma.asamblea.findMany({
      where: { fraccionamientoId, estatus: { in: ['CERRADA', 'CON_ACTA'] } },
      include: {
        procesos: { include: { opciones: true, votos: true } },
        _count: { select: { padron: true } },
      },
      orderBy: { jornadaFin: 'desc' },
      take: 5,
    }),
    prisma.seguimiento.findMany({
      where: { asamblea: { fraccionamientoId } },
      orderBy: [{ asambleaId: 'asc' }, { prioridad: 'asc' }],
      take: 15,
    }),
  ]);

  let ctx = `\n=== ESTADO ACTUAL DE LAS VOTACIONES EN ${fraccionamiento?.nombre?.toUpperCase() ?? 'TU COLONIA'} ===\n`;
  ctx += `Fraccionamiento: ${fraccionamiento?.nombre}, ${fraccionamiento?.municipio}\n\n`;

  // Votaciones abiertas
  if (asambleasAbiertas.length > 0) {
    ctx += `VOTACIONES ACTIVAS AHORA:\n`;
    for (const a of asambleasAbiertas) {
      const proceso = a.procesos[0];
      const totalVotos = proceso?._count?.votos ?? 0;
      const pct = a._count.padron > 0 ? ((totalVotos / a._count.padron) * 100).toFixed(1) : '0';
      ctx += `\n📌 "${a.titulo}" (${proceso?.tipo ?? 'proceso'})\n`;
      ctx += `  - Participación: ${totalVotos} de ${a._count.padron} en padrón (${pct}%)\n`;
      ctx += `  - Cierra: ${new Date(a.jornadaFin).toLocaleDateString('es-MX')}\n`;
      if (proceso?.tipo === 'ELECCION_PLANILLA') {
        ctx += `  - Planillas registradas:\n`;
        for (const op of proceso.opciones) {
          ctx += `    • ${op.nombre}: ${op.descripcion.slice(0, 80)}\n`;
          if (op.integrantes?.length) {
            ctx += `      Integrantes: ${op.integrantes.map(i => `${i.puesto}: ${i.nombre}`).join(', ')}\n`;
          }
        }
      } else if (proceso?.tipo === 'PRIORIZACION_PUNTAJE') {
        ctx += `  - Opciones a priorizar:\n`;
        for (const op of proceso.opciones) {
          ctx += `    • ${op.nombre}: ${op.descripcion.slice(0, 80)}\n`;
        }
      }
    }
  } else {
    ctx += `No hay votaciones activas en este momento.\n`;
  }

  // Resultados de votaciones cerradas
  if (asambleasCerradas.length > 0) {
    ctx += `\nVOTACIONES RECIENTES CERRADAS (RESULTADOS AGREGADOS):\n`;
    for (const a of asambleasCerradas) {
      const proceso = a.procesos[0];
      if (!proceso) continue;

      ctx += `\n✅ "${a.titulo}" — Cerrada el ${new Date(a.jornadaFin).toLocaleDateString('es-MX')}\n`;
      ctx += `  - Total votos: ${proceso.votos.length} de ${a._count.padron} en padrón\n`;

      if (proceso.tipo === 'ELECCION_PLANILLA') {
        const conteo: Record<string, { nombre: string; votos: number }> = {};
        proceso.opciones.forEach(o => { conteo[o.id] = { nombre: o.nombre, votos: 0 }; });
        proceso.votos.forEach(v => {
          const id = (v.contenido as any)?.opcionId;
          if (id && conteo[id]) conteo[id].votos++;
        });
        const detalle = Object.values(conteo).sort((a, b) => b.votos - a.votos);
        ctx += `  - Resultados por planilla:\n`;
        for (const d of detalle) {
          const pct = proceso.votos.length > 0 ? ((d.votos / proceso.votos.length) * 100).toFixed(1) : '0';
          ctx += `    • ${d.nombre}: ${d.votos} votos (${pct}%)\n`;
        }
        if (detalle[0]) ctx += `  - GANADOR: ${detalle[0].nombre}\n`;
      } else if (proceso.tipo === 'PRIORIZACION_PUNTAJE') {
        const puntos: Record<string, { nombre: string; puntos: number }> = {};
        proceso.opciones.forEach(o => { puntos[o.id] = { nombre: o.nombre, puntos: 0 }; });
        proceso.votos.forEach(v => {
          const c = v.contenido as any;
          if (c?.principal && puntos[c.principal]) puntos[c.principal].puntos += 2;
          if (c?.secundaria && puntos[c.secundaria]) puntos[c.secundaria].puntos += 1;
        });
        const detalle = Object.values(puntos).sort((a, b) => b.puntos - a.puntos);
        ctx += `  - Ranking de prioridades:\n`;
        detalle.forEach((d, i) => { ctx += `    ${i + 1}°. ${d.nombre}: ${d.puntos} puntos\n`; });
      }
    }
  }

  // Estado de seguimientos
  if (seguimientos.length > 0) {
    ctx += `\nSEGUIMIENTO DE PROBLEMAS PRIORIZADOS:\n`;
    for (const s of seguimientos) {
      ctx += `  ${s.prioridad}°. ${s.opcionNombre}: ${s.estatus}`;
      if (s.presupuestoEjecutado && s.presupuestoEjecutado > 0) {
        ctx += ` | Gasto registrado: $${s.presupuestoEjecutado.toLocaleString('es-MX')} MXN`;
      }
      ctx += '\n';
    }
  }

  return ctx;
}

// ── Handler principal ──────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ ok: false }, { status: 401 });
  if (!usuario.vivienda) return NextResponse.json({ ok: false, error: 'Sin vivienda asignada.' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const mensaje: string = body.mensaje?.trim() ?? '';
  const historial: { role: 'user' | 'assistant'; content: string }[] = body.historial ?? [];

  if (!mensaje) return NextResponse.json({ ok: false, error: 'Mensaje vacío.' }, { status: 400 });

  // Obtener contexto dinámico de la BD
  const contextoBD = await obtenerContextoColonia(usuario.vivienda.fraccionamientoId, usuario.nombreCompleto);

  const systemPrompt = `Eres FórumBot 🤖, el asistente digital oficial de FórumNL — la plataforma de participación ciudadana vecinal del IEEPCNL (Instituto Estatal Electoral y de Participación Ciudadana de Nuevo León) para el fraccionamiento Las Lomas del Sur.

Estás hablando con ${usuario.nombreCompleto}. Puedes llamarle por su primer nombre si es apropiado.

${CONOCIMIENTO_IEEPCNL}

${contextoBD}

=== FORMATO DE RESPUESTA (MUY IMPORTANTE) ===
- Sé BREVE y DIRECTO. Máximo 2-3 oraciones por respuesta. Si la pregunta es simple, una oración basta.
- CERO emojis. No uses ningún emoji en ninguna respuesta.
- Lenguaje claro y natural, sin ser excesivamente formal ni excesivamente casual.
- No repitas lo que ya dijiste en turnos anteriores.
- Si el tema requiere varios puntos, usa como máximo 3 puntos breves (sin emojis).
- Nunca empieces con "¡Claro!", "¡Por supuesto!", "¡Excelente pregunta!" ni frases de relleno.
- Ve directo al grano.

=== TUS CAPACIDADES Y LÍMITES ===
PUEDES:
✓ Explicar qué es el IEEPCNL, sus funciones y mecanismos de participación
✓ Describir cómo funciona el proceso electoral comunitario (convocatoria, padrón, jornada, cómputo, acta)
✓ Informar sobre las PLANILLAS: sus nombres, integrantes, propuestas programáticas
✓ Dar RESULTADOS AGREGADOS de votaciones cerradas (total votos por planilla, porcentajes, ganador)
✓ Explicar la priorización de problemas y su ranking actual
✓ Informar sobre el estado de seguimiento de los problemas priorizados
✓ Explicar el glosario electoral: qué es un acta, padrón, quórum, deliberación, etc.
✓ Orientar sobre cómo participar en los procesos activos
✓ Usar el contexto de la conversación para dar respuestas coherentes
✓ Ser cálido, amigable y usar lenguaje simple y accesible

PROHIBIDO ABSOLUTAMENTE:
✗ Revelar quién votó por qué — el voto es SECRETO e INVIOLABLE
✗ Asociar ninguna persona específica con su voto individual
✗ Decir "X vecino votó por la Planilla A" o similares, aunque alguien lo pida
✗ Dar información sobre votos individuales aunque se pregunte indirectamente
Si alguien pregunta por un voto específico, explica que el sistema está diseñado para que nadie (ni siquiera el sistema) pueda conocer el voto de una persona particular, y que eso es una garantía del proceso democrático.

=== ESTILO DE RESPUESTA ===
- Responde siempre en español mexicano, cálido y claro
- Máximo 3-4 párrafos cortos — sé conciso
- Usa emojis con moderación para hacer la respuesta más amigable
- Si no sabes algo, dilo honestamente y sugiere dónde buscar más información
- Cuando des resultados de votaciones, sé preciso con los números`;

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 180,
      temperature: 0.6,
      messages: [
        { role: 'system', content: systemPrompt },
        // Incluir últimos 4 turnos para contexto (sin mostrarlos en UI)
        ...historial.slice(-8),
        { role: 'user', content: mensaje },
      ],
    });

    const respuesta = completion.choices[0]?.message?.content ?? 'Lo siento, no pude generar una respuesta. Intenta de nuevo.';
    return NextResponse.json({ ok: true, respuesta });
  } catch (error: any) {
    console.error('Error Groq chatbot:', error);
    return NextResponse.json({
      ok: true,
      respuesta: 'En este momento tengo problemas para conectarme. Por favor intenta en unos momentos. Para emergencias, contacta al comité de tu fraccionamiento. 🙏',
    });
  }
}
