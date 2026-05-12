import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { normalizarTelefono } from '@/lib/sms/sms';
import { SignJWT } from 'jose';
import { z } from 'zod';

const Schema = z.object({ telefono: z.string().min(8), codigo: z.string().length(6) });

export async function POST(req: NextRequest) {
  try {
    const { telefono: raw, codigo } = Schema.parse(await req.json());
    const telefono = normalizarTelefono(raw);

    const cv = await prisma.codigoVerificacion.findFirst({
      where: { telefono, codigo, usado: false, proposito: 'registro' },
      orderBy: { createdAt: 'desc' },
    });

    if (!cv) return NextResponse.json({ ok: false, error: 'CODIGO_INVALIDO' }, { status: 400 });
    if (cv.expiraEn < new Date()) return NextResponse.json({ ok: false, error: 'CODIGO_EXPIRADO' }, { status: 400 });

    await prisma.codigoVerificacion.update({ where: { id: cv.id }, data: { usado: true } });

    // Emitir un registration token corto (15 min) que se requiere para finalizar el registro
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const regToken = await new SignJWT({ telefono, scope: 'registro' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(secret);

    return NextResponse.json({ ok: true, regToken });
  } catch (e: any) {
    console.error('[register/verificar-codigo]', e);
    return NextResponse.json({ ok: false, error: 'ERROR', message: e?.message }, { status: 400 });
  }
}
