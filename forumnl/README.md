# FórumNL

Plataforma de participación ciudadana vecinal del **Instituto Estatal Electoral y de Participación Ciudadana de Nuevo León (IEEPCNL)**.

Permite a los habitantes de un fraccionamiento registrarse mediante verificación biométrica (INE + selfie), participar en votaciones, asambleas deliberativas, generar reportes ciudadanos y consultar el histórico con actas formales.

---

## 📦 Stack

- **Next.js 14** (App Router) + **TypeScript**
- **PostgreSQL** via **Prisma** ORM
- **Supabase**: BD + Storage + (futuro) Realtime
- **Twilio** para SMS (con modo dev que muestra el código en pantalla)
- **Groq** (Llama 3.3 70B) para resúmenes de asamblea y generación de actas
- **TailwindCSS** con paleta IEEPCNL (amarillo + negro + blanco)
- **face-api.js** + **OpenCV.js** + **Tesseract.js** para verificación biométrica en navegador
- **PDFKit** para generación de actas oficiales

---

## 🚀 Setup local

### 1. Pre-requisitos
- Node.js 20+
- Cuenta en [Supabase](https://supabase.com) (free tier)
- Cuenta en [Twilio](https://twilio.com) (opcional, en dev no se requiere)
- Cuenta en [Groq](https://groq.com) (free)

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

```bash
cp .env.example .env.local
```

Edita `.env.local` y llena:

- **DATABASE_URL** y **DIRECT_URL**: cadenas de conexión de Supabase
  - Project Settings → Database → Connection string
  - Usa **Transaction pooler** (puerto 6543) para `DATABASE_URL`
  - Usa **Direct connection** (puerto 5432) para `DIRECT_URL`
- **NEXT_PUBLIC_SUPABASE_URL** y **NEXT_PUBLIC_SUPABASE_ANON_KEY**: Project Settings → API
- **SUPABASE_SERVICE_ROLE_KEY**: Project Settings → API → service_role (¡secreto!)
- **TWILIO_***: déjalo vacío si solo trabajarás en modo dev
- **GROQ_API_KEY**: de tu dashboard de Groq
- **JWT_SECRET**: genera uno con `openssl rand -base64 32`

### 4. Crear las tablas

```bash
npm run db:push
```

Esto sincroniza el schema de Prisma con tu base de datos de Supabase.

### 5. Sembrar datos iniciales

```bash
npm run db:seed
```

Esto crea:
- **Fraccionamiento "Las Lomas del Sur"** (220 viviendas)
- **Tu número** `+528132558755` como **ADMIN+COMITÉ verificado**
- **18 vecinos ficticios** verificados con likes/comentarios simulados
- **3 eventos abiertos**:
  1. Elección de Mesa Directiva (3 planillas con 5 integrantes c/u)
  2. Priorización de problemas (3 opciones con regla 2pts/1pt)
  3. Asamblea Vecinal Deliberativa con mensajes simulados
- **3 reportes** ciudadanos de ejemplo
- **4 posts** iniciales en el feed

### 6. Crear los buckets de Supabase Storage

En tu proyecto Supabase, ve a **Storage** y crea estos buckets (todos privados):
- `identidad` — para fotos de INE y selfies
- `publico` — para imágenes públicas de planillas y posts
- `actas` — PDFs generados
- `reportes` — fotos de reportes ciudadanos

### 7. Correr en desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

---

## 🔐 Credenciales de prueba

| Rol | Teléfono | Acceso |
|-----|----------|--------|
| Admin | `+52 81 3255 8755` | Total |
| Comité | `+52 81 1111 1111` | Modera asambleas, edita Infórmate, gestiona eventos |
| Vecino | `+52 8100000010` ... `+52 8100000027` | Vota y comenta |

En **modo dev** (`SMS_MODE=dev`), el código SMS se muestra:
- En la consola del servidor (terminal donde corre `npm run dev`)
- En la propia pantalla de verificación (banner amarillo)

---

## 🌐 Deploy a producción

### Vercel + Supabase

1. Crea un repositorio en GitHub y haz push de este proyecto.
2. En [Vercel](https://vercel.com), importa el repo.
3. Configura las **mismas variables** de `.env.local` en **Environment Variables**.
4. Cambia `SMS_MODE` a `"prod"` y llena `TWILIO_*` con tus credenciales reales.
5. Deploy.

### Configurar Twilio para producción

En el dashboard de Twilio:
- Compra un número con soporte SMS para México.
- Verifica los números destino o pasa a una cuenta paga (las cuentas trial solo envían a números verificados).

### Dominio personalizado

En Vercel → Settings → Domains. Puedes usar un dominio gratuito `*.vercel.app` o tu propio dominio.

---

## 📋 Estructura del proyecto

```
forumnl/
├── prisma/
│   ├── schema.prisma          # Modelo de datos
│   └── seed.ts                # Datos iniciales
├── public/
│   └── logo-ieepc.png         # Logo institucional
├── src/
│   ├── app/
│   │   ├── (autenticado)/     # Rutas protegidas (requieren sesión)
│   │   │   ├── home/          # Feed comunidad
│   │   │   ├── eventos/       # Listado, votación, infórmate, asamblea
│   │   │   ├── reportes/      # Reportes ciudadanos
│   │   │   ├── historico/     # Asambleas cerradas + actas
│   │   │   └── ayuda/         # Placeholder
│   │   ├── api/               # API routes
│   │   │   ├── auth/          # Login y registro (Twilio)
│   │   │   ├── feed/          # Posts, likes, comentarios
│   │   │   ├── eventos/       # Votos, mensajes asamblea, resúmenes Groq
│   │   │   ├── reportes/      # CRUD reportes
│   │   │   └── asambleas/     # Generación de actas PDF
│   │   ├── login/             # Pantalla de login
│   │   ├── register/          # Pantalla de registro
│   │   ├── onboarding/        # Flujo biométrico INE+selfie
│   │   └── page.tsx           # Landing
│   ├── components/            # NavBar, AppHeader, formularios
│   └── lib/
│       ├── db/prisma.ts       # Cliente Prisma
│       ├── auth/session.ts    # JWT + cookies
│       ├── sms/sms.ts         # Twilio
│       ├── groq/groq.ts       # Resúmenes IA
│       ├── storage/supabase.ts# Storage
│       └── verification/      # Comparación biométrica
└── package.json
```

---

## 🧪 Comandos útiles

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build de producción
npm run start        # Servidor de producción
npm run db:push      # Sincronizar schema con BD
npm run db:seed      # Re-cargar datos iniciales
npm run db:studio    # GUI de Prisma para explorar la BD
```

---

## 🔒 Seguridad

- **Voto secreto**: la tabla `Voto` no tiene FK a `Usuario`. Solo se conecta vía `folioAnonimo`. La tabla separada `EmisionPadron` marca quién ya votó sin revelar qué.
- **Sesiones**: JWT firmado HS256 en cookie HttpOnly. Se requiere `JWT_SECRET` configurado.
- **Biométricos**: el embedding facial (128 floats) se guarda como `Bytes` cifrados; las fotos se almacenan en bucket privado de Supabase.
- **RLS de Supabase**: pendiente configurar Row Level Security para acceso directo del cliente al storage.

---

## ⚠️ Próximos pasos / TODO

- [ ] Implementar Supabase Realtime para feed en vivo (actualmente polling cada 15s).
- [ ] Página "Crear evento" para comité/admin.
- [ ] Convertir reporte en votación con un click (UI del moderador).
- [ ] Asistente virtual en pestaña Ayuda con Groq.
- [ ] PWA (instalable como app móvil).
- [ ] Configurar Row Level Security para storage.
- [ ] Encriptar el campo `embeddingFacial` en BD con clave aparte (KMS).

---

## 📄 Licencia y aviso

Este proyecto es parte del reto académico **Innova TecNM 2026** en colaboración con el **IEEPCNL**.

Los datos biométricos son sensibles. En producción debe cumplirse con:
- Ley Federal de Protección de Datos Personales en Posesión de los Particulares
- Lineamientos del INAI
- Política de privacidad publicada y consentimiento expreso del usuario

---

*Generado con cariño para Las Lomas del Sur 💛*
