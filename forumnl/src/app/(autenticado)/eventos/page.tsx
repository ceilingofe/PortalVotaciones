import { prisma } from '@/lib/db/prisma';
import { usuarioActual } from '@/lib/auth/session';
import Link from 'next/link';
import { Vote, Info, MessageSquare, Plus, Clock, Users } from 'lucide-react';

export default async function EventosPage() {
  const usuario = await usuarioActual();
  if (!usuario?.vivienda) return null;

  const asambleas = await prisma.asamblea.findMany({
    where: {
      fraccionamientoId: usuario.vivienda.fraccionamientoId,
      estatus: { in: ['EN_JORNADA', 'PADRON_ABIERTO', 'PUBLICADA'] },
    },
    include: {
      procesos: { include: { _count: { select: { opciones: true, votos: true } } } },
      _count: { select: { padron: true } },
    },
    orderBy: { jornadaFin: 'asc' },
  });

  const puedeCrear = usuario.rol === 'ADMIN' || usuario.rol === 'COMITE';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Eventos vigentes</h1>
          <p className="text-sm text-ieepc-gray">Procesos abiertos en tu fraccionamiento</p>
        </div>
        {puedeCrear && (
          <Link href="/eventos/nuevo" className="btn-yellow">
            <Plus className="w-4 h-4" /> Crear evento
          </Link>
        )}
      </div>

      {asambleas.length === 0 && (
        <div className="card p-8 text-center text-ieepc-gray">No hay eventos vigentes en este momento.</div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {asambleas.map((a) => {
          const proceso = a.procesos[0];
          const tipo = proceso?.tipo ?? 'OTRO';
          const horasRestantes = Math.max(0, Math.round((a.jornadaFin.getTime() - Date.now()) / 3600000));

          return (
            <article key={a.id} className="card p-5 flex flex-col">
              <div className="flex items-start justify-between gap-3 mb-2">
                <span className={`badge ${
                  tipo === 'ASAMBLEA_DELIBERATIVA' ? 'badge-yellow' : 'badge-success'
                }`}>
                  {tipo === 'ELECCION_PLANILLA' ? '🗳️ Elección' :
                   tipo === 'PRIORIZACION_PUNTAJE' ? '📊 Priorización' :
                   tipo === 'ASAMBLEA_DELIBERATIVA' ? '💬 Asamblea' : 'Votación'}
                </span>
                <span className="text-xs text-ieepc-gray flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {horasRestantes}h
                </span>
              </div>

              <h2 className="font-semibold text-lg mb-1">{a.titulo}</h2>
              <p className="text-sm text-ieepc-gray mb-4 flex-1">{a.descripcion}</p>

              <div className="text-xs text-ieepc-gray mb-4 flex items-center gap-3">
                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {a._count.padron} padrón</span>
                {proceso && tipo !== 'ASAMBLEA_DELIBERATIVA' && (
                  <span>{proceso._count.opciones} opciones</span>
                )}
              </div>

              <div className="flex gap-2 mt-auto">
                {tipo === 'ASAMBLEA_DELIBERATIVA' ? (
                  <Link href={`/eventos/${a.id}/asamblea`} className="btn-yellow flex-1 justify-center">
                    <MessageSquare className="w-4 h-4" /> Participar
                  </Link>
                ) : (
                  <>
                    <Link href={`/eventos/${a.id}/votar`} className="btn-yellow flex-1 justify-center">
                      <Vote className="w-4 h-4" /> Votar
                    </Link>
                    <Link href={`/eventos/${a.id}/informate`} className="btn-outline flex-1 justify-center">
                      <Info className="w-4 h-4" /> Infórmate
                    </Link>
                  </>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
