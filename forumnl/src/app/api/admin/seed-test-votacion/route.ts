import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { usuarioActual } from '@/lib/auth/session';
import { EstatusAsamblea, EstatusProceso, TipoProceso } from '@prisma/client';

function randomFolio(): string {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 12 }, () => c[Math.floor(Math.random() * c.length)]).join('');
}

export async function POST() {
  const usuario = await usuarioActual();
  if (!usuario || usuario.rol !== 'ADMIN') {
    return NextResponse.json({ ok: false, error: 'SOLO_ADMIN' }, { status: 403 });
  }
  if (!usuario.vivienda) return NextResponse.json({ ok: false }, { status: 400 });

  const fraccionamientoId = usuario.vivienda.fraccionamientoId;
  const ahora = new Date();
  const en7dias = new Date(ahora.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Crear asamblea de prueba
  const asamblea = await prisma.asamblea.create({
    data: {
      fraccionamientoId,
      titulo: `[PRUEBA] Elección de Mesa Directiva — ${ahora.toLocaleDateString('es-MX')}`,
      descripcion: 'Votación de prueba creada desde el panel admin. Puede resetearse o borrarse después.',
      reglas: 'Una vivienda, un voto. El voto es secreto. Gana la planilla con mayoría simple.',
      fechaCierrePadron: ahora,
      jornadaInicio: ahora,
      jornadaFin: en7dias,
      lugarPresencial: 'Palapa del parque central, Las Lomas del Sur',
      estatus: EstatusAsamblea.EN_JORNADA,
    },
  });

  const proceso = await prisma.proceso.create({
    data: {
      asambleaId: asamblea.id,
      tipo: TipoProceso.ELECCION_PLANILLA,
      titulo: 'Elección de Mesa Directiva',
      descripcion: 'Elige una de las tres planillas. Tu voto es secreto.',
      orden: 1,
      estatus: EstatusProceso.ABIERTO,
    },
  });

  // Planillas con imágenes apuntando a los archivos del usuario
  const planillas = [
    {
      nombre: 'Planilla A — Vecindad Activa',
      descripcion: 'Comunidad, transparencia y mejora de espacios comunes.',
      infoMd: `## Propuesta principal\nRehabilitación del parque central, nuevos juegos infantiles y comité juvenil.\n\n## Compromisos\n- Asambleas mensuales abiertas\n- Estado de cuenta público trimestral\n- Buzón comunitario de propuestas`,
      imagenPath: '/images/planillas/vecindad-activa.jpg',
      integrantes: [
        { puesto: 'Presidencia', nombre: 'Laura Camarena Quintero' },
        { puesto: 'Secretaría', nombre: 'Roberto Vega Morales' },
        { puesto: 'Tesorería', nombre: 'Ana Cruz Hernández' },
        { puesto: 'Vocalía de Seguridad', nombre: 'Miguel Solís Bautista' },
        { puesto: 'Vocalía de Mantenimiento', nombre: 'Sofía Domínguez Núñez' },
      ],
    },
    {
      nombre: 'Planilla B — Orden y Seguridad',
      descripcion: 'Vigilancia, control de accesos y rondines permanentes.',
      infoMd: `## Propuesta principal\nConvenio formal con Seguridad Pública municipal para rondines y mejora de la caseta de acceso.\n\n## Compromisos\n- Cámaras adicionales en accesos\n- Protocolo de respuesta vecinal\n- Directorio de emergencias actualizado`,
      imagenPath: '/images/planillas/orden-seguridad.jpg',
      integrantes: [
        { puesto: 'Presidencia', nombre: 'Fernando Aguirre Salazar' },
        { puesto: 'Secretaría', nombre: 'Carmen Quintero Villanueva' },
        { puesto: 'Tesorería', nombre: 'Eduardo Olvera Cantú' },
        { puesto: 'Vocalía de Seguridad', nombre: 'Hugo Esparza Valdez' },
        { puesto: 'Vocalía de Mantenimiento', nombre: 'Mónica Garza Ibarra' },
      ],
    },
    {
      nombre: 'Planilla C — Comunidad Verde',
      descripcion: 'Sustentabilidad, áreas verdes y convivencia vecinal.',
      infoMd: `## Propuesta principal\nPrograma de reciclaje vecinal, reforestación de banquetas y huerto comunitario.\n\n## Compromisos\n- Centros de acopio mensuales\n- Talleres de ahorro de agua\n- Mejora de iluminación con LED`,
      imagenPath: '/images/planillas/comunidad-verde.jpg',
      integrantes: [
        { puesto: 'Presidencia', nombre: 'Adriana Lozano Cárdenas' },
        { puesto: 'Secretaría', nombre: 'Pablo Mendoza Garza' },
        { puesto: 'Tesorería', nombre: 'Verónica Treviño Sandoval' },
        { puesto: 'Vocalía de Seguridad', nombre: 'Ricardo Tijerina Reyes' },
        { puesto: 'Vocalía de Mantenimiento', nombre: 'Daniela Robles Tovar' },
      ],
    },
  ];

  for (let i = 0; i < planillas.length; i++) {
    const p = planillas[i];
    const opcion = await prisma.opcion.create({
      data: {
        procesoId: proceso.id,
        nombre: p.nombre,
        descripcion: p.descripcion,
        infoMd: p.infoMd,
        imagenPath: p.imagenPath,
        orden: i + 1,
      },
    });
    for (const integ of p.integrantes) {
      await prisma.planillaIntegrante.create({
        data: { opcionId: opcion.id, puesto: integ.puesto, nombre: integ.nombre },
      });
    }
  }

  // Agregar mesa
  await prisma.mesaOrganizadora.create({
    data: { asambleaId: asamblea.id, usuarioId: usuario.id, rolMesa: 'responsable' },
  });

  // Padrón completo
  const verificados = await prisma.usuario.findMany({
    where: { estatus: 'VERIFICADO', vivienda: { fraccionamientoId } },
    select: { id: true, viviendaId: true },
  });
  for (const u of verificados) {
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

  // Post en feed
  await prisma.post.create({
    data: {
      fraccionamientoId,
      autorId: null,
      tipo: 'auto_evento',
      titulo: '🗳️ [PRUEBA] Nueva elección de Mesa Directiva',
      contenido: 'Se ha creado una votación de prueba para elección de Mesa Directiva. Consulta la sección de Eventos para participar.',
      asambleaId: asamblea.id,
    },
  });

  return NextResponse.json({ ok: true, asambleaId: asamblea.id });
}
