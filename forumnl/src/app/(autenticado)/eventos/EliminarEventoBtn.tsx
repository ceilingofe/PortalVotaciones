'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Loader2, AlertTriangle } from 'lucide-react';

interface Props {
  asambleaId: string;
  titulo: string;
  /** Si true, después de borrar redirige a /eventos en lugar de refresh */
  redirigir?: boolean;
}

export function EliminarEventoBtn({ asambleaId, titulo, redirigir = false }: Props) {
  const router = useRouter();
  const [modal, setModal] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState('');

  async function eliminar() {
    setCargando(true);
    setError(null);
    try {
      const r = await fetch(`/api/eventos/${asambleaId}/eliminar`, { method: 'DELETE' });
      const j = await r.json();
      if (!r.ok || !j.ok) { setError(j.message || 'No se pudo eliminar.'); return; }
      setModal(false);
      if (redirigir) router.push('/eventos');
      else router.refresh();
    } catch (e: any) {
      setError(e?.message || 'Error de red.');
    } finally {
      setCargando(false);
    }
  }

  const puedeConfirmar = confirmText.trim().toLowerCase() === 'eliminar';

  return (
    <>
      <button
        onClick={() => { setModal(true); setConfirmText(''); setError(null); }}
        className="btn-ghost btn-sm text-red-500 hover:text-red-700 hover:bg-red-50"
        title="Eliminar evento"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      {modal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
          onClick={() => !cargando && setModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Icono de advertencia */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h2 className="font-bold text-lg text-[#1A1A1A]">Eliminar evento</h2>
                <p className="text-sm text-[#6B7280]">Esta acción es permanente e irreversible</p>
              </div>
            </div>

            {/* Nombre del evento */}
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
              <p className="text-sm font-semibold text-red-900">"{titulo}"</p>
            </div>

            {/* Lista de lo que se borrará */}
            <p className="text-sm text-[#374151] mb-2 font-medium">Se eliminará permanentemente:</p>
            <ul className="text-xs text-[#6B7280] space-y-1 mb-5 ml-2">
              {[
                'Todos los votos y el padrón',
                'Las actas generadas',
                'El seguimiento y sus actualizaciones',
                'Las publicaciones en el feed',
                'Todos los datos del proceso',
              ].map(item => (
                <li key={item} className="flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-red-400 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>

            {/* Confirmación por texto */}
            <div className="mb-4">
              <label className="label text-xs">
                Escribe <strong className="font-black text-[#1A1A1A]">eliminar</strong> para confirmar
              </label>
              <input
                type="text"
                className="input"
                placeholder="eliminar"
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                disabled={cargando}
                autoComplete="off"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-3 text-sm mb-4">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setModal(false)}
                disabled={cargando}
                className="btn-outline flex-1 justify-center"
              >
                Cancelar
              </button>
              <button
                onClick={eliminar}
                disabled={cargando || !puedeConfirmar}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm
                  bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {cargando
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <><Trash2 className="w-4 h-4" /> Eliminar definitivamente</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
