import { supabase } from './supabase.js';

const SERVER_OFFLINE_MSG =
  'Server Backend AI (port 3001) belum berjalan. Buka terminal baru dan jalankan: npm run server';

const REQUEST_TIMEOUT_MS = 120000;

/**
 * Normalize backend fetch errors (offline proxy, timeout, HTML fallback, JSON errors).
 * @param {Response} res
 * @param {string} endpointLabel
 * @returns {Promise<never>}
 */
async function throwFriendlyApiError(res, endpointLabel) {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('text/html')) {
    throw new Error(
      `Koneksi ke ${endpointLabel} mengembalikan HTML, bukan respons server AI. Pastikan 'npm run server' sudah berjalan dan restart 'npm run dev'.`
    );
  }

  let detail = '';
  if (contentType.includes('application/json')) {
    const err = await res.json().catch(() => null);
    detail = err?.error || err?.message || '';
  } else {
    detail = (await res.text().catch(() => '')).trim();
  }

  if (
    !detail &&
    (res.status === 500 ||
      res.status === 502 ||
      res.status === 503 ||
      res.status === 504)
  ) {
    throw new Error(SERVER_OFFLINE_MSG);
  }

  if (
    res.status === 502 ||
    res.status === 504 ||
    (res.status === 503 && /proxy|econnrefused/i.test(detail))
  ) {
    throw new Error(SERVER_OFFLINE_MSG);
  }

  throw new Error(detail || `Server error (${res.status})`);
}

/**
 * Call backend endpoint with timeout and offline detection.
 * @param {string} url
 * @param {RequestInit} init
 * @returns {Promise<Response>}
 */
async function fetchBackend(url, init) {
  try {
    return await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      throw new Error(
        'Permintaan ke server AI melewati batas waktu (120 detik). Cek terminal backend atau coba lagi.'
      );
    }
    throw new Error(SERVER_OFFLINE_MSG);
  }
}

/**
 * Split raw study material into overlapping text chunks for RAG.
 * @param {string} text
 * @param {number} chunkSize
 * @param {number} overlap
 * @returns {string[]}
 */
export function chunkText(text, chunkSize = 700, overlap = 100) {
  const cleaned = text.replace(/\r\n/g, '\n').trim();
  if (!cleaned) return [];
  if (cleaned.length <= chunkSize) return [cleaned];

  const chunks = [];
  let start = 0;
  while (start < cleaned.length) {
    const end = Math.min(start + chunkSize, cleaned.length);
    chunks.push(cleaned.slice(start, end).trim());
    if (end >= cleaned.length) break;
    start += chunkSize - overlap;
  }
  return chunks.filter(Boolean);
}

/**
 * Generate 768-dimension embedding via PENS Copilot AI backend (/api/rag/embed).
 * @param {string} text
 * @returns {Promise<number[]>}
 */
export async function embedText(text) {
  const res = await fetchBackend('/api/rag/embed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });

  if (!res.ok) {
    await throwFriendlyApiError(res, '/api/rag/embed');
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    await throwFriendlyApiError(res, '/api/rag/embed');
  }

  const data = await res.json();
  return data?.embedding || [];
}

/**
 * Store study material and batch-embed its chunks via backend (/api/rag/embed) into Supabase pgvector.
 * @param {{ title: string, subject?: string, rawText: string, userId: string }} params
 */
export async function ingestMaterial({ title, subject = '', rawText, userId }) {
  const chunks = chunkText(rawText);
  if (chunks.length === 0) {
    throw new Error('Konten materi tidak boleh kosong.');
  }

  const [materialRes, embedRes] = await Promise.all([
    supabase
      .from('study_materials')
      .insert({ user_id: userId, title, subject })
      .select('id, title, subject')
      .single(),
    fetchBackend('/api/rag/embed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts: chunks })
    })
  ]);

  if (materialRes.error) throw new Error(materialRes.error.message);
  if (!embedRes.ok) {
    await throwFriendlyApiError(embedRes, '/api/rag/embed');
  }

  const contentType = embedRes.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    await throwFriendlyApiError(embedRes, '/api/rag/embed');
  }

  const { embeddings } = await embedRes.json();
  const material = materialRes.data;
  const rows = chunks.map((content, idx) => ({
    material_id: material.id,
    user_id: userId,
    content,
    embedding: embeddings[idx]
  }));

  const { error: chunkError } = await supabase.from('document_chunks').insert(rows);
  if (chunkError) throw new Error(chunkError.message);

  return { material, chunkCount: rows.length };
}

