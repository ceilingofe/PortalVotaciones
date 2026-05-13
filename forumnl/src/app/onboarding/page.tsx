'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Upload, Loader2, CheckCircle2, XCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

type Paso = 'cargando' | 'instrucciones' | 'ine' | 'preview_ine' | 'datos' | 'selfie' | 'preview_selfie' | 'procesando' | 'exito' | 'error';

export default function OnboardingPage() {
  const router = useRouter();
  const [paso, setPaso] = useState<Paso>('cargando');
  const [progreso, setProgreso] = useState('Preparando modelos de IA...');
  const [error, setError] = useState<string | null>(null);

  const [ineDescriptor, setIneDescriptor] = useState<Float32Array | null>(null);
  const [ineCanvas, setIneCanvas] = useState<HTMLCanvasElement | null>(null);
  const [datosIne, setDatosIne] = useState({ nombreCompleto: '', curp: '', fechaNacimiento: '', sexo: '', domicilio: '' });
  const [selfieDescriptor, setSelfieDescriptor] = useState<Float32Array | null>(null);

  useEffect(() => {
    cargarLibrerias();
  }, []);

  async function cargarLibrerias() {
    try {
      setProgreso('Cargando detector facial (1/3)…');
      await loadScript('https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js');

      setProgreso('Cargando OCR (2/3)…');
      await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js');

      setProgreso('Descargando modelo de reconocimiento (3/3)…');
      const MODEL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights';
      const fa = (window as any).faceapi;
      await fa.nets.tinyFaceDetector.loadFromUri(MODEL);
      await fa.nets.faceLandmark68Net.loadFromUri(MODEL);
      await fa.nets.faceRecognitionNet.loadFromUri(MODEL);

      setPaso('instrucciones');
    } catch (e: any) {
      setError('No se pudieron cargar los modelos. Verifica tu conexión.');
      setPaso('error');
    }
  }

  async function finalizarRegistro(selfieDesc: Float32Array) {
    try {
      if (!ineDescriptor) throw new Error('Sin descriptor de INE');
      const fa = (window as any).faceapi;
      const dist = fa.euclideanDistance(ineDescriptor, selfieDesc);
      if (dist >= 0.62) {
        setError(`Tu rostro no coincide con la foto de la INE (distancia: ${dist.toFixed(3)}). Intenta con mejor iluminación o una foto más clara de la INE.`);
        setPaso('error');
        return;
      }
      const regToken = sessionStorage.getItem('forumnl_reg_token');
      if (!regToken) { setError('Sesión expirada. Vuelve al inicio.'); setPaso('error'); return; }
      const r = await fetch('/api/auth/register/finalizar', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          regToken,
          nombreCompleto: datosIne.nombreCompleto || 'Usuario',
          curp: datosIne.curp || undefined,
          fechaNacimiento: datosIne.fechaNacimiento || undefined,
          sexo: datosIne.sexo || undefined,
          domicilio: datosIne.domicilio || undefined,
          embeddingFacial: Array.from(ineDescriptor),
        }),
      });
      const json = await r.json();
      if (!r.ok || !json.ok) { setError(json.message || 'Error al registrar.'); setPaso('error'); return; }
      sessionStorage.removeItem('forumnl_reg_token');
      setPaso('exito');
    } catch (e: any) {
      setError(e?.message || 'Error desconocido.');
      setPaso('error');
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header amarillo */}
      <div className="w-full py-4 px-4 flex items-center gap-3" style={{ background: 'linear-gradient(135deg,#F5C518,#FFD740)' }}>
        <Link href="/register" className="text-[#1A1A1A] hover:opacity-70">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-ieepc.png" alt="IEEPCNL" style={{ height: '36px', width: 'auto', mixBlendMode: 'multiply' }} />
        <span className="font-black text-[#1A1A1A]">Verificación de identidad</span>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        <StepIndicator paso={paso} />

        {paso === 'cargando' && <PantallaCargando progreso={progreso} />}
        {paso === 'instrucciones' && <PantallaInstrucciones onContinuar={() => setPaso('ine')} />}
        {paso === 'ine' && (
          <CapturaIne
            onCapturado={(canvas, descriptor, datos) => {
              setIneCanvas(canvas);
              setIneDescriptor(descriptor);
              setDatosIne(datos);
              setPaso('datos');
            }}
            onError={(msg) => { setError(msg); setPaso('error'); }}
          />
        )}
        {paso === 'datos' && (
          <ConfirmarDatos
            datos={datosIne}
            ineCanvas={ineCanvas}
            onActualizar={setDatosIne}
            onAtras={() => setPaso('ine')}
            onContinuar={() => setPaso('selfie')}
          />
        )}
        {paso === 'selfie' && (
          <CapturaSelfie
            onCapturado={async (descriptor) => {
              setSelfieDescriptor(descriptor);
              setPaso('procesando');
              await finalizarRegistro(descriptor);
            }}
            onError={(msg) => { setError(msg); setPaso('error'); }}
          />
        )}
        {paso === 'procesando' && (
          <div className="card p-10 text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-[#F5C518]" />
            <p className="font-bold text-lg">Verificando identidad…</p>
            <p className="text-sm text-[#6B7280] mt-1">Comparando rostros, un momento.</p>
          </div>
        )}
        {paso === 'exito' && (
          <div className="card p-10 text-center">
            <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-500" />
            <h2 className="text-2xl font-extrabold mb-2">¡Registro exitoso!</h2>
            <p className="text-[#6B7280] mb-8">Bienvenido a FórumNL. Tu identidad fue verificada.</p>
            <button onClick={() => router.push('/home')} className="btn-yellow px-10 py-3 text-base">
              Ir al inicio →
            </button>
          </div>
        )}
        {paso === 'error' && (
          <div className="card p-10 text-center">
            <XCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-bold mb-2">Algo salió mal</h2>
            <p className="text-[#6B7280] mb-8 text-sm max-w-xs mx-auto">{error}</p>
            <button onClick={() => { setError(null); setPaso('ine'); }} className="btn-yellow px-8 py-3">
              <RefreshCw className="w-4 h-4" /> Reintentar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Indicador de pasos ──────────────────────────────── */
function StepIndicator({ paso }: { paso: Paso }) {
  const labels = ['INE', 'Datos', 'Selfie', 'Listo'];
  const idx = ['cargando','instrucciones','ine','preview_ine'].includes(paso) ? 0 :
               paso === 'datos' ? 1 :
               ['selfie','preview_selfie','procesando'].includes(paso) ? 2 : 3;
  return (
    <div className="flex items-center mb-8">
      {labels.map((label, i) => (
        <div key={label} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                i < idx ? 'bg-green-500 text-white' : i === idx ? 'text-[#1A1A1A]' : 'bg-[#F3F4F6] text-[#9CA3AF]'
              }`}
              style={i === idx ? { background: 'linear-gradient(135deg,#F5C518,#E6B800)' } : {}}
            >
              {i < idx ? '✓' : i + 1}
            </div>
            <span className={`text-[10px] mt-1 font-semibold ${i === idx ? 'text-[#1A1A1A]' : 'text-[#9CA3AF]'}`}>{label}</span>
          </div>
          {i < labels.length - 1 && (
            <div className={`flex-1 h-0.5 mx-2 mb-5 ${i < idx ? 'bg-green-400' : 'bg-[#E5E7EB]'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Pantalla de carga ───────────────────────────────── */
function PantallaCargando({ progreso }: { progreso: string }) {
  return (
    <div className="card p-10 text-center">
      <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4 text-[#F5C518]" />
      <p className="font-semibold">{progreso}</p>
      <p className="text-xs text-[#9CA3AF] mt-1">Primera carga: ~10 MB. Solo una vez por sesión.</p>
    </div>
  );
}

/* ── Instrucciones ───────────────────────────────────── */
function PantallaInstrucciones({ onContinuar }: { onContinuar: () => void }) {
  return (
    <div className="card p-7">
      <div className="text-center mb-7">
        <div className="text-5xl mb-3">🪪</div>
        <h2 className="text-2xl font-extrabold">Verifica tu identidad</h2>
        <p className="text-[#6B7280] text-sm mt-2">Proceso rápido en 3 pasos.</p>
      </div>
      <div className="space-y-3 mb-8">
        {[
          { emoji: '📸', title: 'Foto del frente de tu INE', desc: 'Coloca la credencial frente a la cámara y toma la foto.' },
          { emoji: '✏️', title: 'Confirma tus datos', desc: 'Revisa y corrige la información extraída.' },
          { emoji: '🤳', title: 'Selfie de verificación', desc: 'Tomamos tu foto para comparar con la INE.' },
        ].map((s) => (
          <div key={s.title} className="flex gap-3 p-3.5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB]">
            <span className="text-2xl">{s.emoji}</span>
            <div>
              <p className="font-semibold text-sm">{s.title}</p>
              <p className="text-xs text-[#6B7280]">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <button onClick={onContinuar} className="btn-yellow w-full py-3.5 text-base">
        Comenzar →
      </button>
    </div>
  );
}

/* ── Captura INE — FLUJO SIMPLIFICADO ────────────────── */
function CapturaIne({
  onCapturado,
  onError,
}: {
  onCapturado: (canvas: HTMLCanvasElement, descriptor: Float32Array, datos: any) => void;
  onError: (msg: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [camActiva, setCamActiva] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState('Inicia la cámara o sube una foto de tu INE.');
  const [msgTipo, setMsgTipo] = useState<'normal' | 'ok' | 'error'>('normal');
  const streamRef = useRef<MediaStream | null>(null);

  function setMsg(t: string, tipo: 'normal' | 'ok' | 'error' = 'normal') { setMensaje(t); setMsgTipo(tipo); }

  async function iniciarCamara() {
    try {
      setMsg('Solicitando acceso a la cámara…');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current!.play();
          setCamActiva(true);
          setMsg('Cámara lista. Coloca el frente de tu INE y toma la foto.');
        };
      }
    } catch (e: any) {
      setMsg('No se pudo abrir la cámara. Usa el botón "Subir foto" en su lugar.', 'error');
    }
  }

  function detenerCamara() {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCamActiva(false);
  }

  async function tomarFoto() {
    const video = videoRef.current;
    if (!video || !camActiva) return;
    detenerCamara();
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);
    await procesarImagen(canvas);
  }

  async function subirFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    detenerCamara();
    try {
      const canvas = await fileToCanvas(file);
      await procesarImagen(canvas);
    } catch (err: any) {
      onError(err.message || 'No se pudo cargar la imagen.');
    }
  }

  async function procesarImagen(canvas: HTMLCanvasElement) {
    setProcesando(true);
    setMsg('Buscando rostro en la credencial…');

    const fa = (window as any).faceapi;
    if (!fa) { onError('Face-api no está cargado.'); return; }

    // Intentar con varios thresholds para capturar caras pequeñas (INE)
    const opciones = [
      { inputSize: 512 as 512, scoreThreshold: 0.20 },
      { inputSize: 416 as 416, scoreThreshold: 0.15 },
      { inputSize: 320 as 320, scoreThreshold: 0.10 },
    ];

    let detection: any = null;
    for (const o of opciones) {
      detection = await fa
        .detectSingleFace(canvas, new fa.TinyFaceDetectorOptions(o))
        .withFaceLandmarks()
        .withFaceDescriptor();
      if (detection) break;
    }

    if (!detection) {
      setProcesando(false);
      setMsg(
        'No se detectó un rostro en la imagen. Asegúrate de que el frente de la INE esté bien visible y enfocado.',
        'error'
      );
      setCamActiva(false); // Permitir reintentar
      return;
    }

    // OCR en background (no bloquea)
    let datos = { nombreCompleto: '', curp: '', fechaNacimiento: '', sexo: '', domicilio: '' };
    try {
      const T = (window as any).Tesseract;
      if (T) {
        const worker = await T.createWorker('spa', 1, { logger: () => {} });
        const res = await worker.recognize(canvas);
        datos = parseIne(res.data.text);
        await worker.terminate();
      }
    } catch {}

    setMsg('¡Rostro detectado!', 'ok');
    setProcesando(false);
    onCapturado(canvas, detection.descriptor as Float32Array, datos);
  }

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <h2 className="text-xl font-extrabold">Paso 1: Frente de tu INE</h2>
        <p className="text-sm text-[#6B7280] mt-1">
          Toma una foto del frente de tu credencial o súbela desde tu galería.
        </p>
      </div>

      {/* Video o placeholder */}
      <div className="relative bg-[#111] mx-5 rounded-2xl overflow-hidden" style={{ aspectRatio: '4/3' }}>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
        />
        {!camActiva && !procesando && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#1A1A1A]">
            <span className="text-5xl">🪪</span>
            <p className="text-sm text-[#9CA3AF] text-center px-4">
              Activa la cámara o sube una foto de tu INE
            </p>
          </div>
        )}
        {procesando && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-10 h-10 text-[#F5C518] animate-spin" />
            <p className="text-white text-sm">{mensaje}</p>
          </div>
        )}
        {/* Guía visual de posicionamiento */}
        {camActiva && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="border-2 border-dashed border-[#F5C518]/70 rounded-lg" style={{ width: '82%', aspectRatio: '1.585' }} />
          </div>
        )}
      </div>

      {/* Mensaje de estado */}
      <div className={`mx-5 mt-3 px-4 py-2.5 rounded-xl text-sm font-medium ${
        msgTipo === 'ok' ? 'bg-green-50 text-green-800 border border-green-200' :
        msgTipo === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
        'bg-[#F9FAFB] text-[#6B7280]'
      }`}>
        {mensaje}
      </div>

      {/* Botones de acción */}
      <div className="p-5 space-y-3">
        {!camActiva && !procesando && (
          <button
            onClick={iniciarCamara}
            className="btn-yellow w-full py-3.5 text-base font-bold"
          >
            <Camera className="w-5 h-5" /> Activar cámara
          </button>
        )}

        {camActiva && !procesando && (
          <button
            onClick={tomarFoto}
            className="btn-yellow w-full py-4 text-lg font-black"
            style={{ boxShadow: '0 4px 20px rgba(245,197,24,0.4)' }}
          >
            📸 Tomar foto de la INE
          </button>
        )}

        {/* Subir foto siempre disponible */}
        {!procesando && (
          <label className="btn-outline w-full justify-center cursor-pointer py-3">
            <Upload className="w-4 h-4" />
            {camActiva ? 'O sube una foto guardada' : 'Subir foto de la INE'}
            <input type="file" accept="image/*" className="hidden" onChange={subirFoto} />
          </label>
        )}

        {camActiva && !procesando && (
          <button onClick={detenerCamara} className="btn-ghost w-full text-sm">
            Cancelar cámara
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Confirmar datos ─────────────────────────────────── */
function ConfirmarDatos({ datos, ineCanvas, onActualizar, onAtras, onContinuar }: any) {
  return (
    <div className="card p-6">
      <h2 className="text-xl font-extrabold mb-1">Confirma tus datos</h2>
      <p className="text-sm text-[#6B7280] mb-4">
        Verifica la información extraída de tu INE y corrige lo necesario.
      </p>

      {ineCanvas && (
        <div className="mb-5 rounded-xl overflow-hidden border border-[#E5E7EB]">
          <canvas
            ref={(ref) => {
              if (ref && ineCanvas) {
                ref.width = ineCanvas.width;
                ref.height = ineCanvas.height;
                ref.getContext('2d')!.drawImage(ineCanvas, 0, 0);
              }
            }}
            className="w-full"
          />
        </div>
      )}

      <div className="space-y-4 mb-6">
        <div>
          <label className="label">Nombre completo *</label>
          <input
            type="text"
            className="input"
            value={datos.nombreCompleto}
            onChange={(e) => onActualizar({ ...datos, nombreCompleto: e.target.value })}
            placeholder="Como aparece en tu INE"
            required
          />
        </div>
        <div>
          <label className="label">CURP</label>
          <input
            type="text"
            className="input font-mono"
            value={datos.curp}
            onChange={(e) => onActualizar({ ...datos, curp: e.target.value.toUpperCase() })}
            placeholder="18 caracteres"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Fecha nacimiento</label>
            <input type="date" className="input" value={datos.fechaNacimiento}
              onChange={(e) => onActualizar({ ...datos, fechaNacimiento: e.target.value })} />
          </div>
          <div>
            <label className="label">Sexo</label>
            <select className="input" value={datos.sexo}
              onChange={(e) => onActualizar({ ...datos, sexo: e.target.value })}>
              <option value="">— Seleccionar —</option>
              <option value="Hombre">Hombre</option>
              <option value="Mujer">Mujer</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label">Domicilio</label>
          <input type="text" className="input" value={datos.domicilio}
            onChange={(e) => onActualizar({ ...datos, domicilio: e.target.value })}
            placeholder="Colonia Las Lomas del Sur (se asigna automáticamente)" />
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={onAtras} className="btn-outline flex-1 justify-center">
          Volver a capturar
        </button>
        <button onClick={onContinuar} disabled={!datos.nombreCompleto} className="btn-yellow flex-1 justify-center">
          Continuar →
        </button>
      </div>
    </div>
  );
}

/* ── Captura Selfie — también simplificada ───────────── */
function CapturaSelfie({ onCapturado, onError }: any) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [camActiva, setCamActiva] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState('Activa la cámara y toma tu selfie.');
  const [msgTipo, setMsgTipo] = useState<'normal' | 'ok' | 'error'>('normal');
  const streamRef = useRef<MediaStream | null>(null);

  async function iniciarCamara() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current!.play();
          setCamActiva(true);
          setMensaje('Mira directamente a la cámara y toma la foto.');
          setMsgTipo('normal');
        };
      }
    } catch {
      setMensaje('No se pudo abrir la cámara frontal.', 'error' as any);
    }
  }

  async function tomarFoto() {
    const video = videoRef.current;
    if (!video) return;
    streamRef.current?.getTracks().forEach(t => t.stop());
    setCamActiva(false);
    setProcesando(true);
    setMensaje('Detectando rostro…');

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    // Capturar en espejo
    const ctx = canvas.getContext('2d')!;
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);

    const fa = (window as any).faceapi;
    const detection = await fa
      .detectSingleFace(canvas, new fa.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.45 }))
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      setProcesando(false);
      setMensaje('No se detectó tu rostro. Asegúrate de estar bien iluminado y mirando a la cámara.', 'error' as any);
      return;
    }

    setMensaje('¡Selfie capturada!', 'ok' as any);
    setProcesando(false);
    onCapturado(detection.descriptor as Float32Array);
  }

  return (
    <div className="card overflow-hidden">
      <div className="px-5 pt-5 pb-3">
        <h2 className="text-xl font-extrabold">Paso 3: Tu selfie</h2>
        <p className="text-sm text-[#6B7280] mt-1">
          Mira directamente a la cámara, en un lugar bien iluminado.
        </p>
      </div>

      <div className="relative bg-[#111] mx-5 rounded-2xl overflow-hidden" style={{ aspectRatio: '4/3' }}>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }}
        />
        {!camActiva && !procesando && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1A1A1A] gap-3">
            <span className="text-5xl">🤳</span>
            <p className="text-sm text-[#9CA3AF]">Activa la cámara frontal</p>
          </div>
        )}
        {procesando && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-[#F5C518] animate-spin" />
          </div>
        )}
        {camActiva && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="border-2 border-dashed border-white/50 rounded-full" style={{ width: '55%', aspectRatio: '3/4' }} />
          </div>
        )}
      </div>

      <div className={`mx-5 mt-3 px-4 py-2.5 rounded-xl text-sm font-medium ${
        msgTipo === 'ok' ? 'bg-green-50 text-green-800 border border-green-200' :
        msgTipo === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
        'bg-[#F9FAFB] text-[#6B7280]'
      }`}>
        {mensaje}
      </div>

      <div className="p-5 space-y-3">
        {!camActiva && !procesando && (
          <button onClick={iniciarCamara} className="btn-yellow w-full py-3.5 text-base font-bold">
            <Camera className="w-5 h-5" /> Activar cámara frontal
          </button>
        )}
        {camActiva && !procesando && (
          <button onClick={tomarFoto} className="btn-yellow w-full py-4 text-lg font-black">
            📸 Tomar selfie
          </button>
        )}
        {!procesando && msgTipo === 'error' && (
          <button onClick={() => { setMensaje('Activa la cámara y toma tu selfie.'); setMsgTipo('normal'); }} className="btn-ghost w-full">
            <RefreshCw className="w-4 h-4" /> Reintentar
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────── */
function loadScript(src: string): Promise<void> {
  return new Promise((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
    const s = document.createElement('script');
    s.src = src; s.async = true;
    s.onload = () => res();
    s.onerror = () => rej(new Error('Falló: ' + src));
    document.head.appendChild(s);
  });
}

function fileToCanvas(file: File): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext('2d')!.drawImage(img, 0, 0);
      URL.revokeObjectURL(img.src);
      resolve(c);
    };
    img.onerror = () => { URL.revokeObjectURL(img.src); reject(new Error('Error al cargar imagen')); };
    img.src = URL.createObjectURL(file);
  });
}

