'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Upload, Loader2, CheckCircle2, XCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { DatePicker } from '@/components/DatePicker';

/* ── Constantes del fraccionamiento ─────────────────────── */
const CALLES = [
  'Av. Las Lomas','Blvd. Del Sur','Circuito Las Lomas',
  'Calle Cedro','Calle Pino','Calle Roble','Calle Encino',
  'Calle Nogal','Calle Fresno','Calle Álamo','Calle Sauce',
  'Calle Olmo','Calle Laurel','Privada Los Pinos','Privada Los Cedros',
  'Privada Las Flores','Retorno Las Lomas',
];
const NUMEROS = Array.from({ length: 50 }, (_, i) => String(i + 1));

/* ── Helpers ─────────────────────────────────────────────── */
const FA_CDN  = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js';
const WEIGHTS = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights';

function loadScript(src: string): Promise<void> {
  return new Promise((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
    const s = document.createElement('script'); s.src = src; s.async = true;
    s.onload = () => res(); s.onerror = () => rej(new Error('Error: ' + src));
    document.head.appendChild(s);
  });
}

function fileToCanvas(file: File): Promise<HTMLCanvasElement> {
  return new Promise((res, rej) => {
    const img = new window.Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      c.getContext('2d')!.drawImage(img, 0, 0);
      URL.revokeObjectURL(img.src); res(c);
    };
    img.onerror = () => rej(new Error('Error al cargar imagen'));
    img.src = URL.createObjectURL(file);
  });
}

/** Detectar rostro con múltiples configuraciones, de más permisiva a más estricta */
async function detectarRostro(canvas: HTMLCanvasElement) {
  const fa = (window as any).faceapi;
  for (const cfg of [
    { inputSize: 512, scoreThreshold: 0.20 },
    { inputSize: 416, scoreThreshold: 0.25 },
    { inputSize: 320, scoreThreshold: 0.30 },
    { inputSize: 608, scoreThreshold: 0.15 },
  ]) {
    const d = await fa.detectSingleFace(canvas, new fa.TinyFaceDetectorOptions(cfg))
      .withFaceLandmarks().withFaceDescriptor();
    if (d) return d;
  }
  return null;
}

function parseIne(texto: string) {
  const u = texto.toUpperCase();
  const out: any = { nombreCompleto:'', curp:'', fechaNacimiento:'', sexo:'' };
  const curp = u.match(/[A-Z]{4}\d{6}[HM][A-Z]{5}[0-9A-Z]{2}/);
  if (curp) out.curp = curp[0];
  const fecha = texto.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (fecha) out.fechaNacimiento = `${fecha[3]}-${fecha[2]}-${fecha[1]}`;
  const sexo = u.match(/SEXO\s*[:\-]?\s*([HM])\b/);
  if (sexo) out.sexo = sexo[1] === 'H' ? 'Hombre' : 'Mujer';
  return out;
}

type Paso = 'cargando'|'instrucciones'|'ine'|'datos'|'selfie'|'procesando'|'exito'|'error';

