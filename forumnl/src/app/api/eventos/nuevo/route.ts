import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { usuarioActual } from '@/lib/auth/session';
import { TipoProceso, EstatusAsamblea, EstatusProceso } from '@prisma/client';
import { randomUUID } from 'crypto';

function randomFolio(): string {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 12 }, () => c[Math.floor(Math.random() * c.length)]).join('');
}

export async function POST(req: NextRequest) {
  const usuario = await usuarioActual();
  if (!usuario || (usuario.rol !== 'ADMIN' && usuario.rol !== 'COMITE')) {
    return NextResponse.json({ ok: false, error: 'FORBIDDEN' }, { status: 403 });
  }
  if (!usuario.vivienda) return NextResponse.json({ ok: false, error: 'SIN_VIVIENDA' }, { status: 400 });

  const body = await req.json();
  const { tipo, titulo, descripcion, reglas, jornadaInicio, jornadaFin, lugarPresencial, planillas, opciones, reportesIds } = body;

  if (!tipo || !titulo || !jornadaInicio || !jornadaFin) {
    return NextResponse.json({ ok: false, message: 'Faltan datos obligatorios.' }, { status: 400 });
  }

  const fraccionamientoId = usuario.vivienda.fraccionamientoId;

  // Crear asamblea
  const asamblea = await prisma.asamblea.create({
    data: {
      fraccionamientoId,
      titulo,
      descripcion: descripcion || '',
      reglas: reglas || '',
      fechaCierrePadron: new Date(jornadaInicio),
      jornadaInicio: new Date(jornadaInicio),
      jornadaFin: new Date(jornadaFin),
      lugarPresencial: lugarPresencial || null,
      estatus: EstatusAsamblea.EN_JORNADA,
    },
  });

  // Crear proceso
  const proceso = await prisma.proceso.create({
    data: {
      asambleaId: asamblea.id,
      tipo: tipo as TipoProceso,
      titulo,
      descripcion: descripcion || '',
      orden: 1,
      estatus: EstatusProceso.ABIERTO,
    },
  });

  // Agregar al moderador como mesa
  await prisma.mesaOrganizadora.create({
    data: { asambleaId: asamblea.id, usuarioId: usuario.id, rolMesa: 'responsable' },
  });

  // Crear opciones según tipo
  if (tipo === 'ELECCION_PLANILLA' && planillas?.length) {
    for (let i = 0; i < planillas.length; i++) {
      const p = planillas[i];
      const opcion = await prisma.opcion.create({
        data: {
          procesoId: proceso.id,
          nombre: p.nombre,
          descripcion: p.descripcion || '',
          infoMd: p.infoMd || '',
          orden: i + 1,
        },
      });
      if (p.integrantes?.length) {
        for (const integ of p.integrantes) {
          if (integ.nombre && integ.puesto) {
            await prisma.planillaIntegrante.create({
              data: { opcionId: opcion.id, puesto: integ.puesto, nombre: integ.nombre },
            });
          }
        }
      }
    }
  }

  if (tipo === 'PRIORIZACION_PUNTAJE') {
    if (reportesIds?.length) {
      // Importar desde reportes
      const reportesEncontrados = await prisma.reporte.findMany({
        where: { id: { in: reportesIds } },
      });
      for (let i = 0; i < reportesEncontrados.length; i++) {
        const r = reportesEncontrados[i];
        await prisma.opcion.create({
          data: {
            procesoId: proceso.id,
            nombre: r.titulo,
            descripcion: r.descripcion,
            infoMd: `**Categoría:** ${r.categoria}\n\n${r.descripcion}`,
            orden: i + 1,
          },
        });
        // Marcar reporte como convertido a votación
        await prisma.reporte.update({
          where: { id: r.id },
          data: { estatus: 'CONVERTIDO_A_VOTACION', convertidoEnProceso: proceso.id },
        });
      }
    } else if (opciones?.length) {
      for (let i = 0; i < opciones.length; i++) {
        const o = opciones[i];
        await prisma.opcion.create({
          data: {
            procesoId: proceso.id,
            nombre: o.nombre,
            descripcion: o.descripcion || '',
            infoMd: o.infoMd || '',
            orden: i + 1,
          },
        });
      }
    }
  }

  // Agregar padrón automáticamente con todos los usuarios verificados del fraccionamiento
  const usuariosVerificados = await prisma.usuario.findMany({
    where: {
      estatus: 'VERIFICADO',
      vivienda: { fraccionamientoId },
    },
    select: { id: true, viviendaId: true },
  });

  for (const u of usuariosVerificados) {
    if (!u.viviendaId) continue;
    await prisma.padronAsamblea.create({
      data: {
        asambleaId: asamblea.id,
        viviendaId: u.viviendaId,
        usuarioId: u.id,
        folioAnonimo: randomFolio(),
      },
    }).catch(() => {});
  }

  // Publicar post anunciando el nuevo evento
  const emojiTipo = tipo === 'ELECCION_PLANILLA' ? '🗳️' : tipo === 'PRIORIZACION_PUNTAJE' ? '📊' : '💬';
  await prisma.post.create({
    data: {
      fraccionamientoId,
      autorId: null,
      tipo: 'auto_evento',
      titulo: `${emojiTipo} Nuevo proceso: ${titulo}`,
      contenido: `Se ha abierto una nueva votación en tu comunidad.\n\n📌 ${titulo}\n\n${descripcion || ''}\n\n¡Participa y haz que tu voz cuente! Encuentra este proceso en la sección de Eventos.`,
      asambleaId: asamblea.id,
    },
  });

  return NextResponse.json({ ok: true, asambleaId: asamblea.id });
}
