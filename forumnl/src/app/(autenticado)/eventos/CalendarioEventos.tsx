'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Vote, MessageSquare, Info, Clock, Users, Lock } from 'lucide-react';
import { ReabrirDesdeListaBtn } from './ReabrirDesdeListaBtn';
import { EliminarEventoBtn } from './EliminarEventoBtn';
import { fmtHora12, fmtClaveDia, fmtDiaLargo } from '@/lib/dates';

const DIAS_CORTOS  = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];
const MESES        = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

interface EventoResumen {
  id: string;
  titulo: string;
  descripcion: string;
  tipo: string;
  estatus: string;
  jornadaInicio: string;
  jornadaFin: string;
  totalPadron: number;
  totalVotos: number;
  esModerador: boolean;
  esAdmin: boolean;
}

const TIPO_EMOJI: Record<string, string> = {
  ELECCION_PLANILLA:    '🗳️',
  PRIORIZACION_PUNTAJE: '📊',
  ASAMBLEA_DELIBERATIVA:'💬',
  SI_NO:                '✋',
  OTRO:                 '📋',
};
const TIPO_LABEL: Record<string, string> = {
  ELECCION_PLANILLA:    'Elección',
  PRIORIZACION_PUNTAJE: 'Priorización',
  ASAMBLEA_DELIBERATIVA:'Asamblea',
  SI_NO:                'Sí / No',
  OTRO:                 'Proceso',
};

function diasDelMes(a: number, m: number)    { return new Date(a, m + 1, 0).getDate(); }
function primerDia(a: number, m: number)     { const d = new Date(a, m, 1).getDay(); return d === 0 ? 6 : d - 1; }

