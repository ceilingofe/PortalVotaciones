'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';

type Fase = 'idle' | 'escuchando' | 'procesando' | 'hablando';
type Turno = 'usuario' | 'bot';

interface Historial {
  role: 'user' | 'assistant';
  content: string;
}

/* ── Robot SVG animado ──────────────────────────────────────── */
function RobotIEEPC({ fase }: { fase: Fase }) {
  const habla = fase === 'hablando';
  const escucha = fase === 'escuchando';
  const procesa = fase === 'procesando';

  return (
    <svg viewBox="0 0 200 260" width={140} height={182} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F5C518" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#F5C518" stopOpacity="0" />
        </radialGradient>
        <style>{`
          @keyframes pulse { 0%,100%{r:38} 50%{r:44} }
          @keyframes blink { 0%,90%,100%{ry:6} 45%{ry:1} }
          @keyframes spin  { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
          @keyframes bob   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
          @keyframes mouthA{ 0%,100%{d:path('M 78 168 Q 100 175 122 168')} 50%{d:path('M 78 168 Q 100 185 122 168')} }
          @keyframes mouthI{ 0%,100%{d:path('M 80 168 Q 100 165 120 168')} 50%{d:path('M 82 168 Q 100 163 118 168')} }
          .robot-body { animation: bob 3s ease-in-out infinite; transform-origin:center; }
        `}</style>
      </defs>

      {/* Resplandor (solo cuando habla o escucha) */}
      {(habla || escucha) && (
        <circle cx="100" cy="120" r={escucha ? 90 : 80} fill="url(#glow)" opacity="0.8">
          <animate attributeName="r" values={escucha ? '80;95;80' : '70;85;70'} dur="1.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.5;0.9;0.5" dur="1.5s" repeatCount="indefinite" />
        </circle>
      )}

      <g className="robot-body">
        {/* Antena */}
        <line x1="100" y1="28" x2="100" y2="50" stroke="#1A1A1A" strokeWidth="4" strokeLinecap="round" />
        <circle cx="100" cy="22" r="9" fill={habla || escucha ? '#F5C518' : '#E6B800'}>
          {(habla || escucha) && <animate attributeName="r" values="8;12;8" dur="0.8s" repeatCount="indefinite" />}
        </circle>

        {/* Cabeza */}
        <rect x="42" y="48" width="116" height="90" rx="22" fill="#1A1A1A" />

        {/* Visor / panel de ojos */}
        <rect x="54" y="62" width="92" height="52" rx="14" fill="#F5C518" opacity="0.15" />
        <rect x="56" y="64" width="88" height="48" rx="12" fill="#F5C518" opacity="0.08" />

        {/* Ojo izquierdo */}
        <ellipse cx="78" cy="88" rx="16" ry="16" fill="#F5C518" />
        <ellipse cx="78" cy="88" rx="8" ry="8" fill="#1A1A1A" />
        <ellipse cx="78" cy="88" rx="3" ry="3" fill="white" />
        {!procesa && (
          <ellipse cx="78" cy="88" rx="16" ry="6" fill="#F5C518">
            <animate attributeName="ry" values="16;1;16" dur="4s" repeatCount="indefinite" />
          </ellipse>
        )}

        {/* Ojo derecho */}
        <ellipse cx="122" cy="88" rx="16" ry="16" fill="#F5C518" />
        <ellipse cx="122" cy="88" rx="8" ry="8" fill="#1A1A1A" />
        <ellipse cx="122" cy="88" rx="3" ry="3" fill="white" />
        {!procesa && (
          <ellipse cx="122" cy="88" rx="16" ry="6" fill="#F5C518">
            <animate attributeName="ry" values="16;1;16" dur="4s" begin="0.5s" repeatCount="indefinite" />
          </ellipse>
        )}

        {/* Procesando: spinner */}
        {procesa && (
          <g transform="translate(100,88)">
            <circle r="14" fill="none" stroke="#F5C518" strokeWidth="3" strokeDasharray="20 60" strokeLinecap="round">
              <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="0.8s" repeatCount="indefinite" />
            </circle>
          </g>
        )}

        {/* Boca */}
        <path
          fill="none"
          stroke="#F5C518"
          strokeWidth="3"
          strokeLinecap="round"
          d={habla ? 'M 78 122 Q 100 132 122 122' : 'M 82 122 Q 100 128 118 122'}
        >
          {habla && (
            <animate attributeName="d"
              values="M 78 122 Q 100 132 122 122;M 78 122 Q 100 116 122 122;M 78 122 Q 100 132 122 122"
              dur="0.5s" repeatCount="indefinite" />
          )}
        </path>

        {/* Cuerpo */}
        <rect x="32" y="144" width="136" height="96" rx="20" fill="#1A1A1A" />

        {/* Panel IEEPCNL — diamante amarillo en pecho */}
        <polygon points="100,160 118,178 100,196 82,178" fill="#F5C518" opacity="0.9" />
        <polygon points="100,167 111,178 100,189 89,178" fill="#1A1A1A" />

        {/* Indicadores de estado en el pecho */}
        <circle cx="60" cy="200" r="6"
          fill={escucha ? '#22C55E' : '#374151'}>
          {escucha && <animate attributeName="fill" values="#22C55E;#16A34A;#22C55E" dur="0.8s" repeatCount="indefinite" />}
        </circle>
        <circle cx="80" cy="200" r="6"
          fill={procesa ? '#F5C518' : '#374151'}>
          {procesa && <animate attributeName="fill" values="#F5C518;#E6B800;#F5C518" dur="0.6s" repeatCount="indefinite" />}
        </circle>
        <circle cx="100" cy="200" r="6"
          fill={habla ? '#3B82F6' : '#374151'}>
          {habla && <animate attributeName="fill" values="#3B82F6;#1D4ED8;#3B82F6" dur="0.7s" repeatCount="indefinite" />}
        </circle>

        {/* Brazos */}
        <rect x="2"  y="150" width="28" height="56" rx="14" fill="#1A1A1A" />
        <rect x="170" y="150" width="28" height="56" rx="14" fill="#1A1A1A" />

        {/* Manos */}
        <circle cx="16"  cy="214" r="12" fill="#F5C518" opacity="0.6" />
        <circle cx="184" cy="214" r="12" fill="#F5C518" opacity="0.6" />
      </g>
    </svg>
  );
}

