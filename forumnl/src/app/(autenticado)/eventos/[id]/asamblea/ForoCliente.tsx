'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Loader2, Shield, UserX, XCircle, AlertTriangle } from 'lucide-react';
import { fmtFechaHora } from '@/lib/dates';

interface Mensaje {
  id: string;
  contenido: string;
  esAnonimo: boolean;
  autor: string;
  rol: string | null;
  esMio: boolean;
  createdAt: string;
}

interface Props {
  asambleaId: string;
  mensajesIniciales: Mensaje[];
  esModerador: boolean;
  estaCerrada: boolean;
}

/* ── Modal de cierre de asamblea ──────────────────────── */
function CerrarAsambleaModal({ asambleaId, onCerrada }: { asambleaId: string; onCerrada: () => void }) {
  const [modal, setModal]         = useState(false);
  const [incidencias, setIncidencias] = useState('');
  const [cerrando, setCerrando]   = useState(false);
  const [error, setError]         = useState<string | null>(null);

  async function cerrar() {
    setCerrando(true); setError(null);
    try {
      const r = await fetch(`/api/eventos/${asambleaId}/cerrar`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ incidencias: incidencias.trim() }),
      });
      const j = await r.json();
      if (!j.ok) { setError(j.message || 'Error al cerrar.'); return; }
      setModal(false);
      onCerrada();
    } catch (e: any) { setError(e.message || 'Error de red.'); }
    finally { setCerrando(false); }
  }

  return (
    <>
      <button onClick={() => setModal(true)} className="btn-danger btn-sm">
        <XCircle className="w-4 h-4" /> Cerrar asamblea
      </button>

      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={() => !cerrando && setModal(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="font-bold text-lg">Cerrar asamblea vecinal</h2>
                <p className="text-xs text-[#6B7280]">Se generará el acta con el resumen de la IA</p>
              </div>
            </div>
            <div className="bg-[#FEF3C7] border border-[#F5C518] rounded-xl p-3 text-sm text-[#92400E] mb-4">
              Al cerrar, Groq analizará todos los mensajes y generará automáticamente:
              <ul className="mt-1 text-xs space-y-0.5 list-disc list-inside">
                <li>Resumen ejecutivo de la deliberación</li>
                <li>Acuerdos y resolutivos detectados</li>
                <li>Acta oficial descargable en Histórico</li>
              </ul>
            </div>
            <div className="mb-4">
              <label className="label">Incidencias (opcional)</label>
              <textarea value={incidencias} onChange={e => setIncidencias(e.target.value)}
                className="input min-h-[70px] resize-none" placeholder="Describe cualquier incidencia durante la asamblea..." disabled={cerrando} />
            </div>
            {error && <p className="text-red-700 text-sm mb-3">{error}</p>}
            <div className="flex gap-3">
              <button onClick={() => setModal(false)} disabled={cerrando} className="btn-outline flex-1 justify-center">Cancelar</button>
              <button onClick={cerrar} disabled={cerrando} className="btn-danger flex-1 justify-center">
                {cerrando ? <><Loader2 className="w-4 h-4 animate-spin" /> Generando acta...</> : <><XCircle className="w-4 h-4" /> Cerrar y generar acta</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Foro principal ───────────────────────────────────── */
export function ForoCliente({ asambleaId, mensajesIniciales, esModerador, estaCerrada }: Props) {
  const router = useRouter();
  const [mensajes, setMensajes]   = useState(mensajesIniciales);
  const [texto, setTexto]         = useState('');
  const [esAnonimo, setEsAnonimo] = useState(false);
  const [enviando, setEnviando]   = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Polling de mensajes nuevos
  useEffect(() => {
    if (estaCerrada) return;
    const id = setInterval(async () => {
      const r = await fetch(`/api/asambleas/${asambleaId}/mensajes`);
      if (r.ok) { const j = await r.json(); if (j.ok) setMensajes(j.mensajes); }
    }, 6000);
    return () => clearInterval(id);
  }, [asambleaId, estaCerrada]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;
    setEnviando(true); setError(null);
    try {
      const r = await fetch(`/api/asambleas/${asambleaId}/mensajes`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ contenido: texto.trim(), esAnonimo }),
      });
      const j = await r.json();
      if (!j.ok) { setError(j.message || 'No se pudo enviar.'); return; }
      setMensajes(prev => [...prev, j.mensaje]);
      setTexto('');
    } catch (e: any) { setError(e.message || 'Error de red.'); }
    finally { setEnviando(false); }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Barra de moderación */}
      {esModerador && !estaCerrada && (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ background: 'linear-gradient(135deg,#1A1A1A,#2D2D2D)' }}>
          <div>
            <p className="text-xs text-[#F5C518] font-bold">Panel de moderación</p>
            <p className="text-xs text-[#9CA3AF]">{mensajes.length} intervenciones · {new Set(mensajes.map(m=>m.autor)).size} participantes</p>
          </div>
          <CerrarAsambleaModal asambleaId={asambleaId} onCerrada={() => router.refresh()} />
        </div>
      )}

      {/* Lista de mensajes */}
      <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
        {mensajes.length === 0 && (
          <div className="card p-8 text-center text-[#9CA3AF]">
            <p>Sé el primero en participar en la asamblea.</p>
          </div>
        )}
        {mensajes.map(m => (
          <div key={m.id} className={`flex gap-3 ${m.esMio ? 'flex-row-reverse' : ''}`}>
            {/* Avatar */}
            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
              m.esAnonimo ? 'bg-[#F3F4F6] text-[#9CA3AF]' :
              m.esMio     ? 'bg-[#F5C518] text-[#1A1A1A]' :
              m.rol === 'ADMIN' || m.rol === 'COMITE' ? 'bg-[#1A1A1A] text-[#F5C518]' :
              'bg-[#E5E7EB] text-[#374151]'
            }`}>
              {m.esAnonimo ? <UserX className="w-4 h-4" /> : m.autor.split(' ').map(s=>s[0]).slice(0,2).join('')}
            </div>

            {/* Burbuja */}
            <div className={`max-w-[75%] ${m.esMio ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
              <div className="flex items-center gap-2 text-xs text-[#9CA3AF]">
                {!m.esMio && (
                  <span className="font-semibold text-[#374151]">
                    {m.esAnonimo ? 'Vecino anónimo' : m.autor}
                    {(m.rol === 'ADMIN' || m.rol === 'COMITE') && (
                      <span className="ml-1 inline-flex items-center gap-0.5 text-[#F5C518]">
                        <Shield className="w-3 h-3" /> Comité
                      </span>
                    )}
                  </span>
                )}
                <span>{fmtFechaHora(m.createdAt)}</span>
              </div>
              <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                m.esMio
                  ? 'text-[#1A1A1A] rounded-br-sm'
                  : 'bg-white border border-[#E5E7EB] text-[#374151] rounded-bl-sm'
              }`}
              style={m.esMio ? { background: 'linear-gradient(135deg,#F5C518,#E6B800)' } : {}}>
                {m.contenido}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input de mensaje */}
      {!estaCerrada && (
        <form onSubmit={enviar} className="space-y-2">
          {error && <p className="text-red-700 text-xs">{error}</p>}

          {/* Toggle anónimo */}
          <label className="flex items-center gap-2.5 cursor-pointer px-1">
            <div
              onClick={() => setEsAnonimo(v => !v)}
              className={`w-10 h-5 rounded-full transition-all flex items-center px-0.5 cursor-pointer ${esAnonimo ? 'bg-[#374151]' : 'bg-[#E5E7EB]'}`}
            >
              <span className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${esAnonimo ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
            <span className="text-xs text-[#6B7280] font-medium flex items-center gap-1">
              <UserX className="w-3.5 h-3.5" />
              Comentar como <strong className={esAnonimo ? 'text-[#374151]' : 'text-[#9CA3AF]'}>
                {esAnonimo ? 'Vecino anónimo' : 'tu nombre'}
              </strong>
            </span>
          </label>

          <div className="flex gap-2">
            <input
              type="text"
              value={texto}
              onChange={e => setTexto(e.target.value)}
              placeholder={esAnonimo ? 'Mensaje anónimo...' : 'Escribe tu intervención...'}
              className="input flex-1 text-sm"
              disabled={enviando}
              maxLength={1000}
            />
            <button type="submit" disabled={enviando || !texto.trim()} className="btn-yellow px-4">
              {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>

          {esAnonimo && (
            <p className="text-[10px] text-[#9CA3AF] pl-1">
              Tu identidad no sera visible para otros vecinos. El comite puede verla con fines de moderacion.
            </p>
          )}
        </form>
      )}

      {estaCerrada && (
        <div className="card p-4 text-center text-sm text-[#6B7280]">
          Esta asamblea fue cerrada. El acta esta disponible en Historico.
        </div>
      )}
    </div>
  );
}
