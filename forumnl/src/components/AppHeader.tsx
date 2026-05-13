'use client';

import Link from 'next/link';
import { LogOut, User, Shield, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  usuario: { nombre: string; rol: string };
}

export function AppHeader({ usuario }: Props) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  }

  const rolLabel =
    usuario.rol === 'ADMIN' ? 'Administrador' :
    usuario.rol === 'COMITE' ? 'Comité' : 'Vecino';

  const inicial = usuario.nombre
    .split(' ')
    .map((s: string) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header
      className="sticky top-0 z-40 border-b border-[#E6B800]"
      style={{ background: 'linear-gradient(135deg, #F5C518 0%, #FFD740 100%)' }}
    >
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-4">

        {/* Logo — usa <img> nativo para evitar el fondo negro de Next.js Image */}
        <Link href="/home" className="flex items-center gap-3 shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-ieepc.png"
            alt="IEEPCNL"
            width={130}
            height={52}
            style={{
              height: '42px',
              width: 'auto',
              objectFit: 'contain',
              /* Truco: multiply hace que los píxeles blancos del PNG sean
                 transparentes sobre cualquier fondo de color */
              mixBlendMode: 'multiply',
            }}
          />
          <div className="hidden sm:block border-l-2 border-[#D4A60F] pl-3">
            <p className="font-black text-[#1A1A1A] text-sm leading-tight tracking-tight">FórumNL</p>
            <p className="text-[10px] text-[#92400E] font-semibold leading-tight">Participación Vecinal</p>
          </div>
        </Link>

        {/* Usuario */}
        <div className="relative" ref={ref}>
          <button
            onClick={() => setAbierto((v) => !v)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-[#E6B800]/50 transition-colors"
          >
            {/* Avatar */}
            <div className="w-9 h-9 rounded-full bg-[#1A1A1A] text-[#F5C518] flex items-center justify-center font-black text-sm">
              {inicial}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-bold text-[#1A1A1A] leading-tight">
                {usuario.nombre.split(' ')[0]}
              </p>
              <p className="text-[10px] font-semibold text-[#92400E] leading-tight">{rolLabel}</p>
            </div>
            <ChevronDown className={`w-4 h-4 text-[#1A1A1A] transition-transform ${abierto ? 'rotate-180' : ''}`} />
          </button>

          {abierto && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl border border-[#E5E7EB] shadow-xl overflow-hidden">
              {/* Info usuario */}
              <div className="px-4 py-3 bg-[#FFFBEB] border-b border-[#FEF3C7]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#1A1A1A] text-[#F5C518] flex items-center justify-center font-black">
                    {inicial}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#1A1A1A] leading-tight">{usuario.nombre}</p>
                    <p className="text-xs text-[#6B7280] flex items-center gap-1 mt-0.5">
                      {usuario.rol !== 'USUARIO'
                        ? <Shield className="w-3 h-3 text-[#F5C518]" />
                        : <User className="w-3 h-3" />}
                      {rolLabel}
                    </p>
                  </div>
                </div>
              </div>
              {/* Acciones */}
              <div className="p-2">
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Cerrar sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
