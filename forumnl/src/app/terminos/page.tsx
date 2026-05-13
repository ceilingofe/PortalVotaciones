import Link from 'next/link';
import { ArrowLeft, Scale } from 'lucide-react';

export default function TerminosPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="w-full py-4 px-4 flex items-center gap-3"
        style={{ background: 'linear-gradient(135deg,#F5C518,#FFD740)' }}>
        <Link href="/" className="text-[#1A1A1A] hover:opacity-70"><ArrowLeft className="w-5 h-5" /></Link>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-ieepc.png" alt="IEEPCNL" style={{ height:'36px', width:'auto', mixBlendMode:'multiply' }} />
        <div>
          <p className="font-black text-[#1A1A1A] text-sm">FórumNL</p>
          <p className="text-[10px] text-[#92400E]">Términos de Uso</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-[#FEF3C7] rounded-2xl flex items-center justify-center">
            <Scale className="w-6 h-6 text-[#F5C518]" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold">Términos de Uso</h1>
            <p className="text-sm text-[#6B7280]">FórumNL — Plataforma de Participación Ciudadana Vecinal</p>
          </div>
        </div>

        <div className="space-y-6 text-sm text-[#374151]">

          <section>
            <h2 className="text-lg font-bold text-[#1A1A1A] mb-2">1. Naturaleza y propósito de la plataforma</h2>
            <p>
              FórumNL es una herramienta digital de apoyo a la participación ciudadana comunitaria. No constituye un proceso electoral formal en los términos de la legislación federal o local aplicable a elecciones de cargos públicos. Los procesos realizados a través de FórumNL son de naturaleza interna vecinal y sus resultados tienen el valor que el propio fraccionamiento y sus reglamentos internos les confieran.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1A1A1A] mb-2">2. Elegibilidad</h2>
            <p>Puede registrarse y participar en FórumNL quien:</p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>Sea residente, propietario o arrendatario de una vivienda registrada en el Fraccionamiento Las Lomas del Sur.</li>
              <li>Sea mayor de edad (18 años o más) conforme a la legislación mexicana.</li>
              <li>Cuente con una Credencial para Votar (INE/IFE) vigente.</li>
              <li>Tenga un número de teléfono celular al que se puedan enviar SMS de verificación.</li>
            </ul>
            <p className="mt-2">La plataforma utiliza verificación de identidad biométrica (comparación de rostro con INE) para garantizar que solo personas elegibles participen en los procesos.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1A1A1A] mb-2">3. Secreto del voto y prohibición de coacción</h2>
            <div className="bg-[#F0FDF4] border border-green-200 rounded-xl p-4">
              <ul className="space-y-1">
                <li>El voto emitido a través de FórumNL es <strong>secreto, libre y personal</strong>.</li>
                <li>Está <strong>estrictamente prohibido</strong> presionar, comprar, condicionar o solicitar prueba del voto de otro usuario.</li>
                <li>Está <strong>estrictamente prohibido</strong> intentar acceder al sistema con la identidad o credenciales de otra persona.</li>
                <li>Una vez emitido, el voto es <strong>irrevocable</strong>.</li>
                <li>Cada vivienda puede emitir <strong>un solo voto</strong> por proceso, independientemente del número de residentes.</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1A1A1A] mb-2">4. Uso aceptable</h2>
            <p>El usuario se compromete a:</p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>Proporcionar información veraz y actualizada en su registro.</li>
              <li>No compartir sus credenciales de acceso con terceros.</li>
              <li>No intentar manipular, alterar o interferir con el sistema o los resultados.</li>
              <li>No utilizar la plataforma para difundir información falsa, discurso de odio o contenido que atente contra la dignidad de otros vecinos.</li>
              <li>No intentar acceder a funciones o datos más allá de los autorizados para su rol.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1A1A1A] mb-2">5. Integridad del proceso</h2>
            <p>
              El Comité Vecinal y el IEEPCNL se reservan el derecho de suspender, anular o repetir cualquier proceso cuando existan indicios fundados de irregularidades. Las actas generadas por la plataforma constituyen constancia del proceso digital, pero pueden complementarse con documentación física cuando así lo determine la asamblea vecinal o la normativa interna aplicable.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1A1A1A] mb-2">6. Limitación de responsabilidad</h2>
            <p>
              La plataforma se proporciona "tal como está" con el objetivo de facilitar la participación ciudadana comunitaria. El Comité Vecinal y el IEEPCNL no garantizan la disponibilidad ininterrumpida del servicio ni se responsabilizan por daños derivados de interrupciones técnicas ajenas a su control (fallas de internet, energía eléctrica, fuerza mayor).
            </p>
            <p className="mt-2">
              Los resultados de los procesos de votación reflejan fielmente los votos emitidos a través de la plataforma. Cualquier discrepancia debe reportarse durante el periodo de inconformidades establecido en la convocatoria correspondiente.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1A1A1A] mb-2">7. Menores de edad</h2>
            <p>
              FórumNL no está dirigida a personas menores de 18 años. Si se detecta que un menor de edad se ha registrado sin autorización, la cuenta será suspendida y los datos eliminados.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1A1A1A] mb-2">8. Legislación aplicable y jurisdicción</h2>
            <p>
              Estos términos se rigen por las leyes del estado de Nuevo León y de los Estados Unidos Mexicanos. Para cualquier controversia, las partes se someten a la jurisdicción de los tribunales competentes de Monterrey, Nuevo León, renunciando expresamente a cualquier otro fuero.
            </p>
            <p className="mt-2 text-xs text-[#6B7280]">
              Normativa relevante: Constitución Política de los Estados Unidos Mexicanos (Art. 35, 41); Ley Federal de Protección de Datos Personales en Posesión de los Particulares; Ley Electoral del Estado de Nuevo León; lineamientos del IEEPCNL para mecanismos de participación ciudadana.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1A1A1A] mb-2">9. Contacto</h2>
            <p>
              Para dudas, ejercicio de derechos ARCO o reportes de irregularidades:<br />
              <strong>Correo:</strong> privacidad@forumnl.mx<br />
              <strong>Comité Vecinal:</strong> presentarse en las oficinas del fraccionamiento en horario de atención.
            </p>
          </section>
        </div>

        <div className="mt-8 pt-6 border-t border-[#E5E7EB] flex flex-wrap gap-4 justify-center">
          <Link href="/privacidad" className="text-sm text-[#F5C518] font-semibold hover:underline">
            Aviso de Privacidad
          </Link>
          <Link href="/" className="text-sm text-[#F5C518] font-semibold hover:underline flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Volver al inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