/* ── Página principal ────────────────────────────────────── */
export default function OnboardingPage() {
  const router = useRouter();
  const [paso,    setPaso]    = useState<Paso>('cargando');
  const [progMsg, setProgMsg] = useState('Preparando...');
  const [errGlobal, setErrGlobal] = useState<string|null>(null); // errores de paso ine/datos
  const [ineDesc,   setIneDesc]   = useState<Float32Array|null>(null);
  const [ineCanvas, setIneCanvas] = useState<HTMLCanvasElement|null>(null);
  const [datos, setDatos] = useState({
    nombreCompleto:'', curp:'', fechaNacimiento:'', sexo:'',
    calle:'', numero:'',
  });
  const [viviendaStatus, setViviendaStatus] = useState<'idle'|'checking'|'libre'|'ocupada'>('idle');

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setPaso('cargando');
    try {
      setProgMsg('Cargando detector facial...');
      await loadScript(FA_CDN);
      setProgMsg('Descargando modelo (puede tardar 20 segundos la primera vez)...');
      const fa = (window as any).faceapi;
      await fa.nets.tinyFaceDetector.loadFromUri(WEIGHTS);
      await fa.nets.faceLandmark68Net.loadFromUri(WEIGHTS);
      await fa.nets.faceRecognitionNet.loadFromUri(WEIGHTS);
      setPaso('instrucciones');
    } catch {
      setErrGlobal('No se pudieron cargar los modelos. Verifica tu conexión e intenta de nuevo.');
      setPaso('error');
    }
  }

  const checkVivienda = useCallback(async (calle: string, numero: string) => {
    if (!calle || !numero) { setViviendaStatus('idle'); return; }
    setViviendaStatus('checking');
    try {
      const r = await fetch(`/api/viviendas/check?calle=${encodeURIComponent(calle)}&numero=${encodeURIComponent(numero)}`);
      const j = await r.json();
      setViviendaStatus(j.ocupada ? 'ocupada' : 'libre');
    } catch { setViviendaStatus('idle'); }
  }, []);

  async function procesarIne(file: File) {
    setErrGlobal(null);
    const canvas = await fileToCanvas(file).catch(() => null);
    if (!canvas) { setErrGlobal('No se pudo leer la imagen. Intenta con otra foto.'); return; }
    setIneCanvas(canvas);
    const det = await detectarRostro(canvas);
    if (!det) { setErrGlobal('No se detectó un rostro en la INE. Sube una foto clara y bien iluminada del frente de tu credencial.'); return; }
    setIneDesc(det.descriptor as Float32Array);
    // OCR opcional
    let extra: any = {};
    try {
      const T = (window as any).Tesseract;
      if (T) {
        const w = await T.createWorker('spa', 1, { logger: () => {} });
        const res = await w.recognize(canvas);
        extra = parseIne(res.data.text);
        await w.terminate();
      }
    } catch {}
    setDatos(d => ({ ...d, ...extra }));
    setPaso('datos');
  }

  async function finalizarRegistro(selfieDesc: Float32Array) {
    if (!ineDesc) return;
    const fa = (window as any).faceapi;
    const dist = fa.euclideanDistance(ineDesc, selfieDesc);
    // Umbral permisivo: 0.70 en lugar de 0.62
    if (dist >= 0.70) {
      // ⚠️  NO resetear al inicio — solo quedarse en selfie con mensaje
      return { ok: false, msg: `Tu selfie no coincide exactamente con tu INE (dist: ${dist.toFixed(2)}). Intenta con mejor iluminación, sin lentes de sol y mirando de frente.` };
    }
    const regToken = sessionStorage.getItem('forumnl_reg_token');
    if (!regToken) return { ok: false, msg: 'Sesión expirada. Vuelve al inicio.', resetear: true };
    try {
      const r = await fetch('/api/auth/register/finalizar', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          regToken,
          nombreCompleto: datos.nombreCompleto || 'Usuario',
          curp:           datos.curp           || undefined,
          fechaNacimiento:datos.fechaNacimiento || undefined,
          sexo:           datos.sexo           || undefined,
          domicilio: `${datos.calle} ${datos.numero}, Las Lomas del Sur`,
          calle:          datos.calle,
          numeroExterior: datos.numero,
          embeddingFacial: Array.from(ineDesc),
        }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) return { ok: false, msg: j.message || 'Error al registrar.', resetear: true };
      sessionStorage.removeItem('forumnl_reg_token');
      return { ok: true };
    } catch {
      return { ok: false, msg: 'Error de red. Intenta de nuevo.', resetear: true };
    }
  }

  const puedeAvanzar = datos.nombreCompleto && datos.calle && datos.numero && viviendaStatus === 'libre';

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="w-full py-4 px-4 flex items-center gap-3" style={{ background:'linear-gradient(135deg,#F5C518,#FFD740)' }}>
        <Link href="/register" className="text-[#1A1A1A] hover:opacity-70"><ArrowLeft className="w-5 h-5"/></Link>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-ieepc.png" alt="IEEPCNL" style={{ height:'36px', width:'auto', mixBlendMode:'multiply' }}/>
        <span className="font-black text-[#1A1A1A]">Verificación de identidad</span>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Indicador de pasos */}
        <div className="flex items-center mb-8">
          {['INE','Datos','Selfie','Listo'].map((label, i) => {
            const idx = ['cargando','instrucciones','ine'].includes(paso) ? 0 : paso==='datos' ? 1 : ['selfie','procesando'].includes(paso) ? 2 : 3;
            return (
              <div key={label} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${i<idx?'bg-green-500 text-white':i===idx?'text-[#1A1A1A]':'bg-[#F3F4F6] text-[#9CA3AF]'}`}
                    style={i===idx?{background:'linear-gradient(135deg,#F5C518,#E6B800)'}:{}}>{i<idx?'✓':i+1}</div>
                  <span className={`text-[10px] mt-1 font-semibold ${i===idx?'text-[#1A1A1A]':'text-[#9CA3AF]'}`}>{label}</span>
                </div>
                {i<3&&<div className={`flex-1 h-0.5 mx-2 mb-5 ${i<idx?'bg-green-400':'bg-[#E5E7EB]'}`}/>}
              </div>
            );
          })}
        </div>

        {errGlobal && paso !== 'selfie' && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 mb-4 flex justify-between items-start">
            {errGlobal}
            <button onClick={() => setErrGlobal(null)} className="ml-2 text-red-400 hover:text-red-600 shrink-0">×</button>
          </div>
        )}

        {paso === 'cargando' && (
          <div className="card p-10 text-center">
            <Loader2 className="w-10 h-10 animate-spin text-[#F5C518] mx-auto mb-4"/>
            <p className="font-semibold">{progMsg}</p>
            <p className="text-xs text-[#9CA3AF] mt-1">Primera carga: ~15 MB. Solo una vez por dispositivo.</p>
          </div>
        )}

        {paso === 'error' && (
          <div className="card p-8 text-center">
            <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4"/>
            <p className="text-red-600 font-semibold mb-4">{errGlobal}</p>
            <button onClick={() => { setErrGlobal(null); cargar(); }} className="btn-yellow px-6 py-3">
              <RefreshCw className="w-4 h-4"/> Reintentar
            </button>
          </div>
        )}

        {paso === 'instrucciones' && (
          <div className="card p-7">
            <div className="text-center mb-6"><div className="text-5xl mb-3">🪪</div><h2 className="text-2xl font-extrabold">Verifica tu identidad</h2></div>
            <div className="space-y-3 mb-8">
              {[
                { e:'📸', t:'Foto del frente de tu INE', d:'La foto debe ser clara, sin reflejos.' },
                { e:'✏️', t:'Confirma tus datos y dirección', d:'Selecciona tu calle y número dentro del fraccionamiento.' },
                { e:'🤳', t:'Selfie de verificación', d:'Mira directo a la cámara con buena iluminación de frente.' },
              ].map(s => (
                <div key={s.t} className="flex gap-3 p-3.5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB]">
                  <span className="text-2xl">{s.e}</span>
                  <div><p className="font-semibold text-sm">{s.t}</p><p className="text-xs text-[#6B7280]">{s.d}</p></div>
                </div>
              ))}
            </div>
            <button onClick={() => setPaso('ine')} className="btn-yellow w-full py-3.5 text-base">Comenzar →</button>
          </div>
        )}

        {paso === 'ine' && (
          <div className="card overflow-hidden">
            <div className="px-5 pt-5 pb-3">
              <h2 className="text-xl font-extrabold">Paso 1: Frente de tu INE</h2>
              <p className="text-sm text-[#6B7280] mt-1">Toma una foto o súbela desde tu galería.</p>
            </div>
            <div className="p-5 space-y-3">
              <CapturaINE onCapturado={procesarIne} />
            </div>
          </div>
        )}

        {paso === 'datos' && (
          <div className="card p-6">
            <h2 className="text-xl font-extrabold mb-1">Confirma tus datos</h2>
            <p className="text-sm text-[#6B7280] mb-4">Verifica la información extraída y elige tu dirección.</p>
            {ineCanvas && (
              <canvas
                ref={ref => { if(ref&&ineCanvas){ref.width=ineCanvas.width;ref.height=ineCanvas.height;ref.getContext('2d')!.drawImage(ineCanvas,0,0);} }}
                className="w-full rounded-xl border border-[#E5E7EB] mb-4 object-contain" style={{ maxHeight:150 }}
              />
            )}
            <div className="space-y-4 mb-5">
              <div>
                <label className="label">Nombre completo *</label>
                <input type="text" className="input" value={datos.nombreCompleto} onChange={e => setDatos(d => ({...d,nombreCompleto:e.target.value}))} placeholder="Como aparece en la INE"/>
              </div>
              <div>
                <label className="label">CURP</label>
                <input type="text" className="input font-mono uppercase" value={datos.curp} onChange={e => setDatos(d => ({...d,curp:e.target.value.toUpperCase()}))} placeholder="18 caracteres"/>
              </div>

              {/* Fecha de nacimiento — calendario popup */}
              <div>
                <label className="label">Fecha de nacimiento</label>
                <DatePicker
                  value={datos.fechaNacimiento}
                  onChange={v => setDatos(d => ({...d, fechaNacimiento: v}))}
                />
              </div>

              <div>
                <label className="label">Sexo</label>
                <select className="input" value={datos.sexo} onChange={e => setDatos(d => ({...d,sexo:e.target.value}))}>
                  <option value="">— Seleccionar —</option>
                  <option>Hombre</option><option>Mujer</option>
                  <option value="No binario">No binario</option>
                  <option value="Prefiero no responder">Prefiero no responder</option>
                </select>
              </div>

              {/* Dirección */}
              <div className="pt-3 border-t border-[#E5E7EB]">
                <p className="text-xs font-bold text-[#374151] uppercase tracking-wider mb-3">Dirección en el fraccionamiento</p>
                <div className="mb-3">
                  <label className="label">Colonia</label>
                  <div className="input bg-[#F3F4F6] text-[#6B7280] cursor-not-allowed flex items-center gap-1.5">
                    <span>📍</span> Las Lomas del Sur, Monterrey, N.L.
                  </div>
                </div>
                <div className="mb-3">
                  <label className="label">Calle *</label>
                  <select className="input" value={datos.calle} onChange={e => {
                    const c = e.target.value; setDatos(d => ({...d,calle:c,numero:''})); setViviendaStatus('idle');
                  }}>
                    <option value="">— Selecciona tu calle —</option>
                    {CALLES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="label">Número exterior *</label>
                  <select className="input" value={datos.numero} disabled={!datos.calle} onChange={e => {
                    const n = e.target.value; setDatos(d => ({...d,numero:n})); if(datos.calle&&n) checkVivienda(datos.calle,n);
                  }}>
                    <option value="">— Número —</option>
                    {NUMEROS.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>

                {viviendaStatus === 'checking' && (
                  <div className="flex items-center gap-2 text-xs text-[#6B7280]"><Loader2 className="w-3 h-3 animate-spin"/>Verificando disponibilidad...</div>
                )}
                {viviendaStatus === 'ocupada' && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3">
                    Esta vivienda ya tiene un representante. Usa <strong>Actualizar votante de la vivienda</strong>.
                  </div>
                )}
                {viviendaStatus === 'libre' && (
                  <div className="bg-green-50 border border-green-200 text-green-700 text-xs rounded-xl p-3 flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5"/>Vivienda disponible para registro.
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setPaso('ine')} className="btn-outline flex-1 justify-center">Volver a capturar</button>
              <button disabled={!puedeAvanzar} onClick={() => setPaso('selfie')} className="btn-yellow flex-1 justify-center">Continuar →</button>
            </div>
          </div>
        )}

        {/* Selfie — errores locales, NO resetea el flujo completo */}
        {paso === 'selfie' && (
          <CapturaSelfie
            onCapturado={async (selfieDesc) => {
              setPaso('procesando');
              const result = await finalizarRegistro(selfieDesc);
              if (!result) { setPaso('error'); setErrGlobal('Error inesperado.'); return; }
              if (result.ok) { setPaso('exito'); return; }
              // ← CLAVE: si falla, volver a 'selfie' con mensaje local — NO al inicio
              if (result.resetear) { setPaso('error'); setErrGlobal(result.msg ?? 'Error.'); return; }
              setPaso('selfie'); // quedarse en selfie con el mensaje de mismatch
              setErrGlobal(result.msg ?? 'Intenta de nuevo.');
            }}
            errLocal={errGlobal}
            onClearErr={() => setErrGlobal(null)}
          />
        )}

        {paso === 'procesando' && (
          <div className="card p-10 text-center">
            <Loader2 className="w-12 h-12 animate-spin text-[#F5C518] mx-auto mb-4"/>
            <p className="font-bold text-lg">Verificando identidad...</p>
            <p className="text-sm text-[#9CA3AF] mt-1">Comparando tu selfie con tu INE...</p>
          </div>
        )}

        {paso === 'exito' && (
          <div className="card p-10 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4"/>
            <h2 className="text-2xl font-extrabold mb-2">¡Registro exitoso!</h2>
            <p className="text-[#6B7280] mb-8">Bienvenido a FórumNL.</p>
            <button onClick={() => { router.refresh(); router.push('/home'); }} className="btn-yellow px-10 py-3">
              Ir al inicio →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Subcomponente: Captura de INE ─────────────────────── */
function CapturaINE({ onCapturado }: { onCapturado: (f: File) => void }) {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream|null>(null);
  const [activa, setActiva] = useState(false);
  const [loading, setLoading] = useState(false);

  async function iniciar() {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } }, audio: false });
      streamRef.current = s;
      if (videoRef.current) { videoRef.current.srcObject = s; videoRef.current.onloadedmetadata = () => { videoRef.current!.play(); setActiva(true); }; }
    } catch { alert('No se pudo abrir la cámara. Usa el botón de subir foto.'); }
  }

  async function capturar() {
    const v = videoRef.current; if (!v) return;
    streamRef.current?.getTracks().forEach(t => t.stop()); setActiva(false); setLoading(true);
    const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d')!.drawImage(v, 0, 0);
    c.toBlob(b => { if (b) onCapturado(new File([b], 'ine.jpg', { type: 'image/jpeg' })); setLoading(false); }, 'image/jpeg', 0.95);
  }

  return (
    <>
      <div className="relative bg-[#111] rounded-2xl overflow-hidden" style={{ aspectRatio: '4/3' }}>
        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover"/>
        {!activa && !loading && <div className="absolute inset-0 flex items-center justify-center bg-[#1A1A1A]"><span className="text-5xl">🪪</span></div>}
        {loading && <div className="absolute inset-0 bg-black/70 flex items-center justify-center"><Loader2 className="w-10 h-10 text-[#F5C518] animate-spin"/></div>}
        {activa && <div className="absolute inset-0 pointer-events-none flex items-center justify-center"><div className="border-2 border-dashed border-[#F5C518]/70 rounded-lg" style={{ width:'85%', aspectRatio:'1.585' }}/></div>}
      </div>
      {!activa && !loading && <button onClick={iniciar} className="btn-yellow w-full py-3.5 font-bold"><Camera className="w-5 h-5"/> Activar cámara</button>}
      {activa && !loading && <button onClick={capturar} className="btn-yellow w-full py-4 text-lg font-black">📸 Tomar foto de la INE</button>}
      {!loading && (
        <label className="btn-outline w-full justify-center cursor-pointer py-3">
          <Upload className="w-4 h-4"/> {activa ? 'O subir foto guardada' : 'Subir foto de la INE'}
          <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { e.target.value=''; setLoading(true); onCapturado(f); } }}/>
        </label>
      )}
    </>
  );
}

/* ── Subcomponente: Selfie ───────────────────────────────
   Los errores son LOCALES — no resetean el flujo completo
   ─────────────────────────────────────────────────────── */
function CapturaSelfie({
  onCapturado, errLocal, onClearErr,
}: {
  onCapturado: (d: Float32Array) => void;
  errLocal: string|null;
  onClearErr: () => void;
}) {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream|null>(null);
  const [activa,   setActiva]  = useState(false);
  const [loading,  setLoading] = useState(false);
  const [intentos, setIntentos] = useState(0);

  async function iniciar() {
    onClearErr();
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      streamRef.current = s;
      if (videoRef.current) { videoRef.current.srcObject = s; videoRef.current.onloadedmetadata = () => { videoRef.current!.play(); setActiva(true); }; }
    } catch { alert('No se pudo abrir la cámara frontal.'); }
  }

  async function capturar() {
    const v = videoRef.current; if (!v) return;
    streamRef.current?.getTracks().forEach(t => t.stop()); setActiva(false); setLoading(true);
    setIntentos(n => n + 1);

    const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight;
    const ctx = c.getContext('2d')!; ctx.translate(c.width, 0); ctx.scale(-1, 1); ctx.drawImage(v, 0, 0);

    const det = await detectarRostro(c);
    setLoading(false);

    if (!det) {
      // ← No llama a onError — solo pone mensaje local
      onClearErr();
      // Usamos el mecanismo de errLocal a través del padre
      onCapturado(new Float32Array()); // enviar vacío para que el padre maneje el "error de detección"
      return;
    }

    onCapturado(det.descriptor as Float32Array);
  }

  return (
    <div className="card overflow-hidden">
      <div className="px-5 pt-5 pb-3">
        <h2 className="text-xl font-extrabold">Paso 3: Tu selfie</h2>
        <p className="text-sm text-[#6B7280] mt-1">Mira directo a la cámara con luz de frente.</p>
      </div>

      {errLocal && (
        <div className="mx-5 mb-3 bg-orange-50 border border-orange-200 text-orange-700 text-xs rounded-xl p-3 flex justify-between items-start">
          <span>{errLocal}</span>
          <button onClick={onClearErr} className="ml-2 shrink-0 text-orange-400 hover:text-orange-600">×</button>
        </div>
      )}

      <div className="relative bg-[#111] mx-5 rounded-2xl overflow-hidden" style={{ aspectRatio: '4/3' }}>
        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }}/>
        {!activa && !loading && <div className="absolute inset-0 flex items-center justify-center bg-[#1A1A1A]"><span className="text-5xl">🤳</span></div>}
        {loading && <div className="absolute inset-0 bg-black/70 flex items-center justify-center"><Loader2 className="w-10 h-10 text-[#F5C518] animate-spin"/></div>}
        {activa && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="border-2 border-dashed border-[#F5C518]/60 rounded-full" style={{ width:'55%', aspectRatio:'3/4' }}/>
            </div>
            <div className="absolute bottom-3 left-0 right-0 flex justify-center">
              <span className="bg-black/50 text-white text-[10px] rounded-full px-3 py-1">☀️ Ilumínate de frente</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-5 space-y-3">
        {!activa && !loading && (
          <button onClick={iniciar} className="btn-yellow w-full py-3.5 font-bold">
            <Camera className="w-5 h-5"/> {intentos > 0 ? 'Intentar selfie de nuevo' : 'Activar cámara frontal'}
          </button>
        )}
        {activa && !loading && (
          <button onClick={capturar} className="btn-yellow w-full py-4 text-lg font-black">📸 Tomar selfie</button>
        )}
        {intentos > 0 && !activa && (
          <p className="text-center text-xs text-[#9CA3AF]">
            Consejo: busca un cuarto bien iluminado, quítate lentes y mira directo a la lente.
          </p>
        )}
      </div>
    </div>
  );
}
