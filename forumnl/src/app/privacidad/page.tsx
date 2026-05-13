import Link from 'next/link';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

export default function PrivacidadPage() {
  const fechaActualizacion = '13 de mayo de 2026';

  return (
    <main className="min-h-screen bg-white">
      {/* Encabezado */}
      <div className="w-full py-4 px-4 flex items-center gap-3"
        style={{ background: 'linear-gradient(135deg,#F5C518,#FFD740)' }}>
        <Link href="/" className="text-[#1A1A1A] hover:opacity-70">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-ieepc.png" alt="IEEPCNL" style={{ height:'36px', width:'auto', mixBlendMode:'multiply' }} />
        <div>
          <p className="font-black text-[#1A1A1A] text-sm">FórumNL</p>
          <p className="text-[10px] text-[#92400E]">Aviso de Privacidad</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-[#FEF3C7] rounded-2xl flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-[#F5C518]" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-[#1A1A1A]">Aviso de Privacidad</h1>
            <p className="text-sm text-[#6B7280]">Última actualización: {fechaActualizacion}</p>
          </div>
        </div>

        {/* Caja de resumen ejecutivo */}
        <div className="bg-[#FFFBEB] border border-[#F5C518] rounded-2xl p-5 mb-8">
          <p className="text-sm font-semibold text-[#92400E] mb-2">Resumen ejecutivo</p>
          <ul className="text-sm text-[#374151] space-y-1">
            <li>• Recopilamos tu nombre, teléfono, CURP, domicilio y datos biométricos <strong>únicamente</strong> para validar tu participación como vecino.</li>
            <li>• Tu voto es <strong>secreto e irrastreable</strong>: se almacena sin ningún vínculo a tu identidad.</li>
            <li>• <strong>No vendemos</strong> ni cedemos tus datos a terceros con fines comerciales.</li>
            <li>• Puedes ejercer tus derechos ARCO en cualquier momento.</li>
          </ul>
        </div>

        <div className="prose prose-sm max-w-none space-y-6 text-[#374151]">

          <section>
            <h2 className="text-lg font-bold text-[#1A1A1A] mb-2">I. Identidad y domicilio del responsable</h2>
            <p>
              El responsable del tratamiento de sus datos personales es el <strong>Comité Vecinal del Fraccionamiento Las Lomas del Sur</strong>, en coordinación con el <strong>Instituto Estatal Electoral y de Participación Ciudadana de Nuevo León (IEEPCNL)</strong>, con domicilio en Monterrey, Nuevo León, México.
            </p>
            <p className="mt-2">
              La plataforma digital <strong>FórumNL</strong> es operada como herramienta tecnológica de apoyo a los procesos de participación ciudadana comunitaria regulados por el marco normativo aplicable en el estado de Nuevo León.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1A1A1A] mb-2">II. Datos personales que se recaban</h2>
            <p>Para el cumplimiento de las finalidades señaladas, recabamos las siguientes categorías de datos:</p>
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-[#1A1A1A] text-white">
                    <th className="text-left px-3 py-2 rounded-tl-lg">Categoría</th>
                    <th className="text-left px-3 py-2">Datos</th>
                    <th className="text-left px-3 py-2 rounded-tr-lg">Sensible</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Identificación', 'Nombre completo, CURP, fecha de nacimiento, sexo', 'No'],
                    ['Contacto', 'Número de teléfono celular', 'No'],
                    ['Domicilio', 'Dirección registrada en INE (colonia, municipio)', 'No'],
                    ['Biométricos', 'Imagen del rostro (facial embedding / descriptor numérico derivado de la foto de INE y selfie)', 'Sí — datos especialmente protegidos'],
                    ['Participación', 'Folios anónimos de votación, asistencia a asambleas', 'No'],
                  ].map(([cat, datos, sens]) => (
                    <tr key={cat} className="border-b border-[#E5E7EB]">
                      <td className="px-3 py-2 font-semibold">{cat}</td>
                      <td className="px-3 py-2">{datos}</td>
                      <td className={`px-3 py-2 text-xs font-semibold ${sens==='No'?'text-green-700':'text-orange-700'}`}>{sens}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1A1A1A] mb-2">III. Datos biométricos — tratamiento especial</h2>
            <p>
              De conformidad con el artículo 9 de la <strong>Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP)</strong> y los lineamientos del INAI aplicables, los datos biométricos constituyen <em>datos personales sensibles</em> que gozan de protección especial.
            </p>
            <p className="mt-2">Respecto al tratamiento biométrico en FórumNL:</p>
            <ul className="list-disc list-inside space-y-1 mt-2 text-sm">
              <li>La imagen de la INE es procesada <strong>localmente en su navegador</strong> (client-side) para extraer un descriptor matemático (vector numérico de 128 dimensiones). La imagen original no se transmite ni almacena en ningún servidor.</li>
              <li>Solo se almacena el descriptor numérico derivado, que no permite reconstruir la imagen original del rostro.</li>
              <li>El descriptor se utiliza exclusivamente para verificar que la persona que inicia sesión es la misma que realizó el registro.</li>
              <li>No se realizan transferencias de datos biométricos a terceros.</li>
              <li>El titular puede solicitar la eliminación del descriptor en cualquier momento ejerciendo su derecho de cancelación.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1A1A1A] mb-2">IV. Finalidades del tratamiento</h2>
            <p><strong>Finalidades primarias (necesarias para la prestación del servicio):</strong></p>
            <ul className="list-disc list-inside space-y-1 mt-2 text-sm">
              <li>Validar la identidad del vecino participante y su elegibilidad para votar.</li>
              <li>Garantizar el principio de <em>una vivienda, un voto</em> en los procesos comunitarios.</li>
              <li>Generar el padrón de participantes para cada proceso de votación o asamblea.</li>
              <li>Emitir y custodiar actas oficiales de los procesos de participación ciudadana.</li>
              <li>Dar seguimiento a los acuerdos comunitarios adoptados.</li>
            </ul>
            <p className="mt-3"><strong>Finalidades secundarias (requieren su consentimiento expreso):</strong></p>
            <ul className="list-disc list-inside space-y-1 mt-2 text-sm">
              <li>Enviar notificaciones SMS sobre nuevos procesos de votación o asambleas.</li>
              <li>Generar estadísticas agregadas de participación ciudadana para reportes del IEEPCNL.</li>
            </ul>
            <p className="mt-2 text-xs text-[#6B7280]">
              Puede revocar su consentimiento para finalidades secundarias enviando un correo a privacidad@forumnl.mx en cualquier momento.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1A1A1A] mb-2">V. Secreto e inviolabilidad del voto</h2>
            <div className="bg-[#F0FDF4] border border-green-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-green-800 mb-2">Garantía de voto secreto</p>
              <p className="text-sm text-green-700">
                FórumNL está diseñado de manera que <strong>ninguna persona</strong> — ni el administrador del sistema, ni el comité vecinal, ni el IEEPCNL — puede asociar un voto emitido con la identidad de quien lo emitió. Cada voto se registra vinculado únicamente a un <em>folio anónimo</em> generado aleatoriamente, sin ninguna referencia al usuario que lo emitió. Esta arquitectura cumple con el principio constitucional de secreto del voto establecido en el artículo 41 de la Constitución Política de los Estados Unidos Mexicanos y con los estándares del IEEPCNL para procesos de participación ciudadana.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1A1A1A] mb-2">VI. Transferencia de datos</h2>
            <p>Sus datos personales <strong>no serán transferidos</strong> a terceros sin su consentimiento, salvo en los siguientes casos previstos por la ley:</p>
            <ul className="list-disc list-inside space-y-1 mt-2 text-sm">
              <li>Cuando sea requerido por autoridad competente mediante orden judicial o administrativa.</li>
              <li>Al IEEPCNL, para efectos de supervisión y validación de los procesos de participación ciudadana comunitaria, exclusivamente en forma de datos estadísticos agregados y sin identificadores personales.</li>
              <li>A proveedores de servicios tecnológicos (Supabase — almacenamiento cifrado; Twilio — envío de SMS) con los que se han suscrito contratos de confidencialidad y tratamiento de datos conforme a la LFPDPPP. Estos actúan como encargados del tratamiento, no como responsables autónomos.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1A1A1A] mb-2">VII. Derechos ARCO</h2>
            <p>Como titular de datos personales, tiene derecho a:</p>
            <div className="grid grid-cols-2 gap-3 mt-3">
              {[
                { letra:'A', nombre:'Acceso', desc:'Conocer qué datos personales tenemos de usted y cómo los usamos.' },
                { letra:'R', nombre:'Rectificación', desc:'Corregir datos inexactos o incompletos.' },
                { letra:'C', nombre:'Cancelación', desc:'Solicitar la supresión de sus datos cuando ya no sean necesarios.' },
                { letra:'O', nombre:'Oposición', desc:'Oponerse al tratamiento de sus datos para finalidades específicas.' },
              ].map(({ letra, nombre, desc }) => (
                <div key={letra} className="bg-[#F9FAFB] rounded-xl p-3 border border-[#E5E7EB]">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-7 h-7 bg-[#F5C518] text-[#1A1A1A] rounded-full flex items-center justify-center font-black text-sm">{letra}</span>
                    <span className="font-semibold text-sm">{nombre}</span>
                  </div>
                  <p className="text-xs text-[#6B7280]">{desc}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-sm">
              Para ejercer sus derechos ARCO, envíe una solicitud a <strong>privacidad@forumnl.mx</strong> o presente su solicitud ante el Comité Vecinal en las oficinas del fraccionamiento. Responderemos en un plazo máximo de 20 días hábiles.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1A1A1A] mb-2">VIII. Medidas de seguridad</h2>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Transmisión de datos mediante HTTPS/TLS en todo momento.</li>
              <li>Contraseñas y tokens almacenados mediante hashing criptográfico irreversible.</li>
              <li>Sesiones autenticadas mediante JWT firmados con clave secreta rotada periódicamente.</li>
              <li>Control de acceso por roles: los vecinos no pueden ver datos de otros vecinos.</li>
              <li>Los descriptores biométricos se almacenan en formato binario cifrado, sin posibilidad de reconstruir la imagen original.</li>
              <li>Códigos SMS de un solo uso con vigencia de 5 minutos.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1A1A1A] mb-2">IX. Conservación de datos</h2>
            <p className="text-sm">
              Los datos personales se conservarán durante el tiempo que sea necesario para cumplir con las finalidades del tratamiento y con las obligaciones legales aplicables. Los registros de participación (actas, folios anónimos) se conservan por un mínimo de 5 años conforme a la normativa electoral local. Los datos biométricos se eliminarán a solicitud del titular o al término de la relación con el fraccionamiento.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1A1A1A] mb-2">X. Cambios al aviso de privacidad</h2>
            <p className="text-sm">
              El presente aviso puede ser modificado. Cualquier cambio sustancial será notificado mediante mensaje SMS y estará disponible en esta página. Si continúa utilizando FórumNL después de la notificación, se entenderá que acepta los cambios.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1A1A1A] mb-2">XI. Autoridad supervisora</h2>
            <p className="text-sm">
              Si considera que sus derechos no han sido atendidos adecuadamente, puede acudir al <strong>Instituto Nacional de Transparencia, Acceso a la Información y Protección de Datos Personales (INAI)</strong>, www.inai.org.mx, o al <strong>IEEPCNL</strong>, www.ieepcnl.mx.
            </p>
          </section>

        </div>

        <div className="mt-8 pt-6 border-t border-[#E5E7EB] text-center">
          <p className="text-xs text-[#9CA3AF]">
            FórumNL — Plataforma de Participación Ciudadana Vecinal<br />
            Instituto Estatal Electoral y de Participación Ciudadana de Nuevo León<br />
            Versión {fechaActualizacion}
          </p>
          <Link href="/" className="inline-flex items-center gap-2 mt-4 text-sm text-[#F5C518] font-semibold hover:underline">
            <ArrowLeft className="w-4 h-4" /> Volver al inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
