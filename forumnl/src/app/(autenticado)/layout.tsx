import { usuarioActual } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { AppHeader } from '@/components/AppHeader';
import { AccesibilidadBtn } from '@/components/AccesibilidadBtn';

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const usuario = await usuarioActual();

  // Solo redirigir si no hay sesión válida
  if (!usuario) redirect('/login');

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col">
      <AppHeader usuario={{ nombre: usuario.nombreCompleto || 'Usuario', rol: usuario.rol }} />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 pb-20">
        {children}
      </main>
      <AccesibilidadBtn />
    </div>
  );
}
