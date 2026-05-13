'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export const PAISES = [
  { code: 'MX', name: 'México',         dial: '+52',  flag: '🇲🇽', digits: 10 },
  { code: 'US', name: 'Estados Unidos',  dial: '+1',   flag: '🇺🇸', digits: 10 },
  { code: 'CA', name: 'Canadá',          dial: '+1',   flag: '🇨🇦', digits: 10 },
  { code: 'ES', name: 'España',          dial: '+34',  flag: '🇪🇸', digits: 9  },
  { code: 'CO', name: 'Colombia',        dial: '+57',  flag: '🇨🇴', digits: 10 },
  { code: 'AR', name: 'Argentina',       dial: '+54',  flag: '🇦🇷', digits: 10 },
  { code: 'BR', name: 'Brasil',          dial: '+55',  flag: '🇧🇷', digits: 11 },
  { code: 'CL', name: 'Chile',           dial: '+56',  flag: '🇨🇱', digits: 9  },
  { code: 'PE', name: 'Perú',            dial: '+51',  flag: '🇵🇪', digits: 9  },
  { code: 'VE', name: 'Venezuela',       dial: '+58',  flag: '🇻🇪', digits: 10 },
  { code: 'GT', name: 'Guatemala',       dial: '+502', flag: '🇬🇹', digits: 8  },
  { code: 'HN', name: 'Honduras',        dial: '+504', flag: '🇭🇳', digits: 8  },
  { code: 'SV', name: 'El Salvador',     dial: '+503', flag: '🇸🇻', digits: 8  },
  { code: 'NI', name: 'Nicaragua',       dial: '+505', flag: '🇳🇮', digits: 8  },
  { code: 'CR', name: 'Costa Rica',      dial: '+506', flag: '🇨🇷', digits: 8  },
  { code: 'PA', name: 'Panamá',          dial: '+507', flag: '🇵🇦', digits: 8  },
];

interface Props {
  value: string;
  onChange: (fullNumber: string) => void;
  disabled?: boolean;
}

export function PhoneInput({ value, onChange, disabled }: Props) {
  const [pais, setPais] = useState(PAISES[0]); // México por default
  const [numero, setNumero] = useState('');
  const [open, setOpen] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  // Sincronizar hacia afuera
  useEffect(() => {
    if (numero.length > 0) {
      onChange(`${pais.dial}${numero}`);
    } else {
      onChange('');
    }
  }, [pais, numero]);

  // Cerrar al click fuera
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setBusqueda('');
      }
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const filtrados = PAISES.filter(
    (p) =>
      p.name.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.dial.includes(busqueda)
  );

  const handleNumero = (v: string) => {
    const solo = v.replace(/\D/g, '').slice(0, pais.digits);
    setNumero(solo);
  };

  const seleccionarPais = (p: typeof PAISES[0]) => {
    setPais(p);
    setOpen(false);
    setBusqueda('');
    setNumero('');
  };

  return (
    <div ref={ref} className="flex gap-2 relative">
      {/* Dropdown país */}
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(!open)}
          className="input flex items-center gap-2 w-[110px] cursor-pointer pr-2"
        >
          <span className="text-xl">{pais.flag}</span>
          <span className="text-sm font-semibold text-[#374151]">{pais.dial}</span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-[#9CA3AF] ml-auto transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>

        {open && (
          <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-[#E5E7EB] rounded-xl shadow-xl w-64 overflow-hidden">
            <div className="p-2 border-b border-[#F3F4F6]">
              <input
                autoFocus
                type="text"
                placeholder="Buscar país..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg outline-none focus:border-[#F5C518]"
              />
            </div>
            <ul className="max-h-56 overflow-y-auto">
              {filtrados.map((p) => (
                <li key={p.code}>
                  <button
                    type="button"
                    onClick={() => seleccionarPais(p)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-[#FFFBEB] transition-colors text-left ${
                      p.code === pais.code ? 'bg-[#FEF3C7] font-semibold' : ''
                    }`}
                  >
                    <span className="text-xl">{p.flag}</span>
                    <span className="flex-1">{p.name}</span>
                    <span className="text-[#9CA3AF]">{p.dial}</span>
                  </button>
                </li>
              ))}
              {filtrados.length === 0 && (
                <li className="px-3 py-4 text-sm text-center text-[#9CA3AF]">Sin resultados</li>
              )}
            </ul>
          </div>
        )}
      </div>

      {/* Campo numérico */}
      <input
        type="tel"
        inputMode="numeric"
        value={numero}
        onChange={(e) => handleNumero(e.target.value)}
        disabled={disabled}
        placeholder={`${pais.digits} dígitos`}
        className="input flex-1 font-mono tracking-wider"
        required
      />
    </div>
  );
}
