'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp, Plus, Send, Loader2, Paperclip, DollarSign } from 'lucide-react';
import { fmtFechaHora } from '@/lib/dates';

/* ─────────────────────────────────────────────────────────────
   GRÁFICA DE PASTEL — SVG puro, sin dependencias externas
   Path correcto para sector de donut:
     M outerStart → arc exterior (clockwise) → L innerEnd
     → arc interior (counter-clockwise) → Z
   ───────────────────────────────────────────────────────────── */

const COLORES = ['#F5C518','#6366F1','#10B981','#EF4444','#8B5CF6','#F97316'];

function sectorDonut(
  cx: number, cy: number,
  R: number,  ri: number,
  startAngle: number, endAngle: number
): string {
  const cos = Math.cos, sin = Math.sin;
  // Cuatro vértices del sector
  const x1 = cx + R  * cos(startAngle); const y1 = cy + R  * sin(startAngle); // outer-start
  const x2 = cx + R  * cos(endAngle);   const y2 = cy + R  * sin(endAngle);   // outer-end
  const x3 = cx + ri * cos(endAngle);   const y3 = cy + ri * sin(endAngle);   // inner-end
  const x4 = cx + ri * cos(startAngle); const y4 = cy + ri * sin(startAngle); // inner-start
  const large = endAngle - startAngle > Math.PI ? 1 : 0;

  return [
    `M ${x1} ${y1}`,                              // mover a outer-start
    `A ${R} ${R} 0 ${large} 1 ${x2} ${y2}`,      // arco exterior (sentido horario)
    `L ${x3} ${y3}`,                              // línea a inner-end
    `A ${ri} ${ri} 0 ${large} 0 ${x4} ${y4}`,    // arco interior (anti-horario)
    'Z',                                           // cerrar
  ].join(' ');
}

export interface DatosGasto {
  nombre: string;
  ejecutado: number;
  prioridad: number;
}

