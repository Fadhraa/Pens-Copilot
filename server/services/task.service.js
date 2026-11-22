import { requestJsonIPv4 } from '../utils/http.js';
import { log } from '../utils/logger.js';

/**
 * Format Supabase task row for API responses and interactive cards.
 * @param {Record<string, any>} row
 */
export function formatTaskRow(row) {
  return {
    id: row.id || '',
    schedule_id: row.schedule_id || null,
    title: row.title || '',
    description: row.description || '',
    deadline: row.deadline || null,
    status: row.status || 'pending',
    priority: row.priority || 'medium'
  };
}

/**
 * Normalize status input from user/LLM into valid database enum values.
 * @param {string} rawStatus
 * @returns {'pending' | 'in_progress' | 'completed'}
 */
export function normalizeTaskStatus(rawStatus) {
  const s = String(rawStatus || '').trim().toLowerCase();
  if (
    s === 'completed' ||
    s === 'done' ||
    s.includes('selesai') ||
    s.includes('kelar')
  ) {
    return 'completed';
  }
  if (
    s === 'in_progress' ||
    s === 'progress' ||
    s.includes('proses') ||
    s.includes('kerjakan') ||
    s.includes('sedang')
  ) {
    return 'in_progress';
  }
  return 'pending';
}

/**
 * Normalize priority input from user/LLM into valid database enum values.
 * @param {string} rawPriority
 * @returns {'low' | 'medium' | 'high'}
 */
export function normalizeTaskPriority(rawPriority) {
  const p = String(rawPriority || '').trim().toLowerCase();
  if (p === 'high' || p.includes('tinggi') || p.includes('urgent') || p.includes('mendesak')) {
    return 'high';
  }
  if (p === 'low' || p.includes('rendah') || p.includes('santai')) {
    return 'low';
  }
  return 'medium';
}

/**
 * Insert a new student task row in Supabase.
 * @param {{
 *   userId: string,
 *   accessToken: string,
 *   payload: { title: string, description?: string, deadline?: string | null, status?: string, priority?: string, schedule_id?: string | null },
 *   env: { supabaseUrl: string, supabaseAnonKey: string }
 * }} params
 */
export async function createTaskServer({ userId, accessToken, payload, env }) {
  const t0 = Date.now();
  const res = await requestJsonIPv4({
    url: `${env.supabaseUrl}/rest/v1/tasks`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: env.supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
      Prefer: 'return=representation'
    },
    body: {
      user_id: userId,
      title: String(payload.title || '').trim(),
      description: String(payload.description || '').trim() || null,
      deadline: payload.deadline || null,
      status: normalizeTaskStatus(payload.status || 'pending'),
      priority: normalizeTaskPriority(payload.priority || 'medium'),
      schedule_id: payload.schedule_id || null
    },
    timeoutMs: 15000
  });

  if (!res.ok) {
    const detail = res.json?.message || res.text || `HTTP ${res.status}`;
    throw new Error(`Gagal menambah tugas ke Supabase: ${detail}`);
  }

  const created = Array.isArray(res.json) ? res.json[0] : res.json;
  log('RAG', `Tugas baru disimpan ke Supabase: ${created?.title}`, t0);
  return formatTaskRow(created || payload);
}

/**
 * Update an existing student task row in Supabase.
 * @param {{
 *   userId: string,
 *   accessToken: string,
 *   taskId: string,
 *   payload: { title?: string, description?: string, deadline?: string | null, status?: string, priority?: string },
 *   env: { supabaseUrl: string, supabaseAnonKey: string }
 * }} params
 */
export async function updateTaskServer({
  userId,
  accessToken,
  taskId,
  payload,
  env
}) {
  const t0 = Date.now();
  /** @type {Record<string, any>} */
  const patchBody = {
    updated_at: new Date().toISOString()
  };

  if (payload.title) patchBody.title = String(payload.title).trim();
  if (payload.description !== undefined && payload.description !== '') {
    patchBody.description = String(payload.description).trim();
  }
  if (payload.deadline !== undefined && payload.deadline !== '') {
    patchBody.deadline = payload.deadline;
  }
  if (payload.status) {
    patchBody.status = normalizeTaskStatus(payload.status);
  }
  if (payload.priority) {
    patchBody.priority = normalizeTaskPriority(payload.priority);
  }

  const query = `id=eq.${encodeURIComponent(taskId)}&user_id=eq.${encodeURIComponent(userId)}`;
  const res = await requestJsonIPv4({
    url: `${env.supabaseUrl}/rest/v1/tasks?${query}`,
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      apikey: env.supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
      Prefer: 'return=representation'
    },
    body: patchBody,
    timeoutMs: 15000
  });

  if (!res.ok) {
    const detail = res.json?.message || res.text || `HTTP ${res.status}`;
    throw new Error(`Gagal memperbarui tugas di Supabase: ${detail}`);
  }

  const updated = Array.isArray(res.json) ? res.json[0] : res.json;
  if (!updated) {
    throw new Error('Tugas yang ingin diperbarui tidak ditemukan di database.');
  }

  log('RAG', `Tugas diperbarui di Supabase: ${updated.title}`, t0);
  return formatTaskRow(updated);
}
