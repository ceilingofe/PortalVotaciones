'use client';

import { useState } from 'react';
import { Plus, MapPin, Camera, Loader2 } from 'lucide-react';

const CATEGORIAS = {
  SEGURIDAD: { label: 'Seguridad', emoji: '🛡️' },
  AGUA_DRENAJE: { label: 'Agua y drenaje', emoji: '💧' },
  PARQUES: { label: 'Parques', emoji: '🌳' },
  BANQUETAS: { label: 'Banquetas', emoji: '🚶' },
  ALUMBRADO: { label: 'Alumbrado', emoji: '💡' },
  BASURA: { label: 'Basura', emoji: '🗑️' },
  OTROS: { label: 'Otros', emoji: '📌' },
};

interface Reporte {
  id: string;
  categoria: keyof typeof CATEGORIAS;
  titulo: string;
  descripcion: string;
  imagenPath: string | null;
  ubicacionLat: number | null;
  ubicacionLng: number | null;
  estatus: string;
  autor: string;
  createdAt: string;
}

export function ReportesCliente({ reportesIniciales }: { reportesIniciales: Reporte[] }) {
  const [reportes, setReportes] = useState(reportesIniciales);
  const [modal, setModal] = useState(false);

  function onNuevo(r: Reporte) {
    setReportes([r, ...reportes]);
    setModal(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reportes ciudadanos</h1>
          <p className="text-sm text-ieepc-gray">Reporta problemas de tu fraccionamiento</p>
        </div>
        <button onClick={() => setModal(true)} className="btn-yellow">
          <Plus className="w-4 h-4" /> Nuevo reporte
        </button>
      </div>

      {reportes.length === 0 ? (
        <div className="card p-8 text-center text-ieepc-gray">Aún no hay reportes. ¡Sé el primero en reportar algo!</div>
      ) : (
        <div className="grid gap-3">
          {reportes.map((r) => (
            <article key={r.id} className="card p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0">{CATEGORIAS[r.categoria].emoji}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{r.titulo}</h3>
                    <span className={`badge ${
                      r.estatus === 'RESUELTO' ? 'badge-success' :
                      r.estatus === 'CONVERTIDO_A_VOTACION' ? 'badge-yellow' :
                      'badge-gray'
                    }`}>
                      {r.estatus === 'ABIERTO' ? 'Abierto' :
                       r.estatus === 'EN_PROCESO' ? 'En proceso' :
                       r.estatus === 'CONVERTIDO_A_VOTACION' ? 'En votación' :
                       r.estatus === 'RESUELTO' ? 'Resuelto' : 'Cerrado'}
                    </span>
                  </div>
                  <p className="text-sm text-ieepc-gray mb-2">{r.descripcion}</p>
                  <div className="flex items-center gap-3 text-xs text-ieepc-gray">
                    <span>Por {r.autor}</span>
                    <span>•</span>
                    <span>{CATEGORIAS[r.categoria].label}</span>
                    {r.ubicacionLat && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Ubicación</span>}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {modal && <ModalNuevoReporte onCerrar={() => setModal(false)} onCreado={onNuevo} />}
    </div>
  );
}

function ModalNuevoReporte({ onCerrar, onCreado }: { onCerrar: () => void; onCreado: (r: Reporte) => void }) {
  const [categoria, setCategoria] = useState<keyof typeof CATEGORIAS>('OTROS');
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [imagen, setImagen] = useState<File | null>(null);
  const [ubicacion, setUbicacion] = useState<{ lat: number; lng: number } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pedirUbicacion() {
    if (!navigator.geolocation) { setError('Tu navegador no soporta geolocalización.'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => setUbicacion({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setError('No se pudo obtener tu ubicación.')
    );
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('categoria', categoria);
      fd.append('titulo', titulo);
      fd.append('descripcion', descripcion);
      if (imagen) fd.append('imagen', imagen);
      if (ubicacion) {
        fd.append('lat', ubicacion.lat.toString());
        fd.append('lng', ubicacion.lng.toString());
      }
      const r = await fetch('/api/reportes', { method: 'POST', body: fd });
      const j = await r.json();
      if (!r.ok || !j.ok) { setError(j.message || 'No se pudo crear el reporte.'); return; }
      onCreado(j.reporte);
    } catch (e: any) {
      setError(e?.message || 'Error de red.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onCerrar}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={enviar} className="card p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold mb-4">Nuevo reporte</h2>

        {error && <div className="bg-red-50 border border-red-200 text-red-800 p-2 rounded text-sm mb-3">{error}</div>}

        <div className="space-y-3">
          <div>
            <label className="label">Categoría</label>
            <select value={categoria} onChange={(e) => setCategoria(e.target.value as any)} className="input">
              {Object.entries(CATEGORIAS).map(([key, v]) => (
                <option key={key} value={key}>{v.emoji} {v.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Título</label>
            <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} className="input" required maxLength={100} />
          </div>
          <div>
            <label className="label">Descripción</label>
            <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className="input min-h-[80px]" required maxLength={500} />
          </div>
          <div>
            <label className="label flex items-center gap-2">
              <Camera className="w-4 h-4" /> Foto (opcional)
            </label>
            <input type="file" accept="image/*" onChange={(e) => setImagen(e.target.files?.[0] || null)} className="text-sm" />
          </div>
          <div>
            <label className="label flex items-center gap-2">
              <MapPin className="w-4 h-4" /> Ubicación (opcional)
            </label>
            {ubicacion ? (
              <div className="text-xs text-green-700 flex items-center gap-2">
                ✓ Ubicación adjunta ({ubicacion.lat.toFixed(4)}, {ubicacion.lng.toFixed(4)})
                <button type="button" onClick={() => setUbicacion(null)} className="text-red-600 underline">quitar</button>
              </div>
            ) : (
              <button type="button" onClick={pedirUbicacion} className="btn-outline text-xs">Compartir mi ubicación</button>
            )}
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button type="button" onClick={onCerrar} className="btn-outline flex-1 justify-center">Cancelar</button>
          <button type="submit" disabled={enviando || !titulo || !descripcion} className="btn-yellow flex-1 justify-center">
            {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar'}
          </button>
        </div>
      </form>
    </div>
  );
}
