import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { prisma } from '@/lib/db/prisma';
import { usuarioActual } from '@/lib/auth/session';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const CONOCIMIENTO_IEEPCNL = `
KNOWLEDGE BASE — IEEPCNL AND COMMUNITY ELECTORAL PROCESSES:

WHAT IS IEEPCNL: Instituto Estatal Electoral y de Participacion Ciudadana de Nuevo Leon. Organizes LOCAL elections in Nuevo Leon and promotes civic participation. INE = federal; IEEPCNL = state/local.

PARTICIPATION MECHANISMS: Consulta Ciudadana, Consulta Popular, Iniciativa Popular, Revocacion de Mandato, Presupuesto Participativo, Contralorias Sociales.

VOTING PROCESS STAGES: Convocatoria (announcement) → Padron (voter list) → Opciones (options/planillas) → Socializacion → Jornada (voting day) → Computo (count) → Acta y publicacion → Seguimiento.

MESA DIRECTIVA ELECTION: One vote per registered housing unit. Candidates must live in the fraccionamiento. Positions: Presidencia, Secretaria, Tesoreria, Vocalia Seguridad, Vocalia Mantenimiento. Method: secret ballot by planilla, simple majority wins.

PRIORITIZATION: 2 points for main priority, 1 point for secondary. Results ordered by total points. Follow-up created per problem.

MINIMUM TRUST CRITERIA: Legality, clarity, verifiable voter list, equal information, impartiality, VOTE SECRECY (nobody can know how an individual voted), auditable count, publication, follow-up.

GLOSSARY: Acta=meeting record, Boleta=ballot, Padron=voter registry, Quorum=minimum attendance, Deliberacion=structured dialogue, Seguimiento=monitoring execution of agreements.

CASE: Fraccionamiento Las Lomas del Sur, 220 viviendas, south Monterrey NL. Processes: mesa directiva election + problem prioritization (2pts/1pt system).
`;

async function obtenerContexto(fraccionamientoId: string) {
  const [fracc, abiertas, cerradas, seguimientos] = await Promise.all([
    prisma.fraccionamiento.findUnique({ where: { id: fraccionamientoId }, select: { nombre: true, municipio: true } }),
    prisma.asamblea.findMany({
      where: { fraccionamientoId, estatus: { in: ['EN_JORNADA','PADRON_ABIERTO','PUBLICADA'] } },
      include: { procesos: { include: { opciones: { include: { integrantes: true } }, _count: { select: { votos: true } } } }, _count: { select: { padron: true } } },
    }),
    prisma.asamblea.findMany({
      where: { fraccionamientoId, estatus: { in: ['CERRADA','CON_ACTA'] } },
      include: { procesos: { include: { opciones: true, votos: true } }, _count: { select: { padron: true } } },
      orderBy: { jornadaFin: 'desc' }, take: 3,
    }),
    prisma.seguimiento.findMany({ where: { asamblea: { fraccionamientoId } }, orderBy: [{ asambleaId:'asc' },{prioridad:'asc'}], take: 10 }),
  ]);

  let ctx = `\nCURRENT STATUS: ${fracc?.nombre}, ${fracc?.municipio}\n`;
  if (abiertas.length) {
    ctx += '\nACTIVE VOTING PROCESSES:\n';
    for (const a of abiertas) {
      const p = a.procesos[0];
      ctx += `- "${a.titulo}" | Participation: ${p?._count?.votos??0}/${a._count.padron}\n`;
      if (p?.tipo==='ELECCION_PLANILLA') for (const op of p.opciones) {
        ctx += `  Planilla: ${op.nombre} — ${op.descripcion.slice(0,60)}\n`;
        if (op.integrantes?.length) ctx += `  Members: ${op.integrantes.map((i:any)=>`${i.puesto}: ${i.nombre}`).join(', ')}\n`;
      }
      else if (p?.tipo==='PRIORIZACION_PUNTAJE') ctx += `  Options: ${p.opciones.map((o:any)=>o.nombre).join(', ')}\n`;
    }
  }
  if (cerradas.length) {
    ctx += '\nRECENT RESULTS (AGGREGATED, NEVER INDIVIDUAL):\n';
    for (const a of cerradas) {
      const p = a.procesos[0]; if (!p) continue;
      if (p.tipo==='ELECCION_PLANILLA') {
        const c:Record<string,{n:string;v:number}>={};
        p.opciones.forEach((o:any)=>{c[o.id]={n:o.nombre,v:0};});
        p.votos.forEach((v:any)=>{const id=(v.contenido as any)?.opcionId; if(id&&c[id]) c[id].v++;});
        const d=Object.values(c).sort((a,b)=>b.v-a.v);
        ctx += `- "${a.titulo}": winner ${d[0]?.n} with ${d[0]?.v} votes\n`;
      } else if (p.tipo==='PRIORIZACION_PUNTAJE') {
        const pts:Record<string,{n:string;p:number}>={};
        p.opciones.forEach((o:any)=>{pts[o.id]={n:o.nombre,p:0};});
        p.votos.forEach((v:any)=>{const c=v.contenido as any; if(c?.principal&&pts[c.principal]) pts[c.principal].p+=2; if(c?.secundaria&&pts[c.secundaria]) pts[c.secundaria].p+=1;});
        const d=Object.values(pts).sort((a,b)=>b.p-a.p);
        ctx += `- "${a.titulo}" priorities: ${d.map((x,i)=>`${i+1}. ${x.n}(${x.p}pts)`).join(', ')}\n`;
      }
    }
  }
  if (seguimientos.length) {
    ctx += '\nPROBLEM FOLLOW-UP:\n';
    for (const s of seguimientos) ctx += `  ${s.prioridad}. ${s.opcionNombre}: ${s.estatus}${s.presupuestoEjecutado&&s.presupuestoEjecutado>0?` | Spent: $${s.presupuestoEjecutado.toLocaleString('es-MX')}`:''}\n`;
  }
  return ctx;
}

