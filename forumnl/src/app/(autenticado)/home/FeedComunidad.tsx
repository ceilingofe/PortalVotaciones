'use client';

import { useEffect, useState } from 'react';
import { Heart, MessageCircle, Bot, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
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

  return (
    <div className="space-y-4">
      {posts.map(p => (
        <PostCard
          key={p.id}
          post={p}
          expandido={expandido === p.id}
          onToggleExpand={() => setExpandido(expandido === p.id ? null : p.id)}
          onToggleLike={() => toggleLike(p.id)}
        />
      ))}
      {posts.length === 0 && (
        <div className="card p-8 text-center text-[#9CA3AF]">Aún no hay publicaciones en tu comunidad.</div>
      )}
    </div>
  );
}

function PostCard({ post, expandido, onToggleExpand, onToggleLike }: {
  post: Post;
  expandido: boolean;
  onToggleExpand: () => void;
  onToggleLike: () => void;
}) {
  const esSistema = post.tipo !== 'manual';
  const inicial = post.autor?.nombre.split(' ').map((s: string) => s[0]).slice(0, 2).join('') || '🤖';
  const img = normRuta(post.imagenPath);

  return (
    <article className="card overflow-hidden">
      {/* Imagen del post si existe */}
      {img && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={img}
          alt={post.titulo}
          className="w-full object-cover"
          style={{ maxHeight: '240px' }}
          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
      )}

      <div className="p-5">
        <header className="flex items-center gap-3 mb-3">
          <div className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0',
            esSistema ? 'bg-[#1A1A1A] text-[#F5C518]' : 'bg-[#F5C518] text-[#1A1A1A]'
          )}>
            {esSistema ? <Bot className="w-5 h-5" /> : inicial}
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">
              {esSistema ? 'FórumNL' : post.autor?.nombre}
            </p>
            {/* Fecha en DD/MM/AAAA HH:MM */}
            <p className="text-xs text-[#9CA3AF]">{fmtFechaHora(post.createdAt)}</p>
          </div>
        </header>

        {post.titulo && <h3 className="font-bold mb-1.5">{post.titulo}</h3>}
        <p className="text-sm text-[#4B5563] whitespace-pre-wrap leading-relaxed">{post.contenido}</p>

        <footer className="flex items-center gap-1 mt-4 pt-3 border-t border-[#E5E7EB]">
          <button onClick={onToggleLike} className={cn('btn-ghost text-sm', post.yaDiLike && 'text-red-600')}>
            <Heart className={cn('w-4 h-4', post.yaDiLike && 'fill-current')} />
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
  const [nuevo, setNuevo] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    fetch(`/api/feed/${postId}/comentarios`)
      .then(r => r.json())
      .then(j => { if (j.ok) setComentarios(j.comentarios); });
  }, [postId]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevo.trim()) return;
    setEnviando(true);
    const r = await fetch(`/api/feed/${postId}/comentarios`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ contenido: nuevo }),
    });
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
        <input
          type="text"
          value={nuevo}
          onChange={e => setNuevo(e.target.value)}
          placeholder="Escribe un comentario..."
          className="input flex-1 text-sm"
          disabled={enviando}
        />
        <button type="submit" disabled={enviando || !nuevo.trim()} className="btn-yellow">
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
