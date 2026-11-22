import { requestJsonIPv4 } from '../utils/http.js';
import { log } from '../utils/logger.js';
import { embedTextServer } from './gemini.service.js';

const GREETING_PATTERN =
  /^(halo+|hai+|hi+|hello+|pagi|siang|sore|malam|tes|test|ping|terima\s*kasih|makasih|oke|ok|siap|permisi)\b/i;

/**
 * Skip RAG embedding & vector search for short greetings or when user has no materials.
 * @param {string} prompt
 * @param {boolean} hasMaterials
 * @param {string | null | undefined} userId
 * @returns {boolean}
 */
export function shouldSkipRag(prompt, hasMaterials, userId) {
  if (!hasMaterials || !userId) return true;
  const trimmed = (prompt || '').trim();
  if (trimmed.length < 12) return true;
  if (trimmed.length < 35 && GREETING_PATTERN.test(trimmed)) {
    return true;
  }
  return false;
}

/**
 * Retrieve relevant document chunks via Supabase pgvector RPC.
 * @param {{
 *   query: string,
 *   userId: string | null,
 *   accessToken: string | null,
 *   env: { geminiApiKey: string, supabaseUrl: string, supabaseAnonKey: string }
 * }} params
 * @returns {Promise<Array<any>>}
 */
export async function retrieveRagChunksServer({
  query,
  userId,
  accessToken,
  env
}) {
  if (!env.supabaseUrl || !env.supabaseAnonKey || !userId || !env.geminiApiKey) {
    return [];
  }

  const t0 = Date.now();
  try {
    const queryEmbedding = await embedTextServer(query, env.geminiApiKey);
    if (!queryEmbedding.length) {
      log('RAG', 'Embedding kosong, pencarian dilewati', t0);
      return [];
    }

    const rpcRes = await requestJsonIPv4({
      url: `${env.supabaseUrl}/rest/v1/rpc/match_document_chunks`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: env.supabaseAnonKey,
        Authorization: `Bearer ${accessToken || env.supabaseAnonKey}`
      },
      body: {
        query_embedding: queryEmbedding,
        match_threshold: 0.35,
        match_count: 3,
        p_user_id: userId
      },
      timeoutMs: 15000
    });

    if (!rpcRes.ok) {
      log('WARN', `Supabase RAG RPC gagal (HTTP ${rpcRes.status})`, t0);
      return [];
    }

    const chunks = Array.isArray(rpcRes.json) ? rpcRes.json : [];
    log('RAG', `Ditemukan ${chunks.length} potongan materi relevan`, t0);
    return chunks;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    log('WARN', `Pencarian RAG dilewati karena error: ${msg}`, t0);
    return [];
  }
}
