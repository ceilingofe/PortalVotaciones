'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Camera, Upload, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import Link from 'next/link';

type Paso = 'instrucciones' | 'ine' | 'datos' | 'selfie' | 'procesando' | 'exito' | 'error';

declare const faceapi: any;
declare const cv: any;

export default function OnboardingPage() {
  const router = useRouter();
  const [paso, setPaso] = useState<Paso>('instrucciones');
  const [librosListos, setLibrosListos] = useState(false);
  const [progreso, setProgreso] = useState('Cargando modelos...');
  const [error, setError] = useState<string | null>(null);

  // Datos capturados
  const [ineCanvas, setIneCanvas] = useState<HTMLCanvasElement | null>(null);
  const [ineDescriptor, setIneDescriptor] = useState<Float32Array | null>(null);
  const [datosIne, setDatosIne] = useState({
    nombreCompleto: '',
    curp: '',
    fechaNacimiento: '',
    sexo: '',
    domicilio: '',
  });
  const [selfieDescriptor, setSelfieDescriptor] = useState<Float32Array | null>(null);

  // Cargar librerías una sola vez
  useEffect(() => {
    let cancelled = false;
    async function cargar() {
      try {
        await loadScript('https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js');
        await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js');
        await loadScript('https://docs.opencv.org/4.10.0/opencv.js', { waitForCv: true });

        setProgreso('Descargando detector facial...');
        const MODEL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights';
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL);

        if (!cancelled) {
          setLibrosListos(true);
          setProgreso('Listo');
        }
      } catch (e: any) {
        if (!cancelled) setError('No se pudieron cargar los modelos. Revisa tu conexión y recarga.');
      }
    }
    cargar();
    return () => { cancelled = true; };
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-ieepc-yellow/10 px-4 py-6">
      <div className="max-w-2xl mx-auto">
        <Link href="/register" className="inline-flex items-center gap-1.5 text-sm text-ieepc-gray hover:text-ieepc-black mb-4">
          <ArrowLeft className="w-4 h-4" /> Volver
        </Link>

        <Indicador paso={paso} />

        {!librosListos && paso === 'instrucciones' && (
          <div className="card p-6 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-ieepc-yellow" />
            <p className="font-medium text-ieepc-black">{progreso}</p>
            <p className="text-sm text-ieepc-gray mt-1">La primera carga descarga ~10 MB.</p>
          </div>
        )}

        {paso === 'instrucciones' && librosListos && (
          <PantallaInstrucciones onContinuar={() => setPaso('ine')} />
        )}

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
          <div className="card p-8 text-center">
            <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4 text-ieepc-yellow" />
            <p className="font-medium">Verificando tu identidad...</p>
          </div>
        )}

        {paso === 'exito' && (
          <div className="card p-8 text-center">
            <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-600" />
            <h2 className="text-2xl font-bold mb-2">¡Bienvenido a FórumNL!</h2>
            <p className="text-ieepc-gray mb-6">Tu registro fue exitoso.</p>
            <button onClick={() => router.push('/home')} className="btn-yellow">
              Ir al inicio
            </button>
          </div>
        )}

        {paso === 'error' && (
          <div className="card p-8 text-center">
            <XCircle className="w-16 h-16 mx-auto mb-4 text-red-600" />
            <h2 className="text-xl font-bold mb-2">Algo salió mal</h2>
            <p className="text-ieepc-gray mb-6">{error}</p>
            <button onClick={() => { setError(null); setPaso('ine'); }} className="btn-yellow">
              Reintentar
            </button>
          </div>
        )}
      </div>
    </main>
  );

  async function finalizarRegistro(selfieDesc: Float32Array) {
    try {
      // Comparar localmente
      if (!ineDescriptor) throw new Error('Sin descriptor de INE');
      const dist = faceapi.euclideanDistance(ineDescriptor, selfieDesc);
      if (dist >= 0.60) {
        setError(`Tu rostro no coincide con la foto de la INE (distancia ${dist.toFixed(3)}). Intenta de nuevo con mejor iluminación.`);
        setPaso('error');
        return;
      }

      const regToken = sessionStorage.getItem('forumnl_reg_token');
      if (!regToken) {
        setError('Sesión de registro expirada. Vuelve a iniciar el proceso.');
        setPaso('error');
        return;
      }

      // El embedding que se guarda en BD es el del INE (referencia)
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
      if (!r.ok || !json.ok) {
        setError(json.message || 'Error al finalizar el registro.');
        setPaso('error');
        return;
      }
      sessionStorage.removeItem('forumnl_reg_token');
      setPaso('exito');
    } catch (e: any) {
      setError(e?.message || 'Error desconocido.');
      setPaso('error');
    }
  }
}

