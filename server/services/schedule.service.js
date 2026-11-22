import { requestJsonIPv4 } from '../utils/http.js';
import { log } from '../utils/logger.js';

/**
 * Format a Supabase schedule row into UI-friendly shape.
 * @param {Record<string, any>} row
 */
function formatScheduleRow(row) {
  return {
    id: row.id,
    day: row.day || 'Senin',
    time: row.time_range || row.time || '-',
    subject: row.subject || '',
    lecturer: row.lecturer || '',
    room: row.room || ''
  };
}

/**
 * Insert a new course schedule row in Supabase on behalf of the authenticated student.
 * @param {{
 *   userId: string,
 *   accessToken: string,
 *   payload: { day?: string, time?: string, subject: string, lecturer?: string, room?: string },
 *   env: { supabaseUrl: string, supabaseAnonKey: string }
 * }} params
 */
export async function createScheduleServer({
  userId,
  accessToken,
  payload,
  env
}) {
  const t0 = Date.now();
  const res = await requestJsonIPv4({
    url: `${env.supabaseUrl}/rest/v1/schedules`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: env.supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
      Prefer: 'return=representation'
    },
    body: {
      user_id: userId,
      day: payload.day || 'Senin',
      time_range: payload.time || '-',
      subject: payload.subject,
      lecturer: payload.lecturer || '',
      room: payload.room || ''
    },
    timeoutMs: 15000
  });

  if (!res.ok) {
    const detail = res.json?.message || res.text || `HTTP ${res.status}`;
    throw new Error(`Gagal menambah jadwal ke Supabase: ${detail}`);
  }

  const created = Array.isArray(res.json) ? res.json[0] : res.json;
  log('RAG', `Jadwal baru disimpan ke Supabase: ${created?.subject}`, t0);
  return formatScheduleRow(created || payload);
}

/**
 * Update an existing course schedule row in Supabase for the authenticated student.
 * @param {{
 *   userId: string,
 *   accessToken: string,
 *   scheduleId: string,
 *   payload: { day?: string, time?: string, subject?: string, lecturer?: string, room?: string },
 *   env: { supabaseUrl: string, supabaseAnonKey: string }
 * }} params
 */
export async function updateScheduleServer({
  userId,
  accessToken,
  scheduleId,
  payload,
  env
}) {
  const t0 = Date.now();
  /** @type {Record<string, any>} */
  const patchBody = {};
  if (payload.day) patchBody.day = payload.day;
  if (payload.time) patchBody.time_range = payload.time;
  if (payload.subject) patchBody.subject = payload.subject;
  if (payload.lecturer !== undefined && payload.lecturer !== '') {
    patchBody.lecturer = payload.lecturer;
  }
  if (payload.room !== undefined && payload.room !== '') {
    patchBody.room = payload.room;
  }

  const query = `id=eq.${encodeURIComponent(scheduleId)}&user_id=eq.${encodeURIComponent(userId)}`;
  const res = await requestJsonIPv4({
    url: `${env.supabaseUrl}/rest/v1/schedules?${query}`,
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
    throw new Error(`Gagal memperbarui jadwal di Supabase: ${detail}`);
  }

  const updated = Array.isArray(res.json) ? res.json[0] : res.json;
  if (!updated) {
    throw new Error('Jadwal yang ingin diubah tidak ditemukan di database.');
  }

  log('RAG', `Jadwal diperbarui di Supabase: ${updated.subject}`, t0);
  return formatScheduleRow(updated);
}
