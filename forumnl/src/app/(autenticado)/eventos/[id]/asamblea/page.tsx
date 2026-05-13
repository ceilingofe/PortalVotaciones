import { prisma } from '@/lib/db/prisma';
import { usuarioActual } from '@/lib/auth/session';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ForoCliente } from './ForoCliente';

export default async function AsambleaPage({ params }: { params: { id: string } }) {
  const usuario = await usuarioActual();
  if (!usuario) return null;

  const asamblea = await prisma.asamblea.findUnique({
    where: { id: params.id },
    include: {
      mensajes: {
        orderBy: { createdAt: 'asc' },
        take: 100,
        include: { usuario: { select: { nombreCompleto: true, rol: true } } },
      },
    },
  });

  if (!asamblea) return <p>Asamblea no encontrada.</p>;

  const esModerador = usuario.rol === 'ADMIN' || usuario.rol === 'COMITE';

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/eventos" className="inline-flex items-center gap-1 text-sm text-ieepc-gray mb-4 hover:text-ieepc-black">
        <ArrowLeft className="w-4 h-4" /> Volver a eventos
      </Link>

      <header className="mb-4">
        <span className="badge badge-yellow mb-2">💬 Asamblea deliberativa</span>
        <h1 className="text-2xl font-bold">{asamblea.titulo}</h1>
        <p className="text-sm text-ieepc-gray mt-1">{asamblea.descripcion}</p>
      </header>

      <ForoCliente
        asambleaId={asamblea.id}
        mensajesIniciales={asamblea.mensajes.map((m) => ({
          id: m.id,
          autor: m.usuario.nombreCompleto,
          esModerador: m.usuario.rol === 'COMITE' || m.usuario.rol === 'ADMIN',
          contenido: m.contenido,
          createdAt: m.createdAt.toISOString(),
          esAnonimo: (m as any).esAnonimo ?? false,
          rol: m.usuario.rol ?? null,
          esMio: m.usuarioId === usuario.id,
        }))}
        esModerador={esModerador}
      />
    </div>
  );
}
