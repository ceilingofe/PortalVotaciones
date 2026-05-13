import { prisma } from '@/lib/db/prisma';
import { usuarioActual } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { BoletaCliente } from './BoletaCliente';
import { CerrarVotacionBtn } from './CerrarVotacionBtn';
import { ReabrirVotacionBtn } from './ReabrirVotacionBtn';

export default async function VotarPage({ params }: { params: { id: string } }) {
  const usuario = await usuarioActual();
  if (!usuario?.vivienda) redirect('/');

  const asamblea = await prisma.asamblea.findUnique({
    where: { id: params.id },
    include: {
      procesos: {
        include: {
          opciones: { orderBy: { orden: 'asc' }, include: { integrantes: true } },
          _count: { select: { votos: true, emisiones: true } },
        },
      },
      padron: { where: { usuarioId: usuario.id } },
      _count: { select: { padron: true } },
    },
  });

  if (!asamblea) return <p>Evento no encontrado.</p>;
  const proceso = asamblea.procesos[0];
  if (!proceso) return <p>Sin proceso configurado.</p>;

  const enPadron = asamblea.padron[0];
  const yaVoto = enPadron
    ? await prisma.emisionPadron.findUnique({
        where: { procesoId_folioAnonimo: { procesoId: proceso.id, folioAnonimo: enPadron.folioAnonimo } },
      })
    : null;

  const esAdmin = usuario.rol === 'ADMIN';
  const esModerador = usuario.rol === 'ADMIN' || usuario.rol === 'COMITE';
  const estaCerrada = asamblea.estatus === 'CERRADA' || asamblea.estatus === 'CON_ACTA';
  const totalPadron = asamblea._count.padron;
  const totalVotos = proceso._count.votos;
  const pctParticipacion = totalPadron > 0 ? ((totalVotos / totalPadron) * 100).toFixed(1) : '0.0';

  return (
    <div className="max-w-2xl mx-auto">
      <Link href="/eventos" className="inline-flex items-center gap-2 text-sm text-[#6B7280] hover:text-[#1A1A1A] mb-6 font-medium transition-colors">
        <ArrowLeft className="w-4 h-4" /> Volver a eventos
      </Link>

      {/* Panel admin/moderador */}
      {esModerador && (
        <div className="rounded-2xl p-5 mb-5 text-white" style={{ background: 'linear-gradient(135deg, #1A1A1A, #2D2D2D)' }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] text-[#F5C518] uppercase tracking-widest font-bold mb-1">Panel de administración</p>
              <p className="text-sm text-[#E5E7EB]">
                <span className="text-white font-bold text-2xl">{totalVotos}</span>
                <span className="text-[#9CA3AF]"> / {totalPadron} votos</span>
                <span className="ml-3 text-[#F5C518] font-semibold">{pctParticipacion}%</span>
              </p>
              {/* Mini progress */}
              <div className="mt-2 h-1.5 bg-white/10 rounded-full w-40 overflow-hidden">
                <div className="h-full rounded-full bg-[#F5C518] transition-all" style={{ width: `${Math.min(100, parseFloat(pctParticipacion))}%` }} />
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!estaCerrada && <CerrarVotacionBtn asambleaId={params.id} titulo={asamblea.titulo} />}
              {estaCerrada && esAdmin && <ReabrirVotacionBtn asambleaId={params.id} />}
              {estaCerrada && !esAdmin && <span className="badge bg-white/10 text-white">Votación cerrada</span>}
            </div>
          </div>
        </div>
      )}

      {/* Votación cerrada — vecino normal */}
      {estaCerrada && !esModerador && (
        <div className="card p-8 text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-xl font-bold mb-2">Votación cerrada</h2>
          <p className="text-[#6B7280] mb-5">Consulta los resultados y las actas oficiales en la sección Histórico.</p>
          <Link href="/historico" className="btn-yellow px-6">Ver resultados →</Link>
        </div>
      )}

      {/* Sin padrón */}
      {!estaCerrada && !enPadron && !esModerador && (
        <div className="card p-6">
          <p className="text-red-700 font-semibold">No estás en el padrón de este proceso.</p>
          <p className="text-sm text-[#6B7280] mt-1">Verifica tu registro o comunícate con el comité.</p>
        </div>
      )}

      {/* Ya votó */}
      {!estaCerrada && enPadron && yaVoto && (
        <div className="card p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-green-100 flex items-center justify-center text-5xl">✅</div>
          <h2 className="text-2xl font-extrabold mb-2">¡Voto registrado!</h2>
          <p className="text-[#6B7280]">Tu participación fue contabilizada de forma segura y anónima.</p>
        </div>
      )}

      {/* Boleta activa */}
      {!estaCerrada && enPadron && !yaVoto && (
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
            imagenPath: o.imagenPath,
            integrantes: o.integrantes.map((i) => ({ puesto: i.puesto, nombre: i.nombre })),
          }))}
        />
      )}
    </div>
  );
}
