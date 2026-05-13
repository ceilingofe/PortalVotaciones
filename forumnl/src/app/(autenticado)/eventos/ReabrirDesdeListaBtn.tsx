'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Loader2, Trash2 } from 'lucide-react';

export function ReabrirDesdeListaBtn({ asambleaId }: { asambleaId: string }) {
  const router = useRouter();
  const [modal, setModal] = useState(false);
  const [modo, setModo] = useState<'reabrir' | 'resetear'>('reabrir');
  const [cargando, setCargando] = useState(false);

  async function ejecutar() {
    setCargando(true);
    const r = await fetch(`/api/eventos/${asambleaId}/reabrir`, {
      method: modo === 'reabrir' ? 'POST' : 'DELETE',
    });
    const j = await r.json();
    setCargando(false);
    if (j.ok) { setModal(false); router.refresh(); }
  }

  return (
    <>
      <button
        onClick={() => setModal(true)}
        className="btn-outline btn-sm flex items-center gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50"
        title="Opciones de admin"
      >
        <RefreshCw className="w-3.5 h-3.5" /> Reabrir
      </button>

      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={() => setModal(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <h2 className="font-bold text-lg mb-4">Opciones de admin</h2>
            <div className="space-y-2 mb-5">
              <label className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${modo === 'reabrir' ? 'border-blue-400 bg-blue-50' : 'border-[#E5E7EB]'}`}>
                <input type="radio" checked={modo === 'reabrir'} onChange={() => setModo('reabrir')} className="mt-0.5 accent-blue-600" />
                <div>
                  <p className="font-semibold text-sm flex items-center gap-2"><RefreshCw className="w-4 h-4 text-blue-600" /> Reabrir votación</p>
                  <p className="text-xs text-[#6B7280]">Conserva los votos existentes. Cambia el estado a "abierta".</p>
                </div>
              </label>
              <label className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${modo === 'resetear' ? 'border-red-400 bg-red-50' : 'border-[#E5E7EB]'}`}>
                <input type="radio" checked={modo === 'resetear'} onChange={() => setModo('resetear')} className="mt-0.5 accent-red-600" />
                <div>
                  <p className="font-semibold text-sm flex items-center gap-2"><Trash2 className="w-4 h-4 text-red-600" /> Resetear (borrar votos)</p>
                  <p className="text-xs text-[#6B7280]">Borra TODOS los votos, acta y resultados. Solo para pruebas.</p>
                </div>
              </label>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setModal(false)} className="btn-outline flex-1 justify-center">Cancelar</button>
              <button onClick={ejecutar} disabled={cargando} className={`flex-1 justify-center btn ${modo === 'resetear' ? 'btn-danger' : 'btn-primary'}`}>
                {cargando ? <Loader2 className="w-4 h-4 animate-spin" /> : modo === 'reabrir' ? 'Reabrir' : 'Resetear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
