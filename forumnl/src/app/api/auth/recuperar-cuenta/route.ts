import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import twilio from 'twilio';

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

function euclidDist(a: Float32Array, b: Float32Array) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
  return Math.sqrt(s);
}

async function mandarSMS(telefono: string, mensaje: string): Promise<void> {
  if (process.env.SMS_MODE === 'dev') {
    // En modo dev no se envía — el código aparece en la respuesta
    return;
  }
  await twilioClient.messages.create({
    body: mensaje,
    from: process.env.TWILIO_PHONE_NUMBER!,
    to:   telefono,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { paso, telefono, descriptor, codigo } = body;

  if (!telefono) {
    return NextResponse.json({ ok: false, message: 'Teléfono requerido.' }, { status: 400 });
  }

  // ── SOLICITAR ──────────────────────────────────────────────
  if (paso === 'solicitar') {
    if (!Array.isArray(descriptor)) {
      return NextResponse.json({ ok: false, message: 'Descriptor inválido.' }, { status: 400 });
    }

    const incoming = new Float32Array(descriptor);

    // Verificar que el descriptor coincide con algún usuario verificado
    const usuarios = await prisma.usuario.findMany({
      where: { estatus: 'VERIFICADO', embeddingFacial: { not: null } },
      select: { id: true, embeddingFacial: true },
    });

    let matchId: string | null = null;
    let menorDist = Infinity;

    for (const u of usuarios) {
      if (!u.embeddingFacial) continue;
      const stored = new Float32Array(Buffer.from(u.embeddingFacial as Buffer).buffer);
      const d = euclidDist(incoming, stored);
      if (d < menorDist) { menorDist = d; matchId = u.id; }
    }

    if (!matchId || menorDist >= 0.62) {
      return NextResponse.json(
        { ok: false, message: 'No encontramos tu registro. Contacta al comité.' },
        { status: 401 }
      );
    }

    // Verificar que el teléfono nuevo no está ya en uso
    const existente = await prisma.usuario.findUnique({ where: { telefono } });
    if (existente) {
      return NextResponse.json(
        { ok: false, message: 'Ese número ya está registrado en otra cuenta.' },
        { status: 400 }
      );
    }

    // Generar código de 6 dígitos
    const code   = Math.floor(100000 + Math.random() * 900000).toString();
    const expira = new Date(Date.now() + 5 * 60 * 1000);

    await prisma.codigoVerificacion.create({
      data: {
        telefono,
        codigo:    code,
        proposito: 'recuperar_cuenta',
        expiraEn:  expira,
        usuarioId: matchId,
      },
    });

    // Enviar SMS (o mostrar en pantalla si SMS_MODE=dev)
    try {
      await mandarSMS(
        telefono,
        `Tu código FórumNL para cambio de número: ${code}. Válido 5 min.`
      );
    } catch (err) {
      console.error('[recuperar-cuenta] Error enviando SMS:', err);
      // En dev, continuamos aunque falle el SMS
      if (process.env.SMS_MODE !== 'dev') {
        return NextResponse.json(
          { ok: false, message: 'No se pudo enviar el SMS. Intenta más tarde.' },
          { status: 500 }
        );
      }
    }

    // En modo dev, devolver el código para que aparezca en pantalla
    const codigoDev = process.env.SMS_MODE === 'dev' ? code : undefined;
    return NextResponse.json({ ok: true, codigoDev });
  }

  // ── VERIFICAR ──────────────────────────────────────────────
  if (paso === 'verificar') {
    if (!codigo) {
      return NextResponse.json({ ok: false, message: 'Código requerido.' }, { status: 400 });
    }

    const registro = await prisma.codigoVerificacion.findFirst({
      where: {
        telefono,
        codigo,
        proposito: 'recuperar_cuenta',
        usado:     false,
        expiraEn:  { gt: new Date() },
      },
    });

    if (!registro || !registro.usuarioId) {
      return NextResponse.json(
        { ok: false, message: 'Código incorrecto o expirado.' },
        { status: 401 }
      );
    }

    // Cambiar teléfono del usuario y marcar código como usado
    await prisma.$transaction([
      prisma.usuario.update({
        where: { id: registro.usuarioId },
        data:  { telefono },
      }),
      prisma.codigoVerificacion.update({
        where: { id: registro.id },
        data:  { usado: true },
      }),
    ]);

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, message: 'Paso inválido.' }, { status: 400 });
}
