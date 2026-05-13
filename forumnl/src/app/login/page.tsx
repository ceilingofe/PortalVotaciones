'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FormularioTelefono } from '@/components/FormularioTelefono';
import { LoginFacial } from '@/components/LoginFacial';
import Link from 'next/link';
import { ArrowLeft, MessageSquare, ScanFace, ShieldCheck } from 'lucide-react';

type Tab = 'sms' | 'facial';

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('sms');

  // router.refresh() fuerza a Next.js a re-ejecutar los Server Components
  // y re-leer las cookies recién establecidas por el API de login.
  // Sin esto, el layout puede no ver la nueva cookie de sesión.
  function irAlDashboard() {
    router.refresh();
    router.push('/home');
  }

  return (
    <main className="min-h-screen flex flex-col lg:flex-row">
      {/* Panel izquierdo amarillo */}
      <div
        className="relative overflow-hidden flex flex-col items-center justify-center px-8 py-10 lg:py-0 lg:w-2/5 lg:min-h-screen"
        style={{ background: 'linear-gradient(145deg,#F5C518 0%,#FFD740 50%,#E6B800 100%)' }}
      >
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 text-center lg:text-left">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-ieepc.png" alt="IEEPCNL"
            style={{ height: '52px', width: 'auto', mixBlendMode: 'multiply' }}
            className="mx-auto lg:mx-0 mb-4" />
          <h2 className="text-3xl lg:text-4xl font-black text-[#1A1A1A] mb-2">FórumNL</h2>
          <p className="text-[#92400E] font-semibold text-sm lg:text-base">
            La plataforma de participación<br />ciudadana de Nuevo León.
          </p>
        </div>
      </div>

      {/* Panel derecho blanco */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 bg-white">
        <div className="w-full max-w-md">
          <Link href="/" className="lg:hidden inline-flex items-center gap-2 text-sm text-[#6B7280] font-medium mb-6 hover:text-[#1A1A1A] transition-colors">
            <ArrowLeft className="w-4 h-4" /> Volver
          </Link>

          {/* Tabs */}
          <div className="flex rounded-xl overflow-hidden border border-[#E5E7EB] mb-6">
            {([
              { id: 'sms',    label: 'Código SMS',            icon: MessageSquare },
              { id: 'facial', label: 'Reconocimiento facial', icon: ScanFace      },
            ] as const).map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setTab(id)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all ${
                  tab === id ? 'text-[#1A1A1A]' : 'bg-[#F9FAFB] text-[#9CA3AF] hover:text-[#6B7280]'}`}
                style={tab === id ? { background: 'linear-gradient(135deg,#F5C518,#E6B800)' } : {}}>
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{id === 'sms' ? 'SMS' : 'Rostro'}</span>
              </button>
            ))}
          </div>

          {/* SMS — misma función de redirección */}
          {tab === 'sms' && (
            <FormularioTelefono modo="login" onSuccess={irAlDashboard} />
          )}

          {/* Facial — misma función de redirección */}
          {tab === 'facial' && (
            <div>
              <h2 className="text-2xl font-extrabold mb-1">Reconocimiento facial</h2>
              <p className="text-sm text-[#6B7280] mb-5">
                Ingresa tu número y verifica tu identidad con tu rostro registrado.
              </p>
              <LoginFacial onSuccess={irAlDashboard} />
            </div>
          )}

          {/* Aviso privacidad */}
          <div className="mt-6 p-3 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB]">
            <p className="text-[10px] text-[#9CA3AF] leading-relaxed text-center flex items-start gap-1.5">
              <ShieldCheck className="w-3 h-3 shrink-0 mt-0.5 text-[#F5C518]" />
              <span>
                Al continuar aceptas el{' '}
                <Link href="/privacidad" className="text-[#F5C518] font-semibold hover:underline" target="_blank">Aviso de Privacidad</Link>
                {' '}y los{' '}
                <Link href="/terminos" className="text-[#F5C518] font-semibold hover:underline" target="_blank">Términos de Uso</Link>.
                Tu voto es secreto e irrastreable.
              </span>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
