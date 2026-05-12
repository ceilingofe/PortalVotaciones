import { redirect } from 'next/navigation';
import { usuarioActual } from '@/lib/auth/session';
import { AppHeader } from '@/components/AppHeader';
import { NavBar } from '@/components/NavBar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const usuario = await usuarioActual();
  if (!usuario) redirect('/');

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader usuario={{ nombre: usuario.nombreCompleto, rol: usuario.rol }} />
      <NavBar />
      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
