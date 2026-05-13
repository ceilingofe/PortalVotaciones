'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Loader2, ChevronRight } from 'lucide-react';
import Link from 'next/link';

type TipoProceso = 'ELECCION_PLANILLA' | 'PRIORIZACION_PUNTAJE' | 'ASAMBLEA_DELIBERATIVA';

interface Planilla {
  nombre: string;
  descripcion: string;
  infoMd: string;
  integrantes: { puesto: string; nombre: string }[];
}

interface OpcionPriorizacion {
  nombre: string;
  descripcion: string;
  infoMd: string;
  reporteId?: string;
}

interface ReporteDisponible {
  id: string;
  titulo: string;
  categoria: string;
  descripcion: string;
}

export default function NuevoEventoPage() {
  const router = useRouter();
  const [paso, setPaso] = useState<1 | 2 | 3>(1);
  const [tipo, setTipo] = useState<TipoProceso | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Datos del evento
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [reglas, setReglas] = useState('');
  const [jornadaInicio, setJornadaInicio] = useState('');
  const [jornadaFin, setJornadaFin] = useState('');
  const [lugarPresencial, setLugarPresencial] = useState('');

  // Para elección de planilla
  const [planillas, setPlanillas] = useState<Planilla[]>([
    { nombre: '', descripcion: '', infoMd: '', integrantes: [{ puesto: '', nombre: '' }] },
  ]);

  // Para priorización
  const [opciones, setOpciones] = useState<OpcionPriorizacion[]>([{ nombre: '', descripcion: '', infoMd: '' }]);
  const [reportes, setReportes] = useState<ReporteDisponible[]>([]);
  const [reportesSeleccionados, setReportesSeleccionados] = useState<string[]>([]);
  const [modoOpciones, setModoOpciones] = useState<'manual' | 'reportes'>('manual');

  useEffect(() => {
    if (tipo === 'PRIORIZACION_PUNTAJE') {
      fetch('/api/reportes?estatus=ABIERTO')
        .then(r => r.json())
        .then(j => { if (j.ok) setReportes(j.reportes || []); });
    }
  }, [tipo]);

  const TIPOS = [
    {
      value: 'ELECCION_PLANILLA' as TipoProceso,
      emoji: '🗳️',
      titulo: 'Elección de planilla',
      desc: 'Los vecinos eligen entre varias planillas/candidatos. Gana quién obtenga mayoría de votos.',
    },
    {
      value: 'PRIORIZACION_PUNTAJE' as TipoProceso,
      emoji: '📊',
      titulo: 'Priorización de problemas',
      desc: 'Los vecinos ordenan problemas por importancia. Opción principal = 2pts, secundaria = 1pt.',
    },
    {
      value: 'ASAMBLEA_DELIBERATIVA' as TipoProceso,
      emoji: '💬',
      titulo: 'Asamblea deliberativa',
      desc: 'Foro de discusión abierta. Los vecinos expresan su opinión y el comité genera un resumen con IA.',
    },
  ];

  async function enviar() {
    setEnviando(true);
    setError(null);
    try {
      const body: any = {
        tipo,
        titulo,
        descripcion,
        reglas,
        jornadaInicio: new Date(jornadaInicio).toISOString(),
        jornadaFin: new Date(jornadaFin).toISOString(),
        lugarPresencial,
      };

      if (tipo === 'ELECCION_PLANILLA') body.planillas = planillas;
      else if (tipo === 'PRIORIZACION_PUNTAJE') {
        if (modoOpciones === 'reportes' && reportesSeleccionados.length > 0) {
          body.reportesIds = reportesSeleccionados;
        } else {
          body.opciones = opciones;
        }
      }

      const r = await fetch('/api/eventos/nuevo', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) { setError(j.message || 'Error al crear el evento.'); return; }
      router.push('/eventos');
    } catch (e: any) {
      setError(e?.message || 'Error de red.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link href="/eventos" className="inline-flex items-center gap-2 text-sm text-[#6B7280] hover:text-[#1A1A1A] mb-6 font-medium transition-colors">
        <ArrowLeft className="w-4 h-4" /> Volver a eventos
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-extrabold mb-1">Crear nuevo evento</h1>
        <p className="text-[#6B7280] text-sm">Paso {paso} de {tipo === 'ASAMBLEA_DELIBERATIVA' ? 2 : 3}</p>
      </div>

      {/* Paso 1: Tipo */}
      {paso === 1 && (
        <div className="animate-fade-in space-y-4">
          <p className="font-semibold text-[#374151] mb-3">¿Qué tipo de proceso quieres crear?</p>
          {TIPOS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTipo(t.value)}
              className={`w-full p-5 rounded-2xl border-2 text-left transition-all flex items-start gap-4 ${
                tipo === t.value
                  ? 'border-[#F5C518] bg-[#FFFBEB]'
                  : 'border-[#E5E7EB] bg-white hover:border-[#F5C518]/50'
              }`}
            >
              <span className="text-4xl">{t.emoji}</span>
              <div>
                <p className="font-bold text-[#1A1A1A] mb-1">{t.titulo}</p>
                <p className="text-sm text-[#6B7280] leading-relaxed">{t.desc}</p>
              </div>
            </button>
          ))}
          <button disabled={!tipo} onClick={() => setPaso(2)} className="btn-yellow w-full py-3 mt-4">
            Continuar <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Paso 2: Información general */}
      {paso === 2 && (
        <div className="animate-fade-in">
          <div className="card p-6 space-y-4 mb-4">
            <h2 className="font-bold text-lg">Información del evento</h2>

            <div>
              <label className="label">Título *</label>
              <input className="input" value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ej: Elección de Mesa Directiva 2026" required />
            </div>
            <div>
              <label className="label">Descripción</label>
              <textarea className="input min-h-[80px]" value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Describe el propósito de este proceso..." />
            </div>
            <div>
              <label className="label">Reglas del proceso</label>
              <textarea className="input min-h-[80px]" value={reglas} onChange={e => setReglas(e.target.value)} placeholder="Ej: Una vivienda, un voto. El voto es secreto..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Apertura de votación *</label>
                <input type="datetime-local" className="input" value={jornadaInicio} onChange={e => setJornadaInicio(e.target.value)} required />
              </div>
              <div>
                <label className="label">Cierre de votación *</label>
                <input type="datetime-local" className="input" value={jornadaFin} onChange={e => setJornadaFin(e.target.value)} required />
              </div>
            </div>
            <div>
              <label className="label">Lugar presencial (opcional)</label>
              <input className="input" value={lugarPresencial} onChange={e => setLugarPresencial(e.target.value)} placeholder="Ej: Palapa del parque central" />
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setPaso(1)} className="btn-outline flex-1 justify-center">Atrás</button>
            <button
              disabled={!titulo || !jornadaInicio || !jornadaFin}
              onClick={() => tipo === 'ASAMBLEA_DELIBERATIVA' ? enviar() : setPaso(3)}
              className="btn-yellow flex-1 justify-center"
            >
              {tipo === 'ASAMBLEA_DELIBERATIVA'
                ? enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear asamblea'
                : 'Continuar →'}
            </button>
          </div>
        </div>
      )}

      {/* Paso 3: Opciones según tipo */}
      {paso === 3 && tipo === 'ELECCION_PLANILLA' && (
        <FormPlanillas planillas={planillas} onChange={setPlanillas} onAtras={() => setPaso(2)} onEnviar={enviar} enviando={enviando} />
      )}
      {paso === 3 && tipo === 'PRIORIZACION_PUNTAJE' && (
        <FormPriorizacion
          opciones={opciones}
          onChange={setOpciones}
          reportes={reportes}
          reportesSeleccionados={reportesSeleccionados}
          onChangeReportes={setReportesSeleccionados}
          modoOpciones={modoOpciones}
          onChangeModo={setModoOpciones}
          onAtras={() => setPaso(2)}
          onEnviar={enviar}
          enviando={enviando}
        />
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">{error}</div>
      )}
    </div>
  );
}

