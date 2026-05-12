import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { crearSesion, setSessionCookie } from '@/lib/auth/session';
import { normalizarTelefono } from '@/lib/sms/sms';
import { z } from 'zod';

const Schema = z.object({
  telefono: z.string().min(8),
  codigo: z.string().length(6),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { telefono: rawTelefono, codigo } = Schema.parse(body);
    const telefono = normalizarTelefono(rawTelefono);

    const cv = await prisma.codigoVerificacion.findFirst({
      where: { telefono, codigo, usado: false, proposito: 'login' },
      orderBy: { createdAt: 'desc' },
    });

    if (!cv) {
      return NextResponse.json({ ok: false, error: 'CODIGO_INVALIDO', message: 'Código incorrecto.' }, { status: 400 });
    }

    if (cv.expiraEn < new Date()) {
      return NextResponse.json({ ok: false, error: 'CODIGO_EXPIRADO', message: 'El código expiró. Solicita uno nuevo.' }, { status: 400 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { telefono },
      include: { vivienda: { include: { fraccionamiento: true } } },
    });

    if (!usuario) {
      return NextResponse.json({ ok: false, error: 'NO_REGISTRADO' }, { status: 404 });
    }

    // Marcar código usado y registrar último acceso
    await prisma.$transaction([
      prisma.codigoVerificacion.update({ where: { id: cv.id }, data: { usado: true } }),
      prisma.usuario.update({ where: { id: usuario.id }, data: { ultimoAcceso: new Date() } }),
    ]);

    // Sesión
    const fraccionamientoId = usuario.vivienda?.fraccionamientoId ?? '';
    const token = await crearSesion({
      sub: usuario.id,
      telefono: usuario.telefono,
      rol: usuario.rol,
      fraccionamientoId,
    });
    await setSessionCookie(token);

    return NextResponse.json({
      ok: true,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombreCompleto,
        rol: usuario.rol,
        fraccionamiento: usuario.vivienda?.fraccionamiento.nombre ?? null,
      },
    });
  } catch (e: any) {
    console.error('[login/verificar-codigo]', e);
    return NextResponse.json({ ok: false, error: 'ERROR', message: e?.message }, { status: 400 });
  }
}
