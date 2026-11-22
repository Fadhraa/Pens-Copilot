import { applyCors, readJsonBody, writeSse } from '../utils/http.js';
import { log } from '../utils/logger.js';
import {
  callGeminiInteractiveChat,
  normalizeScheduleDay
} from '../services/gemini.service.js';
import { retrieveRagChunksServer, shouldSkipRag } from '../services/rag.service.js';
import {
  createScheduleServer,
  updateScheduleServer
} from '../services/schedule.service.js';
import {
  createTaskServer,
  formatTaskRow,
  normalizeTaskPriority,
  normalizeTaskStatus,
  updateTaskServer
} from '../services/task.service.js';

/**
 * Format schedule row to card item shape.
 * @param {Record<string, any>} row
 */
function toCardScheduleItem(row) {
  return {
    id: row.id || '',
    day: row.day || 'Senin',
    time: row.time_range || row.time || '-',
    subject: row.subject || '',
    lecturer: row.lecturer || '',
    room: row.room || ''
  };
}

/**
 * Resolve target row from AI payload id or case-insensitive label match.
 * @param {Array<Record<string, any>>} rows
 * @param {Record<string, any> | null} payload
 * @param {'subject' | 'title'} labelField
 */
function findMatchingRow(rows = [], payload = null, labelField = 'subject') {
  if (!Array.isArray(rows) || rows.length === 0 || !payload) {
    return null;
  }

  if (payload.id) {
    const byId = rows.find((r) => String(r.id) === String(payload.id));
    if (byId) return byId;
  }

  const target = String(payload[labelField] || '').trim().toLowerCase();
  if (!target) return null;

  const exact = rows.find(
    (r) => String(r[labelField] || '').trim().toLowerCase() === target
  );
  if (exact) return exact;

  return (
    rows.find((r) => {
      const name = String(r[labelField] || '').trim().toLowerCase();
      return name.includes(target) || target.includes(name);
    }) || null
  );
}

/**
 * Filter schedules by normalized weekday unless filterDay is empty or "Semua".
 * @param {Array<Record<string, any>>} schedules
 * @param {string} filterDay
 */
function filterSchedulesByDay(schedules = [], filterDay = '') {
  const cleanFilter = String(filterDay || '').trim();
  if (!cleanFilter || /^semua$/i.test(cleanFilter)) {
    return {
      normalizedDay: 'Semua',
      items: schedules.map(toCardScheduleItem)
    };
  }

  const normalizedDay = normalizeScheduleDay(cleanFilter);
  const items = schedules
    .filter(
      (s) =>
        normalizeScheduleDay(s.day || '').toLowerCase() ===
        normalizedDay.toLowerCase()
    )
    .map(toCardScheduleItem);

  return { normalizedDay, items };
}

/**
 * Remove accidental outer Markdown code fences wrapped inside structured code block content.
 * @param {string} raw
 */
function stripCodeFence(raw) {
  return String(raw || '')
    .replace(/^```[^\n]*\r?\n/, '')
    .replace(/\r?\n```$/, '')
    .trim();
}

/**
 * Split any fenced code snippets embedded inside a markdown string into alternating markdown and code blocks.
 * @param {string} rawContent
 * @returns {Array<Record<string, any>>}
 */
