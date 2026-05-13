'use client';

import { useState, useEffect } from 'react';
import { Accessibility, X, Bot } from 'lucide-react';
import Link from 'next/link';

type FontSize = 'normal' | 'grande' | 'extra';

const STYLES_ID = 'a11y-global-styles';

function applyPref(key: string, val: any) {
  const h = document.documentElement;
  if (key==='fontSize') { h.classList.remove('text-size-normal','text-size-grande','text-size-extra'); h.classList.add(`text-size-${val}`); }
  if (key==='hc')  h.classList.toggle('high-contrast', val);
  if (key==='rm')  h.classList.toggle('reduce-motion', val);
  if (key==='dx')  h.classList.toggle('dyslexia-mode', val);
}

function savePrefs(patch: Record<string,any>) {
  try { const p=JSON.parse(localStorage.getItem('forumnl_a11y')||'{}'); localStorage.setItem('forumnl_a11y',JSON.stringify({...p,...patch})); } catch {}
}

export function AccesibilidadBtn() {
  const [open, setOpen] = useState(false);
  const [fs, setFS]     = useState<FontSize>('normal');
  const [hc, setHC]     = useState(false);
  const [rm, setRM]     = useState(false);
  const [dx, setDX]     = useState(false);

  useEffect(()=>{
    if (!document.getElementById(STYLES_ID)) {
      const s = document.createElement('style'); s.id = STYLES_ID;
      s.textContent = `
        @import url('https://fonts.cdnfonts.com/css/open-dyslexic');
        .text-size-grande{font-size:112%!important}
        .text-size-extra{font-size:130%!important}
        .high-contrast,.high-contrast *{background-color:#000!important;color:#FFF!important;border-color:#FFF!important}
        .high-contrast a{color:#FFD740!important}
        .reduce-motion *,.reduce-motion *::before,.reduce-motion *::after{animation-duration:.01ms!important;transition-duration:.01ms!important}
        .dyslexia-mode,.dyslexia-mode *{font-family:'Open-Dyslexic','OpenDyslexic',Arial,sans-serif!important;letter-spacing:.05em!important;line-height:1.6!important}
      `;
      document.head.appendChild(s);
    }
    try {
      const p=JSON.parse(localStorage.getItem('forumnl_a11y')||'{}');
      if (p.fontSize)  { applyPref('fontSize',p.fontSize);  setFS(p.fontSize); }
      if (p.hc)        { applyPref('hc',p.hc);              setHC(p.hc); }
      if (p.rm)        { applyPref('rm',p.rm);              setRM(p.rm); }
      if (p.dx)        { applyPref('dx',p.dx);              setDX(p.dx); }
    } catch {}
  },[]);

  const toggles = [
    { key:'dx', label:'Fuente para dislexia',   desc:'Activa la fuente OpenDyslexic',       val:dx, fn:()=>{const n=!dx;applyPref('dx',n);setDX(n);savePrefs({dx:n});} },
    { key:'hc', label:'Alto contraste',          desc:'Fondo negro y texto blanco',           val:hc, fn:()=>{const n=!hc;applyPref('hc',n);setHC(n);savePrefs({hc:n});} },
    { key:'rm', label:'Reducir movimiento',      desc:'Desactiva animaciones',                val:rm, fn:()=>{const n=!rm;applyPref('rm',n);setRM(n);savePrefs({rm:n});} },
  ];

  const hayPrefs = fs!=='normal'||hc||rm||dx;

  return (
    <>
      <button onClick={()=>setOpen(v=>!v)}
        className="fixed bottom-6 right-4 z-50 w-12 h-12 rounded-full shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
        style={{background:'linear-gradient(135deg,#1A1A1A,#2D2D2D)',border:'2.5px solid #F5C518'}}
        aria-label="Accesibilidad">
        <Accessibility className="w-5 h-5 text-[#F5C518]"/>
        {hayPrefs&&<span className="absolute -top-1 -right-1 w-4 h-4 bg-[#F5C518] rounded-full border-2 border-[#1A1A1A] text-[#1A1A1A] text-[8px] font-black flex items-center justify-center">{(fs!=='normal'?1:0)+Number(hc)+Number(rm)+Number(dx)}</span>}
      </button>

      {open && (
        <div className="fixed bottom-24 right-4 z-50 bg-white rounded-2xl shadow-2xl border border-[#E5E7EB] overflow-hidden" style={{width:284}} role="dialog">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E7EB]" style={{background:'linear-gradient(135deg,#1A1A1A,#2D2D2D)'}}>
            <span className="text-sm font-bold text-white flex items-center gap-2"><Accessibility className="w-4 h-4 text-[#F5C518]"/>Accesibilidad</span>
            <button onClick={()=>setOpen(false)} className="text-[#9CA3AF] hover:text-white"><X className="w-4 h-4"/></button>
          </div>

          <div className="p-4 space-y-4">
            {/* Acceso directo a FórumBot */}
            <Link href="/ayuda" onClick={()=>setOpen(false)}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl border-2 border-[#F5C518] bg-[#FFFBEB] hover:bg-[#FEF3C7] transition-all">
              <div className="w-8 h-8 rounded-full bg-[#1A1A1A] flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-[#F5C518]"/>
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-[#1A1A1A]">Ir a FórumBot</p>
                <p className="text-[10px] text-[#9CA3AF]">Asistente de participación ciudadana</p>
              </div>
            </Link>

            {/* Tamaño de texto */}
            <div>
              <p className="text-xs font-bold text-[#374151] uppercase tracking-wider mb-2">Tamaño de texto</p>
              <div className="flex gap-2">
                {([{k:'normal',l:'A',sz:11},{k:'grande',l:'A+',sz:14},{k:'extra',l:'A++',sz:17}] as const).map(({k,l,sz})=>(
                  <button key={k} onClick={()=>{applyPref('fontSize',k);setFS(k as FontSize);savePrefs({fontSize:k});}}
                    className={`flex-1 py-2.5 rounded-xl font-bold border-2 transition-all ${fs===k?'border-[#F5C518] text-[#1A1A1A]':'border-[#E5E7EB] text-[#6B7280]'}`}
                    style={fs===k?{background:'linear-gradient(135deg,#F5C518,#E6B800)',fontSize:sz}:{fontSize:sz}}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-[#374151] uppercase tracking-wider">Preferencias visuales</p>
              {toggles.map(({key,label,desc,val,fn})=>(
                <button key={key} onClick={fn} aria-pressed={val}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${val?'border-[#F5C518] bg-[#FFFBEB]':'border-[#E5E7EB] hover:border-[#F5C518]/40'}`}>
                  <div className="text-left">
                    <p className="font-semibold text-[#1A1A1A] text-xs">{label}</p>
                    <p className="text-[10px] text-[#9CA3AF]">{desc}</p>
                  </div>
                  <span className={`w-10 h-5 rounded-full flex items-center px-0.5 transition-all shrink-0 ${val?'bg-[#F5C518]':'bg-[#E5E7EB]'}`}>
                    <span className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${val?'translate-x-5':'translate-x-0'}`}/>
                  </span>
                </button>
              ))}
            </div>

            {hayPrefs&&(
              <button onClick={()=>{applyPref('fontSize','normal');setFS('normal');applyPref('hc',false);setHC(false);applyPref('rm',false);setRM(false);applyPref('dx',false);setDX(false);localStorage.removeItem('forumnl_a11y');}}
                className="w-full text-xs text-[#9CA3AF] hover:text-[#6B7280] py-1 border-t border-[#E5E7EB] pt-3">
                Restablecer predeterminados
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
