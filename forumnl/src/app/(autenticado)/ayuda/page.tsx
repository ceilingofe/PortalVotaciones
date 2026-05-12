import { Headphones } from 'lucide-react';

export default function AyudaPage() {
  return (
    <div className="card p-10 text-center max-w-md mx-auto">
      <Headphones className="w-12 h-12 mx-auto mb-4 text-ieepc-gray" />
      <h1 className="text-xl font-bold mb-2">Ayuda</h1>
      <p className="text-ieepc-gray text-sm">
        Próximamente: asistente virtual para guiarte en el uso de FórumNL y resolver dudas sobre tu participación.
      </p>
      <p className="text-xs text-ieepc-gray mt-4">
        Mientras tanto, escríbenos a <a href="mailto:contacto@ieepcnl.mx" className="text-ieepc-yellow-dark underline">contacto@ieepcnl.mx</a>
      </p>
    </div>
  );
}
