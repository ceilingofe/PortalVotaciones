import Link from 'next/link';
import Image from 'next/image';
import { LogIn, UserPlus } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-gradient-to-b from-white to-ieepc-yellow/10">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-10">
          <Image
            src="/logo-ieepc.png"
            alt="Instituto Estatal Electoral y de Participación Ciudadana de Nuevo León"
            width={240}
            height={120}
            priority
            className="mb-6"
          />
          <h1 className="text-3xl font-bold text-ieepc-black tracking-tight">FórumNL</h1>
          <p className="text-ieepc-gray text-center mt-2 text-sm leading-relaxed">
            La plataforma de participación ciudadana del Instituto Estatal Electoral
            y de Participación Ciudadana de Nuevo León.
          </p>
        </div>

        <div className="card p-6 space-y-3">
          <Link href="/login" className="btn-yellow w-full justify-center">
            <LogIn className="w-5 h-5" />
            Iniciar sesión
          </Link>
          <Link href="/register" className="btn-outline w-full justify-center">
            <UserPlus className="w-5 h-5" />
            Crear cuenta
          </Link>
        </div>

        <p className="text-center text-xs text-ieepc-gray mt-6">
          Al continuar aceptas que se utilicen tus datos únicamente para
          identificarte como vecino o vecina participante.
        </p>
      </div>
    </main>
  );
}
