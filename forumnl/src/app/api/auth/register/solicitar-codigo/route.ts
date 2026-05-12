import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { enviarCodigoSms, generarCodigo, normalizarTelefono } from '@/lib/sms/sms';
import { z } from 'zod';

const Schema = z.object({ telefono: z.string().min(8) });

export async function POST(req: NextRequest) {
  try {
    const { telefono: raw } = Schema.parse(await req.json());
    const telefono = normalizarTelefono(raw);

    // Si ya existe usuario verificado, no permitir re-registro
    const existente = await prisma.usuario.findUnique({ where: { telefono } });
    if (existente && existente.estatus === 'VERIFICADO') {
      return NextResponse.json(
        { ok: false, error: 'YA_REGISTRADO', message: 'Este número ya está registrado. Inicia sesión.' },
        { status: 409 }
      );
    }

    const codigo = generarCodigo();
    const expiraEn = new Date(Date.now() + 5 * 60 * 1000);
    await prisma.codigoVerificacion.create({
      data: { telefono, codigo, proposito: 'registro', expiraEn },
    });

    const sms = await enviarCodigoSms(telefono, codigo);
    return NextResponse.json({
      ok: sms.ok,
      mode: sms.mode,
      codigoDev: sms.mode === 'dev' ? sms.codigoMostrado : undefined,
      message: sms.mode === 'dev' ? 'Código mostrado en pantalla (modo dev)' : `Código enviado a ${telefono}`,
    });
  } catch (e: any) {
    console.error('[register/solicitar-codigo]', e);
    return NextResponse.json({ ok: false, error: 'ERROR', message: e?.message }, { status: 400 });
  }
}
