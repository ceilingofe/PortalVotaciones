import { prisma } from '@/lib/db/prisma';
import { usuarioActual } from '@/lib/auth/session';
import { ReportesCliente } from './ReportesCliente';

export default async function ReportesPage() {
  const usuario = await usuarioActual();
  if (!usuario?.vivienda) return null;

  const reportes = await prisma.reporte.findMany({
    where: { fraccionamientoId: usuario.vivienda.fraccionamientoId },
    orderBy: { createdAt: 'desc' },
    take: 30,
    include: { autor: { select: { nombreCompleto: true } } },
  });

  return (
    <ReportesCliente
      reportesIniciales={reportes.map((r) => ({
        id: r.id,
        categoria: r.categoria,
        titulo: r.titulo,
        descripcion: r.descripcion,
        imagenPath: r.imagenPath,
        ubicacionLat: r.ubicacionLat,
        ubicacionLng: r.ubicacionLng,
        estatus: r.estatus,
        autor: r.autor.nombreCompleto,
        createdAt: r.createdAt.toISOString(),
      }))}
    />
  );
}