// =============================================================================
// Sub-componentes
// =============================================================================

function Indicador({ paso }: { paso: Paso }) {
  const pasos = ['INE', 'Datos', 'Rostro', 'Listo'];
  const indiceActual =
    paso === 'instrucciones' || paso === 'ine' ? 0 :
    paso === 'datos' ? 1 :
    paso === 'selfie' || paso === 'procesando' ? 2 :
    paso === 'exito' ? 3 : 0;

  return (
    <ol className="flex items-center mb-6 text-xs">
      {pasos.map((p, i) => (
        <li key={p} className="flex items-center flex-1">
          <span className={`w-7 h-7 rounded-full flex items-center justify-center font-semibold ${
            i < indiceActual ? 'bg-green-600 text-white' :
            i === indiceActual ? 'bg-ieepc-black text-white' :
            'bg-ieepc-gray-light text-ieepc-gray'
          }`}>
            {i < indiceActual ? '✓' : i + 1}
          </span>
          <span className={`ml-2 ${i === indiceActual ? 'font-medium text-ieepc-black' : 'text-ieepc-gray'}`}>{p}</span>
          {i < pasos.length - 1 && <span className="flex-1 h-px bg-ieepc-gray-light mx-2" />}
        </li>
      ))}
    </ol>
  );
}