/* ── Formulario Planillas ───────────────────────────── */
function FormPlanillas({ planillas, onChange, onAtras, onEnviar, enviando }: {
  planillas: Planilla[];
  onChange: (p: Planilla[]) => void;
  onAtras: () => void;
  onEnviar: () => void;
  enviando: boolean;
}) {
  function addPlanilla() {
    onChange([...planillas, { nombre: '', descripcion: '', infoMd: '', integrantes: [{ puesto: '', nombre: '' }] }]);
  }
  function removePlanilla(i: number) {
    onChange(planillas.filter((_, j) => j !== i));
  }
  function updatePlanilla(i: number, field: keyof Planilla, value: any) {
    const next = [...planillas];
    (next[i] as any)[field] = value;
    onChange(next);
  }
  function addIntegrante(i: number) {
    const next = [...planillas];
    next[i].integrantes.push({ puesto: '', nombre: '' });
    onChange(next);
  }
  function removeIntegrante(i: number, j: number) {
    const next = [...planillas];
    next[i].integrantes = next[i].integrantes.filter((_, k) => k !== j);
    onChange(next);
  }
  function updateIntegrante(pi: number, ii: number, field: 'puesto' | 'nombre', value: string) {
    const next = [...planillas];
    next[pi].integrantes[ii][field] = value;
    onChange(next);
  }

  const puestosComunes = ['Presidencia', 'Secretaría', 'Tesorería', 'Vocalía de Seguridad', 'Vocalía de Mantenimiento'];

  return (
    <div className="animate-fade-in space-y-4">
      <h2 className="font-bold text-xl">Registra las planillas</h2>
      <p className="text-sm text-[#6B7280]">Agrega las planillas que participarán en la elección. Cada planilla puede tener múltiples integrantes.</p>

      {planillas.map((p, i) => (
        <div key={i} className="card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">Planilla {String.fromCharCode(65 + i)}</h3>
            {planillas.length > 1 && (
              <button onClick={() => removePlanilla(i)} className="text-red-600 hover:text-red-800 p-1">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          <div>
            <label className="label">Nombre de la planilla *</label>
            <input className="input" value={p.nombre} onChange={e => updatePlanilla(i, 'nombre', e.target.value)} placeholder="Ej: Vecindad Activa" />
          </div>
          <div>
            <label className="label">Descripción breve *</label>
            <input className="input" value={p.descripcion} onChange={e => updatePlanilla(i, 'descripcion', e.target.value)} placeholder="Ej: Comunidad, transparencia y mejora de espacios" />
          </div>
          <div>
            <label className="label">Información para "Infórmate" (markdown soportado)</label>
            <textarea className="input min-h-[80px]" value={p.infoMd} onChange={e => updatePlanilla(i, 'infoMd', e.target.value)} placeholder="## Propuesta principal&#10;Describe las propuestas de la planilla..." />
          </div>

          <div>
            <label className="label">Integrantes</label>
            {p.integrantes.map((integ, j) => (
              <div key={j} className="flex gap-2 mb-2">
                <select className="input w-40 shrink-0" value={integ.puesto} onChange={e => updateIntegrante(i, j, 'puesto', e.target.value)}>
                  <option value="">Puesto</option>
                  {puestosComunes.map(pu => <option key={pu} value={pu}>{pu}</option>)}
                  <option value="Otro">Otro</option>
                </select>
                <input className="input flex-1" value={integ.nombre} onChange={e => updateIntegrante(i, j, 'nombre', e.target.value)} placeholder="Nombre completo" />
                <button onClick={() => removeIntegrante(i, j)} className="text-[#9CA3AF] hover:text-red-600 p-1 shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button onClick={() => addIntegrante(i)} className="btn-ghost btn-sm mt-1">
              <Plus className="w-3 h-3" /> Agregar integrante
            </button>
          </div>
        </div>
      ))}

      <button onClick={addPlanilla} className="btn-outline w-full">
        <Plus className="w-4 h-4" /> Agregar planilla
      </button>

      <div className="flex gap-3 pt-2">
        <button onClick={onAtras} className="btn-outline flex-1 justify-center">Atrás</button>
        <button onClick={onEnviar} disabled={enviando || planillas.some(p => !p.nombre)} className="btn-yellow flex-1 justify-center">
          {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear elección →'}
        </button>
      </div>
    </div>
  );
}

/* ── Formulario Priorización ────────────────────────── */
function FormPriorizacion({ opciones, onChange, reportes, reportesSeleccionados, onChangeReportes, modoOpciones, onChangeModo, onAtras, onEnviar, enviando }: any) {
  function addOpcion() {
    onChange([...opciones, { nombre: '', descripcion: '', infoMd: '' }]);
  }
  function removeOpcion(i: number) { onChange(opciones.filter((_: any, j: number) => j !== i)); }
  function updateOpcion(i: number, field: string, value: string) {
    const next = [...opciones];
    next[i][field] = value;
    onChange(next);
  }
  function toggleReporte(id: string) {
    onChangeReportes((prev: string[]) => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);
  }

  const EMOJIS: Record<string, string> = { SEGURIDAD:'🛡️', AGUA_DRENAJE:'💧', PARQUES:'🌳', BANQUETAS:'🚶', ALUMBRADO:'💡', BASURA:'🗑️', OTROS:'📌' };

  return (
    <div className="animate-fade-in space-y-4">
      <h2 className="font-bold text-xl">Opciones de priorización</h2>

      <div className="flex gap-2">
        <button onClick={() => onChangeModo('manual')} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all border-2 ${modoOpciones === 'manual' ? 'border-[#F5C518] bg-[#FFFBEB] text-[#1A1A1A]' : 'border-[#E5E7EB] text-[#6B7280]'}`}>
          ✏️ Opciones manuales
        </button>
        <button onClick={() => onChangeModo('reportes')} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all border-2 ${modoOpciones === 'reportes' ? 'border-[#F5C518] bg-[#FFFBEB] text-[#1A1A1A]' : 'border-[#E5E7EB] text-[#6B7280]'}`}>
          📋 Desde reportes
        </button>
      </div>

      {modoOpciones === 'manual' && (
        <>
          {opciones.map((o: any, i: number) => (
            <div key={i} className="card p-5 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-bold">Opción {i + 1}</h3>
                {opciones.length > 1 && (
                  <button onClick={() => removeOpcion(i)} className="text-red-600 hover:text-red-800 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div>
                <label className="label">Nombre *</label>
                <input className="input" value={o.nombre} onChange={e => updateOpcion(i, 'nombre', e.target.value)} placeholder="Ej: Seguridad pública: rondines" />
              </div>
              <div>
                <label className="label">Descripción *</label>
                <textarea className="input" value={o.descripcion} onChange={e => updateOpcion(i, 'descripcion', e.target.value)} placeholder="Descripción breve del problema o propuesta..." />
              </div>
              <div>
                <label className="label">Información detallada (markdown)</label>
                <textarea className="input min-h-[80px]" value={o.infoMd} onChange={e => updateOpcion(i, 'infoMd', e.target.value)} placeholder="**Problema:** ..." />
              </div>
            </div>
          ))}
          <button onClick={addOpcion} className="btn-outline w-full">
            <Plus className="w-4 h-4" /> Agregar opción
          </button>
        </>
      )}

      {modoOpciones === 'reportes' && (
        <div className="card p-5">
          <p className="text-sm font-semibold mb-3 text-[#374151]">Selecciona reportes ciudadanos para convertirlos en opciones:</p>
          {reportes.length === 0 ? (
            <p className="text-sm text-[#9CA3AF] text-center py-4">No hay reportes abiertos disponibles.</p>
          ) : (
            <div className="space-y-2">
              {reportes.map((r: any) => (
                <label key={r.id} className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all border-2 ${reportesSeleccionados.includes(r.id) ? 'border-[#F5C518] bg-[#FFFBEB]' : 'border-[#E5E7EB] hover:border-[#F5C518]/40'}`}>
                  <input type="checkbox" checked={reportesSeleccionados.includes(r.id)} onChange={() => toggleReporte(r.id)} className="mt-0.5 accent-[#F5C518]" />
                  <div>
                    <p className="font-semibold text-sm">{EMOJIS[r.categoria]} {r.titulo}</p>
                    <p className="text-xs text-[#6B7280] mt-0.5 line-clamp-2">{r.descripcion}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button onClick={onAtras} className="btn-outline flex-1 justify-center">Atrás</button>
        <button
          onClick={onEnviar}
          disabled={enviando || (modoOpciones === 'manual' && opciones.some((o: any) => !o.nombre)) || (modoOpciones === 'reportes' && reportesSeleccionados.length === 0)}
          className="btn-yellow flex-1 justify-center"
        >
          {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear priorización →'}
        </button>
      </div>
    </div>
  );
}
