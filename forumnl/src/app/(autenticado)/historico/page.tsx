import { prisma } from '@/lib/db/prisma';
import { usuarioActual } from '@/lib/auth/session';
import Link from 'next/link';
import { Download, FileText, BarChart3 } from 'lucide-react';

export default async function HistoricoPage() {
  const usuario = await usuarioActual();
  if (!usuario?.vivienda) return null;

  const asambleas = await prisma.asamblea.findMany({
    where: {
      fraccionamientoId: usuario.vivienda.fraccionamientoId,
      estatus: { in: ['CERRADA', 'CON_ACTA'] },
    },
    include: {
      procesos: { include: { _count: { select: { votos: true, opciones: true } }, acta: true } },
    },
    orderBy: { jornadaFin: 'desc' },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Histórico</h1>
        <p className="text-sm text-ieepc-gray">Procesos cerrados y sus actas oficiales</p>
      </div>

      {asambleas.length === 0 ? (
        <div className="card p-8 text-center">
          <BarChart3 className="w-12 h-12 mx-auto mb-2 text-ieepc-gray" />
          <p className="text-ieepc-gray">Aún no hay procesos cerrados.</p>
          <p className="text-xs text-ieepc-gray mt-2">
            Cuando un evento termine, aquí aparecerá su acta oficial descargable.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {asambleas.map((a) => (
            <article key={a.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h2 className="font-semibold">{a.titulo}</h2>
                  <p className="text-sm text-ieepc-gray mt-0.5">{a.descripcion}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-ieepc-gray">
                    <span>Cerrada el {a.jornadaFin.toLocaleDateString('es-MX')}</span>
                    <span>•</span>
                    <span>{a.procesos.reduce((s, p) => s + p._count.votos, 0)} votos totales</span>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                {a.procesos.map((p) => (
                  <Link
                    key={p.id}
                    href={`/api/asambleas/${a.id}/acta?procesoId=${p.id}`}
                    target="_blank"
                    className="btn-outline text-xs"
                  >
                    <Download className="w-3.5 h-3.5" /> Acta: {p.titulo}
                  </Link>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