/**
 * Ingest PDF, DOCX, TXT/MD file or pasted notes via /api/rag/ingest and persist to Supabase pgvector.
 * @param {{
 *   title: string,
 *   subject?: string,
 *   fileData?: string,
 *   mimeType?: string,
 *   fileName?: string,
 *   rawText?: string,
 *   userId: string
 * }} params
 */
export async function ingestMaterialDocument({
  title,
  subject = '',
  fileData = '',
  mimeType = '',
  fileName = '',
  rawText = '',
  userId,
  tier = 'free'
}) {
  const ingestRes = await fetchBackend('/api/rag/ingest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileData, mimeType, fileName, rawText, tier })
  });

  if (!ingestRes.ok) {
    await throwFriendlyApiError(ingestRes, '/api/rag/ingest');
  }

  const contentType = ingestRes.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    await throwFriendlyApiError(ingestRes, '/api/rag/ingest');
  }

  const { chunks, embeddings, charCount, chunkCount, truncated } =
    await ingestRes.json();

  if (!Array.isArray(chunks) || !chunks.length) {
    throw new Error('Tidak ada potongan teks materi yang berhasil dibuat.');
  }

  const materialRes = await supabase
    .from('study_materials')
    .insert({ user_id: userId, title, subject })
    .select('id, title, subject, created_at')
    .single();

  if (materialRes.error) {
    throw new Error(materialRes.error.message);
  }

  const material = materialRes.data;
  const rows = chunks.map((content, idx) => ({
    material_id: material.id,
    user_id: userId,
    content,
    embedding: embeddings[idx]
  }));

  const { error: chunkError } = await supabase
    .from('document_chunks')
    .insert(rows);

  if (chunkError) {
    await supabase.from('study_materials').delete().eq('id', material.id);
    throw new Error(chunkError.message);
  }

  return {
    material,
    chunkCount: Number(chunkCount || rows.length),
    charCount: Number(charCount || 0),
    truncated: Boolean(truncated)
  };
}

/**
 * Stream reply and optional interactive card from PENS Copilot AI backend (/api/chat).
 * @param {{
 *   prompt: string,
 *   history?: Array<{ sender: 'user' | 'assistant', text: string }>,
 *   userContext?: {
 *     name?: string,
 *     nrp?: string,
 *     prodi?: string,
 *     schedules?: Array<any>,
 *     tasks?: Array<any>
 *   },
 *   userId?: string | null,
 *   hasMaterials?: boolean,
 *   accessToken?: string | null,
 *   model?: string,
 *   onDelta?: (delta: string, accumulated: string) => void,
 *   onCard?: (
 *     card: Record<string, any> | null,
 *     schedulesUpdated: boolean,
 *     tasksUpdated: boolean,
 *     blocks?: Array<Record<string, any>>
 *   ) => void
 * }} params
 * @returns {Promise<{ text: string, card: Record<string, any> | null, blocks: Array<Record<string, any>>, schedulesUpdated: boolean, tasksUpdated: boolean }>}
 */
