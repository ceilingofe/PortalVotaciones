import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { crearSesion, setSessionCookie } from '@/lib/auth/session';
import { jwtVerify } from 'jose';
import { embeddingToBuffer } from '@/lib/verification/biometric';
import { z } from 'zod';
import { Rol, EstatusUsuario } from '@prisma/client';

const Schema = z.object({
  regToken: z.string(),
  nombreCompleto: z.string().min(3),
  curp: z.string().optional(),
  fechaNacimiento: z.string().optional(),
  sexo: z.string().optional(),
  domicilio: z.string().optional(),
  embeddingFacial: z.array(z.number()).length(128),
  ineFrenteBase64: z.string().optional(),
  selfieBase64: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = Schema.parse(body);

    // Validar regToken
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(data.regToken, secret);
    if (payload.scope !== 'registro' || !payload.telefono) {
      return NextResponse.json({ ok: false, error: 'TOKEN_INVALIDO' }, { status: 401 });
    }
    const telefono = payload.telefono as string;

    // Buscar fraccionamiento por defecto (Las Lomas del Sur)
    const fraccionamiento = await prisma.fraccionamiento.findFirst({
      where: { nombre: 'Las Lomas del Sur' },
      include: { viviendas: true },
    });
    if (!fraccionamiento) {
      return NextResponse.json({ ok: false, error: 'SIN_FRACCIONAMIENTO' }, { status: 500 });
    }

    // Buscar vivienda libre
    const viviendasUsadas = await prisma.usuario.findMany({
      where: { viviendaId: { not: null } },
      select: { viviendaId: true },
    });
    const usadasSet = new Set(viviendasUsadas.map((v) => v.viviendaId!));
    const viviendaLibre = fraccionamiento.viviendas.find((v) => !usadasSet.has(v.id));
    if (!viviendaLibre) {
      return NextResponse.json({ ok: false, error: 'SIN_VIVIENDA_DISPONIBLE' }, { status: 409 });
    }

    // Crear o actualizar usuario
    const embeddingBuf = embeddingToBuffer(data.embeddingFacial);
    const usuario = await prisma.usuario.upsert({
      where: { telefono },
      update: {
        nombreCompleto: data.nombreCompleto,
        curp: data.curp,
        fechaNacimiento: data.fechaNacimiento ? new Date(data.fechaNacimiento) : null,
        sexo: data.sexo,
        domicilio: data.domicilio ?? `${viviendaLibre.identificador}, ${fraccionamiento.nombre}`,
        viviendaId: viviendaLibre.id,
        embeddingFacial: embeddingBuf,
        rol: Rol.USUARIO,
        estatus: EstatusUsuario.VERIFICADO,
        fechaVerificacion: new Date(),
      },
      create: {
        telefono,
        nombreCompleto: data.nombreCompleto,
        curp: data.curp,
        fechaNacimiento: data.fechaNacimiento ? new Date(data.fechaNacimiento) : null,
        sexo: data.sexo,
        domicilio: data.domicilio ?? `${viviendaLibre.identificador}, ${fraccionamiento.nombre}`,
        viviendaId: viviendaLibre.id,
        embeddingFacial: embeddingBuf,
        rol: Rol.USUARIO,
        estatus: EstatusUsuario.VERIFICADO,
        fechaVerificacion: new Date(),
      },
    });

    // TODO: subir ineFrenteBase64 y selfieBase64 a Supabase Storage si vienen

    // Crear sesión
    const token = await crearSesion({
      sub: usuario.id,
      telefono: usuario.telefono,
      rol: usuario.rol,
      fraccionamientoId: fraccionamiento.id,
    });
    await setSessionCookie(token);

    return NextResponse.json({
      ok: true,
      usuario: { id: usuario.id, nombre: usuario.nombreCompleto, rol: usuario.rol },
    });
  } catch (e: any) {
    console.error('[register/finalizar]', e);
    return NextResponse.json({ ok: false, error: 'ERROR', message: e?.message }, { status: 400 });
  }
}
