'use client';

import { useState } from 'react';
import { KeyRound, Loader2 } from 'lucide-react';
import { PhoneInput } from '@/components/PhoneInput';

interface Props {
  modo: 'login' | 'registro';
  onSuccess: (data: any) => void;
}

export function FormularioTelefono({ modo, onSuccess }: Props) {
  const [paso, setPaso] = useState<'telefono' | 'codigo'>('telefono');
  const [telefono, setTelefono] = useState('');
  const [codigo, setCodigo] = useState('');
  const [codigoDev, setCodigoDev] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const endpointSolicitar = modo === 'login'
    ? '/api/auth/login/solicitar-codigo'
    : '/api/auth/register/solicitar-codigo';
  const endpointVerificar = modo === 'login'
    ? '/api/auth/login/verificar-codigo'
    : '/api/auth/register/verificar-codigo';

  async function solicitarCodigo(e: React.FormEvent) {
    e.preventDefault();
    if (!telefono) { setError('Ingresa tu número de teléfono.'); return; }
    setError(null);
    setCargando(true);
    try {
      const r = await fetch(endpointSolicitar, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ telefono }),
      });
      const json = await r.json();
      if (!r.ok || !json.ok) {
        if (json.error === 'NO_REGISTRADO') setError('Este número no está registrado.');
        else if (json.error === 'YA_REGISTRADO') setError('Este número ya tiene cuenta. Inicia sesión.');
        else setError(json.message || 'No se pudo enviar el código.');
        return;
      }
      if (json.codigoDev) setCodigoDev(json.codigoDev);
      setPaso('codigo');
    } catch (err: any) {
      setError(err?.message || 'Error de red.');
    } finally {
      setCargando(false);
    }
  }

  async function verificarCodigo(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const r = await fetch(endpointVerificar, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ telefono, codigo }),
      });
      const json = await r.json();
      if (!r.ok || !json.ok) {
        setError(json.message || 'Código incorrecto.');
        return;
      }
      onSuccess(json);
    } catch (err: any) {
      setError(err?.message || 'Error de red.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="w-full">
      {/* Título */}
      <h1 className="text-3xl font-extrabold text-[#1A1A1A] mb-1">
        {modo === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
      </h1>
      <p className="text-[#6B7280] text-sm mb-8">
        {paso === 'telefono'
          ? 'Te enviaremos un código de verificación por SMS.'
          : `Ingresa el código de 6 dígitos enviado a ${telefono}.`}
      </p>

      {/* Error */}
      {error && (
        <div className="rounded-xl p-4 mb-5 bg-red-50 border border-red-200 text-red-800 text-sm">
          {error}
        </div>
      )}

      {/* Código DEV */}
      {codigoDev && (
        <div className="rounded-xl p-4 mb-5 border border-[#F5C518]" style={{ background: 'linear-gradient(135deg,#FFFBEB,#FEF3C7)' }}>
          <p className="text-sm text-[#92400E]">
            <strong>Modo desarrollo:</strong> tu código es{' '}
            <span className="font-mono font-black text-2xl tracking-[0.3em]">{codigoDev}</span>
          </p>
        </div>
      )}

      {/* Paso 1: Teléfono */}
      {paso === 'telefono' && (
        <form onSubmit={solicitarCodigo} className="card p-6 space-y-5">
          <div>
            <label className="label">Número de teléfono</label>
            <PhoneInput value={telefono} onChange={setTelefono} disabled={cargando} />
            <p className="text-xs text-[#9CA3AF] mt-2">
              Selecciona tu país e ingresa los dígitos sin espacios.
            </p>
          </div>
          <button type="submit" disabled={cargando || !telefono} className="btn-yellow w-full py-3.5 text-base font-bold">
            {cargando ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enviar código →'}
          </button>
        </form>
      )}

      {/* Paso 2: Código */}
      {paso === 'codigo' && (
        <form onSubmit={verificarCodigo} className="card p-6 space-y-5">
          <div>
            <label className="label">Código de verificación</label>
            <div className="relative">
              <KeyRound className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                autoFocus
                className="input pl-11 text-center text-3xl font-black tracking-[0.5em]"
                placeholder="······"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
                required
                disabled={cargando}
              />
            </div>
            <p className="text-xs text-[#9CA3AF] mt-2 text-center">
              Vigencia: 5 minutos.
            </p>
          </div>
          <button
            type="submit"
            disabled={cargando || codigo.length !== 6}
            className="btn-yellow w-full py-3.5 text-base font-bold"
          >
            {cargando
              ? <Loader2 className="w-5 h-5 animate-spin" />
              : modo === 'login' ? 'Ingresar →' : 'Continuar →'}
          </button>
          <button
            type="button"
            onClick={() => { setPaso('telefono'); setCodigo(''); setCodigoDev(null); setError(null); }}
            className="btn-ghost w-full text-sm"
          >
            Cambiar número
          </button>
        </form>
      )}
    </div>
  );
}
