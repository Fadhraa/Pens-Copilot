import { readJsonBody, sendJson } from '../utils/http.js';
import { log } from '../utils/logger.js';
import {
  chunkDocumentText,
  embedChunksWithConcurrency,
  extractDocumentText
} from '../services/document.service.js';
import { embedTextServer } from '../services/gemini.service.js';

/**
 * Handle POST /api/rag/embed for single or batch text embeddings.
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 * @param {{ geminiApiKey: string }} env
 */
export async function handleRagEmbedRoute(req, res, env) {
  const t0 = Date.now();

  if (!env.geminiApiKey) {
    sendJson(res, 500, {
      error: 'API key Gemini belum dikonfigurasi di .env server.'
    });
    return;
  }

  try {
    const body = await readJsonBody(req);

    if (Array.isArray(body.texts)) {
      log('RAG', `Membuat batch embedding untuk ${body.texts.length} chunk...`);
      const embeddings = await embedChunksWithConcurrency(
        body.texts.map((t) => String(t || '')),
        env.geminiApiKey,
        embedTextServer,
        5
      );
      log('RAG', `Batch embedding selesai (${embeddings.length} vektor)`, t0);
      sendJson(res, 200, { embeddings });
      return;
    }

    if (typeof body.text === 'string' && body.text.trim()) {
      const embedding = await embedTextServer(body.text, env.geminiApiKey);
      log('RAG', `Single embedding selesai (${embedding.length} dimensi)`, t0);
      sendJson(res, 200, { embedding });
      return;
    }

    sendJson(res, 400, { error: 'Parameter text atau texts wajib diisi.' });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Gagal membuat embedding RAG.';
    log('ERROR', `Endpoint /api/rag/embed gagal: ${message}`, t0);
    sendJson(res, 500, { error: message });
  }
}

/**
 * Handle POST /api/rag/ingest for PDF, DOCX, TXT/MD extraction, chunking, and 768-dim embedding.
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 * @param {{ geminiApiKey: string }} env
 */
export async function handleRagIngestRoute(req, res, env) {
  const t0 = Date.now();

  if (!env.geminiApiKey) {
    sendJson(res, 500, {
      error: 'API key Gemini belum dikonfigurasi di .env server.'
    });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const fileData = typeof body.fileData === 'string' ? body.fileData.trim() : '';
    const mimeType = typeof body.mimeType === 'string' ? body.mimeType.trim() : '';
    const fileName = typeof body.fileName === 'string' ? body.fileName.trim() : '';
    const rawText = typeof body.rawText === 'string' ? body.rawText : '';
    const tier = String(body.tier || 'free').toLowerCase();

    if (!fileData && !rawText.trim()) {
      sendJson(res, 400, {
        error: 'Unggah dokumen materi (PDF/DOCX/TXT/MD) atau isi catatan materi terlebih dahulu.'
      });
      return;
    }

    // Validasi batas ukuran file berdasarkan tier (Free: 5 MB, Pro: 25 MB)
    if (fileData) {
      const base64Data = fileData.split(',')[1] || fileData;
      const approximateBytes = Math.floor((base64Data.length * 3) / 4);
      const isFreeTier = tier !== 'pro';
      const maxAllowedBytes = isFreeTier ? 5.25 * 1024 * 1024 : 26.25 * 1024 * 1024;
      if (approximateBytes > maxAllowedBytes) {
        sendJson(res, 413, {
          error: isFreeTier
            ? 'Ukuran berkas melebihi batas 5 MB untuk akun Free. Silakan tingkatkan ke paket Pro untuk berkas hingga 25 MB.'
            : 'Ukuran berkas melebihi batas maksimal 25 MB.'
        });
        return;
      }
    }

    log(
      'RAG',
      `Memproses ingest materi RAG (${fileData ? fileName || mimeType || 'file' : 'teks-manual'})...`
    );

    const extractedText = await extractDocumentText({
      fileData,
      mimeType,
      fileName,
      rawText
    });

    if (!extractedText) {
      sendJson(res, 400, {
        error: 'Tidak ada teks yang terbaca dari dokumen tersebut (pastikan PDF bukan hasil scan gambar kosong).'
      });
      return;
    }

    const { chunks, charCount, truncated } = chunkDocumentText(extractedText);
    if (!chunks.length) {
      sendJson(res, 400, {
        error: 'Konten materi terlalu pendek atau kosong untuk diindeks.'
      });
      return;
    }

    const embeddings = await embedChunksWithConcurrency(
      chunks,
      env.geminiApiKey,
      embedTextServer,
      5
    );

    log(
      'RAG',
      `Ingest selesai: ${charCount} karakter -> ${chunks.length} chunk vektor${truncated ? ' (dibatasi 40 chunk)' : ''}`,
      t0
    );

    sendJson(res, 200, {
      chunks,
      embeddings,
      charCount,
      chunkCount: chunks.length,
      truncated
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Gagal memproses dokumen materi RAG.';
    const statusCode = /terlalu besar/i.test(message) ? 413 : 500;
    log('ERROR', `Endpoint /api/rag/ingest gagal: ${message}`, t0);
    sendJson(res, statusCode, { error: message });
  }
}
