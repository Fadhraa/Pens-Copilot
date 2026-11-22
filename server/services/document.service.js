import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';

const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/**
 * Clean extracted document text by collapsing excessive blank lines and trailing spaces.
 * @param {string} raw
 * @returns {string}
 */
function sanitizeExtractedText(raw) {
  return String(raw || '')
    .replace(/\r\n/g, '\n')
    .replace(/\u0000/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Extract plain UTF-8 text from .pdf, .docx, .txt/.md files or pasted text.
 * @param {{
 *   fileData?: string,
 *   mimeType?: string,
 *   fileName?: string,
 *   rawText?: string
 * }} params
 * @returns {Promise<string>}
 */
export async function extractDocumentText({
  fileData = '',
  mimeType = '',
  fileName = '',
  rawText = ''
}) {
  if (rawText && rawText.trim() && !fileData) {
    return sanitizeExtractedText(rawText);
  }

  if (!fileData) {
    return '';
  }

  const buffer = Buffer.from(fileData, 'base64');
  const lowerName = String(fileName || '').toLowerCase();
  const lowerMime = String(mimeType || '').toLowerCase();

  if (lowerMime === 'application/pdf' || lowerName.endsWith('.pdf')) {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return sanitizeExtractedText(result?.text || '');
    } finally {
      await parser.destroy().catch(() => {});
    }
  }

  if (lowerMime === DOCX_MIME || lowerName.endsWith('.docx')) {
    const result = await mammoth.extractRawText({ buffer });
    return sanitizeExtractedText(result?.value || '');
  }

  if (
    lowerMime.startsWith('text/') ||
    lowerName.endsWith('.txt') ||
    lowerName.endsWith('.md') ||
    lowerName.endsWith('.csv') ||
    !lowerMime
  ) {
    return sanitizeExtractedText(buffer.toString('utf-8'));
  }

  throw new Error('Format berkas belum didukung. Gunakan PDF, DOCX, TXT, atau MD.');
}

/**
 * Split extracted text into overlapping chunks capped at maxChunks for predictable RAG latency.
 * @param {string} text
 * @param {number} [chunkSize]
 * @param {number} [overlap]
 * @param {number} [maxChunks]
 * @returns {{ chunks: string[], charCount: number, truncated: boolean }}
 */
export function chunkDocumentText(
  text,
  chunkSize = 750,
  overlap = 100,
  maxChunks = 40
) {
  const cleaned = sanitizeExtractedText(text);
  if (!cleaned) {
    return { chunks: [], charCount: 0, truncated: false };
  }

  if (cleaned.length <= chunkSize) {
    return { chunks: [cleaned], charCount: cleaned.length, truncated: false };
  }

  const chunks = [];
  let start = 0;
  let truncated = false;

  while (start < cleaned.length) {
    if (chunks.length >= maxChunks) {
      truncated = true;
      break;
    }
    const end = Math.min(start + chunkSize, cleaned.length);
    const slice = cleaned.slice(start, end).trim();
    if (slice) chunks.push(slice);
    if (end >= cleaned.length) break;
    start += chunkSize - overlap;
  }

  return {
    chunks,
    charCount: cleaned.length,
    truncated
  };
}

/**
 * Embed text chunks using a bounded concurrency pool to stay fast without hitting rate limits.
 * @param {string[]} chunks
 * @param {string} apiKey
 * @param {(text: string, apiKey: string) => Promise<number[]>} embedFn
 * @param {number} [concurrency]
 * @returns {Promise<number[][]>}
 */
export async function embedChunksWithConcurrency(
  chunks,
  apiKey,
  embedFn,
  concurrency = 5
) {
  if (!chunks.length) return [];

  const results = new Array(chunks.length);
  let cursor = 0;
  const workerCount = Math.min(concurrency, chunks.length);

  const workers = Array.from({ length: workerCount }, async () => {
    while (cursor < chunks.length) {
      const idx = cursor;
      cursor += 1;
      results[idx] = await embedFn(chunks[idx], apiKey);
    }
  });

  await Promise.all(workers);
  return results;
}
