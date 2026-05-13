'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Loader2, XCircle } from 'lucide-react';

function normRuta(p: string|null|undefined): string|null {
  if(!p) return null; if(p.startsWith('http')) return p; return p.startsWith('/')?p:`/${p}`;
}

interface Opcion { id:string; nombre:string; descripcion:string; imagenPath:string|null; integrantes:{puesto:string;nombre:string}[]; }
const NULO = '__VOTO_NULO__';

export function BoletaCliente({procesoId,titulo,tipo,opciones}:{procesoId:string;titulo:string;subtitulo:string;tipo:string;reglas:string;opciones:Opcion[]}) {
  const router=useRouter();
  const [sel,  setSel]    = useState<string|null>(null);
  const [ppal, setPpal]   = useState<string|null>(null);
  const [sec,  setSec]    = useState<string|null>(null);
  const [conf, setConf]   = useState(false);
  const [env,  setEnv]    = useState(false);
  const [err,  setErr]    = useState<string|null>(null);

  const esPrio  = tipo==='PRIORIZACION_PUNTAJE';
  const esNulo  = sel===NULO;
  const puedeEnviar = esNulo || (esPrio?ppal!==null&&sec!==null&&ppal!==sec:sel!==null);

  function selectPpal(id:string){setPpal(id);if(sec===id)setSec(null);setSel(null);}
  function selectSec(id:string){setSec(id);if(ppal===id)setPpal(null);setSel(null);}
  function selectNulo(){setSel(NULO);setPpal(null);setSec(null);}

  async function emitir() {
    setEnv(true);setErr(null);
    const contenido=esNulo?{tipo:'nulo'}:esPrio?{principal:ppal,secundaria:sec}:{opcionId:sel};
    try {
      const r=await fetch(`/api/eventos/${procesoId}/voto`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({contenido})});
      const j=await r.json();
      if(!r.ok||!j.ok){setErr(j.message||'Error al registrar el voto.');setEnv(false);return;}
      router.refresh();
    } catch(e:any){setErr(e?.message||'Error de red.');setEnv(false);}
  }

  return (
    <div className="boleta-wrapper">
      <div className="boleta-header">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-ieepc.png" alt="IEEPCNL" style={{height:'36px',width:'auto',mixBlendMode:'screen'}}/>
        <div className="flex-1"><p className="text-xs text-[#F5C518] font-bold uppercase tracking-wider">Boleta oficial</p><p className="text-white font-semibold text-sm leading-tight">{titulo}</p></div>
        <ShieldCheck className="w-6 h-6 text-[#F5C518] shrink-0"/>
      </div>

      <div className="p-6">
        <div className="bg-[#FFFBEB] border border-[#F5C518]/40 rounded-xl p-3 text-xs text-[#92400E] mb-5">
          <p className="font-bold mb-0.5">Tu voto es secreto e irrevocable</p>
          {esPrio?<p>Elige prioridad <strong>principal</strong> (2 pts) y <strong>secundaria</strong> (1 pt). No puedes elegir la misma opción dos veces. Puedes anular tu voto.</p>
                 :<p>Elige una opción o anula tu voto. No se puede cambiar después.</p>}
        </div>

        {err&&<div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm mb-4">{err}</div>}

        <div className="space-y-3 mb-4">
          {/* Opciones regulares */}
          {opciones.map(o=>{
            const img=normRuta(o.imagenPath);
            const ePpal=ppal===o.id, eSec=sec===o.id, eSel=sel===o.id;
            const marcado=ePpal||eSec||eSel;
            return (
              <div key={o.id} className={`border-2 rounded-2xl overflow-hidden transition-all ${marcado?'border-[#F5C518]':'border-[#E5E7EB] hover:border-[#F5C518]/40'}`}>
                {img&&<img src={img} alt={o.nombre} className="w-full object-cover" style={{maxHeight:120}} onError={e=>{(e.currentTarget.parentElement as HTMLElement).style.display='none';}}/>}
                <div className="p-4">
                  {esPrio?(
                    <div className="flex items-start gap-4">
                      <div className="flex flex-col gap-2 shrink-0 pt-0.5">
                        <label className={`flex items-center gap-1.5 cursor-pointer text-xs font-semibold ${ePpal?'text-[#92400E]':'text-[#6B7280]'}`}>
                          <input type="radio" name="ppal" checked={ePpal} onChange={()=>selectPpal(o.id)} className="accent-[#F5C518] w-4 h-4"/>
                          <span>Principal</span>{ePpal&&<span className="bg-[#F5C518] text-[#1A1A1A] text-[10px] font-black px-1.5 rounded-full">2pts</span>}
                        </label>
                        <label className={`flex items-center gap-1.5 cursor-pointer text-xs font-semibold ${eSec?'text-[#374151]':'text-[#6B7280]'} ${ePpal?'opacity-40 pointer-events-none':''}`}>
                          <input type="radio" name="sec" checked={eSec} onChange={()=>selectSec(o.id)} disabled={ePpal} className="accent-[#9CA3AF] w-4 h-4"/>
                          <span>Secundaria</span>{eSec&&<span className="bg-[#E5E7EB] text-[#374151] text-[10px] font-black px-1.5 rounded-full">1pt</span>}
                        </label>
                      </div>
                      <div className="flex-1 min-w-0"><h3 className="font-bold text-[#1A1A1A] leading-tight">{o.nombre}</h3><p className="text-sm text-[#6B7280] mt-0.5 line-clamp-2">{o.descripcion}</p></div>
                    </div>
                  ):(
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input type="radio" name="opcion" checked={eSel} onChange={()=>{setSel(o.id);setPpal(null);setSec(null);}} className="mt-0.5 w-5 h-5 accent-[#F5C518]"/>
                      <div className="flex-1">
                        <h3 className="font-bold text-[#1A1A1A]">{o.nombre}</h3><p className="text-sm text-[#6B7280] mt-0.5">{o.descripcion}</p>
                        {o.integrantes.length>0&&<ul className="mt-2 text-xs text-[#6B7280] space-y-0.5">{o.integrantes.map((i,j)=><li key={j}><strong className="text-[#374151]">{i.puesto}:</strong> {i.nombre}</li>)}</ul>}
                      </div>
                    </label>
                  )}
                </div>
              </div>
            );
          })}

          {/* Opción anular — SIEMPRE disponible */}
          <div onClick={selectNulo} className={`border-2 rounded-2xl p-4 cursor-pointer transition-all ${esNulo?'border-red-400 bg-red-50':'border-[#E5E7EB] hover:border-red-300 hover:bg-red-50/40'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${esNulo?'border-red-500 bg-red-500':'border-[#D1D5DB]'}`}>
                {esNulo&&<XCircle className="w-3 h-3 text-white"/>}
              </div>
              <div>
                <p className="font-bold text-[#374151] text-sm">Anular mi voto</p>
                <p className="text-xs text-[#9CA3AF]">Participo pero no me inclino por ninguna opción. Cuenta como participación.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Resumen priorización */}
        {esPrio&&(ppal||sec)&&!esNulo&&(
          <div className="bg-[#F9FAFB] rounded-xl p-3 mb-4 text-sm">
            <p className="font-semibold text-xs uppercase tracking-wider text-[#9CA3AF] mb-1.5">Tu selección:</p>
            {ppal&&<div className="flex items-center gap-2 mb-1"><span className="badge badge-yellow text-xs">Principal</span><span className="font-medium">{opciones.find(o=>o.id===ppal)?.nombre}</span></div>}
            {sec&&<div className="flex items-center gap-2"><span className="badge badge-gray text-xs">Secundaria</span><span className="font-medium">{opciones.find(o=>o.id===sec)?.nombre}</span></div>}
          </div>
        )}

        <button disabled={!puedeEnviar||env} onClick={()=>setConf(true)}
          className={`w-full py-3 text-base font-bold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed ${esNulo?'bg-red-500 text-white hover:bg-red-600':'btn-yellow'}`}>
          {env?<Loader2 className="w-5 h-5 animate-spin"/>:esNulo?'Confirmar voto nulo':'Emitir voto'}
        </button>
      </div>

      {/* Modal */}
      {conf&&(
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={()=>setConf(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={e=>e.stopPropagation()}>
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">{esNulo?'🚫':'🗳️'}</div>
              <h2 className="font-extrabold text-xl">{esNulo?'¿Anular tu voto?':'¿Confirmar voto?'}</h2>
              <p className="text-sm text-[#6B7280] mt-1">Esta acción es irreversible.</p>
            </div>
            {esNulo&&<div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-sm text-red-700">Confirmas que deseas anular tu voto. Seguirás contando como participante.</div>}
            {!esNulo&&esPrio&&(
              <div className="bg-[#FFFBEB] rounded-xl p-3 mb-4 space-y-1 text-sm">
                {ppal&&<p><span className="badge badge-yellow mr-2">Principal</span>{opciones.find(o=>o.id===ppal)?.nombre}</p>}
                {sec&&<p><span className="badge badge-gray mr-2">Secundaria</span>{opciones.find(o=>o.id===sec)?.nombre}</p>}
              </div>
            )}
            {!esNulo&&!esPrio&&sel&&<div className="bg-[#FFFBEB] rounded-xl p-3 mb-4 text-sm font-medium text-center">{opciones.find(o=>o.id===sel)?.nombre}</div>}
            <div className="flex gap-2">
              <button onClick={()=>setConf(false)} className="btn-outline flex-1 justify-center">Cancelar</button>
              <button onClick={()=>{setConf(false);emitir();}}
                className={`flex-1 justify-center font-bold flex items-center justify-center py-2.5 rounded-xl ${esNulo?'bg-red-500 text-white':'btn-yellow'}`}>
                {esNulo?'Sí, anular':'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