export function CalendarioEventos({ eventos }: { eventos: EventoResumen[] }) {
  const hoy = new Date();
  const [mes, setMes]   = useState(hoy.getMonth());
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [diaFiltro, setDiaFiltro] = useState<string | null>(null);

  function mesAnterior() { if (mes === 0) { setMes(11); setAnio(a => a - 1); } else setMes(m => m - 1); }
  function mesSiguiente(){ if (mes === 11){ setMes(0);  setAnio(a => a + 1); } else setMes(m => m + 1); }

  // Índice de eventos por día
  const porDia: Record<string, EventoResumen[]> = {};
  for (const ev of eventos) {
    const k = fmtClaveDia(ev.jornadaInicio);
    if (!porDia[k]) porDia[k] = [];
    porDia[k].push(ev);
  }

  const totalDias  = diasDelMes(anio, mes);
  const offset     = primerDia(anio, mes);
  const filas      = Math.ceil((offset + totalDias) / 7);

  const eventosOrdenados = [...eventos].sort((a, b) => a.jornadaInicio.localeCompare(b.jornadaInicio));
  const eventosMostrar   = diaFiltro
    ? (porDia[diaFiltro] ?? [])
    : eventosOrdenados;

  // Agrupar por fecha
  const grupos: { key: string; label: string; items: EventoResumen[] }[] = [];
  const vistas = new Set<string>();
  for (const ev of eventosMostrar) {
    const k = fmtClaveDia(ev.jornadaInicio);
    if (!vistas.has(k)) {
      vistas.add(k);
      grupos.push({ key: k, label: fmtDiaLargo(ev.jornadaInicio), items: eventosMostrar.filter(e => fmtClaveDia(e.jornadaInicio) === k) });
    }
  }

  return (
    <div className="space-y-6">
      {/* ── CALENDARIO ── */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-5">
          <button onClick={mesAnterior}  className="btn-ghost p-2 rounded-xl"><ChevronLeft  className="w-5 h-5" /></button>
          <h2 className="font-extrabold text-xl">{MESES[mes]} {anio}</h2>
          <button onClick={mesSiguiente} className="btn-ghost p-2 rounded-xl"><ChevronRight className="w-5 h-5" /></button>
        </div>

        <div className="grid grid-cols-7 mb-2">
          {DIAS_CORTOS.map(d => <div key={d} className="text-center text-xs font-bold text-[#9CA3AF] py-1">{d}</div>)}
        </div>

        <div className="grid grid-cols-7 gap-y-1">
          {Array.from({ length: filas * 7 }).map((_, idx) => {
            const num = idx - offset + 1;
            if (num < 1 || num > totalDias) return <div key={idx} />;

            const k = `${anio}-${String(mes + 1).padStart(2,'0')}-${String(num).padStart(2,'0')}`;
            const tieneEvt  = !!porDia[k];
            const esHoy     = num === hoy.getDate() && mes === hoy.getMonth() && anio === hoy.getFullYear();
            const esSel     = diaFiltro === k;
            const cuantos   = porDia[k]?.length ?? 0;

            return (
              <button key={idx}
                onClick={() => tieneEvt && setDiaFiltro(esSel ? null : k)}
                disabled={!tieneEvt}
                className={`flex flex-col items-center justify-center h-10 w-full rounded-xl text-sm font-semibold transition-all
                  ${esSel ? 'ring-2 ring-[#F5C518] text-[#1A1A1A]' : ''}
                  ${tieneEvt && !esSel ? 'cursor-pointer hover:scale-105 text-[#1A1A1A]' : ''}
                  ${!tieneEvt ? 'text-[#9CA3AF] cursor-default' : ''}
                  ${esHoy && !tieneEvt ? 'underline' : ''}`}
                style={tieneEvt ? { background: esSel ? 'linear-gradient(135deg,#F5C518,#E6B800)' : 'linear-gradient(135deg,#FFFBEB,#FEF3C7)' } : {}}
              >
                <span>{num}</span>
                {tieneEvt && cuantos > 1 && <span className="text-[8px] font-black text-[#92400E]">{cuantos}</span>}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-[#E5E7EB]">
          <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
            <div className="w-5 h-5 rounded-lg" style={{ background: 'linear-gradient(135deg,#FFFBEB,#FEF3C7)' }} />
            Día con evento
          </div>
          {diaFiltro && (
            <button onClick={() => setDiaFiltro(null)} className="text-xs text-[#F5C518] font-semibold hover:underline ml-auto">
              Ver todos los eventos
            </button>
          )}
        </div>
      </div>

      {/* ── TARJETAS POR DÍA ── */}
      {grupos.length === 0 ? (
        <div className="card p-8 text-center text-[#9CA3AF]">
          <Vote className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No hay eventos {diaFiltro ? 'para este día' : 'activos'}.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grupos.map(({ key, label, items }) => (
            <div key={key}>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px flex-1 bg-[#E5E7EB]" />
                <span className="text-sm font-bold text-[#374151] whitespace-nowrap">{label}</span>
                <div className="h-px flex-1 bg-[#E5E7EB]" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {items.map(a => <TarjetaEvento key={a.id} evento={a} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TarjetaEvento({ evento: a }: { evento: EventoResumen }) {
  const estaCerrada = a.estatus === 'CERRADA' || a.estatus === 'CON_ACTA';
  const fin    = new Date(a.jornadaFin);
  const diffMs = fin.getTime() - Date.now();
  const diffH  = Math.round(diffMs / 3600000);
  const diffD  = Math.round(diffMs / 86400000);
  const tiempoRestante = diffMs < 0 ? 'Finalizado'
    : diffH < 1    ? 'Cierra pronto'
    : diffH < 24   ? `Cierra en ${diffH}h`
    : `Cierra en ${diffD}d`;

  const pct = a.totalPadron > 0 ? Math.round((a.totalVotos / a.totalPadron) * 100) : 0;

  const FRANJA: Record<string, string> = {
    ELECCION_PLANILLA:    'linear-gradient(90deg,#F5C518,#E6B800)',
    PRIORIZACION_PUNTAJE: 'linear-gradient(90deg,#818CF8,#6366F1)',
    ASAMBLEA_DELIBERATIVA:'linear-gradient(90deg,#34D399,#10B981)',
  };

  return (
    <article className={`card flex flex-col transition-all ${estaCerrada ? 'opacity-75' : 'hover:shadow-md hover:-translate-y-0.5'}`}>
      <div className="h-1.5 rounded-t-2xl" style={{ background: FRANJA[a.tipo] ?? 'linear-gradient(90deg,#9CA3AF,#6B7280)' }} />
      <div className="p-5 flex flex-col flex-1">

        {/* Badges + botones admin en la misma fila */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex flex-wrap gap-1.5">
            <span className="badge badge-gray text-xs">{TIPO_EMOJI[a.tipo]} {TIPO_LABEL[a.tipo] ?? a.tipo}</span>
            {estaCerrada
              ? <span className="badge badge-gray text-xs"><Lock className="w-3 h-3 mr-1" />Cerrada</span>
              : <span className="badge badge-success text-xs">● Abierta</span>}
          </div>
          {/* Botones admin */}
          {a.esAdmin && (
            <div className="flex items-center gap-1 shrink-0">
              <EliminarEventoBtn asambleaId={a.id} titulo={a.titulo} />
            </div>
          )}
        </div>

        <h2 className="font-extrabold text-base text-[#1A1A1A] mb-1 leading-tight">{a.titulo}</h2>
        <p className="text-xs text-[#6B7280] mb-3 flex-1 line-clamp-2">{a.descripcion}</p>

        {/* Horario */}
        <div className="flex items-center gap-2 text-xs font-medium text-[#374151] bg-[#F9FAFB] rounded-xl px-3 py-2 mb-3">
          <Clock className="w-3.5 h-3.5 text-[#F5C518] shrink-0" />
          <span>Apertura: <strong>{fmtHora12(a.jornadaInicio)}</strong></span>
          <span className="text-[#D1D5DB]">·</span>
          <span>Cierre: <strong>{fmtHora12(a.jornadaFin)}</strong></span>
          {!estaCerrada && (
            <>
              <span className="text-[#D1D5DB]">·</span>
              <span className={`font-bold ${diffMs < 3600000 ? 'text-red-600' : diffMs < 86400000 ? 'text-orange-500' : 'text-[#9CA3AF]'}`}>
                {tiempoRestante}
              </span>
            </>
          )}
        </div>

        {/* Participación — solo moderadores */}
        {a.esModerador && a.totalPadron > 0 && (
          <div className="mb-3">
            <div className="flex justify-between text-[10px] text-[#9CA3AF] mb-1">
              <span className="flex items-center gap-1"><Users className="w-3 h-3" />{a.totalVotos}/{a.totalPadron} votos</span>
              <span className="font-bold text-[#F5C518]">{pct}%</span>
            </div>
            <div className="h-1.5 bg-[#E5E7EB] rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#F5C518,#E6B800)' }} />
            </div>
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex gap-2 mt-auto">
          {estaCerrada ? (
            <>
              <Link href="/historico" className="btn-outline flex-1 justify-center btn-sm text-xs">Ver actas</Link>
              {a.esAdmin && <ReabrirDesdeListaBtn asambleaId={a.id} />}
            </>
          ) : a.tipo === 'ASAMBLEA_DELIBERATIVA' ? (
            <Link href={`/eventos/${a.id}/asamblea`} className="btn-yellow flex-1 justify-center">
              <MessageSquare className="w-4 h-4" /> Participar
            </Link>
          ) : (
            <>
              <Link href={`/eventos/${a.id}/votar`} className="btn-yellow flex-1 justify-center">
                <Vote className="w-4 h-4" /> Votar
              </Link>
              <Link href={`/eventos/${a.id}/informate`} className="btn-outline flex-1 justify-center">
                <Info className="w-4 h-4" /> Infórmate
              </Link>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
