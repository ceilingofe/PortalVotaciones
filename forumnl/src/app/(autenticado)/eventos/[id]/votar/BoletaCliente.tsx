'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Loader2 } from 'lucide-react';

interface Opcion {
  id: string;
  nombre: string;
  descripcion: string;
  integrantes: { puesto: string; nombre: string }[];
}

export function BoletaCliente({
  procesoId,
  titulo,
  subtitulo,
  tipo,
  reglas,
  opciones,
}: {
  procesoId: string;
  titulo: string;
  subtitulo: string;
  tipo: string;
  reglas: string;
  opciones: Opcion[];
}) {
  const router = useRouter();
  const [seleccion, setSeleccion] = useState<string | null>(null);  // para elección
  const [principal, setPrincipal] = useState<string | null>(null);  // priorización
  const [secundaria, setSecundaria] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const esPriorizacion = tipo === 'PRIORIZACION_PUNTAJE';
  const puedeEnviar = esPriorizacion
    ? principal && secundaria && principal !== secundaria
    : seleccion !== null;

  async function emitirVoto() {
    setEnviando(true);
    setError(null);

    const contenido = esPriorizacion
      ? { principal, secundaria }
      : { opcionId: seleccion };

    try {
      const r = await fetch(`/api/eventos/${procesoId}/voto`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ contenido }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) {
        setError(j.message || 'No se pudo emitir el voto.');
        setEnviando(false);
        return;
      }
      router.refresh();
    } catch (e: any) {
      setError(e?.message || 'Error de red.');
      setEnviando(false);
    }
  }

  return (
    <div className="card p-6 border-2 border-ieepc-yellow">
      <div className="border-b-2 border-dashed border-ieepc-gray-light pb-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="w-5 h-5 text-ieepc-yellow-dark" />
          <span className="text-xs font-bold uppercase tracking-wider text-ieepc-gray">Boleta oficial</span>
        </div>
        <h1 className="text-xl font-bold">{titulo}</h1>
        <p className="text-sm text-ieepc-gray">{subtitulo}</p>
      </div>

      <div className="bg-ieepc-yellow/10 border border-ieepc-yellow/30 rounded-lg p-3 text-xs mb-4">
        <p className="font-semibold mb-1">🔒 Tu voto es secreto</p>
        {esPriorizacion ? (
          <p>
            Selecciona tu prioridad <strong>principal</strong> (vale 2 puntos) y tu prioridad{' '}
            <strong>secundaria</strong> (vale 1 punto). No puedes repetir opción.
          </p>
        ) : (
          <p>Elige una sola opción. Una vez emitido no podrás cambiar tu voto.</p>
        )}
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg text-sm mb-4">{error}</div>}

      <div className="space-y-3">
        {opciones.map((o) => {
          const seleccionada = esPriorizacion
            ? principal === o.id || secundaria === o.id
            : seleccion === o.id;

          return (
            <label
              key={o.id}
              className={`block border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                seleccionada ? 'border-ieepc-yellow bg-ieepc-yellow/10' : 'border-ieepc-gray-light hover:border-ieepc-gray'
              }`}
            >
              {esPriorizacion ? (
                <div className="flex items-start gap-3">
                  <div className="flex flex-col gap-1 shrink-0 mt-1">
                    <label className="flex items-center gap-1 text-xs cursor-pointer">
                      <input
                        type="radio"
                        name="principal"
                        checked={principal === o.id}
                        onChange={() => setPrincipal(o.id)}
                      />
                      <span>Principal (2pts)</span>
                    </label>
                    <label className="flex items-center gap-1 text-xs cursor-pointer">
                      <input
                        type="radio"
                        name="secundaria"
                        checked={secundaria === o.id}
                        onChange={() => setSecundaria(o.id)}
                      />
                      <span>Secundaria (1pt)</span>
                    </label>
                  </div>
                  <div>
                    <h3 className="font-semibold">{o.nombre}</h3>
                    <p className="text-sm text-ieepc-gray">{o.descripcion}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="opcion"
                    checked={seleccion === o.id}
                    onChange={() => setSeleccion(o.id)}
                    className="mt-1 w-5 h-5"
                  />
                  <div>
                    <h3 className="font-semibold">{o.nombre}</h3>
                    <p className="text-sm text-ieepc-gray">{o.descripcion}</p>
                    {o.integrantes.length > 0 && (
                      <ul className="mt-2 text-xs text-ieepc-gray space-y-0.5">
                        {o.integrantes.map((i, idx) => (
                          <li key={idx}>
                            <strong>{i.puesto}:</strong> {i.nombre}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </label>
          );
        })}
      </div>

      <button
        disabled={!puedeEnviar || enviando}
        onClick={() => setConfirmando(true)}
        className="btn-yellow w-full mt-6 justify-center text-base py-3"
      >
        {enviando ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Emitir voto'}
      </button>

      {confirmando && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setConfirmando(false)}>
          <div className="card p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-bold text-lg mb-2">¿Confirmar voto?</h2>
            <p className="text-sm text-ieepc-gray mb-5">Esta acción no se puede deshacer.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmando(false)} className="btn-outline flex-1 justify-center">Cancelar</button>
              <button onClick={() => { setConfirmando(false); emitirVoto(); }} className="btn-yellow flex-1 justify-center">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
