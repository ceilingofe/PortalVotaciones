'use client';

const MESES = [
  { v: '01', l: 'Enero' }, { v: '02', l: 'Febrero' }, { v: '03', l: 'Marzo' },
  { v: '04', l: 'Abril' }, { v: '05', l: 'Mayo' }, { v: '06', l: 'Junio' },
  { v: '07', l: 'Julio' }, { v: '08', l: 'Agosto' }, { v: '09', l: 'Septiembre' },
  { v: '10', l: 'Octubre' }, { v: '11', l: 'Noviembre' }, { v: '12', l: 'Diciembre' },
];

interface Props {
  /** Valor en formato ISO: "yyyy-mm-dd" o "" */
  value: string;
  onChange: (iso: string) => void;
  disabled?: boolean;
}

export function DateInputDMY({ value, onChange, disabled }: Props) {
  // Parsear desde ISO
  const parts = value ? value.split('-') : ['', '', ''];
  const yyyy = parts[0] ?? '';
  const mm   = parts[1] ?? '';
  const dd   = parts[2] ?? '';

  function update(newDd: string, newMm: string, newYyyy: string) {
    const d = newDd.padStart(2, '0');
    const m = newMm.padStart(2, '0');
    if (d && m && newYyyy && newYyyy.length === 4) {
      onChange(`${newYyyy}-${m}-${d}`);
    } else {
      // Si no está completo aún, limpiar el valor
      onChange('');
    }
  }

  return (
    <div className="flex gap-2">
      {/* Día */}
      <input
        type="number"
        min={1}
        max={31}
        disabled={disabled}
        placeholder="DD"
        value={dd ? parseInt(dd, 10).toString() : ''}
        onChange={(e) => update(e.target.value, mm, yyyy)}
        className="input w-20 text-center font-mono"
      />

      {/* Mes */}
      <select
        disabled={disabled}
        value={mm}
        onChange={(e) => update(dd, e.target.value, yyyy)}
        className="input flex-1"
      >
        <option value="">Mes</option>
        {MESES.map((m) => (
          <option key={m.v} value={m.v}>{m.l}</option>
        ))}
      </select>

      {/* Año */}
      <input
        type="number"
        min={1900}
        max={new Date().getFullYear()}
        disabled={disabled}
        placeholder="AAAA"
        value={yyyy || ''}
        onChange={(e) => update(dd, mm, e.target.value)}
        className="input w-24 text-center font-mono"
      />
    </div>
  );
}
