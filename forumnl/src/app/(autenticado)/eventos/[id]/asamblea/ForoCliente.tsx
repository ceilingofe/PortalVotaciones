'use client';

import { useEffect, useRef, useState } from 'react';
import { Send, Sparkles, Loader2, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Mensaje { id: string; autor: string; esModerador: boolean; contenido: string; createdAt: string; }

export function ForoCliente({
  asambleaId,
  mensajesIniciales,
  usuarioId,
  esModerador,
}: {
  asambleaId: string;
  mensajesIniciales: Mensaje[];
  usuarioId: string;
  esModerador: boolean;
}) {
  const [mensajes, setMensajes] = useState(mensajesIniciales);
  const [nuevo, setNuevo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [resumen, setResumen] = useState<string | null>(null);
  const [generandoResumen, setGenerandoResumen] = useState(false);
  const fin = useRef<HTMLDivElement>(null);

  useEffect(() => { fin.current?.scrollIntoView({ behavior: 'smooth' }); }, [mensajes]);

  useEffect(() => {
    const id = setInterval(async () => {
      const r = await fetch(`/api/eventos/${asambleaId}/asamblea/mensajes`);
      if (r.ok) {
        const j = await r.json();
        if (j.ok) setMensajes(j.mensajes);
      }
    }, 8000);
    return () => clearInterval(id);
  }, [asambleaId]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevo.trim()) return;
    setEnviando(true);
    const r = await fetch(`/api/eventos/${asambleaId}/asamblea/mensajes`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ contenido: nuevo }),
    });
    const j = await r.json();
    if (j.ok) {
      setMensajes([...mensajes, j.mensaje]);
      setNuevo('');
    }
    setEnviando(false);
  }

  async function generarResumen() {
    setGenerandoResumen(true);
    setResumen(null);
    const r = await fetch(`/api/eventos/${asambleaId}/asamblea/resumen`, { method: 'POST' });
    const j = await r.json();
    if (j.ok) setResumen(j.resumen);
    else setResumen(`Error: ${j.message}`);
    setGenerandoResumen(false);
  }

  return (
    <div className="space-y-4">
      {esModerador && (
        <div className="card p-4 bg-ieepc-black text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold flex items-center gap-2"><Shield className="w-4 h-4" /> Panel de moderación</h3>
            <button onClick={generarResumen} disabled={generandoResumen} className="btn-yellow text-xs px-3 py-1.5">
              {generandoResumen ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              Generar resumen IA
            </button>
          </div>
          {resumen && (
            <pre className="text-xs bg-white/10 p-3 rounded mt-2 whitespace-pre-wrap max-h-64 overflow-auto">{resumen}</pre>
          )}
        </div>
      )}

      <div className="card p-4 h-[400px] overflow-y-auto space-y-3 bg-gray-50">
        {mensajes.length === 0 && (
          <p className="text-center text-ieepc-gray text-sm mt-8">Sé el primero en participar.</p>
        )}
        {mensajes.map((m) => (
          <div key={m.id} className="flex gap-2">
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0',
              m.esModerador ? 'bg-ieepc-black text-ieepc-yellow' : 'bg-ieepc-yellow text-ieepc-black'
            )}>
              {m.autor.split(' ').map((s) => s[0]).slice(0, 2).join('')}
            </div>
            <div className="flex-1">
              <div className="flex items-baseline gap-2">
                <p className="text-xs font-medium">{m.autor}</p>
                {m.esModerador && <span className="badge badge-yellow text-[10px]">Comité</span>}
                <p className="text-[10px] text-ieepc-gray">{new Date(m.createdAt).toLocaleString('es-MX', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</p>
              </div>
              <p className="text-sm bg-white border border-ieepc-gray-light rounded-lg px-3 py-2 mt-0.5">{m.contenido}</p>
            </div>
          </div>
        ))}
        <div ref={fin} />
      </div>

      <form onSubmit={enviar} className="flex gap-2">
        <input
          type="text"
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          placeholder="Escribe tu participación..."
          className="input flex-1"
          disabled={enviando}
          maxLength={500}
        />
        <button type="submit" disabled={enviando || !nuevo.trim()} className="btn-yellow">
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
