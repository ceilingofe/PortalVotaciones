import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { cookies } from 'next/headers';
import { SignJWT } from 'jose';

/* ─── Configuración de la sesión ─────────────────────────────────────
   Usa exactamente los mismos parámetros que el resto del sistema de auth.
   El nombre de la cookie y el secreto DEBEN coincidir con los de
   usuarioActual() / crearSesion() en lib/auth/session.ts              */
const COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? 'forumnl_token';
const JWT_SECRET  = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'forumnl-super-secret-key-change-in-production'
);

function euclidDist(a: Float32Array, b: Float32Array): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
  return Math.sqrt(s);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { telefono, descriptor } = body;

  if (!telefono || !Array.isArray(descriptor)) {
    return NextResponse.json({ ok: false, error: 'DATOS_INVALIDOS' }, { status: 400 });
  }

  const incoming = new Float32Array(descriptor);

  // Buscar al usuario por teléfono
  const usuario = await prisma.usuario.findUnique({
    where: { telefono },
    select: {
      id: true,
      nombreCompleto: true,
      rol: true,
      estatus: true,
      embeddingFacial: true,
      vivienda: { select: { id: true, fraccionamientoId: true } },
    },
  });

  if (!usuario)                    return NextResponse.json({ ok: false, error: 'NO_REGISTRADO' },  { status: 404 });
  if (usuario.estatus !== 'VERIFICADO') return NextResponse.json({ ok: false, error: 'NO_VERIFICADO' }, { status: 403 });
  if (!usuario.embeddingFacial)    return NextResponse.json({ ok: false, error: 'SIN_EMBEDDING',   message: 'Este número no tiene reconocimiento facial.' }, { status: 400 });

  // Comparar descriptores
  const stored   = new Float32Array(Buffer.from(usuario.embeddingFacial as Buffer).buffer);
  const distancia = euclidDist(incoming, stored);

  if (distancia >= 0.58) {
    return NextResponse.json({
      ok: false,
      error: 'ROSTRO_NO_COINCIDE',
      distancia: parseFloat(distancia.toFixed(4)),
    }, { status: 401 });
  }

  // Actualizar último acceso
  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { ultimoAcceso: new Date() },
  });

  // ── Crear JWT ─────────────────────────────────────────────────
  const token = await new SignJWT({
    id:  usuario.id,
    rol: usuario.rol,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);

  // ── Establecer la cookie usando cookies() de next/headers ────
  // Este método es el más confiable en Next.js 14 App Router para
  // route handlers — garantiza que el Set-Cookie se incluye en la
  // respuesta antes de cualquier redirección del cliente.
  const cookieStore = cookies();
  cookieStore.set({
    name:     COOKIE_NAME,
    value:    token,
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   60 * 60 * 24 * 7, // 7 días
    path:     '/',
  });

  return NextResponse.json({ ok: true, nombre: usuario.nombreCompleto });
}