export async function askPensCopilotStream({
  prompt,
  history = [],
  userContext = {},
  userId = null,
  hasMaterials = false,
  accessToken = null,
  model = 'gemini-3.6-flash',
  tier = 'free',
  ragQuotaExceeded = false,
  onDelta = () => {},
  onCard = () => {}
}) {
  const res = await fetchBackend('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      history,
      userContext,
      userId,
      hasMaterials,
      accessToken,
      model,
      tier,
      ragQuotaExceeded
    })
  });

  if (!res.ok) {
    await throwFriendlyApiError(res, '/api/chat');
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const data = await res.json();
    if (data?.error) {
      throw new Error(data.error);
    }
    const reply = data?.reply || '';
    const card = data?.card || null;
    const blocks = Array.isArray(data?.blocks) ? data.blocks : [];
    const schedulesUpdated = Boolean(data?.schedulesUpdated);
    const tasksUpdated = Boolean(data?.tasksUpdated);
    if (reply) onDelta(reply, reply);
    if (card || blocks.length > 0 || schedulesUpdated || tasksUpdated) {
      onCard(card, schedulesUpdated, tasksUpdated, blocks);
    }
    return {
      text: reply || 'Maaf, saya tidak menerima respons dari AI. Silakan coba lagi.',
      card,
      blocks,
      schedulesUpdated,
      tasksUpdated
    };
  }

  if (!contentType.includes('text/event-stream')) {
    throw new Error(
      "Koneksi ke /api/chat mengembalikan HTML, bukan stream AI. Pastikan 'npm run server' sudah berjalan dan restart 'npm run dev'."
    );
  }

  if (!res.body) {
    throw new Error('Streaming tidak didukung oleh browser ini.');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullReply = '';
  /** @type {Record<string, any> | null} */
  let latestCard = null;
  /** @type {Array<Record<string, any>>} */
  let latestBlocks = [];
  let schedulesUpdated = false;
  let tasksUpdated = false;
  let ragUsed = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || '';

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;

      let parsed;
      try {
        parsed = JSON.parse(payload);
      } catch {
        continue;
      }

      if (parsed.error) {
        throw new Error(parsed.error);
      }
      if (parsed.ragUsed !== undefined) {
        ragUsed = Boolean(parsed.ragUsed || ragUsed);
      }
      if (parsed.delta) {
        fullReply += parsed.delta;
        onDelta(parsed.delta, fullReply);
      }
      if (
        parsed.card !== undefined ||
        parsed.blocks !== undefined ||
        parsed.schedulesUpdated !== undefined ||
        parsed.tasksUpdated !== undefined
      ) {
        if (parsed.card) latestCard = parsed.card;
        if (Array.isArray(parsed.blocks)) latestBlocks = parsed.blocks;
        if (parsed.schedulesUpdated) schedulesUpdated = true;
        if (parsed.tasksUpdated) tasksUpdated = true;
        onCard(latestCard, schedulesUpdated, tasksUpdated, latestBlocks);
      }
    }
  }

  return {
    text: fullReply || 'Maaf, saya tidak menerima respons dari AI. Silakan coba lagi.',
    card: latestCard,
    blocks: latestBlocks,
    schedulesUpdated,
    tasksUpdated,
    ragUsed
  };
}

/**
 * Extract structured course schedules from KRS file (PDF/image) or raw text via backend AI.
 * @param {{
 *   fileData?: string,
 *   mimeType?: string,
 *   fileName?: string,
 *   rawText?: string
 * }} params
 * @returns {Promise<{
 *   schedules: Array<{ day: string, time: string, subject: string, lecturer: string, room: string }>,
 *   modelUsed: string
 * }>}
 */
export async function extractSchedules({
  fileData = '',
  mimeType = '',
  fileName = '',
  rawText = ''
}) {
  const res = await fetchBackend('/api/schedule/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileData, mimeType, fileName, rawText })
  });

  if (!res.ok) {
    await throwFriendlyApiError(res, '/api/schedule/extract');
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    await throwFriendlyApiError(res, '/api/schedule/extract');
  }

  const data = await res.json();
  return {
    schedules: Array.isArray(data?.schedules) ? data.schedules : [],
    modelUsed: data?.modelUsed || ''
  };
}

/**
 * Safely escape HTML and render lightweight Markdown (code blocks, inline code, bold, italic, lists).
 * @param {string} text
 * @returns {string}
 */
export function renderMarkdown(text) {
  if (!text) return '';

  let escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const codeBlocks = [];
  escaped = escaped.replace(/```([^\n]*)\r?\n([\s\S]*?)```/g, (_, _lang, code) => {
    const idx = codeBlocks.length;
    codeBlocks.push(
      `<pre class="my-2 p-3 rounded-xl bg-slate-900 text-slate-100 text-xs overflow-x-auto font-mono"><code>${code.trim()}</code></pre>`
    );
    return `@@CODEBLOCK_${idx}@@`;
  });

  escaped = escaped
    .replace(/`([^`\n]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-slate-100 text-[#02389E] font-mono text-[12px]">$1</code>')
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>')
    .replace(/\*([^*\n]+)\*/g, '<em>$1</em>');

  const lines = escaped.split(/\r?\n/);
  const htmlLines = [];
  let inList = false;

  for (const line of lines) {
    const listMatch = line.match(/^\s*[-*]\s+(.+)$/);
    if (listMatch) {
      if (!inList) {
        htmlLines.push('<ul class="list-disc pl-5 my-1.5 space-y-1">');
        inList = true;
      }
      htmlLines.push(`<li>${listMatch[1]}</li>`);
    } else {
      if (inList) {
        htmlLines.push('</ul>');
        inList = false;
      }
      if (line.trim() === '') {
        htmlLines.push('<div class="h-1.5"></div>');
      } else {
        htmlLines.push(`<p class="leading-relaxed">${line}</p>`);
      }
    }
  }
  if (inList) htmlLines.push('</ul>');

  let result = htmlLines.join('');
  result = result.replace(/@@CODEBLOCK_(\d+)@@/g, (_, idx) => codeBlocks[Number(idx)] || '');
  return result;
}
