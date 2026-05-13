'use client';

import { useEffect, useState } from 'react';
import { Heart, MessageCircle, Bot, Send } from 'lucide-react';
import { fmtFechaHora } from '@/lib/dates';

interface Post {
  id: string;
  titulo: string;
  contenido: string;
  tipo: string;
  imagenPath: string | null;
  createdAt: string;
  autor: { id: string; nombre: string; rol: string } | null;
  likes: number;
  comentarios: number;
  yaDiLike: boolean;
}

// Posts de difusión ciudadana del IEEPCNL
// Se inyectan de forma estática entre los posts del feed
const POSTS_DIFUSION = [
  {
    id: 'difusion-1',
    titulo: '🏛️ Mecanismos de Participación Ciudadana',
    contenido: `¿Sabías que como ciudadano tienes múltiples formas de influir en las decisiones públicas?\n\nLos mecanismos de participación ciudadana del IEEPCNL incluyen: Consulta Ciudadana, Consulta Popular, Iniciativa Popular, Revocación de Mandato, Presupuesto Participativo y Contralorías Sociales.\n\nFórumNL te facilita ejercer algunos de estos derechos a nivel comunitario. ¡Tu participación construye una mejor colonia!`,
    imagenPath: '/images/difusion/mecanismos.jpg',
    tipo: 'difusion',
    esIEEPCNL: true,
  },
  {
    id: 'difusion-2',
    titulo: '💬 ¿Qué es la Consulta Ciudadana?',
    contenido: `La Consulta Ciudadana es un mecanismo democrático por el cual la ciudadanía puede opinar sobre actos, decisiones o proyectos de gobierno que afecten su comunidad.\n\nA nivel vecinal, FórumNL te permite ejercer este derecho en tu fraccionamiento: votar sobre prioridades, elegir a tus representantes y participar en asambleas deliberativas.\n\nTu voto es secreto, seguro y verificado. ¡Participa hoy!`,
    imagenPath: '/images/difusion/consulta-ciudadana.jpg',
    tipo: 'difusion',
    esIEEPCNL: true,
  },
];

function normRuta(p: string | null | undefined) {
  if (!p) return null;
  if (p.startsWith('http')) return p;
  return p.startsWith('/') ? p : `/${p}`;
}

export function FeedComunidad({ postsIniciales, usuarioId }: { postsIniciales: Post[]; usuarioId: string }) {
  const [posts, setPosts] = useState(postsIniciales);
  const [expandido, setExpandido] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(async () => {
      const r = await fetch('/api/feed');
      if (r.ok) { const j = await r.json(); if (j.posts) setPosts(j.posts); }
    }, 15000);
    return () => clearInterval(id);
  }, []);

  async function toggleLike(postId: string) {
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, yaDiLike: !p.yaDiLike, likes: p.likes + (p.yaDiLike ? -1 : 1) } : p
    ));
    await fetch(`/api/feed/${postId}/like`, { method: 'POST' });
  }

  // Mezclar posts de difusión: insertar uno después del post 1 y otro después del post 3
  const postsMezclados: (Post | typeof POSTS_DIFUSION[0])[] = [];
  posts.forEach((p, i) => {
    postsMezclados.push(p);
    if (i === 1 && POSTS_DIFUSION[0]) postsMezclados.push(POSTS_DIFUSION[0]);
    if (i === 3 && POSTS_DIFUSION[1]) postsMezclados.push(POSTS_DIFUSION[1]);
  });
  // Si hay menos de 2 posts regulares, agregar difusión al final
  if (posts.length <= 1) POSTS_DIFUSION.forEach(d => postsMezclados.push(d));

  return (
    <div className="space-y-4">
      {postsMezclados.map((p: any) => (
        p.esIEEPCNL
          ? <PostDifusion key={p.id} post={p} />
          : (
            <PostCard
              key={p.id}
              post={p}
              expandido={expandido === p.id}
              onToggleExpand={() => setExpandido(expandido === p.id ? null : p.id)}
              onToggleLike={() => toggleLike(p.id)}
            />
          )
      ))}
      {postsMezclados.length === 0 && (
        <div className="card p-8 text-center text-[#9CA3AF]">Aún no hay publicaciones en tu comunidad.</div>
      )}
    </div>
  );
}

