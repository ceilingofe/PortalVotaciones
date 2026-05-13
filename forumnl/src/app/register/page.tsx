'use client';

import { useRouter } from 'next/navigation';
import { FormularioTelefono } from '@/components/FormularioTelefono';
import Link from 'next/link';
import { ArrowLeft, RefreshCw } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  function handleSuccess(data: any) {
    if (data.regToken) { sessionStorage.setItem('forumnl_reg_token', data.regToken); router.push('/onboarding'); }
  }
  return (
    <main className="min-h-screen flex flex-col lg:flex-row">
      <div className="relative overflow-hidden flex flex-col items-center justify-center px-8 py-10 lg:py-0 lg:w-2/5 lg:min-h-screen"
        style={{background:'linear-gradient(145deg,#F5C518 0%,#FFD740 50%,#E6B800 100%)'}}>
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"/>
        <div className="relative z-10 text-center lg:text-left">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-ieepc.png" alt="IEEPCNL" style={{height:'52px',width:'auto',mixBlendMode:'multiply'}} className="mx-auto lg:mx-0 mb-4"/>
          <h2 className="text-3xl lg:text-4xl font-black text-[#1A1A1A] mb-2">Únete</h2>
          <p className="text-[#92400E] font-semibold text-sm lg:text-base">Verifica tu identidad con tu INE.</p>
        </div>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 bg-white">
        <div className="w-full max-w-md">
          <Link href="/" className="lg:hidden inline-flex items-center gap-2 text-sm text-[#6B7280] font-medium mb-6 hover:text-[#1A1A1A]">
            <ArrowLeft className="w-4 h-4"/> Volver
          </Link>
          <FormularioTelefono modo="registro" onSuccess={handleSuccess}/>
          {/* ── Actualizar apoderado ── */}
          <div className="mt-6 pt-5 border-t border-[#E5E7EB] text-center">
            <p className="text-xs text-[#9CA3AF] mb-2">¿Ya hay alguien registrado en tu vivienda?</p>
            <Link href="/actualizar-votante" className="inline-flex items-center gap-2 text-sm font-semibold text-[#374151] hover:text-[#1A1A1A] transition-colors">
              <RefreshCw className="w-4 h-4 text-[#F5C518]"/>
              Actualizar votante de la vivienda
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
