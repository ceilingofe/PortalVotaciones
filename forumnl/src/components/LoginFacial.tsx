'use client';

import { useRef, useState, useEffect } from 'react';
import { Camera, Loader2, CheckCircle2, XCircle, RefreshCw, Phone, Sun } from 'lucide-react';
import { PhoneInput } from '@/components/PhoneInput';

interface Props { onSuccess: () => void; }
type Estado = 'telefono'|'cargando'|'listo'|'camara'|'procesando'|'exito'|'error';

const FA_CDN  = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js';
const WEIGHTS = [
  'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights',
  'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/0.22.2/weights',
];

function loadScript(src: string): Promise<void> {
  return new Promise((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
    const s = document.createElement('script'); s.src = src; s.async = true;
    s.onload = () => res(); s.onerror = () => rej(new Error('Script error: ' + src));
    document.head.appendChild(s);
  });
}

async function cargarModelos(): Promise<void> {
  await loadScript(FA_CDN);
  const fa = (window as any).faceapi;
  if (!fa) throw new Error('face-api no disponible');
  for (const url of WEIGHTS) {
    try {
      await Promise.all([
        fa.nets.tinyFaceDetector.loadFromUri(url),
        fa.nets.faceLandmark68Net.loadFromUri(url),
        fa.nets.faceRecognitionNet.loadFromUri(url),
      ]);
      return;
    } catch { continue; }
  }
  throw new Error('No se pudieron cargar los modelos. Verifica tu conexión.');
}

/**
 * Intenta detectar el rostro con configuraciones progresivamente más permisivas.
 * Esto mejora mucho la tasa de detección en condiciones de iluminación variada.
 */
async function detectarRostro(canvas: HTMLCanvasElement): Promise<any | null> {
  const fa = (window as any).faceapi;

  // Configuraciones en orden: más estricto → más permisivo
  const configs = [
    { inputSize: 416,  scoreThreshold: 0.40 },
    { inputSize: 512,  scoreThreshold: 0.30 },
    { inputSize: 608,  scoreThreshold: 0.20 },
    { inputSize: 320,  scoreThreshold: 0.15 },
  ];

  for (const cfg of configs) {
    const det = await fa
      .detectSingleFace(canvas, new fa.TinyFaceDetectorOptions(cfg))
      .withFaceLandmarks()
      .withFaceDescriptor();
    if (det) return det;
  }
  return null;
}

