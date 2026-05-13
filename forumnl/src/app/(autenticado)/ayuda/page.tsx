import { usuarioActual } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { ChatbotIEEPC } from './ChatbotIEEPC';

export default async function AyudaPage() {
  const usuario = await usuarioActual();
  if (!usuario) redirect('/');

  return (
    <div className="max-w-lg mx-auto">
      {/* Header de la sección */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-extrabold text-[#1A1A1A] mb-1">Asistente Virtual</h1>
        <p className="text-sm text-[#6B7280]">
          Resuelve tus dudas sobre el proceso electoral y las votaciones de tu colonia
        </p>
      </div>

      {/* Chatbot */}
      <ChatbotIEEPC nombreUsuario={usuario.nombreCompleto || 'Vecino'} />

      {/* Sección de recursos adicionales */}
      <div className="mt-10 pt-6 border-t border-[#E5E7EB]">
        <p className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF] mb-4 text-center">
          Recursos adicionales
        </p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { emoji: '📋', titulo: 'Glosario electoral', desc: 'Términos del proceso' },
            { emoji: '🏛️', titulo: 'IEEPCNL', desc: 'Qué es y cómo funciona' },
            { emoji: '🗳️', titulo: 'Cómo votar', desc: 'Guía paso a paso' },
            { emoji: '📊', titulo: 'Seguimiento', desc: 'Trazabilidad de acuerdos' },
          ].map(r => (
            <div key={r.titulo} className="card p-3 text-center">
              <span className="text-2xl block mb-1">{r.emoji}</span>
              <p className="text-xs font-bold text-[#1A1A1A] leading-tight">{r.titulo}</p>
              <p className="text-[10px] text-[#9CA3AF] mt-0.5">{r.desc}</p>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-[#9CA3AF] mt-4">
          Puedes preguntarle a FórumBot sobre cualquiera de estos temas
        </p>
      </div>
    </div>
  );
}
