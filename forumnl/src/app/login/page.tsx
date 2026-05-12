'use client';

import { useRouter } from 'next/navigation';
import { FormularioTelefono } from '@/components/FormularioTelefono';

export default function LoginPage() {
  const router = useRouter();
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-gradient-to-b from-white to-ieepc-yellow/10">
      <FormularioTelefono modo="login" onSuccess={() => router.push('/home')} />
    </main>
  );
}
