import { prisma } from '@/lib/db/prisma';
import Link from 'next/link';
import { ArrowLeft, Vote } from 'lucide-react';
import { usuarioActual } from '@/lib/auth/session';

/** Normaliza rutas locales. Si ya empieza con "/" no agrega otro. */
function normalizarRuta(p: string | null | undefined): string | null {
  if (!p) return null;
  if (p.startsWith('http://') || p.startsWith('https://')) return p;
  return p.startsWith('/') ? p : `/${p}`;
}

function renderMd(text: string) {
  const lines = text.split('\n');
  const out: JSX.Element[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (line.startsWith('## ')) {
      out.push(<h3 key={i} className="text-lg font-bold text-[#1A1A1A] mb-2 mt-4">{parseBold(line.slice(3))}</h3>);
    } else if (line.startsWith('# ')) {
      out.push(<h2 key={i} className="text-xl font-bold text-[#1A1A1A] mb-2 mt-5">{parseBold(line.slice(2))}</h2>);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      const items: JSX.Element[] = [];
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
        items.push(<li key={i} className="text-[#4B5563] text-sm leading-relaxed">{parseBold(lines[i].slice(2))}</li>);
        i++;
      }
      out.push(<ul key={`ul-${i}`} className="list-disc list-inside space-y-1 mb-3 ml-2">{items}</ul>);
      continue;
    } else {
      out.push(<p key={i} className="text-[#4B5563] text-sm leading-relaxed mb-2">{parseBold(line)}</p>);
    }
    i++;
  }
  return out;
}

function parseBold(text: string): React.ReactNode {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((p, i) => i % 2 === 1 ? <strong key={i} className="font-semibold text-[#1A1A1A]">{p}</strong> : p);
}

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
      <Link href="/eventos" className="inline-flex items-center gap-2 text-sm text-[#6B7280] hover:text-[#1A1A1A] mb-6 font-medium transition-colors">
        <ArrowLeft className="w-4 h-4" /> Volver a eventos
      </Link>

      <div className="card p-6 mb-6">
        <span className="badge badge-yellow mb-3">📋 Infórmate antes de votar</span>
        <h1 className="text-2xl font-extrabold mb-2">{asamblea.titulo}</h1>
        <p className="text-[#6B7280] text-sm">{asamblea.descripcion}</p>
      </div>

      {asamblea.reglas && (
        <div className="card p-5 mb-6 border-l-4 border-[#F5C518]">
          <h2 className="font-bold text-sm uppercase tracking-wider text-[#92400E] mb-2">📋 Reglas</h2>
          <p className="text-sm text-[#4B5563] leading-relaxed">{asamblea.reglas}</p>
        </div>
      )}

      <div className="space-y-5">
        {proceso?.opciones.map((o, idx) => {
          const imgSrc = normalizarRuta(o.imagenPath);
          return (
            <article key={o.id} className="card overflow-hidden">
              {/* Imagen — <img> nativo evita problemas de config de Next.js Image */}
              {imgSrc ? (
                <div className="relative h-44 w-full overflow-hidden bg-[#F3F4F6]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imgSrc}
                    alt={o.nombre}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none'; }}
                  />
                </div>
              ) : (
                <div className="h-2 w-full" style={{ background: `linear-gradient(90deg,#F5C518 ${idx * 33}%,#1A1A1A)` }} />
              )}

              <div className="p-6">
                <span className="badge badge-black text-xs mb-2">
                  {proceso.tipo === 'ELECCION_PLANILLA' ? `Planilla ${String.fromCharCode(65 + idx)}` : `Opción ${idx + 1}`}
                </span>
                <h2 className="text-xl font-extrabold mt-1 mb-1">{o.nombre}</h2>
                <p className="text-[#6B7280] text-sm mb-4">{o.descripcion}</p>

                {o.integrantes.length > 0 && (
                  <div className="mb-5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF] mb-3">Integrantes</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {o.integrantes.map((integ, j) => (
                        <div key={j} className="flex items-center gap-3 p-2.5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB]">
                          <div className="w-9 h-9 rounded-full bg-[#F5C518] text-[#1A1A1A] flex items-center justify-center font-bold text-xs shrink-0">
                            {integ.nombre.split(' ').map(n => n[0]).slice(0, 2).join('')}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold leading-tight truncate">{integ.nombre}</p>
                            <p className="text-[10px] text-[#9CA3AF] leading-tight">{integ.puesto}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {o.infoMd && (
                  <div className="border-t border-[#E5E7EB] pt-4">
                    {renderMd(o.infoMd)}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-8 text-center">
        <Link href={`/eventos/${params.id}/votar`} className="btn-yellow px-8 py-3 text-base">
          <Vote className="w-5 h-5" /> Ir a votar →
        </Link>
      </div>
    </div>
  );
}
