'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Loader2, AlertCircle } from 'lucide-react';

/** Normaliza rutas locales — evita double-slash */
function normalizarRuta(p: string | null | undefined): string | null {
  if (!p) return null;
  if (p.startsWith('http://') || p.startsWith('https://')) return p;
  return p.startsWith('/') ? p : `/${p}`;
}

interface Opcion {
  id: string;
  nombre: string;
  descripcion: string;
  imagenPath: string | null;
  integrantes: { puesto: string; nombre: string }[];
}

export function BoletaCliente({
  procesoId, titulo, subtitulo, tipo, reglas, opciones,
}: {
  procesoId: string;
  titulo: string;
  subtitulo: string;
  tipo: string;
  reglas: string;
  opciones: Opcion[];
}) {
  const router = useRouter();
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const [principal, setPrincipal] = useState<string | null>(null);
  const [secundaria, setSecundaria] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const esPriorizacion = tipo === 'PRIORIZACION_PUNTAJE';
  const mismaOpcion = esPriorizacion && principal !== null && principal === secundaria;
  const puedeEnviar = esPriorizacion
    ? principal !== null && secundaria !== null && principal !== secundaria
    : seleccion !== null;

  const handlePrincipal = (id: string) => {
    setPrincipal(id);
    if (secundaria === id) setSecundaria(null);
  };
  const handleSecundaria = (id: string) => {
    setSecundaria(id);
    if (principal === id) setPrincipal(null);
  };

  async function emitirVoto() {
    setEnviando(true);
    setError(null);
    const contenido = esPriorizacion ? { principal, secundaria } : { opcionId: seleccion };
    try {
      const r = await fetch(`/api/eventos/${procesoId}/voto`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ contenido }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) { setError(j.message || 'No se pudo registrar el voto.'); setEnviando(false); return; }
      router.refresh();
    } catch (e: any) {
      setError(e?.message || 'Error de red.');
      setEnviando(false);
    }
  }

  return (
    <div className="boleta-wrapper">
      {/* Header */}
      <div className="boleta-header">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-ieepc.png" alt="IEEPCNL" style={{ height: '36px', width: 'auto', mixBlendMode: 'screen' }} />
        <div className="flex-1">
          <p className="text-xs text-[#F5C518] font-bold uppercase tracking-wider">Boleta oficial</p>
          <p className="text-white font-semibold text-sm leading-tight">{titulo}</p>
        </div>
        <ShieldCheck className="w-6 h-6 text-[#F5C518] shrink-0" />
      </div>

      <div className="p-6">
        <div className="bg-[#FFFBEB] border border-[#F5C518]/40 rounded-xl p-3 text-xs text-[#92400E] mb-5">
          <p className="font-bold mb-0.5">🔒 Tu voto es secreto e irrevocable</p>
          {esPriorizacion ? (
            <p>Selecciona tu prioridad <strong>principal</strong> (2 puntos) y la <strong>secundaria</strong> (1 punto). <strong>No puedes elegir la misma opción dos veces.</strong></p>
          ) : (
            <p>Elige <strong>una sola opción</strong>. No se puede cambiar después.</p>
          )}
        </div>

        {mismaOpcion && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-xs mb-4">
            <AlertCircle className="w-4 h-4 shrink-0" />
            No puedes elegir la misma opción como principal y secundaria.
          </div>
        )}
        {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm mb-4">{error}</div>}

        <div className="space-y-3 mb-6">
          {opciones.map((o) => {
            const imgSrc = normalizarRuta(o.imagenPath);
            const esPpal = principal === o.id;
            const esSec = secundaria === o.id;
            const esSel = seleccion === o.id;

            return (
              <div key={o.id} className={`border-2 rounded-2xl overflow-hidden transition-all ${(esPpal || esSec || esSel) ? 'border-[#F5C518]' : 'border-[#E5E7EB] hover:border-[#F5C518]/40'}`}>
                {/* Imagen de la opción */}
                {imgSrc && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imgSrc}
                    alt={o.nombre}
                    className="w-full object-cover"
                    style={{ maxHeight: '120px' }}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  />
                )}

                <div className="p-4">
                  {esPriorizacion ? (
                    <div className="flex items-start gap-4">
                      <div className="flex flex-col gap-2 shrink-0 pt-0.5">
                        <label className={`flex items-center gap-1.5 cursor-pointer text-xs font-semibold ${esPpal ? 'text-[#92400E]' : 'text-[#6B7280]'}`}>
                          <input type="radio" name="principal" checked={esPpal} onChange={() => handlePrincipal(o.id)} className="accent-[#F5C518] w-4 h-4" />
                          <span>Principal</span>
                          {esPpal && <span className="bg-[#F5C518] text-[#1A1A1A] text-[10px] font-black px-1.5 rounded-full">2pts</span>}
                        </label>
                        <label className={`flex items-center gap-1.5 cursor-pointer text-xs font-semibold ${esSec ? 'text-[#374151]' : 'text-[#6B7280]'} ${esPpal ? 'opacity-40 pointer-events-none' : ''}`}>
                          <input type="radio" name="secundaria" checked={esSec} onChange={() => handleSecundaria(o.id)} disabled={esPpal} className="accent-[#9CA3AF] w-4 h-4" />
                          <span>Secundaria</span>
                          {esSec && <span className="bg-[#E5E7EB] text-[#374151] text-[10px] font-black px-1.5 rounded-full">1pt</span>}
                        </label>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-[#1A1A1A] leading-tight">{o.nombre}</h3>
                        <p className="text-sm text-[#6B7280] mt-0.5 line-clamp-2">{o.descripcion}</p>
                      </div>
                    </div>
                  ) : (
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input type="radio" name="opcion" checked={esSel} onChange={() => setSeleccion(o.id)} className="mt-0.5 w-5 h-5 accent-[#F5C518]" />
                      <div className="flex-1">
                        <h3 className="font-bold text-[#1A1A1A]">{o.nombre}</h3>
                        <p className="text-sm text-[#6B7280] mt-0.5">{o.descripcion}</p>
                        {o.integrantes.length > 0 && (
                          <ul className="mt-2 text-xs text-[#6B7280] space-y-0.5">
                            {o.integrantes.map((integ, i) => (
                              <li key={i}><strong className="text-[#374151]">{integ.puesto}:</strong> {integ.nombre}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </label>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {esPriorizacion && (principal || secundaria) && (
          <div className="bg-[#F9FAFB] rounded-xl p-3 mb-4 text-sm">
            <p className="font-semibold text-xs uppercase tracking-wider text-[#9CA3AF] mb-1.5">Tu selección:</p>
            {principal && <div className="flex items-center gap-2 mb-1"><span className="badge badge-yellow text-xs">Principal</span><span className="font-medium text-sm">{opciones.find(o => o.id === principal)?.nombre}</span></div>}
            {secundaria && <div className="flex items-center gap-2"><span className="badge badge-gray text-xs">Secundaria</span><span className="font-medium text-sm">{opciones.find(o => o.id === secundaria)?.nombre}</span></div>}
          </div>
        )}

        <button disabled={!puedeEnviar || enviando} onClick={() => setConfirmando(true)} className="btn-yellow w-full py-3 text-base font-bold disabled:opacity-40 disabled:cursor-not-allowed">
          {enviando ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Emitir voto'}
        </button>
      </div>

      {confirmando && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={() => setConfirmando(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">🗳️</div>
              <h2 className="font-extrabold text-xl">¿Confirmar voto?</h2>
              <p className="text-sm text-[#6B7280] mt-1">Esta acción es irreversible.</p>
            </div>
            {esPriorizacion && (
              <div className="bg-[#FFFBEB] rounded-xl p-3 mb-4 space-y-1 text-sm">
                {principal && <p><span className="badge badge-yellow mr-2">Principal</span>{opciones.find(o => o.id === principal)?.nombre}</p>}
                {secundaria && <p><span className="badge badge-gray mr-2">Secundaria</span>{opciones.find(o => o.id === secundaria)?.nombre}</p>}
              </div>
            )}
            {!esPriorizacion && seleccion && (
              <div className="bg-[#FFFBEB] rounded-xl p-3 mb-4 text-sm font-medium text-center">
                {opciones.find(o => o.id === seleccion)?.nombre}
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => setConfirmando(false)} className="btn-outline flex-1 justify-center">Cancelar</button>
              <button onClick={() => { setConfirmando(false); emitirVoto(); }} className="btn-yellow flex-1 justify-center font-bold">
                Confirmar voto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