// Instrucciones de idioma según lo detectado en el cliente
function instruccionesIdioma(idioma: string): string {
  if (idioma === 'english') {
    return `
!!!! LANGUAGE OVERRIDE — HIGHEST PRIORITY !!!!
The user is writing in ENGLISH. You MUST respond ONLY in ENGLISH.
Do NOT use Spanish. Do NOT mix languages.
Your ENTIRE response must be in English.
This overrides all other instructions.
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!`;
  }
  if (idioma === 'nahuatl') {
    return `
!!!! INSTRUCCION DE IDIOMA — MAXIMA PRIORIDAD !!!!
El usuario esta escribiendo en NAHUATL. Responde en Nahuatl en la medida de lo posible.
Usa vocabulario nahuatl (tlen, quemah, cualli, tlein, nochi, etc.) mezclado con español cuando
no conozcas el termino exacto en nahuatl. Se respetuoso y accesible.
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!`;
  }
  // spanish (default)
  return `
!!!! INSTRUCCION DE IDIOMA !!!! 
El usuario esta escribiendo en ESPANOL. Responde UNICAMENTE en espanol mexicano.
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!`;
}

export async function POST(req: NextRequest) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ ok: false }, { status: 401 });
  if (!usuario.vivienda) return NextResponse.json({ ok: false }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const mensaje:  string = body.mensaje?.trim() ?? '';
  const historial: { role: 'user'|'assistant'; content: string }[] = body.historial ?? [];
  // idioma detectado en el cliente — 'spanish' | 'english' | 'nahuatl'
  const idioma: string = body.idioma ?? 'spanish';

  if (!mensaje) return NextResponse.json({ ok: false }, { status: 400 });

  const contextoBD = await obtenerContexto(usuario.vivienda.fraccionamientoId);
  const primerNombre = usuario.nombreCompleto.split(' ')[0];

  // La instrucción de idioma va PRIMERO en el system prompt — máxima prioridad
  const systemPrompt = `${instruccionesIdioma(idioma)}

You are ForumBot, the official digital assistant of ForumNL (IEEPCNL platform) for Fraccionamiento Las Lomas del Sur.
You are speaking with ${primerNombre} (${usuario.nombreCompleto}).

${CONOCIMIENTO_IEEPCNL}

${contextoBD}

FORMAT (CRITICAL):
- Maximum 2-3 short sentences. One sentence if the question is simple.
- NO emojis.
- Never start with filler phrases like "Of course!", "Sure!", "Claro que si!".
- Be direct and concise.

CAPABILITIES:
- Explain IEEPCNL functions and participation mechanisms
- Describe planillas: names, members, proposals
- Give AGGREGATE results only (totals, percentages, winner — NEVER individual votes)
- Explain problem prioritization and follow-up status
- Define electoral terms and guide participation

STRICTLY FORBIDDEN:
- Revealing how any specific individual voted
- Associating any person with their vote
- The vote is SECRET and INVIOLABLE — explain this if asked`;

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 180,
      temperature: 0.5,
      messages: [
        { role: 'system', content: systemPrompt },
        ...historial.slice(-8),
        { role: 'user', content: mensaje },
      ],
    });
    const respuesta = completion.choices[0]?.message?.content ?? 'Could not generate a response. Please try again.';
    return NextResponse.json({ ok: true, respuesta });
  } catch {
    const fallback = idioma === 'english'
      ? 'Connection error. Please try again in a moment.'
      : 'Error de conexion. Intenta en unos momentos.';
    return NextResponse.json({ ok: true, respuesta: fallback });
  }
}