function PantallaInstrucciones({ onContinuar }: { onContinuar: () => void }) {
  return (
    <div className="card p-6 text-center">
      <div className="text-5xl mb-3">🪪</div>
      <h2 className="text-xl font-bold mb-2">Verifica tu identidad</h2>
      <p className="text-ieepc-gray text-sm mb-6 max-w-md mx-auto">
        Necesitamos comprobar que tú eres el titular de la credencial INE.
        Esto toma menos de 2 minutos. Tendrás dos pasos:
      </p>
      <ol className="text-left max-w-md mx-auto mb-6 space-y-2 text-sm">
        <li className="flex gap-3">
          <span className="font-bold text-ieepc-yellow-dark">1.</span>
          <span>Tomamos una foto del <strong>frente</strong> de tu credencial INE.</span>
        </li>
        <li className="flex gap-3">
          <span className="font-bold text-ieepc-yellow-dark">2.</span>
          <span>Capturamos una <strong>selfie</strong> y comparamos los rostros.</span>
        </li>
      </ol>
      <button onClick={onContinuar} className="btn-yellow">
        <Camera className="w-4 h-4" /> Comenzar
      </button>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Captura de INE (cámara o archivo)
// ────────────────────────────────────────────────────────────────────────

function CapturaIne({
  onCapturado,
  onError,
}: {
  onCapturado: (canvas: HTMLCanvasElement, descriptor: Float32Array, datos: any) => void;
  onError: (msg: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState('Iniciando cámara...');
  const [statusType, setStatusType] = useState<'normal' | 'detecting' | 'success' | 'error'>('normal');
  const [procesando, setProcesando] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const stoppedRef = useRef(false);

  useEffect(() => {
    iniciarCamara();
    return () => { stoppedRef.current = true; streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, []);

  async function iniciarCamara() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise<void>((resolve) => {
          videoRef.current!.onloadedmetadata = () => { videoRef.current!.play(); resolve(); };
        });
      }
      loopDeteccion();
    } catch (e: any) {
      setStatus('No se pudo abrir la cámara. Sube una foto de tu INE en su lugar.');
      setStatusType('error');
    }
  }

  function loopDeteccion() {
    let stableCount = 0;
    let lastCorners: any = null;
    let detectionStart: number | null = null;
    let totalFrames = 0, detectedFrames = 0;

    const tick = async () => {
      if (stoppedRef.current || procesando) return;
      const video = videoRef.current;
      const overlay = overlayRef.current;
      if (!video || !overlay || video.readyState < 2) { setTimeout(tick, 150); return; }

      if (overlay.width !== video.videoWidth) overlay.width = video.videoWidth;
      if (overlay.height !== video.videoHeight) overlay.height = video.videoHeight;

      totalFrames++;
      const corners = detectarRectangulo(video);

      if (corners) {
        detectedFrames++;
        lastCorners = corners;
        stableCount = Math.min(4, stableCount + 1);
        if (!detectionStart) detectionStart = Date.now();
        dibujarCorners(overlay, corners, stableCount);
        const pct = Math.min(100, Math.round(stableCount / 4 * 100));
        setStatus(`Credencial detectada (${pct}%)`);
        setStatusType('detecting');

        if (stableCount >= 4) {
          setStatus('¡Capturando!');
          setStatusType('success');
          await new Promise(r => setTimeout(r, 200));
          procesar(video, corners);
          return;
        }
      } else {
        stableCount = Math.max(0, stableCount - 0.4);
        if (stableCount === 0) {
          overlay.getContext('2d')!.clearRect(0, 0, overlay.width, overlay.height);
          setStatus('Coloca la credencial frente a la cámara o sube una foto.');
          setStatusType('normal');
        }
      }

      // Fallback tras 3.5s
      if (detectionStart && Date.now() - detectionStart > 3500 && detectedFrames / totalFrames > 0.4 && lastCorners) {
        setStatus('¡Capturando!'); setStatusType('success');
        await new Promise(r => setTimeout(r, 150));
        procesar(video, lastCorners);
        return;
      }

      setTimeout(tick, 90);
    };
    tick();
  }

  async function procesar(video: HTMLVideoElement, corners: any) {
    setProcesando(true);
    streamRef.current?.getTracks().forEach(t => t.stop());

    // Snapshot del frame
    const source = document.createElement('canvas');
    source.width = video.videoWidth;
    source.height = video.videoHeight;
    source.getContext('2d')!.drawImage(video, 0, 0);

    await procesarImagen(source, corners);
  }

  async function subirArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    stoppedRef.current = true;
    streamRef.current?.getTracks().forEach(t => t.stop());
    setProcesando(true);

    try {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error('No se pudo cargar la imagen')); });
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d')!.drawImage(img, 0, 0);
      URL.revokeObjectURL(img.src);

      // Intentar detectar rectángulo en la foto
      const corners = detectarRectanguloDeCanvas(canvas);
      await procesarImagen(canvas, corners);
    } catch (e: any) {
      onError(e.message || 'Error al procesar la imagen');
    }
  }

  async function procesarImagen(source: HTMLCanvasElement, corners: any) {
    setStatus('Rectificando imagen...');
    let rectified = source;
    if (corners && (window as any).cv?.Mat) {
      try { rectified = rectificar(source, corners); } catch (e) { /* usa source */ }
    }

    setStatus('Detectando rostro en la INE...');
    const det = await (window as any).faceapi
      .detectSingleFace(rectified, new (window as any).faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.30 }))
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!det) {
      onError('No se detectó un rostro en la credencial. Intenta con mejor iluminación.');
      return;
    }

    setStatus('Extrayendo datos por OCR...');
    let texto = '';
    try {
      const Tesseract = (window as any).Tesseract;
      const worker = await Tesseract.createWorker('spa');
      const result = await worker.recognize(rectified);
      texto = result.data.text;
      await worker.terminate();
    } catch (e) { /* OCR opcional */ }

    const datos = parseIne(texto);
    onCapturado(rectified, det.descriptor as Float32Array, datos);
  }

  return (
    <div className="card p-4">
      <h2 className="text-lg font-bold mb-1">Paso 1: Frente de tu INE</h2>
      <p className="text-sm text-ieepc-gray mb-4">Coloca el frente de la credencial frente a la cámara o sube una foto.</p>

      <div className="relative w-full bg-ieepc-black rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
        <canvas ref={overlayRef} className="absolute inset-0 w-full h-full pointer-events-none" />
        {procesando && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-white animate-spin" />
          </div>
        )}
      </div>

      <div className={`mt-3 p-2.5 rounded-md text-sm ${
        statusType === 'detecting' ? 'bg-yellow-50 text-yellow-800' :
        statusType === 'success' ? 'bg-green-50 text-green-800' :
        statusType === 'error' ? 'bg-red-50 text-red-800' :
        'bg-gray-50 text-gray-700'
      }`}>{status}</div>

      <div className="mt-3 flex gap-2">
        <label className="btn-outline cursor-pointer flex-1 justify-center">
          <Upload className="w-4 h-4" /> Subir foto
          <input type="file" accept="image/*" className="hidden" onChange={subirArchivo} />
        </label>
      </div>
    </div>
  );
}

