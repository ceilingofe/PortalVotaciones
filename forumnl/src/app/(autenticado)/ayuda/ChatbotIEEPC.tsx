'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';

type Fase   = 'idle' | 'escuchando' | 'procesando' | 'hablando';
type Turno  = 'usuario' | 'bot';
type Idioma = 'spanish' | 'english' | 'nahuatl';
interface Historial { role: 'user'|'assistant'; content: string; }

/* ── Detección de idioma en el cliente ─────────────────────────
   Se detecta ANTES de enviar al API para poder pasarlo como param.
   Simple pero efectivo para los 3 idiomas soportados.               */
function detectarIdioma(texto: string): Idioma {
  const t = texto.toLowerCase();
  // Patrones de náhuatl (palabras comunes)
  const nah = /\b(tlen|quemah|tlein|nochi|miec|cualli|tlahzo|meztli|tonatiuh|tlahtoa|nimitz|notoca|nozo|macehualli|teopixqui|teotl|xi|tla mo|in )\b/;
  // Patrones de inglés — al menos 2 palabras inglesas claras
  const eng = /\b(the|is|are|was|were|have|has|can|will|would|should|what|how|why|when|where|who|your|you|my|me|we|they|this|that|does|did|do|its|for|not)\b/g;
  if (nah.test(t)) return 'nahuatl';
  const engMatches = t.match(eng);
  if (engMatches && engMatches.length >= 2) return 'english';
  return 'spanish';
}

function etiquetaIdioma(i: Idioma) {
  return i === 'english' ? '🇺🇸 English' : i === 'nahuatl' ? '🌾 Nahuatl' : '';
}

/* ── Robot SVG ─────────────────────────────────────────────── */
function RobotIEEPC({ fase }: { fase: Fase }) {
  const habla = fase==='hablando', escucha=fase==='escuchando', procesa=fase==='procesando';
  return (
    <svg viewBox="0 0 200 260" width={140} height={182} xmlns="http://www.w3.org/2000/svg">
      <defs><style>{`.robot-body{animation:bob 3s ease-in-out infinite;transform-origin:center;}@keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}`}</style></defs>
      {(habla||escucha)&&<circle cx="100" cy="120" r="80" fill="#F5C518" opacity="0.08"><animate attributeName="r" values="70;90;70" dur="1.5s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.05;0.15;0.05" dur="1.5s" repeatCount="indefinite"/></circle>}
      <g className="robot-body">
        <line x1="100" y1="28" x2="100" y2="50" stroke="#1A1A1A" strokeWidth="4" strokeLinecap="round"/>
        <circle cx="100" cy="22" r="9" fill={habla||escucha?'#F5C518':'#E6B800'}>{(habla||escucha)&&<animate attributeName="r" values="8;12;8" dur="0.8s" repeatCount="indefinite"/>}</circle>
        <rect x="42" y="48" width="116" height="90" rx="22" fill="#1A1A1A"/>
        <ellipse cx="78" cy="88" rx="16" ry="16" fill="#F5C518"/><ellipse cx="78" cy="88" rx="8" ry="8" fill="#1A1A1A"/><ellipse cx="78" cy="88" rx="3" ry="3" fill="white"/>
        {!procesa&&<ellipse cx="78" cy="88" rx="16" ry="6" fill="#F5C518"><animate attributeName="ry" values="16;1;16" dur="4s" repeatCount="indefinite"/></ellipse>}
        <ellipse cx="122" cy="88" rx="16" ry="16" fill="#F5C518"/><ellipse cx="122" cy="88" rx="8" ry="8" fill="#1A1A1A"/><ellipse cx="122" cy="88" rx="3" ry="3" fill="white"/>
        {!procesa&&<ellipse cx="122" cy="88" rx="16" ry="6" fill="#F5C518"><animate attributeName="ry" values="16;1;16" dur="4s" begin="0.5s" repeatCount="indefinite"/></ellipse>}
        {procesa&&<g transform="translate(100,88)"><circle r="14" fill="none" stroke="#F5C518" strokeWidth="3" strokeDasharray="20 60" strokeLinecap="round"><animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="0.8s" repeatCount="indefinite"/></circle></g>}
        <path fill="none" stroke="#F5C518" strokeWidth="3" strokeLinecap="round" d={habla?'M 78 122 Q 100 132 122 122':'M 82 122 Q 100 128 118 122'}>{habla&&<animate attributeName="d" values="M 78 122 Q 100 132 122 122;M 78 122 Q 100 116 122 122;M 78 122 Q 100 132 122 122" dur="0.5s" repeatCount="indefinite"/>}</path>
        <rect x="32" y="144" width="136" height="96" rx="20" fill="#1A1A1A"/>
        <polygon points="100,160 118,178 100,196 82,178" fill="#F5C518" opacity="0.9"/>
        <polygon points="100,167 111,178 100,189 89,178" fill="#1A1A1A"/>
        <circle cx="60" cy="200" r="6" fill={escucha?'#22C55E':'#374151'}>{escucha&&<animate attributeName="fill" values="#22C55E;#16A34A;#22C55E" dur="0.8s" repeatCount="indefinite"/>}</circle>
        <circle cx="80" cy="200" r="6" fill={procesa?'#F5C518':'#374151'}>{procesa&&<animate attributeName="fill" values="#F5C518;#E6B800;#F5C518" dur="0.6s" repeatCount="indefinite"/>}</circle>
        <circle cx="100" cy="200" r="6" fill={habla?'#3B82F6':'#374151'}>{habla&&<animate attributeName="fill" values="#3B82F6;#1D4ED8;#3B82F6" dur="0.7s" repeatCount="indefinite"/>}</circle>
        <rect x="2" y="150" width="28" height="56" rx="14" fill="#1A1A1A"/><rect x="170" y="150" width="28" height="56" rx="14" fill="#1A1A1A"/>
        <circle cx="16" cy="214" r="12" fill="#F5C518" opacity="0.6"/><circle cx="184" cy="214" r="12" fill="#F5C518" opacity="0.6"/>
      </g>
    </svg>
  );
}