function splitMarkdownAndFencedCode(rawContent) {
  const text = String(rawContent || '').trim();
  if (!text) return [];

  const pattern = /```([^\n`]*)\r?\n([\s\S]*?)```/g;
  /** @type {Array<Record<string, any>>} */
  const segments = [];
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    const before = text.slice(lastIndex, match.index).trim();
    if (before) {
      segments.push({ type: 'markdown', content: before });
    }
    const lang = String(match[1] || 'text').trim() || 'text';
    const code = String(match[2] || '').trim();
    if (code) {
      segments.push({ type: 'code', language: lang, title: '', code });
    }
    lastIndex = match.index + match[0].length;
  }

  const tail = text.slice(lastIndex).trim();
  if (tail) {
    segments.push({ type: 'markdown', content: tail });
  }
  return segments;
}

/**
 * Normalize and hydrate ordered multi-blocks using trusted server/user database context.
 * @param {{
 *   rawBlocks: Array<Record<string, any>>,
 *   aiResult: Record<string, any>,
 *   userSchedules: Array<Record<string, any>>,
 *   userTasks: Array<Record<string, any>>,
 *   reply: string,
 *   replyOverridden: boolean,
 *   fallbackCard: Record<string, any> | null
 * }} params
 */
function hydrateInteractiveBlocks({
  rawBlocks = [],
  aiResult = {},
  userSchedules = [],
  userTasks = [],
  reply = '',
  replyOverridden = false,
  fallbackCard = null
}) {
  /** @type {Array<Record<string, any>>} */
  const hydrated = [];

  for (const raw of Array.isArray(rawBlocks) ? rawBlocks : []) {
    if (!raw || typeof raw.type !== 'string') continue;

    switch (raw.type) {
      case 'markdown': {
        for (const seg of splitMarkdownAndFencedCode(raw.content || '')) {
          hydrated.push(seg);
        }
        break;
      }

      case 'list_card': {
        const items = (Array.isArray(raw.items) ? raw.items : [])
          .map((item) => String(item || '').trim())
          .filter(Boolean);
        if (items.length > 0) {
          hydrated.push({
            type: 'list_card',
            title: String(raw.title || 'Ringkasan Poin').trim(),
            subtitle: String(raw.subtitle || '').trim(),
            style: raw.style === 'numbered' ? 'numbered' : 'bullet',
            items
          });
        }
        break;
      }

      case 'code': {
        const cleanedCode = stripCodeFence(raw.code || raw.content || '');
        if (cleanedCode) {
          hydrated.push({
            type: 'code',
            language: String(raw.language || 'text').trim() || 'text',
            title: String(raw.title || '').trim(),
            code: cleanedCode
          });
        }
        break;
      }

      case 'callout': {
        const content = String(raw.content || '').trim();
        if (content) {
          const variant = ['tip', 'info', 'warning'].includes(raw.variant)
            ? raw.variant
            : 'tip';
          hydrated.push({
            type: 'callout',
            variant,
            title: String(raw.title || '').trim(),
            content
          });
        }
        break;
      }

      case 'schedule_list': {
        const { normalizedDay, items } = filterSchedulesByDay(
          userSchedules,
          raw.filterDay || aiResult.scheduleFilterDay || ''
        );
        hydrated.push({
          type: 'schedule_list',
          title:
            normalizedDay === 'Semua'
              ? 'Jadwal Kuliah Mingguan'
              : `Jadwal Kuliah Hari ${normalizedDay}`,
          filterDay: normalizedDay,
          items
        });
        break;
      }

      case 'task_list': {
        hydrated.push({
          type: 'task_list',
          title: String(raw.title || 'Daftar Tugas & Deadline').trim(),
          items: userTasks.map((t) => formatTaskRow(t))
        });
        break;
      }

      default:
        break;
    }
  }

  if (hydrated.length === 0 && reply && !replyOverridden) {
    for (const seg of splitMarkdownAndFencedCode(reply)) {
      hydrated.push(seg);
    }
  }

  if (replyOverridden && reply) {
    const mdIdx = hydrated.findIndex((b) => b.type === 'markdown');
    if (mdIdx >= 0) {
      hydrated[mdIdx] = { type: 'markdown', content: reply };
    } else {
      hydrated.unshift({ type: 'markdown', content: reply });
    }
  }

  const summaryPoints = Array.isArray(aiResult.summaryCard?.points)
    ? aiResult.summaryCard.points.map((x) => String(x || '').trim()).filter(Boolean)
    : [];
  if (
    summaryPoints.length > 0 &&
    !hydrated.some((b) => b.type === 'list_card' || b.type === 'summary')
  ) {
    hydrated.push({
      type: 'list_card',
      title: String(aiResult.summaryCard?.title || 'Ringkasan Materi').trim(),
      subtitle: String(aiResult.summaryCard?.subtitle || '').trim(),
      style: aiResult.summaryCard?.style === 'numbered' ? 'numbered' : 'bullet',
      items: summaryPoints
    });
  }

  const cleanedCodeBlock = stripCodeFence(aiResult.codeBlock?.code || '');
  if (
    cleanedCodeBlock &&
    !hydrated.some((b) => b.type === 'code' && b.code === cleanedCodeBlock)
  ) {
    hydrated.push({
      type: 'code',
      language: String(aiResult.codeBlock?.language || 'text').trim() || 'text',
      title: String(aiResult.codeBlock?.title || '').trim(),
      code: cleanedCodeBlock
    });
  }

  const summaryTip = String(aiResult.summaryCard?.tip || '').trim();
  if (summaryTip && !hydrated.some((b) => b.type === 'callout')) {
    hydrated.push({
      type: 'callout',
      variant: 'tip',
      title: 'Catatan Belajar',
      content: summaryTip
    });
  }

  if (
    (aiResult.includeScheduleList || aiResult.intent === 'show_schedule') &&
    !hydrated.some((b) => b.type === 'schedule_list')
  ) {
    const { normalizedDay, items } = filterSchedulesByDay(
      userSchedules,
      aiResult.scheduleFilterDay || ''
    );
    hydrated.push({
      type: 'schedule_list',
      title:
        normalizedDay === 'Semua'
          ? 'Jadwal Kuliah Mingguan'
          : `Jadwal Kuliah Hari ${normalizedDay}`,
      filterDay: normalizedDay,
      items
    });
  }

  if (
    (aiResult.includeTaskList || aiResult.intent === 'show_tasks') &&
    !hydrated.some((b) => b.type === 'task_list')
  ) {
    hydrated.push({
      type: 'task_list',
      title: 'Daftar Tugas & Deadline',
      items: userTasks.map((t) => formatTaskRow(t))
    });
  }

  if (fallbackCard) {
    const isDuplicateList =
      (fallbackCard.type === 'schedule_list' ||
        fallbackCard.type === 'task_list') &&
      hydrated.some((b) => b.type === fallbackCard.type);
    const isDuplicateSummary =
      fallbackCard.type === 'summary' &&
      hydrated.some((b) => b.type === 'list_card' || b.type === 'summary');

    if (!isDuplicateList && !isDuplicateSummary) {
      hydrated.push(fallbackCard);
    }
  }

  if (hydrated.length === 0 && reply) {
    hydrated.push({ type: 'markdown', content: reply });
  }

  return hydrated;
}

/**
 * Build interactive rich card and execute server-side schedule/task mutations.
 * @param {{
 *   aiResult: Record<string, any>,
 *   userContext: Record<string, any>,
 *   userId: string | null,
 *   accessToken: string | null,
 *   env: { supabaseUrl: string, supabaseAnonKey: string }
 * }} params
 */
async function resolveInteractiveCard({
  aiResult,
  userContext,
  userId,
  accessToken,
  env
}) {
  const userSchedules = Array.isArray(userContext?.schedules)
    ? userContext.schedules
    : [];
  const userTasks = Array.isArray(userContext?.tasks) ? userContext.tasks : [];

  const initialReply = aiResult.reply;
  let reply = initialReply;
  let card = null;
  let schedulesUpdated = false;
  let tasksUpdated = false;

  switch (aiResult.intent) {
    case 'show_schedule': {
      const { normalizedDay, items } = filterSchedulesByDay(
        userSchedules,
        aiResult.scheduleFilterDay
      );
      card = {
        type: 'schedule_list',
        title:
          normalizedDay === 'Semua'
            ? 'Jadwal Kuliah Mingguan'
            : `Jadwal Kuliah Hari ${normalizedDay}`,
        filterDay: normalizedDay,
        items
      };
      break;
    }

    case 'show_tasks': {
      card = {
        type: 'task_list',
        title: 'Daftar Tugas & Deadline',
        items: userTasks.map((t) => formatTaskRow(t))
      };
      break;
    }

    case 'show_summary': {
      const points = Array.isArray(aiResult.summaryCard?.points)
        ? aiResult.summaryCard.points.filter(Boolean)
        : [];
      if (points.length > 0) {
        card = {
          type: 'summary',
          title: aiResult.summaryCard?.title || 'Ringkasan Materi',
          subtitle: aiResult.summaryCard?.subtitle || '',
          points,
          tip: aiResult.summaryCard?.tip || ''
        };
      }
      break;
    }

    case 'create_schedule': {
      const payload = aiResult.schedulePayload;
      if (!payload?.subject) break;

      if (!userId || !accessToken || !env.supabaseUrl) {
        reply = `${reply}\n\n(Silakan login dengan akun terdaftar agar jadwal dapat disimpan ke database.)`;
        break;
      }

      const createdItem = await createScheduleServer({
        userId,
        accessToken,
        payload: {
          day: normalizeScheduleDay(payload.day || 'Senin'),
          time: payload.time || '-',
          subject: payload.subject,
          lecturer: payload.lecturer || '',
          room: payload.room || ''
        },
        env
      });
      schedulesUpdated = true;
      card = {
        type: 'schedule_action',
        action: 'created',
        title: 'Jadwal Berhasil Ditambahkan',
        item: createdItem
      };
      break;
    }

    case 'update_schedule': {
      const matched = findMatchingRow(
        userSchedules,
        aiResult.schedulePayload,
        'subject'
      );
      if (!matched?.id) {
        reply =
          'Saya tidak menemukan mata kuliah tersebut di jadwal tersimpan Anda. Coba sebutkan nama mata kuliah dengan lebih spesifik.';
        break;
      }
      if (!userId || !accessToken || !env.supabaseUrl) {
        reply =
          'Silakan login dengan akun terdaftar agar perubahan jadwal dapat disimpan.';
        break;
      }

      const p = aiResult.schedulePayload || {};
      const updatedItem = await updateScheduleServer({
        userId,
        accessToken,
        scheduleId: String(matched.id),
        payload: {
          day: p.day ? normalizeScheduleDay(p.day) : matched.day,
          time: p.time || matched.time_range || matched.time || '-',
          subject: p.subject || matched.subject,
          lecturer:
            p.lecturer !== undefined && p.lecturer !== ''
              ? p.lecturer
              : matched.lecturer,
          room: p.room !== undefined && p.room !== '' ? p.room : matched.room
        },
        env
      });
      schedulesUpdated = true;
      card = {
        type: 'schedule_action',
        action: 'updated',
        title: 'Jadwal Berhasil Diperbarui',
        item: updatedItem
      };
      break;
    }

    case 'delete_schedule': {
      const matched = findMatchingRow(
        userSchedules,
        aiResult.schedulePayload,
        'subject'
      );
      if (!matched?.id) {
        reply =
          'Saya tidak menemukan mata kuliah tersebut di daftar jadwal Anda. Pastikan nama mata kuliah sesuai.';
        break;
      }
      card = {
        type: 'schedule_delete_confirm',
        status: 'pending',
        title: 'Konfirmasi Hapus Jadwal',
        item: toCardScheduleItem(matched)
      };
      break;
    }

    case 'create_task': {
      const payload = aiResult.taskPayload;
      if (!payload?.title) break;

      if (!userId || !accessToken || !env.supabaseUrl) {
        reply = `${reply}\n\n(Silakan login dengan akun terdaftar agar tugas dapat disimpan ke database.)`;
        break;
      }

      const createdTask = await createTaskServer({
        userId,
        accessToken,
        payload: {
          title: payload.title,
          description: payload.description || '',
          deadline: payload.deadline || null,
          status: normalizeTaskStatus(payload.status || 'pending'),
          priority: normalizeTaskPriority(payload.priority || 'medium')
        },
        env
      });
      tasksUpdated = true;
      card = {
        type: 'task_action',
        action: 'created',
        title: 'Tugas Berhasil Ditambahkan',
        item: createdTask
      };
      break;
    }

    case 'update_task': {
      const matched = findMatchingRow(userTasks, aiResult.taskPayload, 'title');
      if (!matched?.id) {
        reply =
          'Saya tidak menemukan tugas tersebut di daftar tugas tersimpan Anda. Coba sebutkan judul tugasnya dengan lebih spesifik.';
        break;
      }
      if (!userId || !accessToken || !env.supabaseUrl) {
        reply =
          'Silakan login dengan akun terdaftar agar pembaruan tugas dapat disimpan.';
        break;
      }

      const p = aiResult.taskPayload || {};
      const updatedTask = await updateTaskServer({
        userId,
        accessToken,
        taskId: String(matched.id),
        payload: {
          title: p.title || matched.title,
          description:
            p.description !== undefined && p.description !== ''
              ? p.description
              : matched.description,
          deadline:
            p.deadline !== undefined && p.deadline !== ''
              ? p.deadline
              : matched.deadline,
          status: p.status ? normalizeTaskStatus(p.status) : matched.status,
          priority: p.priority
            ? normalizeTaskPriority(p.priority)
            : matched.priority
        },
        env
      });
      tasksUpdated = true;
      card = {
        type: 'task_action',
        action: 'updated',
        title: 'Tugas Berhasil Diperbarui',
        item: updatedTask
      };
      break;
    }

    case 'delete_task': {
      const matched = findMatchingRow(userTasks, aiResult.taskPayload, 'title');
      if (!matched?.id) {
        reply =
          'Saya tidak menemukan tugas tersebut di daftar tugas Anda. Pastikan judul tugas sesuai.';
        break;
      }
      card = {
        type: 'task_delete_confirm',
        status: 'pending',
        title: 'Konfirmasi Hapus Tugas',
        item: formatTaskRow(matched)
      };
      break;
    }

    default:
      break;
  }

  const replyOverridden = reply !== initialReply;
  const blocks = hydrateInteractiveBlocks({
    rawBlocks: aiResult.blocks,
    aiResult,
    userSchedules,
    userTasks,
    reply,
    replyOverridden,
    fallbackCard: card
  });

  const primaryCard = blocks.find((b) => b.type !== 'markdown') || card || null;

  return { reply, card: primaryCard, blocks, schedulesUpdated, tasksUpdated };
}

/**
 * Handle POST /api/chat via SSE with keepalive heartbeats, rich cards, and schedule/task CRUD orchestration.
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 * @param {{
 *   geminiApiKey: string,
 *   geminiModel: string,
 *   supabaseUrl: string,
 *   supabaseAnonKey: string
 * }} env
 */
export async function handleChatRoute(req, res, env) {
  const t0 = Date.now();
  let heartbeat = null;

  const stopHeartbeat = () => {
    if (heartbeat) {
      clearInterval(heartbeat);
      heartbeat = null;
    }
  };

  applyCors(res);
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.write(': connected\n\n');
  res.on('close', stopHeartbeat);

  heartbeat = setInterval(() => {
    if (!res.writableEnded) {
      res.write(': heartbeat\n\n');
    }
  }, 5000);

  try {
    if (!env.geminiApiKey) {
      stopHeartbeat();
      writeSse(res, {
        error: 'VITE_GOOGLE_API_KEY / GOOGLE_API_KEY belum tersedia di .env.'
      });
      writeSse(res, '[DONE]');
      res.end();
      return;
    }

    const body = await readJsonBody(req);
    const {
      prompt = '',
      history = [],
      userContext = {},
      userId = null,
      hasMaterials = false,
      accessToken = null,
      model
    } = body;

    const requestedModel = model || env.geminiModel || 'gemini-3.6-flash';
    const cleanedPrompt = String(prompt || '').trim();
    const promptPreview =
      cleanedPrompt.length > 48
        ? `${cleanedPrompt.slice(0, 48)}...`
        : cleanedPrompt;

    log('REQ', `POST /api/chat | model=${requestedModel} | prompt="${promptPreview}"`);

    const isFreeTier = String(body.tier || 'free').toLowerCase() !== 'pro';
    const isRagQuotaExceeded = Boolean(body.ragQuotaExceeded && isFreeTier);

    let ragChunks = [];
    if (isRagQuotaExceeded) {
      log('RAG', 'Melewati pencarian RAG karena kuota harian akun Free (10/10) telah habis');
    } else if (shouldSkipRag(cleanedPrompt, hasMaterials, userId)) {
      log('RAG', 'Melewati pencarian vektor RAG (sapaan singkat / belum ada materi)');
    } else {
      ragChunks = await retrieveRagChunksServer({
        query: cleanedPrompt,
        userId,
        accessToken,
        env
      });
    }

    const aiResult = await callGeminiInteractiveChat({
      prompt: cleanedPrompt,
      history,
      userContext,
      ragChunks,
      apiKey: env.geminiApiKey,
      model: requestedModel
    });

    const { reply, card, blocks, schedulesUpdated, tasksUpdated } =
      await resolveInteractiveCard({
        aiResult,
        userContext,
        userId,
        accessToken,
        env
      });

    stopHeartbeat();
    writeSse(res, {
      delta: reply,
      card,
      blocks,
      schedulesUpdated,
      tasksUpdated,
      ragUsed: ragChunks.length > 0,
      modelUsed: aiResult.modelUsed
    });
    writeSse(res, '[DONE]');
    res.end();

    log(
      'REQ',
      `Chat selesai (${reply.length} karakter | intent=${aiResult.intent} | blocks=[${blocks.map((b) => b.type).join(',')}] via ${aiResult.modelUsed})`,
      t0
    );
  } catch (err) {
    stopHeartbeat();
    const message =
      err instanceof Error ? err.message : 'Gagal terhubung ke server AI.';
    log('ERROR', `Endpoint /api/chat gagal: ${message}`, t0);
    writeSse(res, { error: message });
    writeSse(res, '[DONE]');
    res.end();
  }
}
