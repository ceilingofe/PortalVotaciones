/**
 * Operaciones biométricas server-side:
 * - Conversión Float32Array <-> Buffer para BD
 * - Distancia euclídea entre dos embeddings
 * - Decisión de match contra umbral configurable
 *
 * El embedding (128-d) se genera en el CLIENTE con face-api.js. Aquí solo
 * almacenamos y comparamos. Para el portal completo, según la spec §4, esto
 * se moverá a un backend con InsightFace.
 */

const DEFAULT_THRESHOLD = 0.60;

export function embeddingToBuffer(embedding: number[] | Float32Array): Buffer {
  const arr = Float32Array.from(embedding);
  return Buffer.from(arr.buffer);
}

export function bufferToEmbedding(buf: Buffer): Float32Array {
  return new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
}

export function distanciaEuclidea(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) throw new Error('Embeddings de distinto largo');
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

export interface MatchResult {
  match: boolean;
  distancia: number;
  umbral: number;
}

export function compararEmbeddings(
  a: Float32Array | number[],
  b: Float32Array | number[]
): MatchResult {
  const umbral = parseFloat(process.env.BIOMETRIC_MATCH_THRESHOLD || `${DEFAULT_THRESHOLD}`);
  const fa = a instanceof Float32Array ? a : Float32Array.from(a);
  const fb = b instanceof Float32Array ? b : Float32Array.from(b);
  const distancia = distanciaEuclidea(fa, fb);
  return { match: distancia < umbral, distancia, umbral };
}
