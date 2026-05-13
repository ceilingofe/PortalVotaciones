import { prisma } from '@/lib/db/prisma';
import { usuarioActual } from '@/lib/auth/session';
import Link from 'next/link';
import { Plus, FlaskConical } from 'lucide-react';
import { CalendarioEventos } from './CalendarioEventos';
import { TestVotacionBtn } from './TestVotacionBtn';

export default async function EventosPage() {
  const usuario = await usuarioActual();
  if (!usuario?.vivienda) return null;

  const esAdmin = usuario.rol === 'ADMIN';
  const esModerador = usuario.rol === 'ADMIN' || usuario.rol === 'COMITE';

  // Eventos abiertos (EN_JORNADA)
  const abiertas = await prisma.asamblea.findMany({
    where: {
      fraccionamientoId: usuario.vivienda.fraccionamientoId,
      estatus: { in: ['EN_JORNADA', 'PADRON_ABIERTO', 'PUBLICADA'] },
    },
    include: {
      procesos: { include: { _count: { select: { votos: true } } } },
      _count: { select: { padron: true } },
    },
    orderBy: { jornadaInicio: 'asc' },
  });

  // Cerradas — solo para admin/comité
  const cerradas = esModerador
    ? await prisma.asamblea.findMany({
        where: {
          fraccionamientoId: usuario.vivienda.fraccionamientoId,
          estatus: { in: ['CERRADA', 'CON_ACTA'] },
        },
        include: {
          procesos: { include: { _count: { select: { votos: true } } } },
          _count: { select: { padron: true } },
        },
        orderBy: { jornadaFin: 'desc' },
        take: 5,
      })
    : [];

  const eventosSerializados = [...abiertas, ...cerradas].map((a) => ({
    id: a.id,
    titulo: a.titulo,
    descripcion: a.descripcion,
    tipo: a.procesos[0]?.tipo ?? 'OTRO',
    estatus: a.estatus,
    jornadaInicio: a.jornadaInicio.toISOString(),
    jornadaFin: a.jornadaFin.toISOString(),
    totalPadron: a._count.padron,
    totalVotos: a.procesos[0]?._count?.votos ?? 0,
    esModerador,
    esAdmin,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Eventos</h1>
          <p className="text-sm text-[#6B7280]">Votaciones y asambleas de tu fraccionamiento</p>
        </div>
        {esModerador && (
          <div className="flex gap-2 flex-wrap justify-end">
            {esAdmin && <TestVotacionBtn />}
            <Link href="/eventos/nuevo" className="btn-yellow btn-sm">
              <Plus className="w-4 h-4" /> Crear evento
            </Link>
          </div>
        )}
      </div>

      {/* Calendario + tarjetas */}
      <CalendarioEventos eventos={eventosSerializados} />
    </div>
  );
}
