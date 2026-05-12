import { prisma } from '@/lib/db/prisma';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { usuarioActual } from '@/lib/auth/session';

export default async function InformatePage({ params }: { params: { id: string } }) {
  const usuario = await usuarioActual();
  if (!usuario) return null;

  const asamblea = await prisma.asamblea.findUnique({
    where: { id: params.id },
    include: {
      procesos: {
        include: { opciones: { orderBy: { orden: 'asc' }, include: { integrantes: true } } },
      },
    },
  });

  if (!asamblea) return <p>Evento no encontrado.</p>;
  const proceso = asamblea.procesos[0];

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/eventos" className="inline-flex items-center gap-1 text-sm text-ieepc-gray mb-4 hover:text-ieepc-black">
        <ArrowLeft className="w-4 h-4" /> Volver a eventos
      </Link>

      <header className="mb-6">
        <span className="badge badge-yellow mb-2">Infórmate antes de votar</span>
        <h1 className="text-2xl font-bold">{asamblea.titulo}</h1>
        <p className="text-ieepc-gray text-sm mt-1">{asamblea.descripcion}</p>
      </header>

      {asamblea.reglas && (
        <div className="card p-4 bg-ieepc-yellow/5 mb-6">
          <h2 className="font-semibold text-sm mb-1">📋 Reglas del proceso</h2>
          <p className="text-sm text-ieepc-gray">{asamblea.reglas}</p>
        </div>
      )}

      <div className="space-y-4">
        {proceso?.opciones.map((o) => (
          <article key={o.id} className="card p-5">
            <h2 className="text-lg font-bold mb-1">{o.nombre}</h2>
            <p className="text-sm text-ieepc-gray mb-3">{o.descripcion}</p>

            {o.integrantes.length > 0 && (
              <div className="mb-4">
                <h3 className="text-xs uppercase tracking-wider text-ieepc-gray mb-2">Integrantes</h3>
                <ul className="text-sm space-y-1">
                  {o.integrantes.map((i, idx) => (
                    <li key={idx}><strong>{i.puesto}:</strong> {i.nombre}</li>
                  ))}
                </ul>
              </div>
            )}

            {o.infoMd && (
              <div className="prose prose-sm max-w-none border-t pt-4 mt-4">
                <pre className="whitespace-pre-wrap font-sans text-sm text-ieepc-gray">{o.infoMd}</pre>
              </div>
            )}
          </article>
        ))}
      </div>

      <div className="mt-6 text-center">
        <Link href={`/eventos/${params.id}/votar`} className="btn-yellow">
          Ir a votar →
        </Link>
      </div>
    </div>
  );
}
