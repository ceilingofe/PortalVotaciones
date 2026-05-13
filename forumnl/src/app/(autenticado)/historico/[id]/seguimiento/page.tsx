import { prisma } from '@/lib/db/prisma';
import { usuarioActual } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Download } from 'lucide-react';
import { SeguimientoCliente } from './SeguimientoCliente';
import { fmtFecha } from '@/lib/dates';

function normRuta(p: string | null | undefined): string | null {
  if (!p) return null;
  if (p.startsWith('http')) return p;
  return p.startsWith('/') ? p : `/${p}`;
}

const ESTATUS_CFG: Record<string, { label: string; color: string; dot: string }> = {
  pendiente:  { label: 'Pendiente',  color: 'bg-gray-100 text-gray-700',   dot: 'bg-gray-400'  },
  en_proceso: { label: 'En proceso', color: 'bg-blue-100 text-blue-800',   dot: 'bg-blue-500'  },
  completado: { label: 'Completado', color: 'bg-green-100 text-green-800', dot: 'bg-green-500' },
  bloqueado:  { label: 'Bloqueado',  color: 'bg-red-100 text-red-800',     dot: 'bg-red-500'   },
};

export default async function SeguimientoPage({ params }: { params: { id: string } }) {
  const usuario = await usuarioActual();
  if (!usuario) redirect('/');

  const asamblea = await prisma.asamblea.findUnique({
    where: { id: params.id },
    include: {
      fraccionamiento: true,
      seguimiento: {
        orderBy: { prioridad: 'asc' },
        include: {
          actualizaciones: {
            orderBy: { createdAt: 'asc' },
            include: { autor: { select: { nombreCompleto: true, rol: true } } },
          },
        },
      },
      procesos: {
        where: { tipo: 'PRIORIZACION_PUNTAJE' },
        include: { _count: { select: { votos: true } } },
      },
    },
  });

  if (!asamblea) return <p className="p-6 text-[#6B7280]">Asamblea no encontrada.</p>;

  const esModerador = usuario.rol === 'ADMIN' || usuario.rol === 'COMITE';
  const totalVotos = asamblea.procesos[0]?._count?.votos ?? 0;

  // Sumar presupuesto real (independiente de si hay Total asignado)
  const presTotal     = asamblea.seguimiento.reduce((s, sg) => s + (sg.presupuestoTotal     ?? 0), 0);
  const presEjecutado = asamblea.seguimiento.reduce((s, sg) => s + (sg.presupuestoEjecutado ?? 0), 0);
  const completados   = asamblea.seguimiento.filter(s => s.estatus === 'completado').length;
  const hayPresTotal  = presTotal > 0;
  const pct = hayPresTotal ? ((presEjecutado / presTotal) * 100).toFixed(1) : null;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Navegación + PDF */}
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <Link href="/historico" className="inline-flex items-center gap-2 text-sm text-[#6B7280] hover:text-[#1A1A1A] font-medium transition-colors">
          <ArrowLeft className="w-4 h-4" /> Volver al histórico
        </Link>
        <Link
          href={`/api/asambleas/${asamblea.id}/trazabilidad-pdf`}
          target="_blank"
          className="btn-outline btn-sm"
        >
          <Download className="w-4 h-4" /> Imprimir reporte de trazabilidad
        </Link>
      </div>

      {/* Header oscuro */}
      <div className="rounded-2xl overflow-hidden mb-6" style={{ background: 'linear-gradient(135deg,#1A1A1A,#2D2D2D)' }}>
        <div className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="badge bg-[#F5C518]/20 text-[#F5C518] mb-3">📊 Trazabilidad de priorización</span>
              <h1 className="text-2xl font-extrabold text-white mb-1">{asamblea.titulo}</h1>
              <p className="text-[#9CA3AF] text-sm">
                {asamblea.fraccionamiento.nombre} · Cerrada el {fmtFecha(asamblea.jornadaFin)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-black text-[#F5C518]">{totalVotos}</p>
              <p className="text-[#9CA3AF] text-xs">participantes</p>
            </div>
          </div>

          {/* KPIs — muestran valores reales aunque no haya presupuesto total */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <p className="text-white font-bold text-lg">{asamblea.seguimiento.length}</p>
              <p className="text-[#9CA3AF] text-[10px] mt-0.5">Problemas<br />priorizados</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <p className="text-white font-bold text-lg">{completados}/{asamblea.seguimiento.length}</p>
              <p className="text-[#9CA3AF] text-[10px] mt-0.5">Completados<br />resueltos</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <p className="text-[#F5C518] font-black text-lg">
                ${presEjecutado.toLocaleString('es-MX')}
              </p>
              <p className="text-[#9CA3AF] text-[10px] mt-0.5">Gasto total<br />registrado MXN</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <p className="text-white font-bold text-lg">
                {hayPresTotal
                  ? `${pct}%`
                  : presEjecutado > 0 ? '✓' : '—'}
              </p>
              <p className="text-[#9CA3AF] text-[10px] mt-0.5">
                {hayPresTotal ? 'Presupuesto\nejecutado' : 'Sin presupuesto\ntotal asignado'}
              </p>
            </div>
          </div>

          {/* Barra de progreso global solo si hay total */}
          {hayPresTotal && (
            <div className="mt-3">
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, parseFloat(pct!))}%`, background: 'linear-gradient(90deg,#F5C518,#E6B800)' }} />
              </div>
              <p className="text-xs text-[#9CA3AF] mt-1 text-right">
                ${presEjecutado.toLocaleString('es-MX')} de ${presTotal.toLocaleString('es-MX')} MXN
              </p>
            </div>
          )}
        </div>
      </div>

      {asamblea.seguimiento.length === 0 && (
        <div className="card p-8 text-center text-[#9CA3AF]">
          <p className="text-4xl mb-3">📋</p>
          <p>Sin seguimientos registrados. Se crean automáticamente al cerrar la votación de priorización.</p>
        </div>
      )}

      <div className="space-y-6">
        {asamblea.seguimiento.map((seg) => {
          const cfg   = ESTATUS_CFG[seg.estatus] ?? ESTATUS_CFG.pendiente;
          const emoji = seg.prioridad === 1 ? '🥇' : seg.prioridad === 2 ? '🥈' : seg.prioridad === 3 ? '🥉' : `${seg.prioridad}°`;

          return (
            <article key={seg.id} className="card overflow-hidden">
              <div className={`h-1.5 w-full ${seg.prioridad === 1 ? 'bg-yellow-400' : seg.prioridad === 2 ? 'bg-gray-300' : 'bg-orange-300'}`} />
              <div className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                  <div className="flex items-start gap-3">
                    <span className="text-3xl shrink-0">{emoji}</span>
                    <div>
                      <h2 className="font-extrabold text-lg leading-tight">{seg.opcionNombre}</h2>
                      <p className="text-sm text-[#6B7280]">
                        <strong className="text-[#F5C518]">{seg.puntos} pts</strong>
                        {seg.responsable && ` · Responsable: ${seg.responsable}`}
                        {seg.fechaCompromiso && ` · Compromiso: ${fmtFecha(seg.fechaCompromiso)}`}
                      </p>
                    </div>
                  </div>
                  <span className={`badge text-xs font-semibold ${cfg.color}`}>
                    <span className={`w-2 h-2 rounded-full ${cfg.dot} mr-1.5 shrink-0`} />
                    {cfg.label}
                  </span>
                </div>

                <SeguimientoCliente
                  seguimientoId={seg.id}
                  actualizacionesIniciales={seg.actualizaciones.map(a => ({
                    id:          a.id,
                    mensaje:     a.mensaje,
                    imagenPath:  normRuta(a.imagenPath),
                    presupuesto: a.presupuesto,
                    tipo:        a.tipo,
                    autor:       a.autor?.nombreCompleto ?? 'FórumNL',
                    esSistema:   !a.autorId,
                    createdAt:   a.createdAt.toISOString(),
                  }))}
                  estatusActual={seg.estatus}
                  presupuestoTotalActual={seg.presupuestoTotal}
                  presupuestoEjecutadoActual={seg.presupuestoEjecutado}
                  esModerador={esModerador}
                />
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
