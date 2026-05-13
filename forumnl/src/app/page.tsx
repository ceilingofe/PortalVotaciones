import Link from 'next/link';
import { LogIn, UserPlus, ShieldCheck, Vote, Users } from 'lucide-react';

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col">

      {/* ── HERO AMARILLO — ocupa pantalla completa en móvil ── */}
      <div
        className="relative overflow-hidden flex flex-col items-center justify-center px-6 py-14 md:py-20"
        style={{ background: 'linear-gradient(145deg, #F5C518 0%, #FFD740 50%, #E6B800 100%)' }}
      >
        {/* Círculos decorativos */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/5 rounded-full translate-y-1/2 -translate-x-1/4" />

        <div className="relative z-10 text-center max-w-md w-full">
          {/* Logo */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-ieepc.png"
            alt="IEEPCNL"
            style={{ height: '60px', width: 'auto', mixBlendMode: 'multiply', objectFit: 'contain' }}
            className="mx-auto mb-6"
          />
          <h1 className="text-5xl sm:text-6xl font-black text-[#1A1A1A] mb-3 tracking-tight">
            Fórum<span style={{ WebkitTextStroke: '2px #1A1A1A', color: 'transparent' }}>NL</span>
          </h1>
          <p className="text-[#92400E] font-semibold text-lg leading-snug">
            Tu voz, tu comunidad.<br />Participa y haz que cuente.
          </p>

          {/* Stats */}
          <div className="flex justify-center gap-8 mt-8">
            {[
              { icon: Users, val: '220+', label: 'Vecinos' },
              { icon: Vote, val: '3', label: 'Procesos' },
              { icon: ShieldCheck, val: '100%', label: 'Anónimo' },
            ].map(({ icon: Icon, val, label }) => (
              <div key={label} className="flex flex-col items-center">
                <span className="text-2xl font-black text-[#1A1A1A]">{val}</span>
                <span className="text-xs font-semibold text-[#92400E] flex items-center gap-1 mt-0.5">
                  <Icon className="w-3 h-3" /> {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── PANEL BLANCO — botones de acción ──────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 bg-white">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-extrabold text-[#1A1A1A] mb-1">Bienvenido</h2>
          <p className="text-[#6B7280] text-sm mb-8">
            Plataforma oficial del Instituto Estatal Electoral y de Participación Ciudadana de Nuevo León.
          </p>

          <div className="space-y-3">
            <Link
              href="/login"
              className="flex items-center gap-3 w-full px-5 py-4 rounded-2xl font-bold text-[#1A1A1A] text-base transition-all"
              style={{ background: 'linear-gradient(135deg,#F5C518,#E6B800)', boxShadow: '0 4px 20px rgba(245,197,24,0.35)' }}
            >
              <LogIn className="w-5 h-5" />
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              className="flex items-center gap-3 w-full px-5 py-4 rounded-2xl font-bold text-[#1A1A1A] text-base bg-white border-2 border-[#E5E7EB] hover:border-[#F5C518] hover:bg-[#FFFBEB] transition-all"
            >
              <UserPlus className="w-5 h-5" />
              Crear cuenta
            </Link>
          </div>

          <div className="mt-8 pt-6 border-t border-[#E5E7EB]">
            <div className="grid grid-cols-3 gap-2">
              {[
                { emoji: '🔒', text: 'Voto secreto' },
                { emoji: '✅', text: 'Verificación INE' },
                { emoji: '📋', text: 'Actas PDF' },
              ].map((g) => (
                <div key={g.text} className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-[#F9FAFB]">
                  <span className="text-xl">{g.emoji}</span>
                  <span className="text-[10px] font-semibold text-[#6B7280] text-center leading-tight">{g.text}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-center text-[10px] text-[#9CA3AF] mt-6 leading-relaxed">
            Tus datos se usan únicamente para verificar tu identidad como vecino participante.
          </p>
        </div>
      </div>
    </main>
  );
}