export function GraficaGastoPorProblema({ datos }: { datos: DatosGasto[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const filtrados = datos.filter(d => d.ejecutado > 0);

  if (filtrados.length === 0) {
    return (
      <div className="card p-6 text-center">
        <p className="text-4xl mb-2">📊</p>
        <p className="text-sm text-[#9CA3AF]">
          Sin gasto registrado aún. Aparecerá aquí cuando se agreguen montos en las actualizaciones.
        </p>
      </div>
    );
  }

  const total = filtrados.reduce((s, d) => s + d.ejecutado, 0);
  const CX = 110; const CY = 110; const R = 90; const RI = 38;

  // Calcular sectores
  let angle = -Math.PI / 2;
  const sectores = filtrados.map((d, i) => {
    const span = (d.ejecutado / total) * 2 * Math.PI;
    const s = {
      nombre:    d.nombre,
      ejecutado: d.ejecutado,
      pct:       ((d.ejecutado / total) * 100).toFixed(1),
      color:     COLORES[i % COLORES.length],
      start:     angle,
      end:       angle + span,
      mid:       angle + span / 2,
    };
    angle += span;
    return s;
  });

  return (
    <div className="card p-5">
      <h3 className="font-bold text-base text-[#1A1A1A] mb-1">Distribución del gasto</h3>
      <p className="text-xs text-[#9CA3AF] mb-4">
        Total ejecutado:{' '}
        <strong className="text-[#1A1A1A]">${total.toLocaleString('es-MX')} MXN</strong>
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* SVG Donut */}
        <svg viewBox="0 0 220 220" className="w-48 h-48 shrink-0" style={{ overflow: 'visible' }}>
          {sectores.map((s, i) => (
            <path
              key={i}
              d={sectorDonut(CX, CY, R, RI, s.start, s.end)}
              fill={s.color}
              stroke="white"
              strokeWidth={2}
              opacity={hovered === null || hovered === i ? 1 : 0.55}
              style={{ cursor: 'pointer', transition: 'opacity .15s' }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}
          {/* Texto central */}
          <text x={CX} y={CY - 6} textAnchor="middle" fontSize={11} fill="#9CA3AF">Total</text>
          <text x={CX} y={CY + 10} textAnchor="middle" fontSize={13} fontWeight="bold" fill="#1A1A1A">
            ${(total / 1000).toFixed(1)}k
          </text>
          {/* Tooltip en hover */}
          {hovered !== null && (() => {
            const s  = sectores[hovered];
            const mx = CX + (R + 14) * Math.cos(s.mid);
            const my = CY + (R + 14) * Math.sin(s.mid);
            const label = s.pct + '%';
            return (
              <text x={mx} y={my} textAnchor="middle" dominantBaseline="middle"
                fontSize={10} fontWeight="bold" fill={s.color}
                style={{ pointerEvents: 'none' }}>
                {label}
              </text>
            );
          })()}
        </svg>

        {/* Leyenda */}
        <div className="flex-1 space-y-2.5 w-full">
          {sectores.map((s, i) => (
            <div key={i}
              className="flex items-start gap-2.5 cursor-default p-2 rounded-xl transition-colors"
              style={{ background: hovered === i ? `${s.color}18` : 'transparent' }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}>
              <div className="w-3 h-3 rounded-sm shrink-0 mt-0.5" style={{ backgroundColor: s.color }} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[#1A1A1A] text-xs leading-tight" title={s.nombre}>
                  {s.nombre.length > 32 ? s.nombre.slice(0, 30) + '…' : s.nombre}
                </p>
                <p className="text-[10px] text-[#9CA3AF] mt-0.5">
                  ${s.ejecutado.toLocaleString('es-MX')} MXN · {s.pct}%
                </p>
              </div>
              <div className="text-xs font-black shrink-0 mt-0.5" style={{ color: s.color }}>
                {s.pct}%
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   El resto del SeguimientoCliente no cambia —
   se copia completo para que el archivo sea autosuficiente
   ───────────────────────────────────────────────────────────── */

interface Actualizacion {
  id: string; mensaje: string; imagenPath: string | null;
  presupuesto: number | null; tipo: string;
  autor: string; esSistema: boolean; createdAt: string;
}

const TIPO_CFG: Record<string,{emoji:string;label:string;color:string}> = {
  inicio:      { emoji:'🚀', label:'Inicio',      color:'border-blue-300 bg-blue-50'    },
  avance:      { emoji:'🔄', label:'Avance',      color:'border-[#F5C518] bg-[#FFFBEB]' },
  completado:  { emoji:'✅', label:'Completado',  color:'border-green-400 bg-green-50'   },
  incidencia:  { emoji:'⚠️', label:'Incidencia',  color:'border-orange-400 bg-orange-50' },
  presupuesto: { emoji:'💰', label:'Presupuesto', color:'border-purple-400 bg-purple-50' },
  foto:        { emoji:'📸', label:'Evidencia',   color:'border-gray-300 bg-gray-50'     },
  documento:   { emoji:'📄', label:'Documento',   color:'border-indigo-300 bg-indigo-50' },
};

const ESTATUS_OPTS = [
  { v:'pendiente',  l:'⏳ Pendiente'  },
  { v:'en_proceso', l:'🔄 En proceso' },
  { v:'completado', l:'✅ Completado' },
  { v:'bloqueado',  l:'🚫 Bloqueado'  },
];

interface Props {
  seguimientoId: string;
  actualizacionesIniciales: Actualizacion[];
  estatusActual: string;
  presupuestoTotalActual: number | null;
  presupuestoEjecutadoActual: number | null;
  esModerador: boolean;
}

export function SeguimientoCliente({ seguimientoId, actualizacionesIniciales, presupuestoTotalActual, presupuestoEjecutadoActual, esModerador }: Props) {
  const router  = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [expandido, setExpandido]   = useState(false);
  const [acts,    setActs]          = useState(actualizacionesIniciales);
  const [formOpen, setFormOpen]     = useState(false);
  const [mensaje, setMensaje]       = useState('');
  const [tipo,    setTipo]          = useState('avance');
  const [estatus, setEstatus]       = useState('');
  const [presupuesto, setPresupuesto] = useState('');
  const [archivo, setArchivo]       = useState<File | null>(null);
  const [enviando, setEnviando]     = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [presEj, setPresEj]         = useState(presupuestoEjecutadoActual ?? 0);

  const presTotal = presupuestoTotalActual ?? 0;
  const pctEj     = presTotal > 0 ? Math.min(100, (presEj / presTotal) * 100) : 0;

  async function enviar(e: React.FormEvent) {
    e.preventDefault(); if (!mensaje.trim()) return;
    setEnviando(true); setError(null);
    const fd = new FormData();
    fd.append('mensaje', mensaje.trim()); fd.append('tipo', tipo);
    if (estatus)     fd.append('estatus', estatus);
    if (presupuesto) fd.append('presupuesto', presupuesto);
    if (archivo)     fd.append('archivo', archivo);
    try {
      const r = await fetch(`/api/seguimiento/${seguimientoId}/actualizaciones`, { method:'POST', body:fd });
      const j = await r.json();
      if (!r.ok || !j.ok) { setError(j.message || 'Error.'); return; }
      if (j.segActualizado?.presupuestoEjecutado != null) setPresEj(Number(j.segActualizado.presupuestoEjecutado));
      const r2 = await fetch(`/api/seguimiento/${seguimientoId}/actualizaciones`);
      const j2 = await r2.json(); if (j2.ok) setActs(j2.actualizaciones);
      setMensaje(''); setPresupuesto(''); setEstatus(''); setArchivo(null);
      setFormOpen(false); setExpandido(true); router.refresh();
    } catch (e: any) { setError(e?.message || 'Error de red.'); }
    finally { setEnviando(false); }
  }

  const visibles = expandido ? acts : acts.slice(-1);
  function archivoUrl(p: string | null) { if (!p) return null; return p.startsWith('http')?p:p.startsWith('/')?p:`/${p}`; }
  function esImagen(p: string | null) { return !!p?.match(/\.(jpg|jpeg|png|gif|webp)$/i); }

  return (
    <div>
      {(presTotal > 0 || presEj > 0) && (
        <div className="mb-4 p-3 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB]">
          <div className="flex justify-between text-xs font-semibold text-[#6B7280] mb-1.5">
            <span>💰 Presupuesto ejecutado</span>
            <span>${presEj.toLocaleString('es-MX')}{presTotal>0?` / $${presTotal.toLocaleString('es-MX')} MXN`:' MXN'}{presTotal>0&&<span className="ml-2 text-[#F5C518] font-bold">{pctEj.toFixed(0)}%</span>}</span>
          </div>
          {presTotal > 0 && <div className="h-2 bg-[#E5E7EB] rounded-full overflow-hidden"><div className="h-full rounded-full" style={{width:`${pctEj}%`,background:'linear-gradient(90deg,#F5C518,#E6B800)'}}/></div>}
        </div>
      )}
      {acts.length > 1 && (
        <button onClick={() => setExpandido(!expandido)} className="text-xs text-[#6B7280] hover:text-[#1A1A1A] flex items-center gap-1 mb-3">
          {expandido?<ChevronUp className="w-3.5 h-3.5"/>:<ChevronDown className="w-3.5 h-3.5"/>}
          {expandido?'Ocultar historial':`Ver ${acts.length-1} actualizaciones anteriores`}
        </button>
      )}
      <div className="space-y-3 mb-4">
        {visibles.map((act, i) => {
          const cfg = TIPO_CFG[act.tipo] ?? TIPO_CFG.avance;
          const url = archivoUrl(act.imagenPath);
          const img = url && esImagen(act.imagenPath);
          const doc = url && !img;
          return (
            <div key={act.id} className="flex gap-3">
              <div className="flex flex-col items-center shrink-0">
                <div className="w-8 h-8 rounded-full border-2 border-[#E5E7EB] bg-white flex items-center justify-center text-sm">{cfg.emoji}</div>
                {i<visibles.length-1&&<div className="w-0.5 flex-1 bg-[#E5E7EB] mt-1"/>}
              </div>
              <div className={`flex-1 mb-3 p-3.5 rounded-xl border ${cfg.color}`}>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-xs font-semibold text-[#374151]">{act.esSistema?'🤖 FórumNL':act.autor}</span>
                  <div className="flex items-center gap-2"><span className="text-[10px] text-[#9CA3AF]">{fmtFechaHora(act.createdAt)}</span><span className="badge badge-gray text-[10px]">{cfg.label}</span></div>
                </div>
                <p className="text-sm text-[#374151] leading-relaxed">{act.mensaje}</p>
                {act.presupuesto!=null&&Number(act.presupuesto)>0&&<div className="mt-2 flex items-center gap-1 text-xs font-semibold text-purple-700 bg-purple-50 rounded-lg px-2 py-1 w-fit"><DollarSign className="w-3 h-3"/>${Number(act.presupuesto).toLocaleString('es-MX')} MXN</div>}
                {img&&url&&<div className="mt-2 rounded-lg overflow-hidden border border-[#E5E7EB]"><img src={url} alt="Evidencia" className="w-full max-h-48 object-cover" onError={e=>{(e.currentTarget.parentElement as HTMLElement).style.display='none';}}/></div>}
                {doc&&url&&<a href={url} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center gap-2 text-xs font-semibold text-indigo-700 bg-indigo-50 rounded-lg px-3 py-2 hover:bg-indigo-100 w-fit"><Paperclip className="w-3.5 h-3.5"/>Ver documento →</a>}
              </div>
            </div>
          );
        })}
      </div>
      {esModerador&&!formOpen&&<button onClick={()=>setFormOpen(true)} className="btn-yellow btn-sm w-full justify-center"><Plus className="w-4 h-4"/>Agregar actualización</button>}
      {esModerador&&formOpen&&(
        <form onSubmit={enviar} className="bg-[#F9FAFB] rounded-2xl p-4 border border-[#E5E7EB] space-y-3">
          <p className="font-semibold text-sm">Nueva actualización</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(TIPO_CFG).map(([k,cfg])=>(<button key={k} type="button" onClick={()=>setTipo(k)} className={`text-xs px-3 py-1.5 rounded-full font-semibold border transition-all ${tipo===k?'border-[#F5C518] bg-[#FFFBEB] text-[#92400E]':'border-[#E5E7EB] bg-white text-[#6B7280]'}`}>{cfg.emoji} {cfg.label}</button>))}
          </div>
          <textarea value={mensaje} onChange={e=>setMensaje(e.target.value)} required placeholder="Describe el avance..." className="input min-h-[80px] resize-none w-full"/>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label text-xs">Cambiar estatus</label><select className="input" value={estatus} onChange={e=>setEstatus(e.target.value)}><option value="">Sin cambio</option>{ESTATUS_OPTS.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}</select></div>
            <div><label className="label text-xs">Monto MXN</label><div className="relative"><DollarSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]"/><input type="number" step="0.01" min="0" className="input pl-9" placeholder="0.00" value={presupuesto} onChange={e=>setPresupuesto(e.target.value)}/></div></div>
          </div>
          <div>
            <input type="file" ref={fileRef} accept="image/*,.pdf,.doc,.docx,.xlsx,.xls,.txt" className="hidden" onChange={e=>setArchivo(e.target.files?.[0]??null)}/>
            <button type="button" onClick={()=>fileRef.current?.click()} className={`btn-outline btn-sm ${archivo?'border-green-400 text-green-700 bg-green-50':''}`}><Paperclip className="w-4 h-4"/>{archivo?`✓ ${archivo.name}`:'Adjuntar archivo'}</button>
          </div>
          {error&&<p className="text-red-700 text-xs">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={()=>setFormOpen(false)} className="btn-ghost flex-1 justify-center btn-sm">Cancelar</button>
            <button type="submit" disabled={enviando||!mensaje.trim()} className="btn-yellow flex-1 justify-center btn-sm">{enviando?<Loader2 className="w-4 h-4 animate-spin"/>:<><Send className="w-4 h-4"/>Publicar</>}</button>
          </div>
        </form>
      )}
    </div>
  );
}
