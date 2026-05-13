'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp, Plus, Send, Loader2, Camera, DollarSign } from 'lucide-react';
import { fmtFechaHora } from '@/lib/dates';

interface Actualizacion {
  id: string;
  mensaje: string;
  imagenPath: string | null;
  presupuesto: number | null;
  tipo: string;
  autor: string;
  esSistema: boolean;
  createdAt: string;
}

const TIPO_CONFIG: Record<string, { emoji: string; label: string; color: string }> = {
  inicio:      { emoji: '🚀', label: 'Inicio',       color: 'border-blue-300 bg-blue-50'    },
  avance:      { emoji: '🔄', label: 'Avance',       color: 'border-[#F5C518] bg-[#FFFBEB]' },
  completado:  { emoji: '✅', label: 'Completado',   color: 'border-green-400 bg-green-50'   },
  incidencia:  { emoji: '⚠️', label: 'Incidencia',   color: 'border-orange-400 bg-orange-50' },
  presupuesto: { emoji: '💰', label: 'Presupuesto',  color: 'border-purple-400 bg-purple-50' },
  foto:        { emoji: '📸', label: 'Evidencia',    color: 'border-gray-300 bg-gray-50'     },
};

const ESTATUS_OPTS = [
  { v: 'pendiente',  l: '⏳ Pendiente'   },
  { v: 'en_proceso', l: '🔄 En proceso'  },
  { v: 'completado', l: '✅ Completado'  },
  { v: 'bloqueado',  l: '🚫 Bloqueado'   },
];

interface Props {
  seguimientoId: string;
  actualizacionesIniciales: Actualizacion[];
  estatusActual: string;
  presupuestoTotalActual: number | null;
  presupuestoEjecutadoActual: number | null;
  esModerador: boolean;
}

