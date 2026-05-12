import { prisma } from '@/lib/db/prisma';
import { usuarioActual } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { BoletaCliente } from './BoletaCliente';

export default async function VotarPage({ params }: { params: { id: string } }) {
  const usuario = await usuarioActual();
  if (!usuario?.vivienda) redirect('/');

  const asamblea = await prisma.asamblea.findUnique({
    where: { id: params.id },
    include: {
      procesos: {
        include: {
          opciones: {
            orderBy: { orden: 'asc' },
            include: { integrantes: true },
          },
        },
      },
      padron: { where: { usuarioId: usuario.id } },
    },
  });

  if (!asamblea) return <p>Evento no encontrado.</p>;
  const proceso = asamblea.procesos[0];
  if (!proceso) return <p>Sin proceso configurado.</p>;

  const enPadron = asamblea.padron[0];
  if (!enPadron) {
    return (
      <div className="card p-6">
        <Link href="/eventos" className="inline-flex items-center gap-1 text-sm text-ieepc-gray mb-3"><ArrowLeft className="w-4 h-4" /> Volver</Link>
        <p className="text-red-700">No estás en el padrón de este proceso.</p>
      </div>
    );
  }

  // Verificar si ya votó
  const yaVoto = await prisma.emisionPadron.findUnique({
    where: { procesoId_folioAnonimo: { procesoId: proceso.id, folioAnonimo: enPadron.folioAnonimo } },
  });

  return (
    <div className="max-w-2xl mx-auto">
      <Link href="/eventos" className="inline-flex items-center gap-1 text-sm text-ieepc-gray mb-4 hover:text-ieepc-black">
        <ArrowLeft className="w-4 h-4" /> Volver a eventos
      </Link>

      {yaVoto ? (
        <div className="card p-8 text-center">
          <div className="text-5xl mb-3">✅</div>
          <h2 className="text-xl font-bold mb-2">Ya emitiste tu voto</h2>
          <p className="text-ieepc-gray">Tu voto fue registrado. Espera al cierre del proceso para ver resultados.</p>
        </div>
      ) : (
        <BoletaCliente
          procesoId={proceso.id}
          titulo={asamblea.titulo}
          subtitulo={proceso.titulo}
          tipo={proceso.tipo}
          reglas={asamblea.reglas}
          opciones={proceso.opciones.map((o) => ({
            id: o.id,
            nombre: o.nombre,
            descripcion: o.descripcion,
            integrantes: o.integrantes.map((i) => ({ puesto: i.puesto, nombre: i.nombre })),
          }))}
        />
      )}
    </div>
  );
}
