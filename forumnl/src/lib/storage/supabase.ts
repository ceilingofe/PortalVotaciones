/**
 * Cliente Supabase para operaciones de Storage.
 * - Imágenes de INE (frente)
 * - Selfies
 * - Fotos de reportes
 * - PDFs de actas
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _admin: SupabaseClient | null = null;

function getAdminClient(): SupabaseClient {
  if (_admin) return _admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY deben estar definidos.');
  }
  _admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _admin;
}

export const STORAGE_BUCKETS = {
  identidad: 'identidad',  // INE, selfies (privado)
  publico: 'publico',      // imágenes de eventos, planillas, posts
  actas: 'actas',          // PDFs de actas
  reportes: 'reportes',    // fotos de reportes ciudadanos
} as const;

export async function subirArchivo(
  bucket: keyof typeof STORAGE_BUCKETS,
  path: string,
  file: Buffer | Blob,
  contentType?: string
): Promise<string> {
  const supabase = getAdminClient();
  const { error } = await supabase.storage
    .from(STORAGE_BUCKETS[bucket])
    .upload(path, file, { upsert: true, contentType });
  if (error) throw new Error(`Upload falló: ${error.message}`);
  return path;
}

export async function obtenerUrlFirmada(
  bucket: keyof typeof STORAGE_BUCKETS,
  path: string,
  segundos = 3600
): Promise<string> {
  const supabase = getAdminClient();
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKETS[bucket])
    .createSignedUrl(path, segundos);
  if (error || !data) throw new Error(`Firma falló: ${error?.message}`);
  return data.signedUrl;
}

export async function obtenerUrlPublica(
  bucket: keyof typeof STORAGE_BUCKETS,
  path: string
): Promise<string> {
  const supabase = getAdminClient();
  const { data } = supabase.storage.from(STORAGE_BUCKETS[bucket]).getPublicUrl(path);
  return data.publicUrl;
}