export function SeguimientoCliente({
  seguimientoId,
  actualizacionesIniciales,
  estatusActual,
  presupuestoTotalActual,
  presupuestoEjecutadoActual,
  esModerador,
}: Props) {
  const router = useRouter();
  const [expandido, setExpandido] = useState(false);
  const [actualizaciones, setActualizaciones] = useState(actualizacionesIniciales);

  // Estado local para presupuesto (se actualiza al enviar sin recargar toda la página)
  const [presEjecutado, setPresEjecutado] = useState(presupuestoEjecutadoActual ?? 0);
  const [formularioAbierto, setFormularioAbierto] = useState(false);

  // Form
  const [mensaje, setMensaje] = useState('');
  const [tipo, setTipo] = useState('avance');
  const [nuevoEstatus, setNuevoEstatus] = useState('');
  const [presupuesto, setPresupuesto] = useState('');
  const [imagen, setImagen] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const presTotal = presupuestoTotalActual ?? 0;
  const pctEjecutado = presTotal > 0 ? Math.min(100, (presEjecutado / presTotal) * 100) : 0;

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!mensaje.trim()) return;
    setEnviando(true);
    setError(null);

    const fd = new FormData();
    fd.append('mensaje', mensaje.trim());
    fd.append('tipo', tipo);
    if (nuevoEstatus) fd.append('estatus', nuevoEstatus);
    if (presupuesto) fd.append('presupuesto', presupuesto);
    if (imagen) fd.append('imagen', imagen);

    try {
      const r = await fetch(`/api/seguimiento/${seguimientoId}/actualizaciones`, {
        method: 'POST', body: fd,
      });
      const j = await r.json();
      if (!r.ok || !j.ok) { setError(j.message || 'Error.'); return; }

      // Actualizar presupuesto ejecutado en estado local
      if (j.segActualizado?.presupuestoEjecutado !== undefined) {
        setPresEjecutado(j.segActualizado.presupuestoEjecutado);
      }

      // Recargar lista de actualizaciones
      const r2 = await fetch(`/api/seguimiento/${seguimientoId}/actualizaciones`);
      const j2 = await r2.json();
      if (j2.ok) setActualizaciones(j2.actualizaciones);

      // Limpiar
      setMensaje(''); setPresupuesto(''); setNuevoEstatus(''); setImagen(null);
      setFormularioAbierto(false);
      setExpandido(true);

      // Forzar re-render del server component para actualizar KPIs del encabezado
      router.refresh();
    } catch (e: any) {
      setError(e?.message || 'Error de red.');
    } finally {
      setEnviando(false);
    }
  }

  const visibles = expandido ? actualizaciones : actualizaciones.slice(-1);

  function imgSrc(p: string | null) {
    if (!p) return null;
    if (p.startsWith('http')) return p;
    return p.startsWith('/') ? p : `/${p}`;
  }

  return (
    <div>
      {/* Mini dashboard de presupuesto (actualizable localmente) */}
      {(presTotal > 0 || presEjecutado > 0) && (
        <div className="mb-4 p-3 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB]">
          <div className="flex justify-between text-xs font-semibold text-[#6B7280] mb-1.5">
            <span>💰 Presupuesto ejecutado</span>
            <span>
              ${presEjecutado.toLocaleString('es-MX')}
              {presTotal > 0 && ` / $${presTotal.toLocaleString('es-MX')} MXN`}
              {presTotal > 0 && <span className="ml-2 text-[#F5C518] font-bold">{pctEjecutado.toFixed(0)}%</span>}
            </span>
          </div>
          {presTotal > 0 && (
            <div className="h-2 bg-[#E5E7EB] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pctEjecutado}%`, background: 'linear-gradient(90deg,#F5C518,#E6B800)' }} />
            </div>
          )}
        </div>
      )}

      {/* Botón expandir historial */}
      {actualizaciones.length > 1 && (
        <button onClick={() => setExpandido(!expandido)}
          className="text-xs text-[#6B7280] hover:text-[#1A1A1A] flex items-center gap-1 mb-3 transition-colors">
          {expandido ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {expandido ? 'Ocultar historial' : `Ver ${actualizaciones.length - 1} actualizaciones anteriores`}
        </button>
      )}

      {/* Timeline */}
      <div className="space-y-3 mb-4">
        {visibles.map((act, i) => {
          const cfg = TIPO_CONFIG[act.tipo] ?? TIPO_CONFIG.avance;
          const img = imgSrc(act.imagenPath);

          return (
            <div key={act.id} className="flex gap-3">
              <div className="flex flex-col items-center shrink-0">
                <div className="w-8 h-8 rounded-full border-2 border-[#E5E7EB] bg-white flex items-center justify-center text-sm">
                  {cfg.emoji}
                </div>
                {i < visibles.length - 1 && <div className="w-0.5 flex-1 bg-[#E5E7EB] mt-1" />}
              </div>

              <div className={`flex-1 mb-3 p-3.5 rounded-xl border ${cfg.color}`}>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-[#374151]">
                      {act.esSistema ? '🤖 FórumNL' : act.autor}
                    </span>
                    <span className="text-[#9CA3AF]">·</span>
                    {/* Fecha en DD/MM/AAAA HH:MM */}
                    <span className="text-[#9CA3AF]">{fmtFechaHora(act.createdAt)}</span>
                  </div>
                  <span className="badge badge-gray text-[10px]">{cfg.label}</span>
                </div>

                <p className="text-sm text-[#374151] leading-relaxed">{act.mensaje}</p>

                {act.presupuesto != null && act.presupuesto > 0 && (
                  <div className="mt-2 flex items-center gap-1 text-xs font-semibold text-purple-700 bg-purple-50 rounded-lg px-2 py-1 w-fit">
                    <DollarSign className="w-3 h-3" />
                    ${act.presupuesto.toLocaleString('es-MX')} MXN
                  </div>
                )}

                {/* Imagen de evidencia visible */}
                {img && (
                  <div className="mt-2 rounded-lg overflow-hidden border border-[#E5E7EB]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img} alt="Evidencia" className="w-full max-h-48 object-cover"
                      onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none'; }} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Botón agregar */}
      {esModerador && !formularioAbierto && (
        <button onClick={() => setFormularioAbierto(true)} className="btn-yellow btn-sm w-full justify-center">
          <Plus className="w-4 h-4" /> Agregar actualización
        </button>
      )}

      {/* Formulario */}
      {esModerador && formularioAbierto && (
        <form onSubmit={enviar} className="bg-[#F9FAFB] rounded-2xl p-4 border border-[#E5E7EB] space-y-3">
          <p className="font-semibold text-sm">Nueva actualización</p>

          {/* Tipo */}
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(TIPO_CONFIG).map(([k, cfg]) => (
              <button key={k} type="button" onClick={() => setTipo(k)}
                className={`text-xs px-3 py-1.5 rounded-full font-semibold border transition-all ${
                  tipo === k ? 'border-[#F5C518] bg-[#FFFBEB] text-[#92400E]' : 'border-[#E5E7EB] bg-white text-[#6B7280]'}`}>
                {cfg.emoji} {cfg.label}
              </button>
            ))}
          </div>

          <textarea value={mensaje} onChange={e => setMensaje(e.target.value)}
            placeholder="Describe el avance, evidencia o información relevante..."
            className="input min-h-[80px] resize-none w-full" required />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label text-xs">Cambiar estatus</label>
              <select className="input" value={nuevoEstatus} onChange={e => setNuevoEstatus(e.target.value)}>
                <option value="">Sin cambio</option>
                {ESTATUS_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            </div>
            <div>
              <label className="label text-xs">Monto MXN ejecutado</label>
              <div className="relative">
                <DollarSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                <input type="number" step="0.01" min="0" className="input pl-9"
                  placeholder="0.00" value={presupuesto} onChange={e => setPresupuesto(e.target.value)} />
              </div>
            </div>
          </div>

          <div>
            <input type="file" ref={fileRef} accept="image/*" className="hidden"
              onChange={e => setImagen(e.target.files?.[0] ?? null)} />
            <button type="button" onClick={() => fileRef.current?.click()}
              className={`btn-outline btn-sm ${imagen ? 'border-green-400 text-green-700 bg-green-50' : ''}`}>
              <Camera className="w-4 h-4" />
              {imagen ? `✓ ${imagen.name}` : 'Adjuntar foto de evidencia'}
            </button>
          </div>

          {error && <p className="text-red-700 text-xs">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setFormularioAbierto(false)} className="btn-ghost flex-1 justify-center btn-sm">Cancelar</button>
            <button type="submit" disabled={enviando || !mensaje.trim()} className="btn-yellow flex-1 justify-center btn-sm">
              {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Publicar</>}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
