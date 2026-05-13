import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { enviarSMS } from '@/lib/sms/sms';

function euclidDist(a: Float32Array, b: Float32Array) {
  let s = 0; for (let i = 0; i < a.length; i++) s += (a[i]-b[i])**2; return Math.sqrt(s);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { paso, telefono, descriptor, codigo } = body;

  if (!telefono) return NextResponse.json({ ok: false, message: 'Teléfono requerido.' }, { status: 400 });

  // ── SOLICITAR ──────────────────────────────────────────────
  if (paso === 'solicitar') {
    if (!Array.isArray(descriptor)) return NextResponse.json({ ok: false, message: 'Descriptor inválido.' }, { status: 400 });

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

    if (!matchId || menorDist >= 0.60) {
      return NextResponse.json({ ok: false, message: 'No encontramos tu registro. Contacta al comité.' }, { status: 401 });
    }

    // Verificar que el teléfono nuevo no está ya en uso
    const existente = await prisma.usuario.findUnique({ where: { telefono } });
    if (existente) return NextResponse.json({ ok: false, message: 'Ese número ya está registrado en otra cuenta.' }, { status: 400 });

    // Generar código de verificación
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expira = new Date(Date.now() + 5 * 60 * 1000);

    await prisma.codigoVerificacion.create({
      data: { telefono, codigo: code, proposito: 'recuperar_cuenta', expiraEn: expira, usuarioId: matchId },
    });

    const smsRes = await enviarSMS(telefono, `Tu código FórumNL para cambio de número: ${code}. Válido 5 min.`);
    const codigoDev = process.env.SMS_MODE === 'dev' ? code : undefined;
    return NextResponse.json({ ok: true, codigoDev });
  }

  // ── VERIFICAR ──────────────────────────────────────────────
  if (paso === 'verificar') {
    if (!codigo) return NextResponse.json({ ok: false, message: 'Código requerido.' }, { status: 400 });

    const registro = await prisma.codigoVerificacion.findFirst({
      where: {
        telefono,
        codigo,
        proposito: 'recuperar_cuenta',
        usado: false,
        expiraEn: { gt: new Date() },
      },
      include: { usuario: true },
    });

    if (!registro || !registro.usuarioId) {
      return NextResponse.json({ ok: false, message: 'Código incorrecto o expirado.' }, { status: 401 });
    }

    // Cambiar teléfono del usuario
    await prisma.$transaction([
      prisma.usuario.update({
        where: { id: registro.usuarioId },
        data: { telefono },
      }),
      prisma.codigoVerificacion.update({
        where: { id: registro.id },
        data: { usado: true },
      }),
    ]);

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, message: 'Paso inválido.' }, { status: 400 });
}