function parseIne(texto: string) {
  const upper = texto.toUpperCase();
  const out: any = { nombreCompleto: '', curp: '', fechaNacimiento: '', sexo: '', domicilio: '' };
  const curp = upper.match(/[A-Z]{4}\d{6}[HM][A-Z]{5}[0-9A-Z]{2}/);
  if (curp) out.curp = curp[0];
  const fecha = texto.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (fecha) out.fechaNacimiento = `${fecha[3]}-${fecha[2]}-${fecha[1]}`;
  const sexo = upper.match(/SEXO\s*[:\-]?\s*([HM])\b/);
  if (sexo) out.sexo = sexo[1] === 'H' ? 'Hombre' : 'Mujer';
  const lines = texto.split(/\n+/).map(l => l.trim()).filter(Boolean);
  const idxN = lines.findIndex(l => /^NOMBRE\b/i.test(l));
  if (idxN >= 0) {
    const pts: string[] = [];
    for (let i = idxN + 1; i < Math.min(idxN + 4, lines.length); i++) {
      if (/^[A-ZÁÉÍÓÚÑ\s]{4,}$/i.test(lines[i]) && !/INSTITUTO|NACIONAL|ELECTORAL/i.test(lines[i])) pts.push(lines[i]);
      else break;
    }
    if (pts.length) out.nombreCompleto = pts.join(' ').replace(/\s+/g, ' ');
  }
  return out;
}
