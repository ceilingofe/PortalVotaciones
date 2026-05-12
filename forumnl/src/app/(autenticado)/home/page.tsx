import { prisma } from '@/lib/db/prisma';
import { usuarioActual } from '@/lib/auth/session';
import { FeedComunidad } from './FeedComunidad';

export default async function HomePage() {
  const usuario = await usuarioActual();
  if (!usuario || !usuario.vivienda) return null;

  const fraccionamiento = usuario.vivienda.fraccionamiento;

  const posts = await prisma.post.findMany({
    where: { fraccionamientoId: fraccionamiento.id },
    orderBy: { createdAt: 'desc' },
    take: 30,
    include: {
      autor: { select: { id: true, nombreCompleto: true, rol: true } },
      _count: { select: { likes: true, comentarios: true } },
      likes: { where: { usuarioId: usuario.id }, select: { id: true } },
    },
  });

  const postsConFlag = posts.map((p) => ({
    id: p.id,
    titulo: p.titulo,
    contenido: p.contenido,
    tipo: p.tipo,
    imagenPath: p.imagenPath,
    createdAt: p.createdAt.toISOString(),
    autor: p.autor ? { id: p.autor.id, nombre: p.autor.nombreCompleto, rol: p.autor.rol } : null,
    likes: p._count.likes,
    comentarios: p._count.comentarios,
    yaDiLike: p.likes.length > 0,
  }));

  return (
    <div className="space-y-4">
      <div className="card p-5 bg-gradient-to-br from-ieepc-yellow/10 to-white">
        <h1 className="text-xl font-bold mb-1">
          Bienvenido, {usuario.nombreCompleto.split(' ')[0]} 👋
        </h1>
        <p className="text-sm text-ieepc-gray">
          Vecino de <strong>{fraccionamiento.nombre}</strong>, {fraccionamiento.municipio}, {fraccionamiento.estado}
        </p>
      </div>

      <FeedComunidad postsIniciales={postsConFlag} usuarioId={usuario.id} />
    </div>
  );
}
