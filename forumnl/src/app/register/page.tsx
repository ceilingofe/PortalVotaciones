'use client';

import { useRouter } from 'next/navigation';
import { FormularioTelefono } from '@/components/FormularioTelefono';

export default function RegisterPage() {
  const router = useRouter();

  function handleSuccess(data: any) {
    if (data.regToken) {
      // Guardar regToken para el siguiente paso (onboarding biométrico)
      sessionStorage.setItem('forumnl_reg_token', data.regToken);
      router.push('/onboarding');
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-gradient-to-b from-white to-ieepc-yellow/10">
      <FormularioTelefono modo="registro" onSuccess={handleSuccess} />
    </main>
  );
}
