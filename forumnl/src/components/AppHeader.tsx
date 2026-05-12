'use client';

import Image from 'next/image';
import Link from 'next/link';
import { LogOut, User, Shield } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function AppHeader({ usuario }: { usuario: { nombre: string; rol: string } }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function cerrar(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false); }
    document.addEventListener('click', cerrar);
    return () => document.removeEventListener('click', cerrar);
  }, []);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  }

  const rolLabel = usuario.rol === 'ADMIN' ? 'Administrador' : usuario.rol === 'COMITE' ? 'Comité' : 'Vecino';
  const inicial = usuario.nombre.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-ieepc-gray-light">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <Link href="/home" className="flex items-center gap-3 shrink-0">
          <Image src="/logo-ieepc.png" alt="IEEPCNL" width={120} height={48} priority />
          <span className="hidden sm:inline-block font-bold text-ieepc-black">FórumNL</span>
        </Link>

        <div className="relative" ref={ref}>
          <button
            onClick={() => setAbierto(v => !v)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-gray-100 transition-colors"
          >
            <span className="w-8 h-8 rounded-full bg-ieepc-yellow text-ieepc-black flex items-center justify-center font-bold text-sm">
              {inicial}
            </span>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium leading-tight">{usuario.nombre.split(' ')[0]}</p>
              <p className="text-xs text-ieepc-gray leading-tight">{rolLabel}</p>
            </div>
          </button>
          {abierto && (
            <div className="absolute right-0 mt-2 w-56 card p-2 shadow-lg">
              <div className="px-3 py-2 border-b border-ieepc-gray-light mb-1">
                <p className="text-sm font-medium">{usuario.nombre}</p>
                <p className="text-xs text-ieepc-gray flex items-center gap-1 mt-0.5">
                  {usuario.rol === 'ADMIN' || usuario.rol === 'COMITE'
                    ? <Shield className="w-3 h-3" />
                    : <User className="w-3 h-3" />}
                  {rolLabel}
                </p>
              </div>
              <button onClick={logout} className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 text-sm flex items-center gap-2 text-red-600">
                <LogOut className="w-4 h-4" /> Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
