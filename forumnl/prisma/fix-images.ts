/**
 * Script para vincular imágenes a las opciones/planillas existentes.
 *
 * Ejecutar con:
 *   npx tsx prisma/fix-images.ts
 *
 * Asegúrate de tener las imágenes en public/images/ antes de correrlo.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Mapa: fragmento del nombre de la opción → ruta de imagen
// Ajusta estos nombres si tus opciones tienen nombres diferentes
const IMAGEN_POR_NOMBRE: Record<string, string> = {
  // Planillas de la elección de mesa directiva
  'vecindad activa':    '/images/planillas/vecindad-activa.jpg',
  'orden y seguridad':  '/images/planillas/orden-seguridad.jpg',
  'comunidad verde':    '/images/planillas/comunidad-verde.jpg',

  // Opciones de priorización
  'seguridad pública':  '/images/problemas/seguridad.jpg',
  'parque central':     '/images/problemas/parque.jpg',
  'agua y drenaje':     '/images/problemas/agua-drenaje.jpg',
  'agua':               '/images/problemas/agua-drenaje.jpg',

  // Eventos / asambleas (para usar como banner si se agrega ese campo)
  'mesa directiva':     '/images/eventos/mesa-directiva.jpg',
  'priorización':       '/images/eventos/priorizacion.jpg',
  'asamblea':           '/images/eventos/asamblea.jpg',
};

async function main() {
  console.log('🔄 Actualizando imágenes en opciones...\n');

  const opciones = await prisma.opcion.findMany({
    select: { id: true, nombre: true, imagenPath: true },
  });

  let actualizadas = 0;
  for (const o of opciones) {
    const nombreLower = o.nombre.toLowerCase();
    let imagen: string | null = null;

    for (const [fragment, path] of Object.entries(IMAGEN_POR_NOMBRE)) {
      if (nombreLower.includes(fragment)) {
        imagen = path;
        break;
      }
    }

    if (imagen && imagen !== o.imagenPath) {
      await prisma.opcion.update({ where: { id: o.id }, data: { imagenPath: imagen } });
      console.log(`  ✓ "${o.nombre}" → ${imagen}`);
      actualizadas++;
    }
  }

  console.log(`\n✅ ${actualizadas} opciones actualizadas.`);
  if (actualizadas === 0) {
    console.log('   (ningún nombre coincidió — verifica que los nombres del mapa correspondan a tus opciones)');
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
