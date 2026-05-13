'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

const MESES_LARGO  = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DIAS_CORTOS  = ['Lu','Ma','Mi','Ju','Vi','Sá','Do'];

interface Props {
  value: string;           // ISO "yyyy-mm-dd" o ""
  onChange: (v: string) => void;
  disabled?: boolean;
  maxYear?: number;        // default: año actual − 18
  minYear?: number;        // default: 1920
}

export function DatePicker({ value, onChange, disabled, maxYear, minYear = 1920 }: Props) {
  const hoy    = new Date();
  const maxYr  = maxYear ?? hoy.getFullYear() - 18;

  // Estado derivado del valor actual
  const partes   = value ? value.split('-') : [];
  const selAnio  = partes[0] ? +partes[0] : 0;
  const selMes   = partes[1] ? +partes[1] - 1 : -1; // 0-based
  const selDia   = partes[2] ? +partes[2] : 0;

  // Vista del calendario
  const [open,      setOpen]      = useState(false);
  const [viewAnio,  setViewAnio]  = useState(selAnio  || 1990);
  const [viewMes,   setViewMes]   = useState(selMes >= 0 ? selMes : hoy.getMonth());
  const ref = useRef<HTMLDivElement>(null);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  // Sincronizar vista cuando cambia el valor
  useEffect(() => {
    if (selAnio) setViewAnio(selAnio);
    if (selMes >= 0) setViewMes(selMes);
  }, [value]);

  // Navegación
  function prevMes() {
    if (viewMes === 0) { setViewMes(11); setViewAnio(a => a - 1); }
    else setViewMes(m => m - 1);
  }
  function nextMes() {
    if (viewMes === 11) { setViewMes(0); setViewAnio(a => a + 1); }
    else setViewMes(m => m + 1);
  }

  // Grid del mes
  const diasEnMes = new Date(viewAnio, viewMes + 1, 0).getDate();
  const primerDia = new Date(viewAnio, viewMes, 1).getDay(); // 0=Dom
  const offset    = primerDia === 0 ? 6 : primerDia - 1;    // Lun=0

  function seleccionar(dia: number) {
    const mm = String(viewMes + 1).padStart(2, '0');
    const dd = String(dia).padStart(2, '0');
    onChange(`${viewAnio}-${mm}-${dd}`);
    setOpen(false);
  }

  // Formatear para mostrar en el botón
  function display() {
    if (!value) return 'Seleccionar fecha';
    const [y, m, d] = value.split('-');
    return `${d} de ${MESES_LARGO[+m - 1]} de ${y}`;
  }

  const años = Array.from({ length: maxYr - minYear + 1 }, (_, i) => maxYr - i);

  return (
    <div className="relative" ref={ref}>
      {/* Botón trigger */}
      <button
        type="button"
        onClick={() => !disabled && setOpen(v => !v)}
        disabled={disabled}
        className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 border-2 rounded-xl text-sm transition-all
          ${open ? 'border-[#F5C518] bg-[#FFFBEB]' : 'border-[#E5E7EB] bg-white hover:border-[#F5C518]/50'}
          ${value ? 'text-[#1A1A1A]' : 'text-[#9CA3AF]'}
          disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <Calendar className="w-4 h-4 text-[#9CA3AF] shrink-0" />
        <span className="flex-1 text-left">{display()}</span>
        {value && (
          <button type="button" onClick={e => { e.stopPropagation(); onChange(''); }}
            className="text-[#9CA3AF] hover:text-[#EF4444] text-base leading-none">×</button>
        )}
      </button>

      {/* Popup calendario */}
      {open && (
        <div className="absolute left-0 top-full mt-2 z-50 bg-white rounded-2xl border-2 border-[#E5E7EB] shadow-2xl overflow-hidden"
          style={{ width: 300 }}>

          {/* Header amarillo: mes + año */}
          <div className="px-3 py-3" style={{ background: 'linear-gradient(135deg,#F5C518,#FFD740)' }}>
            <div className="flex items-center justify-between mb-2">
              <button type="button" onClick={prevMes}
                className="w-8 h-8 rounded-full bg-[#1A1A1A]/10 hover:bg-[#1A1A1A]/20 flex items-center justify-center transition-colors">
                <ChevronLeft className="w-4 h-4 text-[#1A1A1A]" />
              </button>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-[#1A1A1A] text-sm">{MESES_LARGO[viewMes]}</span>
                {/* Selector de año */}
                <select
                  value={viewAnio}
                  onChange={e => setViewAnio(+e.target.value)}
                  className="font-black text-[#1A1A1A] bg-white/60 border-0 rounded-lg px-2 py-0.5 text-sm cursor-pointer"
                >
                  {años.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <button type="button" onClick={nextMes}
                className="w-8 h-8 rounded-full bg-[#1A1A1A]/10 hover:bg-[#1A1A1A]/20 flex items-center justify-center transition-colors">
                <ChevronRight className="w-4 h-4 text-[#1A1A1A]" />
              </button>
            </div>

            {/* Nombres de días */}
            <div className="grid grid-cols-7">
              {DIAS_CORTOS.map(d => (
                <div key={d} className="text-center text-[10px] font-bold text-[#1A1A1A]/60 py-1">{d}</div>
              ))}
            </div>
          </div>

          {/* Grid de días */}
          <div className="p-3">
            <div className="grid grid-cols-7 gap-y-1">
              {/* Celdas vacías del offset */}
              {Array.from({ length: offset }).map((_, i) => <div key={`e${i}`} />)}

              {/* Días del mes */}
              {Array.from({ length: diasEnMes }).map((_, i) => {
                const dia = i + 1;
                const esSel = selAnio === viewAnio && selMes === viewMes && selDia === dia;
                const isToday = hoy.getFullYear() === viewAnio && hoy.getMonth() === viewMes && hoy.getDate() === dia;

                return (
                  <button
                    key={dia}
                    type="button"
                    onClick={() => seleccionar(dia)}
                    className={`w-9 h-9 mx-auto rounded-full text-sm font-medium flex items-center justify-center transition-all
                      ${esSel
                        ? 'font-black text-[#1A1A1A] scale-110'
                        : isToday
                        ? 'border-2 border-[#F5C518] text-[#92400E] font-semibold'
                        : 'text-[#374151] hover:bg-[#FEF3C7] hover:text-[#92400E]'
                      }`}
                    style={esSel ? { background: 'linear-gradient(135deg,#F5C518,#E6B800)' } : {}}
                  >
                    {dia}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
