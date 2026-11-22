import { readJsonBody, sendJson } from '../utils/http.js';
import { log } from '../utils/logger.js';
import { extractSchedulesWithGemini } from '../services/gemini.service.js';

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp'
]);

/**
 * Handle POST /api/schedule/extract for KRS files (PDF/image) or pasted schedule text.
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 * @param {{ geminiApiKey: string }} env
 */
export async function handleScheduleExtractRoute(req, res, env) {
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
    const rawText = typeof body.rawText === 'string' ? body.rawText.trim() : '';

    if (!fileData && !rawText) {
      sendJson(res, 400, {
        error: 'Unggah berkas KRS atau tempel teks jadwal terlebih dahulu.'
      });
      return;
    }

    if (fileData && !ALLOWED_MIME_TYPES.has(mimeType)) {
      sendJson(res, 400, {
        error: 'Format berkas harus PDF, PNG, JPG, atau WebP.'
      });
      return;
    }

    const modeLabel = fileData
      ? `file (${mimeType}, ${fileName || 'tanpa-nama'})`
      : 'teks-manual';
    log('REQ', `POST /api/schedule/extract | mode=${modeLabel}`);

    const { schedules, modelUsed } = await extractSchedulesWithGemini({
      fileData,
      mimeType,
      fileName,
      rawText,
      apiKey: env.geminiApiKey
    });

    log(
      'REQ',
      `Ekstraksi selesai (${schedules.length} mata kuliah via ${modelUsed})`,
      t0
    );
    sendJson(res, 200, { schedules, modelUsed });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Gagal mengekstrak jadwal kuliah.';
    const statusCode = /terlalu besar/i.test(message) ? 413 : 500;
    log('ERROR', `Endpoint /api/schedule/extract gagal: ${message}`, t0);
    sendJson(res, statusCode, { error: message });
  }
}