function Burbuja({ texto, turno }: { texto: string; turno: Turno }) {
  return (
    <div className={`w-full flex ${turno==='usuario'?'justify-end':'justify-start'} px-2`}>
      <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${turno==='usuario'?'text-[#1A1A1A] rounded-br-sm':'bg-[#1A1A1A] text-white rounded-bl-sm'}`}
        style={turno==='usuario'?{background:'linear-gradient(135deg,#F5C518,#E6B800)'}:{}}>
        {texto}
      </div>
    </div>
  );
}

/* ── Componente principal ─────────────────────────────────── */
export function ChatbotIEEPC({ nombreUsuario }: { nombreUsuario: string }) {
  const primerNombre = nombreUsuario.split(' ')[0];
  const [fase, setFase]                   = useState<Fase>('idle');
  const [texto, setTexto]                 = useState('');
  const [turnoActual, setTurnoActual]     = useState<Turno|null>(null);
  const [mensajeVisible, setMensajeVisible] = useState('');
  const [transcript, setTranscript]       = useState('');
  const [historial, setHistorial]         = useState<Historial[]>([]);
  const [sinVoz, setSinVoz]               = useState(false);
  const [errorMic, setErrorMic]           = useState<string|null>(null);
  const [sttDisponible, setSttDisponible] = useState(true);
  const [idiomaActual, setIdiomaActual]   = useState<Idioma>('spanish');

  const recognitionRef = useRef<any>(null);
  const synthRef       = useRef<SpeechSynthesis|null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    synthRef.current = window.speechSynthesis;
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) { setSttDisponible(false); return; }
    const rec = new SpeechRec();
    rec.lang = 'es-MX'; rec.continuous = false; rec.interimResults = true;
    rec.onresult = (e: any) => {
      const t = Array.from(e.results as any[]).map((r: any) => r[0].transcript).join('');
      setTranscript(t);
    };
    rec.onend = () => {
      setTranscript(prev => { if (prev.trim()) setTimeout(() => enviarMensaje(prev.trim()), 100); return ''; });
      setFase(f => f === 'escuchando' ? 'idle' : f);
    };
    rec.onerror = (e: any) => {
      if (e.error !== 'no-speech') setErrorMic(`Error: ${e.error}`);
      setFase('idle'); setTranscript('');
    };
    recognitionRef.current = rec;

    const saludo = `Hola, ${primerNombre}. Soy ForumBot, tu asistente de participacion ciudadana. En que te puedo ayudar?`;
    mostrarRespuestaBot(saludo, 'spanish', false);
  }, []);

  function mostrarRespuestaBot(respuesta: string, idioma: Idioma, conVoz = true) {
    setTurnoActual('bot');
    setMensajeVisible(respuesta);
    setFase('hablando');

    if (conVoz && !sinVoz && synthRef.current) {
      synthRef.current.cancel();
      const utterance = new SpeechSynthesisUtterance(respuesta);
      // Idioma del TTS según lo detectado
      utterance.lang  = idioma === 'english' ? 'en-US' : 'es-MX';
      utterance.rate  = 0.95;
      utterance.pitch = 1.0;

      const voces = synthRef.current.getVoices();
      const MASC = /raúl|raul|diego|carlos|jorge|miguel|pablo|juan|pedro|sergio|manuel|david/i;
      const FEM  = /sabina|maria|maría|lucia|lucía|paula|mónica|monica|isabel|elena|laura|ana|rosa/i;
      const prefLang = idioma === 'english' ? 'en' : 'es';
      const voz =
        voces.find(v => v.lang.startsWith(prefLang) && MASC.test(v.name)) ??
        voces.find(v => v.lang.startsWith(prefLang) && !FEM.test(v.name)) ??
        voces.find(v => v.lang.startsWith(prefLang)) ?? null;
      if (voz) utterance.voice = voz;

      utterance.onend   = () => setFase('idle');
      utterance.onerror = () => setFase('idle');
      // FIX: setTimeout 150ms evita el corte de primera sílaba en Chrome
      setTimeout(() => { if (synthRef.current) synthRef.current.speak(utterance); }, 150);
    } else {
      const ms = Math.min(Math.max(respuesta.length * 30, 1500), 6000);
      setTimeout(() => setFase('idle'), ms);
    }
  }

  const enviarMensaje = useCallback(async (mensajeTexto: string) => {
    if (!mensajeTexto.trim() || fase === 'procesando' || fase === 'hablando') return;

    // Detectar idioma AQUÍ, en el cliente, antes de llamar al API
    const idioma = detectarIdioma(mensajeTexto);
    setIdiomaActual(idioma);

    setTurnoActual('usuario');
    setMensajeVisible(mensajeTexto);
    setFase('procesando');

    const nuevoHistorial: Historial[] = [...historial, { role: 'user' as const, content: mensajeTexto }];

    try {
      const r = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        // Se manda el idioma detectado al servidor para que lo fuerce en el prompt
        body: JSON.stringify({ mensaje: mensajeTexto, historial: historial.slice(-8), idioma }),
      });
      const j = await r.json();
      if (!j.ok || !j.respuesta) throw new Error('Sin respuesta');
      const respuesta: string = j.respuesta;
      setHistorial([...nuevoHistorial, { role: 'assistant' as const, content: respuesta }].slice(-16));
      mostrarRespuestaBot(respuesta, idioma);
    } catch {
      mostrarRespuestaBot('No pude conectarme. Intenta de nuevo.', idioma);
    }
  }, [fase, historial, sinVoz]);

  function manejarEnvioTexto(e: React.FormEvent) {
    e.preventDefault();
    const t = texto.trim(); if (!t) return;
    setTexto(''); enviarMensaje(t);
  }

  function toggleMic() {
    if (!recognitionRef.current) return;
    if (fase === 'escuchando') { recognitionRef.current.stop(); setFase('idle'); setTranscript(''); }
    else if (fase === 'idle') {
      setErrorMic(null); setTranscript(''); setTurnoActual(null); setMensajeVisible('');
      try { recognitionRef.current.start(); setFase('escuchando'); }
      catch { setErrorMic('No se pudo acceder al microfono.'); }
    }
  }

  function toggleVoz() {
    if (!sinVoz && synthRef.current) { synthRef.current.cancel(); setFase(p => p==='hablando'?'idle':p); }
    setSinVoz(v => !v);
  }

  const puedeInteractuar = fase === 'idle';
  const etiquetaFase =
    fase==='escuchando' ? 'Escuchando...' :
    fase==='procesando' ? 'Procesando...' :
    fase==='hablando'   ? 'ForumBot esta respondiendo...' : '';

  return (
    <div className="flex flex-col items-center w-full max-w-lg mx-auto gap-6">
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <RobotIEEPC fase={fase} />
          {fase==='escuchando'&&(<>
            <div className="absolute inset-0 rounded-full border-4 border-[#F5C518]/30 animate-ping"/>
            <div className="absolute inset-2 rounded-full border-2 border-[#F5C518]/20 animate-ping" style={{animationDelay:'0.3s'}}/>
          </>)}
        </div>
        <div className="text-center">
          <p className="font-black text-xl text-[#1A1A1A]">ForumBot</p>
          <div className="flex items-center gap-2 justify-center mt-0.5">
            <p className="text-xs text-[#9CA3AF]">Asistente IEEPCNL</p>
            {idiomaActual !== 'spanish' && (
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-[#F5C518]/20 text-[#92400E]">
                {etiquetaIdioma(idiomaActual)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="w-full min-h-[120px] flex flex-col justify-center gap-3">
        {etiquetaFase && (
          <div className="flex items-center justify-center gap-2 text-sm text-[#6B7280]">
            <span className="w-2 h-2 rounded-full bg-[#F5C518] animate-pulse"/>
            {etiquetaFase}
          </div>
        )}
        {fase==='escuchando' && transcript && <Burbuja texto={transcript} turno="usuario"/>}
        {turnoActual && mensajeVisible && fase!=='escuchando' && <Burbuja texto={mensajeVisible} turno={turnoActual}/>}
        {!turnoActual && fase==='idle' && (
          <p className="text-center text-sm text-[#9CA3AF] px-4">Escribe o habla para comenzar</p>
        )}
      </div>

      {errorMic && (
        <div className="w-full bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-4 py-2 text-center">{errorMic}</div>
      )}

      <div className="w-full space-y-3">
        <form onSubmit={manejarEnvioTexto} className="flex gap-2">
          <input
            type="text" value={texto} onChange={e => setTexto(e.target.value)}
            placeholder={puedeInteractuar ? 'Español · English · Nahuatl...' : 'Esperando...'}
            disabled={!puedeInteractuar}
            className="input flex-1 text-sm disabled:opacity-50"
          />
          <button type="submit" disabled={!puedeInteractuar||!texto.trim()} className="btn-yellow px-4 disabled:opacity-40">
            <Send className="w-4 h-4"/>
          </button>
        </form>

        <div className="flex gap-2">
          {sttDisponible ? (
            <button onClick={toggleMic} disabled={fase==='procesando'||fase==='hablando'}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-40 ${fase==='escuchando'?'text-white border-2 border-[#F5C518]':'btn-outline'}`}
              style={fase==='escuchando'?{background:'linear-gradient(135deg,#1A1A1A,#2D2D2D)'}:{}}>
              {fase==='escuchando'?<><MicOff className="w-4 h-4 text-[#F5C518]"/> Detener</>:<><Mic className="w-4 h-4"/> Hablar</>}
            </button>
          ) : (
            <div className="flex-1 bg-[#F9FAFB] rounded-xl py-3 text-center text-xs text-[#9CA3AF]">Microfono no disponible</div>
          )}
          <button onClick={toggleVoz}
            className={`px-4 py-3 rounded-xl border-2 transition-all ${sinVoz?'border-[#E5E7EB] text-[#9CA3AF]':'border-[#F5C518] text-[#92400E] bg-[#FFFBEB]'}`}
            title={sinVoz?'Activar voz':'Silenciar bot'}>
            {sinVoz?<VolumeX className="w-4 h-4"/>:<Volume2 className="w-4 h-4"/>}
          </button>
        </div>

        <p className="text-center text-[10px] text-[#9CA3AF] leading-relaxed">
          ForumBot nunca revela votos individuales. El voto es secreto e inviolable.
        </p>
      </div>
    </div>
  );
}
