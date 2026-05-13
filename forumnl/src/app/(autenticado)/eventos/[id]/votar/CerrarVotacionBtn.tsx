'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { XCircle, Loader2, AlertTriangle } from 'lucide-react';

export function CerrarVotacionBtn({ asambleaId, titulo }: { asambleaId: string; titulo: string }) {
  const router = useRouter();
  const [modal, setModal] = useState(false);
  const [cerrando, setCerrando] = useState(false);
  const [incidencias, setIncidencias] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function cerrar() {
    setCerrando(true);
    setError(null);
    try {
      const r = await fetch(`/api/eventos/${asambleaId}/cerrar`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ incidencias: incidencias.trim() }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) { setError(j.message || 'Error al cerrar.'); return; }
      setModal(false);
      router.refresh();
    } catch (e: any) {
      setError(e?.message || 'Error de red.');
    } finally {
      setCerrando(false);
    }
  }

  return (
    <>
      <button onClick={() => setModal(true)} className="btn-danger btn-sm">
        <XCircle className="w-4 h-4" /> Cerrar votación
      </button>

      {modal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
          onClick={() => !cerrando && setModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="font-bold text-lg text-[#1A1A1A]">Cerrar votación</h2>
                <p className="text-sm text-[#6B7280]">Esta acción no se puede deshacer fácilmente</p>
              </div>
            </div>

            <div className="bg-[#FEF3C7] border border-[#F5C518] rounded-xl p-3 mb-5 text-sm text-[#92400E]">
              <strong>{titulo}</strong>
              <ul className="mt-1.5 space-y-0.5 text-xs">
                <li>✓ Se computarán los resultados finales</li>
                <li>✓ Se generará el acta en Histórico</li>
                <li>✓ Se publicarán los resultados en el feed</li>
              </ul>
            </div>

            {/* Incidencias */}
            <div className="mb-5">
              <label className="label">
                Incidencias durante la jornada
                <span className="text-[#9CA3AF] font-normal ml-1">(opcional)</span>
              </label>
              <textarea
                value={incidencias}
                onChange={(e) => setIncidencias(e.target.value)}
                className="input min-h-[90px] resize-none"
                placeholder="Describe cualquier incidencia ocurrida durante la jornada: interrupciones, reclamos, problemas técnicos, votos impugnados, etc. Si no hubo incidencias, deja este campo vacío."
                disabled={cerrando}
              />
              <p className="text-xs text-[#9CA3AF] mt-1">
                Las incidencias se incluirán en el acta oficial de la votación.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-3 text-sm mb-4">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setModal(false)}
                disabled={cerrando}
                className="btn-outline flex-1 justify-center"
              >
                Cancelar
              </button>
              <button
                onClick={cerrar}
                disabled={cerrando}
                className="btn-danger flex-1 justify-center"
              >
                {cerrando
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Cerrando...</>
                  : <><XCircle className="w-4 h-4" /> Sí, cerrar votación</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
