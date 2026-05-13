'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, CheckCircle2, Upload, Camera } from 'lucide-react';
import { PhoneInput } from '@/components/PhoneInput';
import { DateInputDMY } from '@/components/DateInputDMY';

type Paso = 'instrucciones'|'cargando'|'ine_actual'|'ine_nuevo'|'datos'|'selfie'|'enviando'|'exito'|'error';
const FA_CDN  = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js';
const WEIGHTS = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights';

function loadScript(src: string): Promise<void> {
  return new Promise((res,rej)=>{ if(document.querySelector(`script[src="${src}"]`)){res();return;} const s=document.createElement('script');s.src=src;s.async=true;s.onload=()=>res();s.onerror=()=>rej();document.head.appendChild(s); });
}
async function fileToCanvas(file: File): Promise<HTMLCanvasElement> {
  return new Promise((res,rej)=>{ const img=new window.Image(); img.onload=()=>{const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;c.getContext('2d')!.drawImage(img,0,0);URL.revokeObjectURL(img.src);res(c);}; img.onerror=()=>rej(); img.src=URL.createObjectURL(file); });
}
async function detectarDescriptor(canvas: HTMLCanvasElement): Promise<Float32Array|null> {
  const fa=(window as any).faceapi;
  for (const t of [0.20,0.15,0.10]) {
    const d=await fa.detectSingleFace(canvas,new fa.TinyFaceDetectorOptions({inputSize:512,scoreThreshold:t})).withFaceLandmarks().withFaceDescriptor();
    if (d) return d.descriptor as Float32Array;
  }
  return null;
}

