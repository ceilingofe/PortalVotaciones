/* =============================================================
 * SEED — Datos iniciales de FórumNL
 *
 * Incluye:
 *  - Fraccionamiento "Las Lomas del Sur"
 *  - 220 viviendas
 *  - Tu número (+528132558755) como ADMIN + COMITÉ verificado
 *  - 18 vecinos ficticios verificados con likes/comentarios
 *  - 3 eventos abiertos:
 *      1. Elección de Mesa Directiva (3 planillas)
 *      2. Priorización de problemas (3 opciones)
 *      3. Asamblea Vecinal Deliberativa
 *  - Posts iniciales en el feed
 * ============================================================= */

import { PrismaClient, Rol, EstatusUsuario, EstatusAsamblea, TipoProceso, EstatusProceso, CategoriaReporte } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

// --- HELPERS ----------------------------------------------------

function randomFolio(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 12; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function hoursFromNow(hours: number): Date {
  const d = new Date();
  d.setHours(d.getHours() + hours);
  return d;
}

// --- DATOS DE PRUEBA -------------------------------------------

const NOMBRES_FICTICIOS = [
  'María Elena Hernández López',
  'Juan Carlos Ramírez Soto',
  'Ana Patricia Martínez Cruz',
  'Roberto Antonio Vega Morales',
  'Lucía Fernanda Gómez Ríos',
  'José Luis Castañeda Pérez',
  'Sofía Alejandra Domínguez Núñez',
  'Miguel Ángel Solís Bautista',
  'Daniela Esperanza Robles Tovar',
  'Fernando Iván Aguirre Salazar',
  'Carmen Beatriz Quintero Villanueva',
  'Eduardo Manuel Olvera Cantú',
  'Verónica Guadalupe Treviño Sandoval',
  'Pablo Sebastián Mendoza Garza',
  'Adriana Isabel Lozano Cárdenas',
  'Ricardo Alfonso Tijerina Reyes',
  'Mónica Rocío Garza Ibarra',
  'Hugo César Esparza Valdez',
];

const POSTS_FEED = [
  {
    titulo: '¡Inicia el proceso para elegir nuestra mesa directiva!',
    contenido:
      'Recordamos a toda la comunidad que el periodo de la mesa directiva vecinal terminó. Ya pueden votar por la planilla que mejor represente a Las Lomas del Sur. Tres planillas registradas, una persona por vivienda. Revisa la sección de Eventos.',
    tipo: 'auto_evento',
  },
  {
    titulo: 'Vota: ¿Qué problema debemos atender primero?',
    contenido:
      'Esta semana definimos colectivamente qué necesidad es más urgente en el fraccionamiento. Recuerda: tu prioridad principal vale 2 puntos y la secundaria vale 1 punto.',
    tipo: 'auto_evento',
  },
  {
    titulo: 'Reporte: encharcamientos en calle Roble',
    contenido:
      'Vecinos reportaron encharcamientos importantes durante las lluvias del fin de semana. Se está dando seguimiento a través de la siguiente votación de priorización.',
    tipo: 'manual',
  },
  {
    titulo: '🏞️ Mejoras al parque central — propuesta abierta',
    contenido:
      'La planilla "Vecindad Activa" propone rehabilitar juegos infantiles y canchas. Revisa los detalles en la sección Infórmate del evento.',
    tipo: 'manual',
  },
];

const COMENTARIOS_DEMO = [
  '¡Excelente iniciativa! Espero buena participación.',
  'Ya voté, súper fácil el proceso 👍',
  '¿A qué hora cierra la votación?',
  'Importante que todos participemos.',
  'Buena información, gracias por compartir.',
  '¿Habrá asamblea presencial también?',
  'Apoyo total a la propuesta de seguridad.',
];

// --- MAIN ------------------------------------------------------

async function main() {
  console.log('🌱 Iniciando seed...');

  // 1) Fraccionamiento --------------------------------------------------
  const fraccionamiento = await prisma.fraccionamiento.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      nombre: 'Las Lomas del Sur',
      municipio: 'Monterrey',
      estado: 'Nuevo León',
      totalViviendas: 220,
      avisoPrivacidad:
        'Los datos personales que proporciones (nombre, CURP, domicilio, fotografía e identificación) serán utilizados únicamente para verificar tu identidad como residente del fraccionamiento Las Lomas del Sur y permitirte participar en los procesos de votación y deliberación comunitaria. No se compartirán con terceros. Para más información consulta la política completa.',
    },
  });
  console.log(`✓ Fraccionamiento creado: ${fraccionamiento.nombre}`);

  // 2) 220 Viviendas ----------------------------------------------------
  const viviendas: { id: string; identificador: string }[] = [];
  for (let i = 1; i <= 220; i++) {
    const id = randomUUID();
    const ident = `Calle Roble #${i}`;
    viviendas.push({ id, identificador: ident });
  }

  await prisma.vivienda.createMany({
    data: viviendas.map((v) => ({
      id: v.id,
      fraccionamientoId: fraccionamiento.id,
      identificador: v.identificador,
    })),
    skipDuplicates: true,
  });
  console.log(`✓ 220 viviendas creadas`);

  // 3) Usuario ADMIN — tu número ---------------------------------------
  const adminUser = await prisma.usuario.upsert({
    where: { telefono: '+528132558755' },
    update: { rol: Rol.ADMIN, estatus: EstatusUsuario.VERIFICADO },
    create: {
      telefono: '+528132558755',
      nombreCompleto: 'Administrador IEEPCNL',
      curp: 'ADMI800101HNLDRM01',
      sexo: 'Hombre',
      domicilio: 'Calle Roble #1, Las Lomas del Sur',
      viviendaId: viviendas[0].id,
      rol: Rol.ADMIN,
      estatus: EstatusUsuario.VERIFICADO,
      fechaVerificacion: new Date(),
    },
  });
  console.log(`✓ Admin creado: ${adminUser.telefono}`);

  // 4) Usuario COMITÉ adicional ----------------------------------------
  const comiteUser = await prisma.usuario.upsert({
    where: { telefono: '+528111111111' },
    update: {},
    create: {
      telefono: '+528111111111',
      nombreCompleto: 'María Comité Moderador',
      curp: 'COMM800101MNLMTRA1',
      sexo: 'Mujer',
      domicilio: 'Calle Roble #2, Las Lomas del Sur',
      viviendaId: viviendas[1].id,
      rol: Rol.COMITE,
      estatus: EstatusUsuario.VERIFICADO,
      fechaVerificacion: new Date(),
    },
  });
  console.log(`✓ Comité creado`);

  // 5) 18 Vecinos ficticios --------------------------------------------
  const ficticios: any[] = [];
  for (let i = 0; i < NOMBRES_FICTICIOS.length; i++) {
    const telefono = `+5281000000${(i + 10).toString().padStart(2, '0')}`;
    const nombre = NOMBRES_FICTICIOS[i];
    const inicial = nombre.split(' ')[0].slice(0, 4).toUpperCase().padEnd(4, 'X');
    const curp = `${inicial}80${(i + 1).toString().padStart(4, '0')}${i % 2 === 0 ? 'H' : 'M'}NLXXX${i.toString().padStart(2, '0')}`;
    const user = await prisma.usuario.upsert({
      where: { telefono },
      update: {},
      create: {
        telefono,
        nombreCompleto: nombre,
        curp,
        sexo: i % 2 === 0 ? 'Hombre' : 'Mujer',
        domicilio: viviendas[i + 2].identificador + ', Las Lomas del Sur',
        viviendaId: viviendas[i + 2].id,
        rol: Rol.USUARIO,
        estatus: EstatusUsuario.VERIFICADO,
        fechaVerificacion: new Date(),
      },
    });
    ficticios.push(user);
  }
  console.log(`✓ ${ficticios.length} vecinos ficticios creados`);

  // 6) Posts iniciales del feed ----------------------------------------
  const posts: { id: string }[] = [];
  for (const p of POSTS_FEED) {
    const post = await prisma.post.create({
      data: {
        fraccionamientoId: fraccionamiento.id,
        autorId: p.tipo === 'auto_evento' ? null : ficticios[Math.floor(Math.random() * ficticios.length)].id,
        tipo: p.tipo,
        titulo: p.titulo,
        contenido: p.contenido,
      },
    });
    posts.push({ id: post.id });
  }
  console.log(`✓ ${posts.length} posts iniciales`);

  // Likes y comentarios distribuidos ------------------------------------
  for (const post of posts) {
    const numLikes = 4 + Math.floor(Math.random() * 10);
    const numComentarios = 1 + Math.floor(Math.random() * 4);
    const shuffled = [...ficticios].sort(() => Math.random() - 0.5);

    for (let i = 0; i < Math.min(numLikes, shuffled.length); i++) {
      await prisma.like.create({
        data: { postId: post.id, usuarioId: shuffled[i].id },
      }).catch(() => {});
    }
    for (let i = 0; i < numComentarios; i++) {
      const u = shuffled[i % shuffled.length];
      await prisma.comentario.create({
        data: {
          postId: post.id,
          usuarioId: u.id,
          contenido: COMENTARIOS_DEMO[Math.floor(Math.random() * COMENTARIOS_DEMO.length)],
        },
      });
    }
  }
  console.log(`✓ Likes y comentarios simulados`);

  // 7) EVENTO 1 — Elección de Mesa Directiva ---------------------------
  const asamblea1 = await prisma.asamblea.create({
    data: {
      fraccionamientoId: fraccionamiento.id,
      titulo: 'Elección de Mesa Directiva Vecinal 2026',
      descripcion:
        'Asamblea para elegir la nueva mesa directiva del fraccionamiento Las Lomas del Sur. Tres planillas registradas. Una persona representante por vivienda. Voto secreto.',
      fechaCierrePadron: hoursFromNow(-2),
      jornadaInicio: hoursFromNow(-1),
      jornadaFin: daysFromNow(7),
      lugarPresencial: 'Palapa del parque central, Las Lomas del Sur',
      reglas:
        'Cada vivienda registrada tiene derecho a un voto. La persona representante debe ser mayor de edad. Gana mayoría simple de votos válidos. El voto es secreto.',
      estatus: EstatusAsamblea.EN_JORNADA,
    },
  });

  const proceso1 = await prisma.proceso.create({
    data: {
      asambleaId: asamblea1.id,
      tipo: TipoProceso.ELECCION_PLANILLA,
      titulo: 'Elección de Mesa Directiva',
      descripcion: 'Elige una de las tres planillas. Tu voto es secreto.',
      orden: 1,
      estatus: EstatusProceso.ABIERTO,
    },
  });

  // 3 planillas con integrantes
  const planillas = [
    {
      nombre: 'Planilla A — Vecindad Activa',
      descripcion: 'Comunidad, transparencia y mejora de espacios.',
      infoMd: `**Propuesta principal:** Rehabilitar el parque central, instalar nuevos juegos infantiles y crear un comité juvenil.\n\n**Compromisos:**\n- Asambleas mensuales abiertas\n- Estado de cuenta público trimestral\n- Recolección de propuestas en buzón comunitario\n\n**Trayectoria:** Los integrantes han participado en comités escolares y de fraccionamiento previos.`,
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
      descripcion: 'Vigilancia, control de accesos y rondines.',
      infoMd: `**Propuesta principal:** Gestionar con autoridades municipales rondines de seguridad pública y mejorar la caseta de acceso vehicular.\n\n**Compromisos:**\n- Convenio formal con Seguridad Pública municipal\n- Cámaras adicionales en accesos\n- Protocolo de respuesta vecinal ante incidentes\n\n**Trayectoria:** Vinculación con autoridades de seguridad estatal y municipal.`,
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
      descripcion: 'Sustentabilidad, áreas verdes y convivencia.',
      infoMd: `**Propuesta principal:** Programa de reciclaje vecinal, reforestación de banquetas y huerto comunitario.\n\n**Compromisos:**\n- Centros de acopio mensuales\n- Talleres de cuidado del agua\n- Mejora de iluminación con LED\n\n**Trayectoria:** Integrantes con experiencia en proyectos ambientales escolares.`,
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
        procesoId: proceso1.id,
        nombre: p.nombre,
        descripcion: p.descripcion,
        infoMd: p.infoMd,
        orden: i + 1,
      },
    });
    for (const integ of p.integrantes) {
      await prisma.planillaIntegrante.create({
        data: { opcionId: opcion.id, puesto: integ.puesto, nombre: integ.nombre },
      });
    }
  }

  // Padrón: incluir admin + ficticios verificados
  const usuariosVerificados = [adminUser, comiteUser, ...ficticios];
  for (const u of usuariosVerificados) {
    if (!u.viviendaId) continue;
    await prisma.padronAsamblea.create({
      data: {
        asambleaId: asamblea1.id,
        viviendaId: u.viviendaId,
        usuarioId: u.id,
        folioAnonimo: randomFolio(),
      },
    }).catch(() => {});
  }
  // Asignar mesa
  await prisma.mesaOrganizadora.create({
    data: { asambleaId: asamblea1.id, usuarioId: comiteUser.id, rolMesa: 'responsable' },
  });
  console.log(`✓ Evento 1: Elección de Mesa Directiva con 3 planillas`);

  // 8) EVENTO 2 — Priorización -----------------------------------------
  const asamblea2 = await prisma.asamblea.create({
    data: {
      fraccionamientoId: fraccionamiento.id,
      titulo: 'Priorización de problemas comunitarios',
      descripcion:
        'Decidamos juntos qué problema atender primero. Cada vivienda elige una prioridad principal (2 puntos) y una secundaria (1 punto). El de mayor puntaje será el primero en gestionarse.',
      fechaCierrePadron: hoursFromNow(-2),
      jornadaInicio: hoursFromNow(-1),
      jornadaFin: daysFromNow(5),
      lugarPresencial: 'Palapa del parque central, Las Lomas del Sur',
      reglas:
        'Una vivienda emite un voto con dos selecciones (principal y secundaria). Principal = 2 puntos. Secundaria = 1 punto. No se puede repetir opción.',
      estatus: EstatusAsamblea.EN_JORNADA,
    },
  });

  const proceso2 = await prisma.proceso.create({
    data: {
      asambleaId: asamblea2.id,
      tipo: TipoProceso.PRIORIZACION_PUNTAJE,
      titulo: 'Priorización de problemas',
      descripcion: 'Selecciona tu prioridad principal y la secundaria.',
      orden: 1,
      estatus: EstatusProceso.ABIERTO,
    },
  });

  const opcionesPriorizacion = [
    {
      nombre: 'Seguridad pública: solicitud de rondines',
      descripcion: 'Solicitar a Seguridad Pública municipal rondines fuera del fraccionamiento.',
      infoMd: `**Problema:** Tres reportes vecinales y dos denuncias por asaltos en los últimos 60 días.\n\n**Evidencia:** Mapa de incidentes y horarios recurrentes.\n\n**Gestión inicial propuesta:** Oficio a Secretaría de Seguridad municipal con mapa de puntos y solicitud de rondines.\n\n**Tiempo estimado:** 5 días hábiles.`,
    },
    {
      nombre: 'Parque central: juegos infantiles y canchas',
      descripcion: 'Mejorar el parque central: pintura, reparación de juegos y canchas.',
      infoMd: `**Problema:** Juegos infantiles dañados, canchas con pintura deslavada y mallas rotas.\n\n**Evidencia:** Fotografías, cotizaciones preliminares, reporte de uso semanal.\n\n**Gestión inicial propuesta:** Plan interno de mantenimiento y solicitud de apoyo municipal o presupuesto participativo.\n\n**Tiempo estimado:** 20 días naturales.`,
    },
    {
      nombre: 'Agua y Drenaje: obras inconclusas',
      descripcion: 'Solicitar conclusión de obras de Agua y Drenaje detrás del fraccionamiento.',
      infoMd: `**Problema:** Encharcamientos y material suelto detrás del fraccionamiento por obras inconclusas.\n\n**Evidencia:** Fotografías, ubicación, testimonio de vecino accidentado.\n\n**Gestión inicial propuesta:** Reporte formal a Agua y Drenaje con folio, oficio y evidencia.\n\n**Tiempo estimado:** 7 días hábiles.`,
    },
  ];

  for (let i = 0; i < opcionesPriorizacion.length; i++) {
    await prisma.opcion.create({
      data: {
        procesoId: proceso2.id,
        nombre: opcionesPriorizacion[i].nombre,
        descripcion: opcionesPriorizacion[i].descripcion,
        infoMd: opcionesPriorizacion[i].infoMd,
        orden: i + 1,
      },
    });
  }
  for (const u of usuariosVerificados) {
    if (!u.viviendaId) continue;
    await prisma.padronAsamblea.create({
      data: {
        asambleaId: asamblea2.id,
        viviendaId: u.viviendaId,
        usuarioId: u.id,
        folioAnonimo: randomFolio(),
      },
    }).catch(() => {});
  }
  await prisma.mesaOrganizadora.create({
    data: { asambleaId: asamblea2.id, usuarioId: comiteUser.id, rolMesa: 'responsable' },
  });
  console.log(`✓ Evento 2: Priorización con 3 opciones`);

  // 9) EVENTO 3 — Asamblea Vecinal Deliberativa ------------------------
  const asamblea3 = await prisma.asamblea.create({
    data: {
      fraccionamientoId: fraccionamiento.id,
      titulo: 'Asamblea Vecinal: Reglas de uso del parque',
      descripcion:
        'Espacio de diálogo abierto para discutir y consensuar las reglas de uso del parque central: horarios, uso de canchas, mascotas y eventos.',
      fechaCierrePadron: hoursFromNow(-1),
      jornadaInicio: new Date(),
      jornadaFin: daysFromNow(3),
      lugarPresencial: 'Palapa del parque central, Las Lomas del Sur',
      reglas:
        'Cualquier vecino puede participar enviando mensajes durante el periodo activo. El comité moderará la discusión. Al cierre, se genera un resumen automático con IA que servirá de base para la toma de decisiones.',
      estatus: EstatusAsamblea.EN_JORNADA,
    },
  });
  await prisma.proceso.create({
    data: {
      asambleaId: asamblea3.id,
      tipo: TipoProceso.ASAMBLEA_DELIBERATIVA,
      titulo: 'Foro de discusión',
      descripcion: 'Comparte tu opinión sobre las reglas propuestas.',
      orden: 1,
      estatus: EstatusProceso.ABIERTO,
    },
  });
  await prisma.mesaOrganizadora.create({
    data: { asambleaId: asamblea3.id, usuarioId: comiteUser.id, rolMesa: 'moderador' },
  });

  // Mensajes simulados de discusión
  const mensajesDemo = [
    'Propongo que el horario sea de 6am a 10pm para evitar ruido en la madrugada.',
    'Apoyo el horario propuesto, pero pediría que los fines de semana se extienda a 11pm.',
    'Sobre las mascotas: deberían estar permitidas con correa siempre.',
    'Las canchas deberían tener un sistema de reservación por hora para evitar conflictos.',
    'Yo sugiero que los eventos privados (cumpleaños, etc.) requieran aviso previo al comité.',
    'Estoy de acuerdo con la reservación de canchas. ¿Podría ser por WhatsApp?',
  ];
  for (let i = 0; i < mensajesDemo.length; i++) {
    const u = ficticios[i % ficticios.length];
    await prisma.mensajeAsamblea.create({
      data: {
        asambleaId: asamblea3.id,
        usuarioId: u.id,
        contenido: mensajesDemo[i],
      },
    });
  }
  console.log(`✓ Evento 3: Asamblea Deliberativa con mensajes simulados`);

  // 10) Reportes ciudadanos de ejemplo -----------------------------------
  const reportes = [
    {
      categoria: CategoriaReporte.ALUMBRADO,
      titulo: 'Lámpara fundida en Calle Roble esquina con Pino',
      descripcion: 'La lámpara de la esquina lleva 3 días sin encender. La zona queda muy oscura por las noches.',
    },
    {
      categoria: CategoriaReporte.BANQUETAS,
      titulo: 'Banqueta levantada cerca de la entrada principal',
      descripcion: 'Una raíz de árbol levantó la banqueta y representa riesgo para adultos mayores.',
    },
    {
      categoria: CategoriaReporte.BASURA,
      titulo: 'Acumulación de basura en lote baldío',
      descripcion: 'El lote baldío frente al parque tiene acumulación de bolsas. Atrae fauna nociva.',
    },
  ];
  for (let i = 0; i < reportes.length; i++) {
    const r = reportes[i];
    await prisma.reporte.create({
      data: {
        fraccionamientoId: fraccionamiento.id,
        autorId: ficticios[i].id,
        categoria: r.categoria,
        titulo: r.titulo,
        descripcion: r.descripcion,
      },
    });
  }
  console.log(`✓ ${reportes.length} reportes ciudadanos de ejemplo`);

  console.log('\n🎉 Seed completado.');
  console.log('   Admin: +528132558755');
  console.log('   Comité: +528111111111');
  console.log(`   Vecinos ficticios: ${ficticios.length}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
