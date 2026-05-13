import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

function euclidDist(a: Float32Array, b: Float32Array) {
  let s=0; for(let i=0;i<a.length;i++) s+=(a[i]-b[i])**2; return Math.sqrt(s);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(()=>({}));
  const { descriptorActual, descriptorNuevoIne, descriptorNuevoSelfie, datos } = body;

  if (!descriptorActual||!descriptorNuevoIne||!descriptorNuevoSelfie||!datos?.telefono||!datos?.nombreCompleto) {
    return NextResponse.json({ok:false,message:'Datos incompletos.'},{status:400});
  }

  const incActual = new Float32Array(descriptorActual);
  const incNuevoI = new Float32Array(descriptorNuevoIne);
  const incNuevoS = new Float32Array(descriptorNuevoSelfie);

  // Verificar selfie del nuevo vs su INE
  if (euclidDist(incNuevoI, incNuevoS) >= 0.62) {
    return NextResponse.json({ok:false,message:'La selfie del nuevo apoderado no coincide con su INE.'},{status:401});
  }

  // Encontrar apoderado actual por embedding
  const usuarios = await prisma.usuario.findMany({
    where:{estatus:'VERIFICADO',embeddingFacial:{not:null}},
    select:{id:true,embeddingFacial:true,viviendaId:true},
  });

  let match: typeof usuarios[0]|null = null;
  let minDist = Infinity;
  for (const u of usuarios) {
    if (!u.embeddingFacial||!u.viviendaId) continue;
    const d = euclidDist(incActual, new Float32Array(Buffer.from(u.embeddingFacial as Buffer).buffer));
    if (d<minDist) { minDist=d; match=u; }
  }

  if (!match||minDist>=0.58) {
    return NextResponse.json({ok:false,message:'El apoderado actual no fue reconocido. Usa la INE de quien está registrado.'},{status:401});
  }

  // Verificar que el teléfono nuevo no esté en uso
  const existente = await prisma.usuario.findUnique({where:{telefono:datos.telefono}});
  if (existente) return NextResponse.json({ok:false,message:'Ese teléfono ya está registrado en otra cuenta.'},{status:400});

  const embeddingBuf = Buffer.from(new Float32Array(descriptorNuevoSelfie).buffer);

  await prisma.$transaction(async tx => {
    // Desactivar apoderado anterior
    await tx.usuario.update({where:{id:match!.id},data:{estatus:'SUSPENDIDO',viviendaId:null}});
    // Crear nuevo usuario con la vivienda
    await tx.usuario.create({data:{
      telefono: datos.telefono,
      nombreCompleto: datos.nombreCompleto,
      curp: datos.curp||null,
      fechaNacimiento: datos.fechaNacimiento?new Date(datos.fechaNacimiento):null,
      sexo: datos.sexo||null,
      viviendaId: match!.viviendaId,
      embeddingFacial: embeddingBuf,
      estatus: 'VERIFICADO',
      fechaVerificacion: new Date(),
      rol: 'USUARIO',
    }});
  });

  return NextResponse.json({ok:true});
}