function ConfirmarDatos({ datos, ineCanvas, onActualizar, onAtras, onContinuar }: any) {
  return (
    <div className="card p-6">
      <h2 className="text-lg font-bold mb-1">Paso 2: Verifica tus datos</h2>
      <p className="text-sm text-ieepc-gray mb-4">
        Revisa la información extraída de tu INE. Puedes corregir lo que sea necesario.
        <strong className="block text-xs mt-1 text-ieepc-gray">
          Nota: la colonia se asignará automáticamente a "Las Lomas del Sur".
        </strong>
      </p>

      <div className="space-y-3 mb-6">
        <Campo label="Nombre completo *" value={datos.nombreCompleto}
          onChange={(v) => onActualizar({ ...datos, nombreCompleto: v })} required />
        <Campo label="CURP" value={datos.curp}
          onChange={(v) => onActualizar({ ...datos, curp: v.toUpperCase() })} />
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Fecha nacimiento" value={datos.fechaNacimiento}
            onChange={(v) => onActualizar({ ...datos, fechaNacimiento: v })} type="date" />
          <div>
            <label className="label">Sexo</label>
            <select className="input" value={datos.sexo} onChange={(e) => onActualizar({ ...datos, sexo: e.target.value })}>
              <option value="">—</option>
              <option value="Hombre">Hombre</option>
              <option value="Mujer">Mujer</option>
            </select>
          </div>
        </div>
        <Campo label="Domicilio" value={datos.domicilio}
          onChange={(v) => onActualizar({ ...datos, domicilio: v })} />
      </div>

      <div className="flex gap-3">
        <button onClick={onAtras} className="btn-outline flex-1 justify-center">Volver a capturar</button>
        <button onClick={onContinuar} disabled={!datos.nombreCompleto} className="btn-yellow flex-1 justify-center">
          Continuar
        </button>
      </div>
    </div>
  );
}

function Campo({ label, value, onChange, type = 'text', required }: any) {
  return (
    <div>
      <label className="label">{label}</label>
      <input type={type} className="input" value={value || ''} onChange={(e) => onChange(e.target.value)} required={required} />
    </div>
  );
}

function CapturaSelfie({ onCapturado, onError }: any) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState('Iniciando cámara...');
  const [statusType, setStatusType] = useState<'normal'|'detecting'|'success'>('normal');
  const streamRef = useRef<MediaStream | null>(null);
  const stoppedRef = useRef(false);

  useEffect(() => {
    iniciar();
    return () => { stoppedRef.current = true; streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, []);

  async function iniciar() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise<void>((res) => { videoRef.current!.onloadedmetadata = () => { videoRef.current!.play(); res(); }; });
      }
      detectar();
    } catch (e) {
      onError('No se pudo abrir la cámara para la selfie.');
    }
  }

  function detectar() {
    let stable = 0;
    let detStart: number | null = null;
    let total = 0, detected = 0;
    const tick = async () => {
      if (stoppedRef.current) return;
      const video = videoRef.current;
      if (!video || video.readyState < 2) { setTimeout(tick, 100); return; }
      total++;
      const d = await (window as any).faceapi
        .detectSingleFace(video, new (window as any).faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.45 }))
        .withFaceLandmarks()
        .withFaceDescriptor();
      if (d) {
        detected++;
        stable = Math.min(6, stable + 1);
        if (!detStart) detStart = Date.now();
        const pct = Math.round(stable / 6 * 100);
        setStatus(`Rostro detectado (${pct}%)`);
        setStatusType('detecting');
        if (stable >= 6) {
          setStatus('¡Capturando!'); setStatusType('success');
          stoppedRef.current = true;
          streamRef.current?.getTracks().forEach(t => t.stop());
          setTimeout(() => onCapturado(d.descriptor), 200);
          return;
        }
      } else {
        stable = Math.max(0, stable - 0.5);
        setStatus('Mira a la cámara con buena iluminación.');
        setStatusType('normal');
      }
      if (detStart && Date.now() - detStart > 3500 && detected / total > 0.5 && d) {
        stoppedRef.current = true;
        streamRef.current?.getTracks().forEach(t => t.stop());
        setTimeout(() => onCapturado(d.descriptor), 100);
        return;
      }
      setTimeout(tick, 90);
    };
    tick();
  }

  return (
    <div className="card p-4">
      <h2 className="text-lg font-bold mb-1">Paso 3: Tu rostro</h2>
      <p className="text-sm text-ieepc-gray mb-4">Mira directamente a la cámara.</p>
      <div className="relative w-full bg-ieepc-black rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
      </div>
      <div className={`mt-3 p-2.5 rounded-md text-sm ${
        statusType === 'detecting' ? 'bg-yellow-50 text-yellow-800' :
        statusType === 'success' ? 'bg-green-50 text-green-800' :
        'bg-gray-50 text-gray-700'
      }`}>{status}</div>
    </div>
  );
}

