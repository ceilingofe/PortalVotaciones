'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, CheckCircle2, Camera } from 'lucide-react';
import { PhoneInput } from '@/components/PhoneInput';

type Paso = 'instrucciones' | 'escaneo_ine' | 'selfie' | 'nuevo_telefono' | 'codigo' | 'exito' | 'error';

function loadScript(src: string): Promise<void> {
  return new Promise((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
    const s = document.createElement('script'); s.src = src; s.async = true;
    s.onload = () => res(); s.onerror = () => rej();
    document.head.appendChild(s);
  });
}
function fileToCanvas(file: File): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => { const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; c.getContext('2d')!.drawImage(img, 0, 0); URL.revokeObjectURL(img.src); resolve(c); };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export default function RecuperarCuentaPage() {
  const [paso, setPaso]           = useState<Paso>('instrucciones');
  const [cargando, setCargando]   = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [ineDescriptor, setIneDescriptor] = useState<Float32Array | null>(null);
  const [nuevoCelular, setNuevoCelular]   = useState('');
  const [codigo, setCodigo]               = useState('');
  const videoRef  = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  async function iniciarEscaneo() {
    setCargando(true);
    try {
      await loadScript('https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js');
      const fa = (window as any).faceapi;
      const MODEL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights';
      await fa.nets.tinyFaceDetector.loadFromUri(MODEL);
      await fa.nets.faceLandmark68Net.loadFromUri(MODEL);
      await fa.nets.faceRecognitionNet.loadFromUri(MODEL);
      setPaso('escaneo_ine');
    } catch { setError('No se pudieron cargar los modelos. Verifica tu conexión.'); }
    setCargando(false);
  }

  async function subirFotoIne(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    e.target.value = '';
    setCargando(true); setError(null);
    try {
      const canvas = await fileToCanvas(file);
      const fa = (window as any).faceapi;
      let det: any = null;
      for (const t of [0.20, 0.15, 0.10]) {
        det = await fa.detectSingleFace(canvas, new fa.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: t })).withFaceLandmarks().withFaceDescriptor();
        if (det) break;
      }
      if (!det) { setError('No se detectó rostro en la INE. Sube una foto clara del frente.'); } else {
        setIneDescriptor(det.descriptor as Float32Array);
        setPaso('selfie');
      }
    } catch { setError('Error procesando la imagen.'); }
    setCargando(false);
  }

  async function tomarSelfie() {
    const video = videoRef.current; if (!video) return;
    streamRef.current?.getTracks().forEach(t => t.stop());
    setCargando(true); setError(null);
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.translate(canvas.width, 0); ctx.scale(-1, 1); ctx.drawImage(video, 0, 0);
    const fa = (window as any).faceapi;
    const det = await fa.detectSingleFace(canvas, new fa.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.45 })).withFaceLandmarks().withFaceDescriptor();
    if (!det) { setError('Rostro no detectado. Ilumínate bien y mira a la cámara.'); setCargando(false); return; }
    const dist = fa.euclideanDistance(ineDescriptor, det.descriptor);
    if (dist >= 0.62) { setError(`Tu selfie no coincide con la INE (distancia ${dist.toFixed(3)}). Intenta de nuevo.`); setCargando(false); return; }
    setPaso('nuevo_telefono');
    setCargando(false);
  }

  async function activarCamaraSelfie() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
    streamRef.current = stream;
    if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.onloadedmetadata = () => videoRef.current!.play(); }
  }

  async function solicitarCodigo(e: React.FormEvent) {
    e.preventDefault(); setCargando(true); setError(null);
    const r = await fetch('/api/auth/recuperar-cuenta', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ paso: 'solicitar', telefono: nuevoCelular, descriptor: Array.from(ineDescriptor!) }),
    });
    const j = await r.json();
    if (!j.ok) { setError(j.message || 'Error.'); } else { setPaso('codigo'); }
    setCargando(false);
  }

  async function verificarYCambiar(e: React.FormEvent) {
    e.preventDefault(); setCargando(true); setError(null);
    const r = await fetch('/api/auth/recuperar-cuenta', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ paso: 'verificar', telefono: nuevoCelular, codigo }),
    });
    const j = await r.json();
    if (!j.ok) { setError(j.message || 'Código incorrecto.'); } else { setPaso('exito'); }
    setCargando(false);
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="w-full py-4 px-4 flex items-center gap-3" style={{ background: 'linear-gradient(135deg,#F5C518,#FFD740)' }}>
        <Link href="/login" className="text-[#1A1A1A] hover:opacity-70"><ArrowLeft className="w-5 h-5" /></Link>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-ieepc.png" alt="IEEPCNL" style={{ height: '36px', width: 'auto', mixBlendMode: 'multiply' }} />
        <span className="font-black text-[#1A1A1A]">Recuperar cuenta</span>
      </div>

      <div className="max-w-md mx-auto px-4 py-8">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 mb-4">{error} <button className="ml-2 underline" onClick={() => setError(null)}>Cerrar</button></div>}

        {paso === 'instrucciones' && (
          <div className="card p-6 text-center">
            <div className="text-5xl mb-4">🪪</div>
            <h1 className="text-xl font-extrabold mb-2">¿Cambiaste de teléfono?</h1>
            <p className="text-sm text-[#6B7280] mb-6">Verificaremos tu identidad con tu INE y una selfie antes de asignar tu nuevo número.</p>
            <div className="space-y-2 text-left text-sm text-[#374151] mb-6">
              {['Sube una foto del frente de tu INE', 'Tómate una selfie para confirmar que eres tú', 'Ingresa tu nuevo número de teléfono', 'Verifica con el código SMS'].map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#F5C518] text-[#1A1A1A] font-bold text-xs flex items-center justify-center shrink-0">{i+1}</span>
                  {s}
                </div>
              ))}
            </div>
            <button onClick={iniciarEscaneo} disabled={cargando} className="btn-yellow w-full py-3.5 font-bold">
              {cargando ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Comenzar verificación'}
            </button>
          </div>
        )}

        {paso === 'escaneo_ine' && (
          <div className="card p-6">
            <h2 className="text-xl font-extrabold mb-2">Paso 1: Tu INE</h2>
            <p className="text-sm text-[#6B7280] mb-4">Sube una foto clara del frente de tu credencial.</p>
            <label className="btn-yellow w-full py-3.5 font-bold flex items-center justify-center gap-2 cursor-pointer">
              <Camera className="w-5 h-5" /> Subir foto de INE
              <input type="file" accept="image/*" className="hidden" onChange={subirFotoIne} disabled={cargando} />
            </label>
            {cargando && <p className="text-center text-sm text-[#9CA3AF] mt-3">Procesando imagen...</p>}
          </div>
        )}

        {paso === 'selfie' && (
          <div className="card overflow-hidden">
            <div className="p-5">
              <h2 className="text-xl font-extrabold mb-1">Paso 2: Tu selfie</h2>
              <p className="text-sm text-[#6B7280] mb-3">Necesitamos confirmar que eres la misma persona de la INE.</p>
            </div>
            <div className="relative bg-[#111] mx-5 rounded-2xl overflow-hidden mb-5" style={{ aspectRatio: '4/3' }}>
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
            </div>
            <div className="p-5 space-y-3">
              <button onClick={activarCamaraSelfie} className="btn-outline w-full justify-center"><Camera className="w-4 h-4" /> Activar cámara</button>
              <button onClick={tomarSelfie} disabled={cargando} className="btn-yellow w-full py-3.5 font-bold">
                {cargando ? <Loader2 className="w-5 h-5 animate-spin" /> : '📸 Tomar selfie'}
              </button>
            </div>
          </div>
        )}

        {paso === 'nuevo_telefono' && (
          <form onSubmit={solicitarCodigo} className="card p-6 space-y-4">
            <h2 className="text-xl font-extrabold">Paso 3: Nuevo número</h2>
            <p className="text-sm text-[#6B7280]">Ingresa el número de teléfono al que quieres transferir tu cuenta.</p>
            <div>
              <label className="label">Nuevo número de teléfono</label>
              <PhoneInput value={nuevoCelular} onChange={setNuevoCelular} disabled={cargando} />
            </div>
            <button type="submit" disabled={cargando || !nuevoCelular} className="btn-yellow w-full py-3.5 font-bold">
              {cargando ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enviar código →'}
            </button>
          </form>
        )}

        {paso === 'codigo' && (
          <form onSubmit={verificarYCambiar} className="card p-6 space-y-4">
            <h2 className="text-xl font-extrabold">Paso 4: Verificar</h2>
            <p className="text-sm text-[#6B7280]">Ingresa el código enviado a {nuevoCelular}.</p>
            <input type="text" inputMode="numeric" maxLength={6} autoFocus
              className="input text-center text-3xl font-black tracking-[0.5em]"
              placeholder="······" value={codigo} onChange={e => setCodigo(e.target.value.replace(/\D/g,''))} />
            <button type="submit" disabled={cargando || codigo.length !== 6} className="btn-yellow w-full py-3.5 font-bold">
              {cargando ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Cambiar número →'}
            </button>
          </form>
        )}

        {paso === 'exito' && (
          <div className="card p-10 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-extrabold mb-2">Número actualizado</h2>
            <p className="text-[#6B7280] mb-6">Tu nuevo número ha sido verificado. Ya puedes iniciar sesión con él.</p>
            <Link href="/login" className="btn-yellow px-8 py-3">Iniciar sesión →</Link>
          </div>
        )}
      </div>
    </main>
  );
}
