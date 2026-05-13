'use client';

import { useState } from 'react';
import { KeyRound, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { PhoneInput } from '@/components/PhoneInput';
import Link from 'next/link';

interface Props {
  modo: 'login' | 'registro';
  onSuccess: (data: any) => void;
}

export function FormularioTelefono({ modo, onSuccess }: Props) {
  const [paso, setPaso]           = useState<'telefono' | 'codigo'>('telefono');
  const [telefono, setTelefono]   = useState('');
  const [codigo, setCodigo]       = useState('');
  const [codigoDev, setCodigoDev] = useState<string | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [cargando, setCargando]   = useState(false);
  const [timer, setTimer]         = useState(0);
  const [reenvios, setReenvios]   = useState(0);
  const [aceptaTerminos, setAceptaTerminos] = useState(false);

  const endpointSolicitar = modo==='login' ? '/api/auth/login/solicitar-codigo' : '/api/auth/register/solicitar-codigo';
  const endpointVerificar = modo==='login' ? '/api/auth/login/verificar-codigo'  : '/api/auth/register/verificar-codigo';

  async function solicitarCodigo(e?: React.FormEvent) {
    e?.preventDefault();
    if (!telefono) { setError('Ingresa tu número de teléfono.'); return; }
    if (modo==='registro' && !aceptaTerminos) { setError('Debes aceptar los Términos de Uso y el Aviso de Privacidad.'); return; }
    setError(null); setCargando(true);
    try {
      const r = await fetch(endpointSolicitar, {
        method:'POST', headers:{'content-type':'application/json'},
        body: JSON.stringify({ telefono }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) {
        if (j.error==='NO_REGISTRADO')   setError('Número no registrado. Crea una cuenta primero.');
        else if (j.error==='YA_REGISTRADO') setError('Este número ya tiene cuenta. Inicia sesión.');
        else setError(j.message || 'No se pudo enviar el código.');
        return;
      }
      if (j.codigoDev) setCodigoDev(j.codigoDev);
      setPaso('codigo');
      startTimer();
    } catch (e: any) { setError(e?.message || 'Error de red.'); }
    finally { setCargando(false); }
  }

  function startTimer() {
    setTimer(60);
    const t = setInterval(() => setTimer(s => { if (s<=1) { clearInterval(t); return 0; } return s-1; }), 1000);
  }

  async function verificarCodigo(e: React.FormEvent) {
    e.preventDefault(); setError(null); setCargando(true);
    try {
      const r = await fetch(endpointVerificar, {
        method:'POST', headers:{'content-type':'application/json'},
        body: JSON.stringify({ telefono, codigo }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) { setError(j.message || 'Código incorrecto o expirado.'); return; }
      onSuccess(j);
    } catch (e: any) { setError(e?.message || 'Error de red.'); }
    finally { setCargando(false); }
  }

  return (
    <div className="w-full">
      <h1 className="text-3xl font-extrabold text-[#1A1A1A] mb-1">
        {modo==='login' ? 'Iniciar sesión' : 'Crear cuenta'}
      </h1>
      <p className="text-[#6B7280] text-sm mb-6">
        {paso==='telefono' ? 'Te enviaremos un código de verificación por SMS.' : `Código enviado a ${telefono}.`}
      </p>

      {error && <div className="rounded-xl p-4 mb-4 bg-red-50 border border-red-200 text-red-800 text-sm">{error}</div>}

      {codigoDev && (
        <div className="rounded-xl p-4 mb-4 border border-[#F5C518]" style={{background:'linear-gradient(135deg,#FFFBEB,#FEF3C7)'}}>
          <p className="text-sm text-[#92400E]"><strong>Modo desarrollo — código:</strong>{' '}
            <span className="font-mono font-black text-2xl tracking-[0.3em]">{codigoDev}</span>
          </p>
        </div>
      )}

      {/* Paso 1: Teléfono */}
      {paso==='telefono' && (
        <form onSubmit={solicitarCodigo} className="card p-6 space-y-4">
          <div>
            <label className="label">Número de teléfono</label>
            <PhoneInput value={telefono} onChange={setTelefono} disabled={cargando} />
            <p className="text-xs text-[#9CA3AF] mt-1.5">Selecciona tu país e ingresa los dígitos sin espacios.</p>
          </div>

          {/* Checkbox de consentimiento — solo en registro */}
          {modo==='registro' && (
            <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] hover:border-[#F5C518]/50 transition-colors">
              <input type="checkbox" checked={aceptaTerminos} onChange={e=>setAceptaTerminos(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-[#F5C518]" />
              <span className="text-xs text-[#374151] leading-relaxed">
                He leído y acepto el{' '}
                <Link href="/privacidad" target="_blank" className="text-[#F5C518] font-semibold hover:underline">Aviso de Privacidad</Link>
                {' '}y los{' '}
                <Link href="/terminos" target="_blank" className="text-[#F5C518] font-semibold hover:underline">Términos de Uso</Link>
                {' '}de FórumNL, incluyendo el tratamiento de mis datos personales y biométricos para la verificación de identidad en procesos de participación ciudadana.
              </span>
            </label>
          )}

          <button type="submit"
            disabled={cargando || !telefono || (modo==='registro' && !aceptaTerminos)}
            className="btn-yellow w-full py-3.5 text-base font-bold">
            {cargando ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enviar código →'}
          </button>
        </form>
      )}

      {/* Paso 2: Código */}
      {paso==='codigo' && (
        <form onSubmit={verificarCodigo} className="card p-6 space-y-4">
          <div>
            <label className="label">Código de verificación</label>
            <div className="relative">
              <KeyRound className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
              <input type="text" inputMode="numeric" pattern="\d{6}" maxLength={6} autoFocus
                className="input pl-11 text-center text-3xl font-black tracking-[0.5em]"
                placeholder="······" value={codigo} onChange={e=>setCodigo(e.target.value.replace(/\D/g,''))}
                required disabled={cargando} />
            </div>
            <p className="text-xs text-[#9CA3AF] mt-1.5 text-center">Vigencia: 5 minutos.</p>
          </div>

          <button type="submit" disabled={cargando||codigo.length!==6} className="btn-yellow w-full py-3.5 text-base font-bold">
            {cargando ? <Loader2 className="w-5 h-5 animate-spin" /> : modo==='login'?'Ingresar →':'Continuar →'}
          </button>

          {/* Reenviar */}
          <div className="flex flex-col items-center gap-2 pt-1">
            <button type="button" onClick={() => { setReenvios(n=>n+1); solicitarCodigo(); }}
              disabled={timer>0||cargando}
              className="flex items-center gap-2 text-sm text-[#6B7280] hover:text-[#1A1A1A] disabled:opacity-40 transition-colors">
              <RefreshCw className="w-4 h-4" />
              {timer>0 ? `Reenviar en ${timer}s` : reenvios>0 ? 'Reenviar código de nuevo' : 'No recibí el código — reenviar'}
            </button>
            <button type="button" onClick={() => { setPaso('telefono'); setCodigo(''); setCodigoDev(null); setError(null); }}
              className="text-sm text-[#9CA3AF] hover:text-[#6B7280] transition-colors">
              Cambiar número
            </button>
          </div>
        </form>
      )}

      {/* Link cambio de teléfono — solo en login */}
      {modo==='login' && (
        <p className="text-center text-xs text-[#9CA3AF] mt-4">
          ¿Cambiaste de teléfono?{' '}
          <Link href="/recuperar-cuenta" className="text-[#F5C518] font-semibold hover:underline">
            Verifica tu identidad aquí
          </Link>
        </p>
      )}

      {/* Indicador de privacidad */}
      <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-[#9CA3AF]">
        <ShieldCheck className="w-3 h-3 text-[#F5C518]" />
        <span>Tus datos están protegidos · <Link href="/privacidad" className="hover:underline">Aviso de Privacidad</Link></span>
      </div>
    </div>
  );
}