/* ── Post de difusión ciudadana ────────────────────────── */
function PostDifusion({ post }: { post: typeof POSTS_DIFUSION[0] }) {
  const img = normRuta(post.imagenPath);
  return (
    <article className="card overflow-hidden ring-1 ring-[#F5C518]/30">
      {/* Badge IEEPCNL */}
      <div className="px-5 pt-4 pb-2 flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-ieepc.png" alt="IEEPCNL" style={{ height: 24, width: 'auto', mixBlendMode: 'multiply' }} />
        <div>
          <p className="text-xs font-bold text-[#1A1A1A] leading-tight">IEEPCNL · FórumNL</p>
          <p className="text-[10px] text-[#9CA3AF]">Difusión ciudadana</p>
        </div>
        <span className="ml-auto badge badge-yellow text-[10px]">Información oficial</span>
      </div>

      {/* Imagen */}
      {img && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={img} alt={post.titulo} className="w-full object-cover"
          style={{ maxHeight: 220 }}
          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
      )}

      <div className="p-5">
        <h3 className="font-bold text-base mb-2">{post.titulo}</h3>
        <p className="text-sm text-[#4B5563] whitespace-pre-wrap leading-relaxed">{post.contenido}</p>
      </div>
    </article>
  );
}

/* ── Post regular ──────────────────────────────────────── */
function PostCard({ post, expandido, onToggleExpand, onToggleLike }: {
  post: Post;
  expandido: boolean;
  onToggleExpand: () => void;
  onToggleLike: () => void;
}) {
  const esSistema = post.tipo !== 'manual';
  const inicial   = post.autor?.nombre.split(' ').map((s: string) => s[0]).slice(0, 2).join('') || '🤖';
  const img = normRuta(post.imagenPath);
  const esDoc = img && !img.match(/\.(jpg|jpeg|png|gif|webp)$/i);

  return (
    <article className="card overflow-hidden">
      {/* Imagen del post */}
      {img && !esDoc && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={img} alt={post.titulo} className="w-full object-cover" style={{ maxHeight: 240 }}
          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
      )}

      {/* Documento adjunto */}
      {esDoc && (
        <div className="mx-5 mt-4 p-3 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB] flex items-center gap-3">
          <div className="w-10 h-10 bg-[#F5C518]/20 rounded-xl flex items-center justify-center text-xl">📄</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#1A1A1A] truncate">Documento adjunto</p>
            <a href={img} target="_blank" rel="noopener noreferrer" className="text-xs text-[#F5C518] font-semibold hover:underline">
              Ver / Descargar →
            </a>
          </div>
        </div>
      )}

      <div className="p-5">
        <header className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${esSistema ? 'bg-[#1A1A1A] text-[#F5C518]' : 'bg-[#F5C518] text-[#1A1A1A]'}`}>
            {esSistema ? <Bot className="w-5 h-5" /> : inicial}
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">{esSistema ? 'FórumNL' : post.autor?.nombre}</p>
            <p className="text-xs text-[#9CA3AF]">{fmtFechaHora(post.createdAt)}</p>
          </div>
        </header>

        {post.titulo && <h3 className="font-bold mb-1.5">{post.titulo}</h3>}
        <p className="text-sm text-[#4B5563] whitespace-pre-wrap leading-relaxed">{post.contenido}</p>

        <footer className="flex items-center gap-1 mt-4 pt-3 border-t border-[#E5E7EB]">
          <button onClick={onToggleLike} className={`btn-ghost text-sm ${post.yaDiLike && 'text-red-600'}`}>
            <Heart className={`w-4 h-4 ${post.yaDiLike && 'fill-current'}`} />
            <span>{post.likes}</span>
          </button>
          <button onClick={onToggleExpand} className="btn-ghost text-sm">
            <MessageCircle className="w-4 h-4" /><span>{post.comentarios}</span>
          </button>
        </footer>
        {expandido && <SeccionComentarios postId={post.id} />}
      </div>
    </article>
  );
}

function SeccionComentarios({ postId }: { postId: string }) {
  const [comentarios, setComentarios] = useState<any[]>([]);
  const [nuevo, setNuevo]   = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    fetch(`/api/feed/${postId}/comentarios`).then(r => r.json()).then(j => { if (j.ok) setComentarios(j.comentarios); });
  }, [postId]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault(); if (!nuevo.trim()) return; setEnviando(true);
    const r = await fetch(`/api/feed/${postId}/comentarios`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ contenido: nuevo }) });
    const j = await r.json();
    if (j.ok) { setComentarios([...comentarios, j.comentario]); setNuevo(''); }
    setEnviando(false);
  }

  return (
    <div className="mt-3 pt-3 border-t border-[#E5E7EB] space-y-2">
      {comentarios.map(c => (
        <div key={c.id} className="bg-[#F9FAFB] rounded-xl px-3 py-2">
          <p className="text-xs font-semibold text-[#1A1A1A]">{c.autor}</p>
          <p className="text-sm text-[#6B7280]">{c.contenido}</p>
        </div>
      ))}
      <form onSubmit={enviar} className="flex gap-2 pt-1">
        <input type="text" value={nuevo} onChange={e => setNuevo(e.target.value)} placeholder="Escribe un comentario..." className="input flex-1 text-sm" disabled={enviando} />
        <button type="submit" disabled={enviando || !nuevo.trim()} className="btn-yellow"><Send className="w-4 h-4" /></button>
      </form>
    </div>
  );
}