// =============================================================================
// Helpers de visión por computadora (compartidos)
// =============================================================================

function loadScript(src: string, opts?: { waitForCv?: boolean }): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src; s.async = true;
    s.onload = () => {
      if (opts?.waitForCv) {
        const ready = () => {
          if ((window as any).cv?.Mat) resolve();
          else if ((window as any).cv) (window as any).cv.onRuntimeInitialized = resolve;
          else setTimeout(ready, 50);
        };
        ready();
      } else resolve();
    };
    s.onerror = () => reject(new Error('Falló cargar ' + src));
    document.head.appendChild(s);
  });
}

const _vidCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
function detectarRectangulo(video: HTMLVideoElement) {
  if (!(window as any).cv?.Mat || !_vidCanvas) return null;
  _vidCanvas.width = video.videoWidth;
  _vidCanvas.height = video.videoHeight;
  _vidCanvas.getContext('2d')!.drawImage(video, 0, 0);
  return detectarRectanguloDeCanvas(_vidCanvas);
}

function detectarRectanguloDeCanvas(canvas: HTMLCanvasElement) {
  const cv = (window as any).cv;
  if (!cv?.Mat) return null;
  let src, small, gray, blur, edges, ctrs, hier, kernel;
  try {
    src = cv.imread(canvas);
    const tw = 480; const scale = tw / src.cols;
    small = new cv.Mat();
    cv.resize(src, small, new cv.Size(tw, Math.round(src.rows * scale)));
    gray = new cv.Mat(); blur = new cv.Mat(); edges = new cv.Mat();
    ctrs = new cv.MatVector(); hier = new cv.Mat();
    kernel = cv.Mat.ones(3,3, cv.CV_8U);
    cv.cvtColor(small, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, blur, new cv.Size(5,5), 0);
    cv.Canny(blur, edges, 40, 150);
    cv.dilate(edges, edges, kernel);
    cv.findContours(edges, ctrs, hier, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
    const fa = small.rows * small.cols;
    let best = null, bestArea = 0;
    for (let i = 0; i < ctrs.size(); i++) {
      const c = ctrs.get(i);
      const peri = cv.arcLength(c, true);
      const ap = new cv.Mat();
      cv.approxPolyDP(c, ap, 0.02 * peri, true);
      if (ap.rows === 4 && cv.isContourConvex(ap)) {
        const area = cv.contourArea(ap);
        if (area > fa * 0.06 && area > bestArea) {
          const pts = [];
          for (let j = 0; j < 4; j++) pts.push({ x: ap.data32S[j*2], y: ap.data32S[j*2+1] });
          const ord = orderCorners(pts);
          const dims = quadDims(ord);
          const ratio = Math.max(dims.w, dims.h) / Math.min(dims.w, dims.h);
          if (ratio >= 1.20 && ratio <= 2.10) {
            best = ord.map(p => ({ x: p.x / scale, y: p.y / scale }));
            bestArea = area;
          }
        }
      }
      ap.delete(); c.delete();
    }
    return best;
  } catch { return null; }
  finally { [src, small, gray, blur, edges, ctrs, hier, kernel].forEach(o => o && o.delete && o.delete()); }
}

function orderCorners(pts: any[]) {
  const s = pts.map(p => p.x + p.y);
  const d = pts.map(p => p.y - p.x);
  return [pts[s.indexOf(Math.min(...s))], pts[d.indexOf(Math.min(...d))], pts[s.indexOf(Math.max(...s))], pts[d.indexOf(Math.max(...d))]];
}
function quadDims(c: any[]) {
  const dist = (a: any, b: any) => Math.hypot(a.x - b.x, a.y - b.y);
  return { w: (dist(c[0],c[1]) + dist(c[3],c[2])) / 2, h: (dist(c[0],c[3]) + dist(c[1],c[2])) / 2 };
}

function rectificar(canvas: HTMLCanvasElement, corners: any[]) {
  const cv = (window as any).cv;
  const W = 1100, H = Math.round(W / 1.585);
  const src = cv.imread(canvas);
  const sm = cv.matFromArray(4,1,cv.CV_32FC2, [
    corners[0].x, corners[0].y, corners[1].x, corners[1].y,
    corners[2].x, corners[2].y, corners[3].x, corners[3].y,
  ]);
  const dm = cv.matFromArray(4,1,cv.CV_32FC2, [0,0,W,0,W,H,0,H]);
  const M = cv.getPerspectiveTransform(sm, dm);
  const dst = new cv.Mat();
  cv.warpPerspective(src, dst, M, new cv.Size(W,H));
  const out = document.createElement('canvas');
  cv.imshow(out, dst);
  src.delete(); sm.delete(); dm.delete(); M.delete(); dst.delete();
  return out;
}

function dibujarCorners(canvas: HTMLCanvasElement, corners: any[], stable: number) {
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  for (let i = 1; i < 4; i++) ctx.lineTo(corners[i].x, corners[i].y);
  ctx.closePath();
  const p = Math.min(1, stable / 4);
  const r = Math.round(251 - 217*p), g = Math.round(191 + 6*p), b = Math.round(36 + 58*p);
  ctx.lineWidth = 4; ctx.strokeStyle = `rgb(${r},${g},${b})`;
  ctx.fillStyle = `rgba(${r},${g},${b},0.15)`;
  ctx.fill(); ctx.stroke();
}

function parseIne(texto: string) {
  const upper = texto.toUpperCase();
  const out: any = { nombreCompleto: '', curp: '', fechaNacimiento: '', sexo: '', domicilio: '' };

  const curp = upper.match(/[A-Z]{4}\d{6}[HM][A-Z]{5}[0-9A-Z]{2}/);
  if (curp) out.curp = curp[0];

  const fecha = texto.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (fecha) {
    const [_, dd, mm, yyyy] = fecha;
    out.fechaNacimiento = `${yyyy}-${mm}-${dd}`;
  }

  const sexo = upper.match(/SEXO\s*[:\-]?\s*([HM])\b/);
  if (sexo) out.sexo = sexo[1] === 'H' ? 'Hombre' : 'Mujer';

  // Nombre: línea después de "NOMBRE"
  const lines = texto.split(/\n+/).map(l => l.trim()).filter(Boolean);
  const idxN = lines.findIndex(l => /^NOMBRE\b/i.test(l));
  if (idxN >= 0) {
    const partes = [];
    for (let i = idxN + 1; i < Math.min(idxN + 4, lines.length); i++) {
      if (/^[A-ZÁÉÍÓÚÑ\s]{4,}$/i.test(lines[i]) && !/INSTITUTO|NACIONAL|ELECTORAL/i.test(lines[i])) {
        partes.push(lines[i]);
      } else break;
    }
    if (partes.length) out.nombreCompleto = partes.join(' ').replace(/\s+/g, ' ');
  }

  // Domicilio
  const idxD = lines.findIndex(l => /^DOMICILIO\b/i.test(l));
  if (idxD >= 0) {
    const partes = [];
    for (let i = idxD + 1; i < Math.min(idxD + 4, lines.length); i++) {
      if (lines[i].length > 4 && !/CURP|CLAVE|VIGENCIA|SEXO|FECHA|REGISTRO/i.test(lines[i])) {
        partes.push(lines[i]);
      } else break;
    }
    if (partes.length) out.domicilio = partes.join(', ');
  }

  return out;
}
