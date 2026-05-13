'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Trash2, Loader2, ChevronDown } from 'lucide-react';

export function ReabrirVotacionBtn({ asambleaId }: { asambleaId: string }) {
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const [modal, setModal] = useState<'reabrir' | 'resetear' | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ejecutar(tipo: 'reabrir' | 'resetear') {
    setCargando(true);
    setError(null);
    try {
      const r = await fetch(`/api/eventos/${asambleaId}/reabrir`, {
        method: tipo === 'reabrir' ? 'POST' : 'DELETE',
      });
      const j = await r.json();
      if (!r.ok || !j.ok) { setError(j.message || 'Error.'); return; }
      setModal(null);
      router.refresh();
    } catch (e: any) {
      setError(e?.message || 'Error de red.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <>
      <div className="relative">
        <button onClick={() => setMenu((v) => !v)} className="btn-ghost btn-sm text-[#9CA3AF] hover:text-[#1A1A1A]">
          <ChevronDown className="w-4 h-4" /> Admin
        </button>
        {menu && (
          <div className="absolute right-0 mt-1 bg-white rounded-xl border border-[#E5E7EB] shadow-xl w-56 overflow-hidden z-10">
            <button
              onClick={() => { setMenu(false); setModal('reabrir'); }}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium hover:bg-[#F9FAFB] text-left"
            >
              <RefreshCw className="w-4 h-4 text-blue-600" />
              <div>
                <p className="font-semibold">Reabrir votación</p>
                <p className="text-[10px] text-[#9CA3AF]">Conserva los votos emitidos</p>
              </div>
            </button>
            <div className="border-t border-[#E5E7EB]" />
            <button
              onClick={() => { setMenu(false); setModal('resetear'); }}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium hover:bg-red-50 text-left text-red-600"
            >
              <Trash2 className="w-4 h-4" />
              <div>
                <p className="font-semibold">Resetear y borrar votos</p>
                <p className="text-[10px] text-red-400">Para pruebas — irreversible</p>
              </div>
            </button>
          </div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={() => !cargando && setModal(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-bold text-lg mb-2">
              {modal === 'reabrir' ? '¿Reabrir votación?' : '⚠️ ¿Resetear y borrar votos?'}
            </h2>
            <p className="text-sm text-[#6B7280] mb-5">
              {modal === 'reabrir'
                ? 'Se reabrirá la jornada de votación. Los votos ya emitidos se conservan y no podrán cambiarse. El acta será borrada.'
                : 'Esto borrará TODOS los votos emitidos, el acta y los resultados. Es irreversible y solo para pruebas de desarrollo.'}
            </p>
            {error && <p className="text-red-700 text-sm mb-3">{error}</p>}
            <div className="flex gap-2">
              <button onClick={() => setModal(null)} disabled={cargando} className="btn-outline flex-1 justify-center">Cancelar</button>
              <button
                onClick={() => ejecutar(modal)}
                disabled={cargando}
                className={`flex-1 justify-center ${modal === 'resetear' ? 'btn-danger' : 'btn-primary'} btn`}
              >
                {cargando
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : modal === 'reabrir' ? 'Reabrir' : 'Borrar y resetear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
