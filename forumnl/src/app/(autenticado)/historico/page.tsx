import { prisma } from '@/lib/db/prisma';
import { usuarioActual } from '@/lib/auth/session';
import Link from 'next/link';
import { Download, BarChart3, ClipboardList, History, MessageSquare } from 'lucide-react';

export default async function HistoricoPage() {
  const usuario = await usuarioActual();
  if (!usuario?.vivienda) return null;

  const asambleas = await prisma.asamblea.findMany({
    where: {
      fraccionamientoId: usuario.vivienda.fraccionamientoId,
      estatus: { in: ['CERRADA', 'CON_ACTA'] },
    },
    include: {
      procesos: {
        include: {
          _count: { select: { votos: true } },
          acta: { select: { id: true } },
        },
      },
      _count: { select: { seguimiento: true, mensajes: true } },
    },
    orderBy: { jornadaFin: 'desc' },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold flex items-center gap-2">
          <History className="w-6 h-6 text-[#F5C518]" /> Histórico
        </h1>
        <p className="text-sm text-[#6B7280]">Votaciones cerradas, actas y seguimiento de problemas</p>
      </div>

      {asambleas.length === 0 && (
        <div className="card p-10 text-center">
          <BarChart3 className="w-14 h-14 mx-auto mb-3 text-[#E5E7EB]" />
          <p className="font-semibold text-[#6B7280]">Aún no hay procesos cerrados.</p>
          <p className="text-xs text-[#9CA3AF] mt-1">Cuando un evento termine, aquí aparecerán sus actas y seguimiento.</p>
        </div>
      )}

      <div className="space-y-4">
        {asambleas.map((a) => {
          const esPriorizacion = a.procesos.some(p => p.tipo === 'PRIORIZACION_PUNTAJE');
          const esDeliberativa = a.procesos.some(p => p.tipo === 'ASAMBLEA_DELIBERATIVA');
          const totalVotos = a.procesos.reduce((s, p) => s + p._count.votos, 0);
          const tieneSeguimiento = a._count.seguimiento > 0;
          const tieneActaDeliberativa = a.procesos.some(p => p.tipo === 'ASAMBLEA_DELIBERATIVA' && p.acta);

          const tipoLabel = esDeliberativa ? '💬 Asamblea' : esPriorizacion ? '📊 Priorización' : '🗳️ Elección';

          return (
            <article key={a.id} className="card overflow-hidden">
              <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#F5C518,#E6B800)' }} />
              <div className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="badge badge-black text-xs">{tipoLabel}</span>
                      <span className="badge badge-success text-xs">Cerrada</span>
                      {tieneSeguimiento && (
                        <span className="badge badge-yellow text-xs">{a._count.seguimiento} tareas con seguimiento</span>
                      )}
                      {esDeliberativa && (
                        <span className="badge badge-blue text-xs">{a._count.mensajes} intervenciones</span>
                      )}
                    </div>
                    <h2 className="font-extrabold text-lg text-[#1A1A1A]">{a.titulo}</h2>
                    <p className="text-sm text-[#6B7280] mt-0.5">
                      Cerrada el {a.jornadaFin.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
                      {!esDeliberativa && ` · ${totalVotos} votos`}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {/* Seguimiento priorización */}
                  {esPriorizacion && (
                    <Link href={`/historico/${a.id}/seguimiento`} className="btn-yellow btn-sm">
                      <ClipboardList className="w-4 h-4" />
                      {tieneSeguimiento ? 'Ver trazabilidad' : 'Abrir seguimiento'}
                    </Link>
                  )}

                  {/* Acta asamblea deliberativa */}
                  {esDeliberativa && tieneActaDeliberativa && (
                    <Link
                      href={`/api/asambleas/${a.id}/acta?procesoId=${a.procesos.find(p => p.tipo === 'ASAMBLEA_DELIBERATIVA')?.id}`}
                      target="_blank"
                      className="btn-outline btn-sm"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <MessageSquare className="w-3.5 h-3.5" /> Acta de asamblea
                    </Link>
                  )}

                  {esDeliberativa && !tieneActaDeliberativa && (
                    <span className="badge badge-gray text-xs">Acta pendiente — cierra la asamblea para generarla</span>
                  )}

                  {/* Actas de votación */}
                  {!esDeliberativa && a.procesos.map((p) => (
                    <Link key={p.id} href={`/api/asambleas/${a.id}/acta?procesoId=${p.id}`} target="_blank" className="btn-outline btn-sm">
                      <Download className="w-3.5 h-3.5" />
                      Acta: {p.tipo === 'ELECCION_PLANILLA' ? 'Elección' : 'Priorización'}
                    </Link>
                  ))}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
