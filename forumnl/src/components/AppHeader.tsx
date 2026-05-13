'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, User, Shield, ChevronDown, Home, Vote, FileText, History } from 'lucide-react';

interface Props { usuario: { nombre: string; rol: string }; }

function RobotIcon() {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor">
      <rect x="4" y="7" width="12" height="8" rx="2.5"/>
      <rect x="6.5" y="3.5" width="7" height="3.5" rx="1.5"/>
      <line x1="10" y1="3.5" x2="10" y2="1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="10" cy="1" r="1"/>
      <circle cx="7.5" cy="11" r="1.5" fill="white"/>
      <circle cx="12.5" cy="11" r="1.5" fill="white"/>
      <rect x="2" y="9" width="2" height="3.5" rx="1"/>
      <rect x="16" y="9" width="2" height="3.5" rx="1"/>
    </svg>
  );
}

const TABS = [
  { href:'/home',      label:'Comunidad',  Icon: Home     },
  { href:'/eventos',   label:'Eventos',    Icon: Vote     },
  { href:'/reportes',  label:'Reportes',   Icon: FileText },
  { href:'/historico', label:'Histórico',  Icon: History  },
  { href:'/ayuda',     label:'FórumBot',   Icon: RobotIcon },
];

export function AppHeader({ usuario }: Props) {
  const router   = useRouter();
  const pathname = usePathname();
  const menuRef  = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  async function logout() { await fetch('/api/auth/logout',{method:'POST'}); router.push('/'); router.refresh(); }

  const rolLabel = usuario.rol==='ADMIN'?'Administrador':usuario.rol==='COMITE'?'Comité':'Vecino';
  const inicial  = usuario.nombre.split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b border-[#E6B800]" style={{background:'linear-gradient(135deg,#F5C518 0%,#FFD740 100%)'}}>
      {/* Fila 1: Logo + Usuario */}
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <Link href="/home" className="flex items-center gap-2.5 shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-ieepc.png" alt="IEEPCNL" style={{height:'38px',width:'auto',objectFit:'contain',mixBlendMode:'multiply'}}/>
          <div className="hidden sm:block border-l-2 border-[#D4A60F] pl-2.5">
            {/* Acento en FórumNL */}
            <p className="font-black text-[#1A1A1A] text-sm leading-tight">FórumNL</p>
            <p className="text-[10px] text-[#92400E] font-semibold leading-tight">Participación Vecinal</p>
          </div>
        </Link>

        <div className="relative" ref={menuRef}>
          <button onClick={()=>setOpen(v=>!v)} className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl hover:bg-[#E6B800]/50 transition-colors">
            <div className="w-8 h-8 rounded-full bg-[#1A1A1A] text-[#F5C518] flex items-center justify-center font-black text-xs">{inicial}</div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-[#1A1A1A] leading-tight">{usuario.nombre.split(' ')[0]}</p>
              <p className="text-[10px] font-semibold text-[#92400E] leading-tight">{rolLabel}</p>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-[#1A1A1A] transition-transform ${open?'rotate-180':''}`}/>
          </button>
          {open && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl border border-[#E5E7EB] shadow-xl overflow-hidden z-50">
              <div className="px-4 py-3 bg-[#FFFBEB] border-b border-[#FEF3C7]">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-[#1A1A1A] text-[#F5C518] flex items-center justify-center font-black text-xs">{inicial}</div>
                  <div>
                    <p className="text-sm font-bold text-[#1A1A1A] leading-tight">{usuario.nombre}</p>
                    <p className="text-xs text-[#6B7280] flex items-center gap-1 mt-0.5">
                      {usuario.rol!=='USUARIO'?<Shield className="w-3 h-3 text-[#F5C518]"/>:<User className="w-3 h-3"/>}
                      {rolLabel}
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-2">
                <button onClick={logout} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors">
                  <LogOut className="w-4 h-4"/> Cerrar sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fila 2: Tabs centrados */}
      <div className="border-t border-[#E6B800]/50">
        <nav className="max-w-5xl mx-auto px-2 flex justify-center overflow-x-auto scrollbar-none">
          {TABS.map(({href,label,Icon})=>{
            const activo = pathname.startsWith(href);
            return (
              <Link key={href} href={href} className={`flex items-center gap-1.5 px-4 sm:px-6 py-2.5 text-xs sm:text-sm font-semibold whitespace-nowrap transition-all border-b-2 ${activo?'border-[#1A1A1A] text-[#1A1A1A] bg-black/10':'border-transparent text-[#1A1A1A]/60 hover:text-[#1A1A1A] hover:bg-black/5'}`}>
                <Icon/>
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
