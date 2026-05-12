/**
 * Cliente Groq para tareas de IA:
 *  - Resumen de asamblea deliberativa
 *  - Generación de texto para actas
 */

import Groq from 'groq-sdk';

function getClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY no está definido en .env');
  return new Groq({ apiKey });
}

const MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

export async function resumirAsamblea(
  tituloAsamblea: string,
  mensajes: { autor: string; texto: string; createdAt: Date }[]
): Promise<string> {
  if (mensajes.length === 0) return 'No se registraron intervenciones en la asamblea.';

  const transcripcion = mensajes
    .map((m) => `[${m.createdAt.toISOString()}] ${m.autor}: ${m.texto}`)
    .join('\n');

  const client = getClient();
  const completion = await client.chat.completions.create({
    model: MODEL,
    temperature: 0.3,
    messages: [
      {
        role: 'system',
        content: `Eres asistente del Instituto Estatal Electoral y de Participación Ciudadana de Nuevo León (IEEPCNL).
Tu tarea es generar un resumen claro y neutral de una asamblea vecinal deliberativa.
Lenguaje sencillo, en español de México. Usa formato:

PUNTOS PRINCIPALES DISCUTIDOS:
- ...

CONSENSOS / ACUERDOS DETECTADOS:
- ...

DESACUERDOS O TEMAS PENDIENTES:
- ...

ACCIONES SUGERIDAS PARA EL COMITÉ:
- ...

No inventes información que no esté en la transcripción. Si no hay consensos, dilo explícitamente.`,
      },
      {
        role: 'user',
        content: `Título: ${tituloAsamblea}\n\nTranscripción:\n\n${transcripcion}`,
      },
    ],
  });

  return completion.choices[0]?.message?.content ?? '(sin respuesta del modelo)';
}

export async function redactarAcuerdosActa(
  tituloProceso: string,
  resultados: Record<string, any>
): Promise<string> {
  const client = getClient();
  const completion = await client.chat.completions.create({
    model: MODEL,
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content: `Redactas la sección "ACUERDOS Y RESOLUTIVOS" de un acta vecinal estilo IEEPCNL.
Lenguaje formal mexicano, párrafos cortos, voz pasiva impersonal cuando sea pertinente.
Solo describe lo que ocurrió y los resultados; NO inventes datos.`,
      },
      {
        role: 'user',
        content: `Proceso: ${tituloProceso}\n\nResultados: ${JSON.stringify(resultados, null, 2)}\n\nRedacta el apartado de acuerdos del acta.`,
      },
    ],
  });

  return completion.choices[0]?.message?.content ?? '';
}
