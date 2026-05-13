import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const calle  = searchParams.get('calle');
  const numero = searchParams.get('numero');
  if (!calle||!numero) return NextResponse.json({ok:false,ocupada:false});

  const vivienda = await prisma.vivienda.findFirst({
    where: { identificador:`${calle} ${numero}`, usuario:{estatus:'VERIFICADO'} },
    select: { id:true },
  });

  return NextResponse.json({ok:true, ocupada:!!vivienda});
}
