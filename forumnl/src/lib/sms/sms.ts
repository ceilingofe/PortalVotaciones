/**
 * Servicio SMS — Twilio.
 *
 * En SMS_MODE="dev" no envía SMS reales: solo loguea y devuelve el código
 * para que la UI lo muestre. Útil para desarrollo sin gastar saldo.
 */

import twilio from 'twilio';

export interface SendSmsResult {
  ok: boolean;
  mode: 'dev' | 'prod';
  codigoMostrado?: string;  // solo en modo dev
  twilioSid?: string;
  error?: string;
}

export function generarCodigo(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function enviarCodigoSms(telefono: string, codigo: string): Promise<SendSmsResult> {
  const mode = (process.env.SMS_MODE || 'dev').toLowerCase();
  const mensaje = `Tu código para FórumNL es: ${codigo}. Vigencia 5 minutos.`;

  if (mode !== 'prod') {
    console.log(`\n[SMS DEV] ─────────────────────────────`);
    console.log(`  Para:    ${telefono}`);
    console.log(`  Código:  ${codigo}`);
    console.log(`  ────────────────────────────────────\n`);
    return { ok: true, mode: 'dev', codigoMostrado: codigo };
  }

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from) {
    return { ok: false, mode: 'prod', error: 'Twilio no está configurado en .env' };
  }

  try {
    const client = twilio(sid, token);
    const msg = await client.messages.create({ body: mensaje, from, to: telefono });
    return { ok: true, mode: 'prod', twilioSid: msg.sid };
  } catch (e: any) {
    console.error('[SMS] Error Twilio:', e?.message || e);
    return { ok: false, mode: 'prod', error: e?.message || 'Error desconocido' };
  }
}

/** Normaliza un número a formato E.164 con prefijo +52 si no lo tiene */
export function normalizarTelefono(input: string): string {
  let s = input.replace(/[\s\-\(\)]/g, '');
  if (s.startsWith('+')) return s;
  if (s.startsWith('52')) return `+${s}`;
  // 10 dígitos típicos de México
  if (/^\d{10}$/.test(s)) return `+52${s}`;
  return `+${s}`;
}
