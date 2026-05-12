'use client';

import { useState } from 'react';
import { ArrowLeft, Phone, KeyRound, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Props {
  modo: 'login' | 'registro';
  /** Para login redirige a /home. Para registro pasa al onboarding biométrico. */
  onSuccess: (data: any) => void;
}

export function FormularioTelefono({ modo, onSuccess }: Props) {
  const router = useRouter();
  const [paso, setPaso] = useState<'telefono' | 'codigo'>('telefono');
  const [telefono, setTelefono] = useState('');
  const [codigo, setCodigo] = useState('');
  const [codigoDev, setCodigoDev] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const endpointSolicitar =
    modo === 'login' ? '/api/auth/login/solicitar-codigo' : '/api/auth/register/solicitar-codigo';
  const endpointVerificar =
    modo === 'login' ? '/api/auth/login/verificar-codigo' : '/api/auth/register/verificar-codigo';

  async function solicitarCodigo(e: React.FormEvent) {
    e.preventDefault();
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
        if (json.error === 'NO_REGISTRADO') {
          setError('Este número no está registrado. ¿Deseas crear una cuenta?');
        } else if (json.error === 'YA_REGISTRADO') {
          setError('Este número ya está registrado. Inicia sesión.');
        } else {
          setError(json.message || 'No se pudo enviar el código.');
        }
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
    <div className="w-full max-w-md">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-ieepc-gray hover:text-ieepc-black mb-6">
        <ArrowLeft className="w-4 h-4" /> Volver
      </Link>

      <h1 className="text-2xl font-bold mb-1">
        {modo === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
      </h1>
      <p className="text-ieepc-gray text-sm mb-6">
        {paso === 'telefono'
          ? 'Te enviaremos un código de verificación por SMS.'
          : `Ingresa el código de 6 dígitos que enviamos a ${telefono}.`}
      </p>

      {error && (
        <div className="card p-3 mb-4 border-red-200 bg-red-50 text-red-800 text-sm">
          {error}
          {modo === 'login' && error?.includes('no está registrado') && (
            <Link href="/register" className="ml-2 underline font-medium">Crear cuenta</Link>
          )}
        </div>
      )}

      {codigoDev && (
        <div className="card p-3 mb-4 border-ieepc-yellow bg-ieepc-yellow/10 text-sm">
          <strong className="text-ieepc-black">Modo desarrollo:</strong> tu código es{' '}
          <span className="font-mono font-bold text-base">{codigoDev}</span>
        </div>
      )}

      {paso === 'telefono' && (
        <form onSubmit={solicitarCodigo} className="card p-6 space-y-4">
          <div>
            <label className="label">Número de teléfono</label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ieepc-gray" />
              <input
                type="tel"
                inputMode="tel"
                className="input pl-10"
                placeholder="+52 81 1234 5678"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                required
                disabled={cargando}
              />
            </div>
            <p className="text-xs text-ieepc-gray mt-1.5">Formato: 10 dígitos (se asume +52)</p>
          </div>
          <button type="submit" disabled={cargando} className="btn-yellow w-full justify-center">
            {cargando ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar código'}
          </button>
        </form>
      )}

      {paso === 'codigo' && (
        <form onSubmit={verificarCodigo} className="card p-6 space-y-4">
          <div>
            <label className="label">Código de 6 dígitos</label>
            <div className="relative">
              <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ieepc-gray" />
              <input
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                className="input pl-10 text-center text-xl font-mono tracking-widest"
                placeholder="000000"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
                required
                disabled={cargando}
                autoFocus
              />
            </div>
          </div>
          <button type="submit" disabled={cargando || codigo.length !== 6} className="btn-yellow w-full justify-center">
            {cargando ? <Loader2 className="w-4 h-4 animate-spin" /> : modo === 'login' ? 'Iniciar sesión' : 'Continuar'}
          </button>
          <button type="button" onClick={() => { setPaso('telefono'); setCodigo(''); setCodigoDev(null); }} className="btn-ghost w-full justify-center text-sm">
            Cambiar número
          </button>
        </form>
      )}
    </div>
  );
}
