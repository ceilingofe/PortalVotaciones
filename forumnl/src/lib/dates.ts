/**
 * Utilidades de formato de fecha — FórumNL
 * Siempre DD/MM/AAAA independiente del locale del navegador/SO.
 */

const DIAS   = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const MESES  = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function parse(f: Date | string | null | undefined): Date {
  if (!f) return new Date(0);
  return typeof f === 'string' ? new Date(f) : f;
}

/** 12/05/2026 */
export function fmtFecha(f: Date | string | null | undefined): string {
  const d = parse(f);
  const dd  = String(d.getDate()).padStart(2, '0');
  const mm  = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

/** 12/05/2026 14:30 */
export function fmtFechaHora(f: Date | string | null | undefined): string {
  const d = parse(f);
  const dd  = String(d.getDate()).padStart(2, '0');
  const mm  = String(d.getMonth() + 1).padStart(2, '0');
  const hh  = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()} ${hh}:${min}`;
}

/** 14:30 */
export function fmtHora(f: Date | string | null | undefined): string {
  const d = parse(f);
  const hh  = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${min}`;
}

/** "2:30 p.m." */
export function fmtHora12(f: Date | string | null | undefined): string {
  const d = parse(f);
  let h = d.getHours();
  const min = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'p.m.' : 'a.m.';
  h = h % 12 || 12;
  return `${h}:${min} ${ampm}`;
}

/** "Lunes 12 de Mayo de 2026" */
export function fmtDiaLargo(f: Date | string | null | undefined): string {
  const d = parse(f);
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

/** "12 de Mayo" */
export function fmtDiaCorto(f: Date | string | null | undefined): string {
  const d = parse(f);
  return `${d.getDate()} de ${MESES[d.getMonth()]}`;
}

/** Clave "yyyy-mm-dd" para agrupar por día */
export function fmtClaveDia(f: Date | string | null | undefined): string {
  const d = parse(f);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Convierte ISO "yyyy-mm-dd" a mostrable "DD/MM/AAAA" */
export function isoADisplay(iso: string): string {
  if (!iso) return '';
  const [yyyy, mm, dd] = iso.split('-');
  return `${dd}/${mm}/${yyyy}`;
}

/** Convierte datetime-local value "yyyy-MM-ddTHH:mm" a ISO full */
export function localInputAIso(v: string): string {
  return v ? new Date(v).toISOString() : '';
}
