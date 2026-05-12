'use client';

import { useEffect, useState } from 'react';
import { Heart, MessageCircle, Bot, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

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

export function FeedComunidad({ postsIniciales, usuarioId }: { postsIniciales: Post[]; usuarioId: string }) {
  const [posts, setPosts] = useState(postsIniciales);
  const [postExpandido, setPostExpandido] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(async () => {
      const r = await fetch('/api/feed');
      if (r.ok) {
        const json = await r.json();
        if (json.posts) setPosts(json.posts);
      }
    }, 15000);
    return () => clearInterval(id);
  }, []);

  async function toggleLike(postId: string) {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, yaDiLike: !p.yaDiLike, likes: p.likes + (p.yaDiLike ? -1 : 1) }
          : p
      )
    );
    await fetch(`/api/feed/${postId}/like`, { method: 'POST' });
  }

  return (
    <div className="space-y-4">
      {posts.map((p) => (
        <PostCard
          key={p.id}
          post={p}
          expandido={postExpandido === p.id}
          onToggleExpand={() => setPostExpandido(postExpandido === p.id ? null : p.id)}
          onToggleLike={() => toggleLike(p.id)}
        />
      ))}
      {posts.length === 0 && (
        <div className="card p-8 text-center text-ieepc-gray">
          Aún no hay publicaciones en tu comunidad.
        </div>
      )}
    </div>
  );
}

function PostCard({ post, expandido, onToggleExpand, onToggleLike }: any) {
  const esSistema = post.tipo !== 'manual';
  const inicial = post.autor?.nombre.split(' ').map((s: string) => s[0]).slice(0, 2).join('') || '🤖';

  return (
    <article className="card p-5">
      <header className="flex items-center gap-3 mb-3">
        <div className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm',
          esSistema ? 'bg-ieepc-black text-ieepc-yellow' : 'bg-ieepc-yellow text-ieepc-black'
        )}>
          {esSistema ? <Bot className="w-5 h-5" /> : inicial}
        </div>
        <div>
          <p className="text-sm font-medium leading-tight">
            {esSistema ? 'FórumNL' : post.autor?.nombre}
          </p>
          <p className="text-xs text-ieepc-gray">{formatearFecha(post.createdAt)}</p>
        </div>
      </header>

      {post.titulo && <h3 className="font-semibold mb-2">{post.titulo}</h3>}
      <p className="text-sm text-ieepc-gray whitespace-pre-wrap">{post.contenido}</p>

      <footer className="flex items-center gap-1 mt-4 pt-3 border-t border-ieepc-gray-light">
        <button
          onClick={onToggleLike}
          className={cn(
            'btn-ghost text-sm',
            post.yaDiLike && 'text-red-600'
          )}
        >
          <Heart className={cn('w-4 h-4', post.yaDiLike && 'fill-current')} />
          <span>{post.likes}</span>
        </button>
        <button onClick={onToggleExpand} className="btn-ghost text-sm">
          <MessageCircle className="w-4 h-4" />
          <span>{post.comentarios}</span>
        </button>
      </footer>

      {expandido && <SeccionComentarios postId={post.id} />}
    </article>
  );
}

function SeccionComentarios({ postId }: { postId: string }) {
  const [comentarios, setComentarios] = useState<any[]>([]);
  const [nuevo, setNuevo] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    fetch(`/api/feed/${postId}/comentarios`).then(r => r.json()).then((j) => {
      if (j.ok) setComentarios(j.comentarios);
    });
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
    if (j.ok) {
      setComentarios([...comentarios, j.comentario]);
      setNuevo('');
    }
    setEnviando(false);
  }

  return (
    <div className="mt-3 pt-3 border-t border-ieepc-gray-light space-y-2">
      {comentarios.map((c) => (
        <div key={c.id} className="bg-gray-50 rounded-lg px-3 py-2">
          <p className="text-xs font-medium text-ieepc-black">{c.autor}</p>
          <p className="text-sm text-ieepc-gray">{c.contenido}</p>
        </div>
      ))}
      <form onSubmit={enviar} className="flex gap-2 pt-2">
        <input
          type="text"
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
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

function formatearFecha(iso: string) {
  const d = new Date(iso);
  const ahora = new Date();
  const diff = (ahora.getTime() - d.getTime()) / 1000;
  if (diff < 60) return 'ahora';
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: '2-digit' });
}