export default function ActualizarVotantePage() {
  const [paso, setPaso]    = useState<Paso>('instrucciones');
  const [error, setError]  = useState<string|null>(null);
  const [descActual, setDescActual]  = useState<Float32Array|null>(null);
  const [descNuevo,  setDescNuevo]   = useState<Float32Array|null>(null);
  const [datos, setDatos]  = useState({telefono:'',nombre:'',curp:'',fechaNac:'',sexo:''});
  const videoRef  = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream|null>(null);

  async function iniciar() {
    setPaso('cargando');
    try {
      await loadScript(FA_CDN);
      const fa=(window as any).faceapi;
      await fa.nets.tinyFaceDetector.loadFromUri(WEIGHTS);
      await fa.nets.faceLandmark68Net.loadFromUri(WEIGHTS);
      await fa.nets.faceRecognitionNet.loadFromUri(WEIGHTS);
      setPaso('ine_actual');
    } catch { setError('No se pudieron cargar los modelos.'); setPaso('error'); }
  }

  async function subirIne(tipo: 'actual'|'nuevo', file: File) {
    const canvas=await fileToCanvas(file).catch(()=>null);
    if (!canvas) { setError('No se pudo leer la imagen.'); return; }
    const desc=await detectarDescriptor(canvas);
    if (!desc) { setError('No se detectó rostro en la INE. Sube una foto clara del frente.'); return; }
    if (tipo==='actual') { setDescActual(desc); setPaso('ine_nuevo'); }
    else { setDescNuevo(desc); setPaso('datos'); }
    setError(null);
  }

  async function activarCamara() {
    const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'},audio:false});
    streamRef.current=s;
    if (videoRef.current) { videoRef.current.srcObject=s; videoRef.current.onloadedmetadata=()=>videoRef.current!.play(); }
  }

  async function finalizarConSelfie() {
    const video=videoRef.current; if (!video) return;
    streamRef.current?.getTracks().forEach(t=>t.stop());
    setPaso('enviando');
    const canvas=document.createElement('canvas'); canvas.width=video.videoWidth; canvas.height=video.videoHeight;
    const ctx=canvas.getContext('2d')!; ctx.translate(canvas.width,0); ctx.scale(-1,1); ctx.drawImage(video,0,0);
    const fa=(window as any).faceapi;
    const selfieDet=await fa.detectSingleFace(canvas,new fa.TinyFaceDetectorOptions({inputSize:320,scoreThreshold:0.45})).withFaceLandmarks().withFaceDescriptor();
    if (!selfieDet) { setError('No se detectó tu rostro en la selfie.'); setPaso('selfie'); return; }
    const dist=fa.euclideanDistance(descNuevo,selfieDet.descriptor);
    if (dist>=0.62) { setError(`Tu selfie no coincide con la INE del nuevo apoderado (dist: ${dist.toFixed(2)}).`); setPaso('selfie'); return; }
    try {
      const r=await fetch('/api/auth/actualizar-votante',{method:'POST',headers:{'content-type':'application/json'},
        body:JSON.stringify({descriptorActual:Array.from(descActual!),descriptorNuevoIne:Array.from(descNuevo!),descriptorNuevoSelfie:Array.from(selfieDet.descriptor as Float32Array),datos:{telefono:datos.telefono,nombreCompleto:datos.nombre,curp:datos.curp,fechaNacimiento:datos.fechaNac,sexo:datos.sexo}})});
      const j=await r.json();
      if (!j.ok) { setError(j.message||'Error al actualizar.'); setPaso('error'); return; }
      setPaso('exito');
    } catch { setError('Error de red.'); setPaso('error'); }
  }

  const FileInput = ({tipo,label}:{tipo:'actual'|'nuevo',label:string}) => (
    <label className="btn-yellow w-full py-3.5 font-bold flex items-center justify-center gap-2 cursor-pointer">
      <Upload className="w-5 h-5"/>{label}
      <input type="file" accept="image/*" className="hidden" onChange={async e=>{const f=e.target.files?.[0];if(f){e.target.value='';await subirIne(tipo,f);}}}/>
    </label>
  );

  return (
    <main className="min-h-screen bg-white">
      <div className="w-full py-4 px-4 flex items-center gap-3" style={{background:'linear-gradient(135deg,#F5C518,#FFD740)'}}>
        <Link href="/register" className="text-[#1A1A1A] hover:opacity-70"><ArrowLeft className="w-5 h-5"/></Link>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-ieepc.png" alt="IEEPCNL" style={{height:'36px',width:'auto',mixBlendMode:'multiply'}}/>
        <span className="font-black text-[#1A1A1A]">Actualizar votante de la vivienda</span>
      </div>
      <div className="max-w-md mx-auto px-4 py-8">
        {error&&<div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 mb-4">{error} <button className="ml-2 underline text-xs" onClick={()=>setError(null)}>×</button></div>}

        {paso==='instrucciones'&&(
          <div className="card p-6 text-center">
            <div className="text-5xl mb-4">🔄</div>
            <h1 className="text-xl font-extrabold mb-2">Actualizar apoderado de vivienda</h1>
            <p className="text-sm text-[#6B7280] mb-6">Proceso para cambiar quién representa a tu vivienda en las votaciones.</p>
            <div className="space-y-2 text-left text-sm mb-6">
              {['Foto de INE del apoderado actual (verificación)','Foto de INE del nuevo apoderado','Datos del nuevo apoderado','Selfie del nuevo apoderado'].map((s,i)=>(
                <div key={i} className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#F5C518] text-[#1A1A1A] font-bold text-xs flex items-center justify-center shrink-0">{i+1}</span>
                  <span>{s}</span>
                </div>
              ))}
            </div>
            <button onClick={iniciar} className="btn-yellow w-full py-3.5 font-bold">Comenzar</button>
          </div>
        )}

        {paso==='cargando'&&<div className="card p-10 text-center"><Loader2 className="w-10 h-10 animate-spin text-[#F5C518] mx-auto mb-4"/><p>Cargando modelos de reconocimiento...</p></div>}

        {paso==='ine_actual'&&(
          <div className="card p-6">
            <h2 className="text-lg font-extrabold mb-2">Paso 1: INE del apoderado actual</h2>
            <p className="text-sm text-[#6B7280] mb-4">Sube el frente de la INE de quien está actualmente registrado en la vivienda.</p>
            <FileInput tipo="actual" label="Subir INE del apoderado actual"/>
          </div>
        )}

        {paso==='ine_nuevo'&&(
          <div className="card p-6">
            <h2 className="text-lg font-extrabold mb-2">Paso 2: INE del nuevo apoderado</h2>
            <p className="text-sm text-[#6B7280] mb-4">Sube el frente de la INE de la persona que será el nuevo representante.</p>
            <FileInput tipo="nuevo" label="Subir INE del nuevo apoderado"/>
          </div>
        )}

        {paso==='datos'&&(
          <div className="card p-6">
            <h2 className="text-lg font-extrabold mb-2">Paso 3: Datos del nuevo apoderado</h2>
            <div className="space-y-4 mb-5">
              <div><label className="label">Nombre completo *</label><input type="text" className="input" value={datos.nombre} onChange={e=>setDatos(d=>({...d,nombre:e.target.value}))} placeholder="Como aparece en la INE"/></div>
              <div><label className="label">Teléfono *</label><PhoneInput value={datos.telefono} onChange={v=>setDatos(d=>({...d,telefono:v}))}/></div>
              <div><label className="label">CURP</label><input type="text" className="input font-mono" value={datos.curp} onChange={e=>setDatos(d=>({...d,curp:e.target.value.toUpperCase()}))} placeholder="18 caracteres"/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Fecha nacimiento</label><DateInputDMY value={datos.fechaNac} onChange={v=>setDatos(d=>({...d,fechaNac:v}))}/></div>
                <div><label className="label">Sexo</label>
                  <select className="input" value={datos.sexo} onChange={e=>setDatos(d=>({...d,sexo:e.target.value}))}>
                    <option value="">— Seleccionar —</option>
                    <option>Hombre</option><option>Mujer</option>
                    <option value="No binario">No binario</option>
                    <option value="Prefiero no responder">Prefiero no responder</option>
                  </select>
                </div>
              </div>
            </div>
            <button disabled={!datos.nombre||!datos.telefono} onClick={()=>setPaso('selfie')} className="btn-yellow w-full py-3.5 font-bold">Continuar →</button>
          </div>
        )}

        {paso==='selfie'&&(
          <div className="card overflow-hidden">
            <div className="p-5"><h2 className="text-lg font-extrabold mb-1">Paso 4: Selfie del nuevo apoderado</h2><p className="text-sm text-[#6B7280] mb-3">El nuevo apoderado debe tomar su foto frente a la cámara.</p></div>
            <div className="relative bg-[#111] mx-5 rounded-2xl overflow-hidden" style={{aspectRatio:'4/3'}}>
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" style={{transform:'scaleX(-1)'}}/>
            </div>
            <div className="p-5 space-y-3">
              <button onClick={activarCamara} className="btn-outline w-full justify-center"><Camera className="w-4 h-4"/> Activar cámara</button>
              <button onClick={finalizarConSelfie} className="btn-yellow w-full py-3.5 font-bold">📸 Tomar selfie y actualizar</button>
            </div>
          </div>
        )}

        {paso==='enviando'&&<div className="card p-10 text-center"><Loader2 className="w-12 h-12 animate-spin text-[#F5C518] mx-auto mb-4"/><p className="font-bold">Verificando y actualizando...</p></div>}

        {paso==='exito'&&(
          <div className="card p-10 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4"/>
            <h2 className="text-2xl font-extrabold mb-2">Apoderado actualizado</h2>
            <p className="text-[#6B7280] mb-6">El nuevo representante puede iniciar sesión con su número de teléfono.</p>
            <Link href="/login" className="btn-yellow px-8 py-3">Ir al inicio de sesión →</Link>
          </div>
        )}

        {paso==='error'&&(
          <div className="card p-8 text-center">
            <p className="text-red-600 font-semibold mb-4">{error}</p>
            <button onClick={()=>{setError(null);setPaso('instrucciones');}} className="btn-yellow px-6 py-3">Reintentar desde el inicio</button>
          </div>
        )}
      </div>
    </main>
  );
}
