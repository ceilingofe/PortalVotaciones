'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FlaskConical, Loader2 } from 'lucide-react';

export function TestVotacionBtn() {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);
  const [modal, setModal] = useState(false);

  async function crearTest() {
    setCargando(true);
    try {
      const r = await fetch('/api/admin/seed-test-votacion', { method: 'POST' });
      const j = await r.json();
      if (j.ok) {
        setModal(false);
        router.refresh();
      } else {
        alert(j.message || 'Error al crear votación de prueba.');
      }
    } finally {
      setCargando(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setModal(true)}
        className="btn-outline btn-sm text-[#6B7280] border-dashed"
        title="Solo visible para administradores"
      >
        <FlaskConical className="w-4 h-4" /> Votación de prueba
      </button>

      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={() => setModal(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] flex items-center justify-center">
                <FlaskConical className="w-5 h-5 text-[#F5C518]" />
              </div>
              <div>
                <h2 className="font-bold">Votación de prueba</h2>
                <p className="text-xs text-[#9CA3AF]">Solo visible para administradores</p>
              </div>
            </div>

            <div className="bg-[#F9FAFB] rounded-xl p-3 text-sm text-[#374151] mb-5 space-y-1">
              <p>Crea una nueva <strong>Elección de Mesa Directiva</strong> de prueba con:</p>
              <ul className="list-disc list-inside text-xs text-[#6B7280] mt-1 space-y-0.5">
                <li>3 planillas pre-configuradas</li>
                <li>Imágenes de las planillas del directorio público</li>
                <li>Padrón de todos los vecinos verificados</li>
                <li>Estado: abierta (lista para votar)</li>
              </ul>
              <p className="text-xs text-orange-600 mt-2 font-medium">
                ⚠️ Se puede resetear después desde la lista de eventos.
              </p>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setModal(false)} className="btn-outline flex-1 justify-center">Cancelar</button>
              <button onClick={crearTest} disabled={cargando} className="btn-yellow flex-1 justify-center">
                {cargando ? <Loader2 className="w-4 h-4 animate-spin" /> : '🚀 Crear prueba'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
