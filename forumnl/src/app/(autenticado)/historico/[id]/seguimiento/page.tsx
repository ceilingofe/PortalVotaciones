import { prisma } from '@/lib/db/prisma';
import { usuarioActual } from '@/lib/auth/session';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { SeguimientoCliente, GraficaGastoPorProblema } from './SeguimientoCliente';
import { fmtFecha } from '@/lib/dates';

export default async function SeguimientoPage({ params }: { params: { id: string } }) {
  const usuario = await usuarioActual();
  if (!usuario) redirect('/login');

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
    },
  });

  if (!asamblea) notFound();

  const esModerador = usuario.rol === 'ADMIN' || usuario.rol === 'COMITE';

  // KPI globales
  const totalProblemas     = asamblea.seguimiento.length;
  const completados        = asamblea.seguimiento.filter(s => s.estatus === 'completado').length;
  const presupuestoTotal   = asamblea.seguimiento.reduce((s, x) => s + (x.presupuestoTotal   ?? 0), 0);
  const presupuestoEjec    = asamblea.seguimiento.reduce((s, x) => s + (x.presupuestoEjecutado ?? 0), 0);
  const pctAvance          = totalProblemas > 0 ? Math.round((completados / totalProblemas) * 100) : 0;
  const pctGasto           = presupuestoTotal > 0 ? Math.round((presupuestoEjec / presupuestoTotal) * 100) : 0;

  // Datos para la gráfica de pastel
  const datosGasto = asamblea.seguimiento.map(s => ({
    nombre:    s.opcionNombre,
    ejecutado: s.presupuestoEjecutado ?? 0,
    prioridad: s.prioridad,
  }));

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex items-center gap-3">
        <Link href="/historico" className="btn-ghost p-2 rounded-xl">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold text-[#1A1A1A] leading-tight">{asamblea.titulo}</h1>
          <p className="text-sm text-[#6B7280]">
            Trazabilidad de seguimiento · {fmtFecha(asamblea.jornadaInicio)}
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label:'Problemas',    valor:`${completados} / ${totalProblemas}`, sub:`${pctAvance}% resueltos`,     color:'#F5C518' },
          { label:'Presupuesto',  valor:`$${presupuestoEjec.toLocaleString('es-MX')}`, sub:`${pctGasto}% de $${presupuestoTotal.toLocaleString('es-MX')}`, color:'#6366F1' },
          { label:'Completados',  valor:String(completados),  sub:'problemas cerrados',  color:'#10B981' },
          { label:'Pendientes',   valor:String(totalProblemas - completados), sub:'en proceso o por iniciar', color:'#F97316' },
        ].map(k => (
          <div key={k.label} className="card p-5">
            <div className="w-10 h-1.5 rounded-full mb-3" style={{ background: k.color }} />
            <p className="text-2xl font-black text-[#1A1A1A]">{k.valor}</p>
            <p className="text-xs text-[#9CA3AF] font-semibold mt-0.5">{k.label}</p>
            <p className="text-[10px] text-[#9CA3AF]">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Gráfica de pastel del gasto ── */}
      <GraficaGastoPorProblema datos={datosGasto} />

      {/* Enlace al PDF de trazabilidad */}
      <div className="flex justify-end">
        <a
          href={`/api/asambleas/${params.id}/trazabilidad-pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-outline btn-sm"
        >
          📄 Descargar PDF de trazabilidad
        </a>
      </div>

      {/* Lista de seguimientos */}
      <div className="space-y-6">
        {asamblea.seguimiento.map(seg => {
          const acts = seg.actualizaciones.map(a => ({
            id:          a.id,
            mensaje:     a.mensaje,
            imagenPath:  a.imagenPath,
            presupuesto: a.presupuesto ? Number(a.presupuesto) : null,
            tipo:        a.tipo,
            autor:       a.autor?.nombreCompleto ?? 'FórumNL',
            esSistema:   !a.autorId,
            createdAt:   a.createdAt.toISOString(),
          }));

          const estatusCfg: Record<string,{label:string;color:string}> = {
            pendiente:   { label:'⏳ Pendiente',   color:'text-yellow-700 bg-yellow-50 border-yellow-200' },
            en_proceso:  { label:'🔄 En proceso',  color:'text-blue-700 bg-blue-50 border-blue-200'       },
            completado:  { label:'✅ Completado',  color:'text-green-700 bg-green-50 border-green-200'    },
            bloqueado:   { label:'🚫 Bloqueado',   color:'text-red-700 bg-red-50 border-red-200'          },
          };
          const esCfg = estatusCfg[seg.estatus] ?? estatusCfg.pendiente;

          return (
            <div key={seg.id} className="card overflow-hidden">
              {/* Franja de prioridad */}
              <div className="h-1" style={{ background:`linear-gradient(90deg,${['#F5C518','#6366F1','#10B981','#EF4444','#8B5CF6'][seg.prioridad-1]??'#9CA3AF'},transparent)` }} />
              <div className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-7 h-7 rounded-full flex items-center justify-center font-black text-sm text-[#1A1A1A]"
                        style={{ background:'linear-gradient(135deg,#F5C518,#E6B800)' }}>
                        {seg.prioridad}
                      </span>
                      <h2 className="font-extrabold text-base text-[#1A1A1A]">{seg.opcionNombre}</h2>
                    </div>
                    <div className="flex items-center gap-2 ml-9">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${esCfg.color}`}>{esCfg.label}</span>
                      {seg.puntos != null && <span className="text-xs text-[#9CA3AF]">{seg.puntos} pts en votación</span>}
                    </div>
                  </div>
                  {(seg.presupuestoTotal || seg.presupuestoEjecutado) ? (
                    <div className="text-right text-xs text-[#6B7280]">
                      <p className="font-bold text-[#1A1A1A]">${(Number(seg.presupuestoEjecutado)??0).toLocaleString('es-MX')}</p>
                      <p>de ${(Number(seg.presupuestoTotal)??0).toLocaleString('es-MX')} MXN</p>
                    </div>
                  ) : null}
                </div>

                <SeguimientoCliente
                  seguimientoId={seg.id}
                  actualizacionesIniciales={acts}
                  estatusActual={seg.estatus}
                  presupuestoTotalActual={seg.presupuestoTotal ? Number(seg.presupuestoTotal) : null}
                  presupuestoEjecutadoActual={seg.presupuestoEjecutado ? Number(seg.presupuestoEjecutado) : null}
                  esModerador={esModerador}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
