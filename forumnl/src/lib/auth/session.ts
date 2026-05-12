/**
 * Auth/sesión basada en JWT firmado con HS256.
 * El JWT se guarda en cookie HttpOnly llamada "forumnl_session".
 *
 * Para que esto funcione en el portal de votación final, el JWT puede emitirse
 * desde un sistema externo (como mencionas en el documento técnico §9). Por
 * ahora la app misma firma sus propias sesiones.
 */

import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db/prisma';
import { Rol } from '@prisma/client';

const COOKIE_NAME = 'forumnl_session';
const SESSION_DAYS = 30;

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET no está definido en .env');
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  sub: string;        // usuarioId
  telefono: string;
  rol: Rol;
  fraccionamientoId: string;
}

export async function crearSesion(payload: SessionPayload): Promise<string> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .setSubject(payload.sub)
    .sign(getSecret());
  return token;
}

export async function setSessionCookie(token: string) {
  const cookieStore = cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearSessionCookie() {
  const cookieStore = cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function verificarToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function leerSesion(): Promise<SessionPayload | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verificarToken(token);
}

/**
 * Carga el usuario completo desde la BD usando la sesión actual.
 * Devuelve null si no hay sesión o el usuario fue eliminado.
 */
export async function usuarioActual() {
  const session = await leerSesion();
  if (!session) return null;
  return prisma.usuario.findUnique({
    where: { id: session.sub },
    include: { vivienda: { include: { fraccionamiento: true } } },
  });
}

export async function requireSession(): Promise<SessionPayload> {
  const s = await leerSesion();
  if (!s) throw new Error('UNAUTHORIZED');
  return s;
}

export function tienePermiso(rolUsuario: Rol, rolMinimo: Rol): boolean {
  const jerarquia = { [Rol.USUARIO]: 1, [Rol.COMITE]: 2, [Rol.ADMIN]: 3 };
  return jerarquia[rolUsuario] >= jerarquia[rolMinimo];
}