/* ── Burbuja de texto ────────────────────────────────────────── */
function Burbuja({ texto, turno }: { texto: string; turno: Turno }) {
  return (
    <div className={`w-full flex ${turno === 'usuario' ? 'justify-end' : 'justify-start'} px-2`}>
      <div
        className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
          turno === 'usuario'
            ? 'text-[#1A1A1A] rounded-br-sm'
            : 'bg-[#1A1A1A] text-white rounded-bl-sm'
        }`}
        style={turno === 'usuario' ? { background: 'linear-gradient(135deg,#F5C518,#E6B800)' } : {}}
      >
        {texto}
      </div>
    </div>
  );
}

/* ── Componente principal ────────────────────────────────────── */
interface Props {
  nombreUsuario: string;
}

export function ChatbotIEEPC({ nombreUsuario }: Props) {
  const primerNombre = nombreUsuario.split(' ')[0];

  const [fase, setFase]             = useState<Fase>('idle');
  const [texto, setTexto]           = useState('');
  const [turnoActual, setTurnoActual] = useState<Turno | null>(null);
  const [mensajeVisible, setMensajeVisible] = useState<string>('');
  const [transcript, setTranscript] = useState(''); // texto en vivo mientras escucha
  const [historial, setHistorial]   = useState<Historial[]>([]);
  const [sinVoz, setSinVoz]         = useState(false); // TTS desactivado por usuario
  const [errorMic, setErrorMic]     = useState<string | null>(null);
  const [sttDisponible, setSttDisponible] = useState(true);

  const recognitionRef = useRef<any>(null);
  const synthRef       = useRef<SpeechSynthesis | null>(null);
  const inputRef       = useRef<HTMLInputElement>(null);

  // Inicializar al montar
  useEffect(() => {
    if (typeof window === 'undefined') return;
    synthRef.current = window.speechSynthesis;

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      setSttDisponible(false);
      return;
    }

    const rec = new SpeechRec();
    rec.lang = 'es-MX';
    rec.continuous = false;
    rec.interimResults = true;

    rec.onresult = (e: any) => {
      const t = Array.from(e.results as any[]).map((r: any) => r[0].transcript).join('');
      setTranscript(t);
    };

    rec.onend = () => {
      // Cuando el reconocimiento termina (silencio detectado), enviar lo que dijo
      setTranscript(prev => {
        if (prev.trim()) {
          // Usar el transcript capturado para enviar el mensaje
          setTimeout(() => enviarMensaje(prev.trim()), 100);
        }
        return '';
      });
      if (fase === 'escuchando') setFase('idle');
    };

    rec.onerror = (e: any) => {
      if (e.error !== 'no-speech') setErrorMic(`Error de micrófono: ${e.error}`);
      setFase('idle');
      setTranscript('');
    };

    recognitionRef.current = rec;

    // Saludo inicial del bot
    const saludo = `Hola, ${primerNombre}. Soy FórumBot, tu asistente de participación ciudadana. Puedo ayudarte con el proceso electoral, las planillas registradas, resultados de votaciones y más. ¿En qué te puedo ayudar?`;
    mostrarRespuestaBot(saludo, false); // no TTS en saludo inicial
  }, []);

  function mostrarRespuestaBot(respuesta: string, conVoz = true) {
    setTurnoActual('bot');
    setMensajeVisible(respuesta);
    setFase('hablando');

    if (conVoz && !sinVoz && synthRef.current) {
      // Cancelar cualquier síntesis previa
      synthRef.current.cancel();

      const utterance = new SpeechSynthesisUtterance(respuesta);
      utterance.lang = 'es-MX';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      // Seleccionar voz masculina en español
      // Nombres típicos de voces masculinas disponibles en navegadores
      const voces = synthRef.current.getVoices();
      const MASCULINOS = /raúl|raul|diego|carlos|jorge|miguel|pablo|juan|andrés|andres|pedro|antonio|sergio|manuel/i;
      const FEMENINOS  = /sabina|maria|maría|lucia|lucía|paula|mónica|monica|isabel|elena|laura|ana|rosa|pilar/i;
      const voz =
        voces.find(v => v.lang.startsWith('es') && MASCULINOS.test(v.name)) ??
        voces.find(v => v.lang.startsWith('es') && !FEMENINOS.test(v.name)) ??
        voces.find(v => v.lang.startsWith('es')) ??
        null;
      if (voz) utterance.voice = voz;

      utterance.onend = () => setFase('idle');
      utterance.onerror = () => setFase('idle');

      synthRef.current.speak(utterance);
    } else {
      // Sin TTS: simular duración proporcional al texto
      const ms = Math.min(Math.max(respuesta.length * 30, 1500), 6000);
      setTimeout(() => setFase('idle'), ms);
    }
  }

  const enviarMensaje = useCallback(async (mensajeTexto: string) => {
    if (!mensajeTexto.trim() || fase === 'procesando' || fase === 'hablando') return;

    // Mostrar mensaje del usuario
    setTurnoActual('usuario');
    setMensajeVisible(mensajeTexto);
    setFase('procesando');

    // Actualizar historial (memoria, no visible)
    const nuevoHistorial: Historial[] = [
      ...historial,
      { role: 'user', content: mensajeTexto },
    ];

    try {
      const r = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mensaje: mensajeTexto, historial: historial.slice(-8) }),
      });
      const j = await r.json();
      if (!j.ok || !j.respuesta) throw new Error('Sin respuesta');

      const respuesta: string = j.respuesta;
      setHistorial([...nuevoHistorial, { role: 'assistant', content: respuesta }].slice(-16));
      mostrarRespuestaBot(respuesta);
    } catch {
      mostrarRespuestaBot('No pude conectarme en este momento. Por favor intenta de nuevo. 🙏');
    }
  }, [fase, historial, sinVoz]);

  function manejarEnvioTexto(e: React.FormEvent) {
    e.preventDefault();
    const t = texto.trim();
    if (!t) return;
    setTexto('');
    enviarMensaje(t);
  }

  function toggleMicrofono() {
    if (!recognitionRef.current) return;
    if (fase === 'escuchando') {
      recognitionRef.current.stop();
      setFase('idle');
      setTranscript('');
    } else if (fase === 'idle') {
      setErrorMic(null);
      setTranscript('');
      setTurnoActual(null);
      setMensajeVisible('');
      try {
        recognitionRef.current.start();
        setFase('escuchando');
      } catch (err: any) {
        setErrorMic('No se pudo acceder al micrófono. Verifica los permisos.');
      }
    }
  }

  function toggleVoz() {
    if (!sinVoz && synthRef.current) {
      synthRef.current.cancel();
      setFase(prev => prev === 'hablando' ? 'idle' : prev);
    }
    setSinVoz(v => !v);
  }

  const puedeInteractuar = fase === 'idle';
  const etiquetaFase = fase === 'escuchando'  ? 'Escuchando...'
                      : fase === 'procesando' ? 'Procesando...'
                      : fase === 'hablando'   ? 'FórumBot está hablando...'
                      : '';

  return (
    <div className="flex flex-col items-center w-full max-w-lg mx-auto gap-6">

      {/* ── Robot y estado ─────────────────────────── */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <RobotIEEPC fase={fase} />
          {/* Anillos de "escuchando" */}
          {fase === 'escuchando' && (
            <>
              <div className="absolute inset-0 rounded-full border-4 border-[#F5C518]/30 animate-ping" />
              <div className="absolute inset-2 rounded-full border-2 border-[#F5C518]/20 animate-ping" style={{ animationDelay: '0.3s' }} />
            </>
          )}
        </div>

        {/* Nombre del bot */}
        <div className="text-center">
          <p className="font-black text-xl text-[#1A1A1A]">FórumBot</p>
          <p className="text-xs text-[#9CA3AF]">Asistente IEEPCNL · FórumNL</p>
        </div>
      </div>

      {/* ── Área de conversación ───────────────────── */}
      <div className="w-full min-h-[120px] flex flex-col justify-center gap-3">
        {/* Etiqueta de estado */}
        {etiquetaFase && (
          <div className="flex items-center justify-center gap-2 text-sm text-[#6B7280]">
            <span className="w-2 h-2 rounded-full bg-[#F5C518] animate-pulse" />
            {etiquetaFase}
          </div>
        )}

        {/* Transcript en vivo mientras escucha */}
        {fase === 'escuchando' && transcript && (
          <Burbuja texto={transcript} turno="usuario" />
        )}

        {/* Burbuja del turno actual */}
        {turnoActual && mensajeVisible && fase !== 'escuchando' && (
          <Burbuja texto={mensajeVisible} turno={turnoActual} />
        )}

        {/* Estado idle sin mensaje — hint */}
        {!turnoActual && fase === 'idle' && (
          <p className="text-center text-sm text-[#9CA3AF] px-4">
            Escribe o habla para comenzar
          </p>
        )}
      </div>

      {/* ── Error de micrófono ─────────────────────── */}
      {errorMic && (
        <div className="w-full bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-4 py-2 text-center">
          {errorMic}
        </div>
      )}

      {/* ── Controles ──────────────────────────────── */}
      <div className="w-full space-y-3">
        {/* Input de texto */}
        <form onSubmit={manejarEnvioTexto} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={texto}
            onChange={e => setTexto(e.target.value)}
            placeholder={puedeInteractuar ? 'Escribe tu pregunta...' : 'Esperando...'}
            disabled={!puedeInteractuar}
            className="input flex-1 text-sm disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!puedeInteractuar || !texto.trim()}
            className="btn-yellow px-4 disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        {/* Botones de voz */}
        <div className="flex gap-2">
          {/* Micrófono */}
          {sttDisponible ? (
            <button
              onClick={toggleMicrofono}
              disabled={fase === 'procesando' || fase === 'hablando'}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-40 ${
                fase === 'escuchando'
                  ? 'text-white border-2 border-[#F5C518]'
                  : 'btn-outline'
              }`}
              style={fase === 'escuchando' ? { background: 'linear-gradient(135deg,#1A1A1A,#2D2D2D)' } : {}}
            >
              {fase === 'escuchando'
                ? <><MicOff className="w-4 h-4 text-[#F5C518]" /> Detener</>
                : <><Mic className="w-4 h-4" /> Hablar</>}
            </button>
          ) : (
            <div className="flex-1 bg-[#F9FAFB] rounded-xl py-3 text-center text-xs text-[#9CA3AF]">
              Micrófono no disponible en este navegador
            </div>
          )}

          {/* Toggle de voz del bot */}
          <button
            onClick={toggleVoz}
            className={`px-4 py-3 rounded-xl border-2 transition-all ${sinVoz ? 'border-[#E5E7EB] text-[#9CA3AF]' : 'border-[#F5C518] text-[#92400E] bg-[#FFFBEB]'}`}
            title={sinVoz ? 'Activar voz del bot' : 'Silenciar bot'}
          >
            {sinVoz ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Hint de la leyenda */}
        <p className="text-center text-[10px] text-[#9CA3AF] leading-relaxed">
          🔒 FórumBot nunca revela votos individuales. El voto es secreto e inviolable.
          <br />El micrófono solo se activa cuando tú lo presionas.
        </p>
      </div>
    </div>
  );
}