export function LoginFacial({ onSuccess }: Props) {
  const videoRef   = useRef<HTMLVideoElement>(null);
  const streamRef  = useRef<MediaStream | null>(null);
  const canvasRef  = useRef<HTMLCanvasElement | null>(null);
  const [estado,   setEstado]   = useState<Estado>('telefono');
  const [telefono, setTelefono] = useState('');
  const [msg,      setMsg]      = useState('');
  const [progreso, setProgreso] = useState(0);
  const [intentos, setIntentos] = useState(0);

  useEffect(() => () => { streamRef.current?.getTracks().forEach(t => t.stop()); }, []);

  async function verificarTelefono(e: React.FormEvent) {
    e.preventDefault();
    setEstado('cargando'); setProgreso(5);
    try {
      const r = await fetch('/api/auth/login/facial/check', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ telefono }),
      });
      const j = await r.json();
      if (!j.ok) {
        setEstado('error');
        setMsg(j.error === 'NO_REGISTRADO' ? 'Número no registrado.' :
               j.error === 'NO_VERIFICADO' ? 'Cuenta no verificada.' :
               j.message || 'Error al verificar.');
        return;
      }
      if (!j.tieneEmbedding) {
        setEstado('error');
        setMsg('Este número no tiene reconocimiento facial. Usa la pestaña Código SMS.');
        return;
      }
      setProgreso(20);
      await cargarModelos();
      setProgreso(100);
      setEstado('listo');
      setMsg('');
    } catch (err: any) {
      setEstado('error');
      setMsg(err?.message?.includes('modelo') || err?.message?.includes('weights')
        ? 'No se cargaron los modelos. Verifica tu internet e intenta de nuevo.'
        : err?.message || 'Error de conexión.');
    }
  }

  async function activarCamara() {
    try {
      // Pedir alta resolución para mejorar la detección facial
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width:      { ideal: 1280 },
          height:     { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current!.play();
          setEstado('camara');
          setMsg('');
          setIntentos(0);
        };
      }
    } catch {
      setEstado('error');
      setMsg('No se pudo acceder a la cámara. Verifica los permisos del navegador.');
    }
  }

  async function capturarYVerificar() {
    const video = videoRef.current;
    if (!video || video.readyState < 2) {
      setMsg('La cámara no está lista. Espera un momento.');
      return;
    }

    setEstado('procesando');
    setMsg('Analizando tu rostro...');

    // Capturar frame en canvas (espejado para que sea natural)
    const canvas = document.createElement('canvas');
    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d')!;
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    canvasRef.current = canvas;

    const nuevoIntento = intentos + 1;
    setIntentos(nuevoIntento);

    // Intentar detectar con configuraciones múltiples
    const det = await detectarRostro(canvas);

    if (!det) {
      // Dar de vuelta la cámara para reintentar
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      setEstado('listo');
      setMsg(
        nuevoIntento === 1
          ? 'No detecté tu rostro. Consejos: acércate a la cámara, busca mejor iluminación (de frente, no de lado), y mira directamente a la lente.'
          : nuevoIntento === 2
          ? 'Sigo sin detectar el rostro. Intenta en un cuarto más iluminado o con la pantalla del celular iluminando tu cara.'
          : 'Prueba alejándote un poco, centrando tu cara en el óvalo y evitando contraluces.'
      );
      return;
    }

    // Enviar al API para comparar con el embedding guardado
    try {
      const r = await fetch('/api/auth/login/facial', {
        method:  'POST',
        headers: { 'content-type': 'application/json' },
        body:    JSON.stringify({
          telefono,
          descriptor: Array.from(det.descriptor as Float32Array),
        }),
      });
      const j = await r.json();

      if (!r.ok || !j.ok) {
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        setEstado('listo');
        setMsg(
          j.error === 'ROSTRO_NO_COINCIDE'
            ? `Rostro detectado pero no coincide con el registro (dist: ${j.distancia?.toFixed(2) ?? '?'}). Intenta con mejor iluminación o usa Código SMS.`
            : j.message || 'No se pudo autenticar.'
        );
        return;
      }

      setEstado('exito');
      setMsg('¡Identidad verificada! Entrando...');
      onSuccess();

    } catch {
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      setEstado('listo');
      setMsg('Error de conexión al verificar. Intenta de nuevo.');
    }
  }

  return (
    <div className="space-y-4">
      {/* Paso 1: Teléfono */}
      {estado === 'telefono' && (
        <form onSubmit={verificarTelefono} className="space-y-4">
          <div className="bg-[#F9FAFB] rounded-xl p-3 text-sm text-[#6B7280] flex items-start gap-2">
            <Phone className="w-4 h-4 shrink-0 mt-0.5 text-[#F5C518]" />
            <p>Ingresa tu número registrado para verificar que tienes reconocimiento facial activo.</p>
          </div>
          <div>
            <label className="label">Número de teléfono registrado</label>
            <PhoneInput value={telefono} onChange={setTelefono} />
          </div>
          <button type="submit" disabled={!telefono} className="btn-yellow w-full py-3.5 font-bold">
            Continuar →
          </button>
        </form>
      )}

      {/* Paso 2: Cámara */}
      {estado !== 'telefono' && (
        <>
          {/* Indicador de teléfono */}
          <div className="flex items-center gap-2 text-xs text-[#6B7280] bg-[#F9FAFB] rounded-xl px-3 py-2">
            <Phone className="w-3.5 h-3.5 text-[#F5C518]" />
            <span>Verificando: <strong className="text-[#1A1A1A]">{telefono}</strong></span>
            {(estado === 'listo' || estado === 'error') && (
              <button onClick={() => { setEstado('telefono'); setMsg(''); }}
                className="ml-auto text-[#F5C518] font-semibold hover:underline">
                Cambiar
              </button>
            )}
          </div>

          {/* Visor de cámara */}
          <div className="relative bg-[#111] rounded-2xl overflow-hidden mx-auto" style={{ aspectRatio: '4/3', maxWidth: 320 }}>
            <video ref={videoRef} autoPlay muted playsInline
              className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />

            {/* Overlay cuando no hay cámara activa */}
            {estado !== 'camara' && estado !== 'procesando' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1A1A1A] gap-3">
                {estado === 'exito'    && <CheckCircle2 className="w-16 h-16 text-green-400" />}
                {estado === 'error'    && <XCircle className="w-16 h-16 text-red-400" />}
                {estado === 'cargando' && (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-10 h-10 text-[#F5C518] animate-spin" />
                    <div className="w-36 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-[#F5C518] transition-all duration-500" style={{ width: `${progreso}%` }} />
                    </div>
                    <p className="text-xs text-[#9CA3AF]">Cargando modelos... {progreso}%</p>
                  </div>
                )}
                {estado === 'listo' && <span className="text-5xl">🤳</span>}
              </div>
            )}

            {/* Spinner mientras procesa */}
            {estado === 'procesando' && (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-12 h-12 text-[#F5C518] animate-spin" />
                <p className="text-xs text-white">Analizando...</p>
              </div>
            )}

            {/* Guía de posición cuando la cámara está activa */}
            {estado === 'camara' && (
              <div className="absolute inset-0 pointer-events-none">
                {/* Óvalo de guía */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="border-2 border-dashed border-[#F5C518]/60 rounded-full"
                    style={{ width: '55%', aspectRatio: '3/4' }} />
                </div>
                {/* Indicador de iluminación */}
                <div className="absolute bottom-3 left-0 right-0 flex justify-center">
                  <div className="bg-black/50 rounded-full px-3 py-1 flex items-center gap-1.5">
                    <Sun className="w-3 h-3 text-[#F5C518]" />
                    <span className="text-white text-[10px]">Busca buena iluminación de frente</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Mensaje de estado */}
          {msg && (
            <div className={`text-sm leading-relaxed rounded-xl p-3 ${
              estado === 'exito' ? 'text-green-700 bg-green-50 border border-green-200' :
              estado === 'error' ? 'text-red-700 bg-red-50 border border-red-200' :
              'text-[#6B7280] bg-[#F9FAFB]'
            }`}>
              {msg}
            </div>
          )}

          {/* Botones de acción */}
          {estado === 'listo' && (
            <button onClick={activarCamara} className="btn-yellow w-full py-3.5 font-bold">
              <Camera className="w-5 h-5" /> {intentos > 0 ? 'Reintentar con cámara' : 'Activar cámara'}
            </button>
          )}

          {estado === 'camara' && (
            <button onClick={capturarYVerificar} className="btn-yellow w-full py-4 text-lg font-black">
              👁 Verificar identidad
            </button>
          )}

          {estado === 'error' && (
            <button onClick={() => { setEstado('telefono'); setMsg(''); setIntentos(0); }}
              className="btn-outline w-full justify-center">
              <RefreshCw className="w-4 h-4" /> Reintentar
            </button>
          )}

          {/* Contador de intentos */}
          {intentos > 0 && estado === 'listo' && (
            <p className="text-center text-xs text-[#9CA3AF]">
              Intento {intentos} — Si persiste, usa la pestaña <strong>Código SMS</strong>
            </p>
          )}
        </>
      )}

      <p className="text-center text-xs text-[#9CA3AF]">
        La cámara solo se activa cuando tú lo solicitas. No se graba ni almacena video.
      </p>
    </div>
  );
}
