import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { enviarCodigoSms, generarCodigo, normalizarTelefono } from '@/lib/sms/sms';
import { z } from 'zod';

const Schema = z.object({ telefono: z.string().min(8) });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { telefono: rawTelefono } = Schema.parse(body);
    const telefono = normalizarTelefono(rawTelefono);

    const usuario = await prisma.usuario.findUnique({ where: { telefono } });

    if (!usuario) {
      return NextResponse.json(
        { ok: false, error: 'NO_REGISTRADO', message: 'Este número no está registrado.' },
        { status: 404 }
      );
    }

    const codigo = generarCodigo();
    const expiraEn = new Date(Date.now() + 5 * 60 * 1000); // 5 minutos

    await prisma.codigoVerificacion.create({
      data: { usuarioId: usuario.id, telefono, codigo, proposito: 'login', expiraEn },
    });

    const smsResult = await enviarCodigoSms(telefono, codigo);

    return NextResponse.json({
      ok: smsResult.ok,
      mode: smsResult.mode,
      // En modo dev devolvemos el código para que la UI lo muestre
      codigoDev: smsResult.mode === 'dev' ? smsResult.codigoMostrado : undefined,
      message: smsResult.mode === 'dev'
        ? `Modo desarrollo: el código se muestra en pantalla.`
        : `Código enviado a ${telefono}`,
    });
  } catch (e: any) {
    console.error('[login/solicitar-codigo]', e);
    return NextResponse.json({ ok: false, error: 'ERROR', message: e?.message || 'Error' }, { status: 400 });
  }
}
