const ATTENDANCE_STORAGE_KEY = 'pens_ethol_attended_v1';
const NOTIFIED_STORAGE_KEY = 'pens_ethol_notified_v1';

/**
 * Normalize a day name for matching against WIB weekday names.
 * @param {string} day
 * @returns {string}
 */
export function normalizeWeekday(day) {
  return String(day || '')
    .trim()
    .toLowerCase()
    .replace(/'/g, '');
}

/**
 * Parse strings like "08:00 - 10:30" or "08.00 sd 10.30" into start/end minutes since midnight.
 * @param {string} timeRange
 * @returns {{ startMin: number, endMin: number, durationMin: number } | null}
 */
export function parseTimeRangeMinutes(timeRange) {
  const matches = [...String(timeRange || '').matchAll(/(\d{1,2})[:.](\d{2})/g)];
  if (matches.length === 0) return null;

  const startHour = Number(matches[0][1]);
  const startMinute = Number(matches[0][2]);
  if (startHour > 23 || startMinute > 59) return null;
  const startMin = startHour * 60 + startMinute;

  let endMin = startMin + 100;
  if (matches.length >= 2) {
    const endHour = Number(matches[1][1]);
    const endMinute = Number(matches[1][2]);
    if (endHour <= 23 && endMinute <= 59) {
      const candidateEnd = endHour * 60 + endMinute;
      if (candidateEnd > startMin) {
        endMin = candidateEnd;
      }
    }
  }

  return {
    startMin,
    endMin,
    durationMin: endMin - startMin
  };
}

/**
 * Format minute-of-day into HH:MM string.
 * @param {number} totalMinutes
 * @returns {string}
 */
export function formatMinutesHHMM(totalMinutes) {
  const clamped = ((totalMinutes % 1440) + 1440) % 1440;
  const h = String(Math.floor(clamped / 60)).padStart(2, '0');
  const m = String(clamped % 60).padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Compute pre-alert (-15m) and 3 equal-interval slots across class duration (duration / 3).
 * @param {string} timeRange
 */
export function computeScheduleNotificationSlots(timeRange) {
  const parsed = parseTimeRangeMinutes(timeRange);
  if (!parsed) return [];

  const { startMin, endMin, durationMin } = parsed;
  const stepMin = Math.max(10, Math.round(durationMin / 3));

  const int2Min = Math.min(endMin - 5, startMin + stepMin);
  const int3Min = Math.min(endMin - 2, startMin + stepMin * 2);

  return [
    {
      key: 'pre_15',
      label: '15 Menit Sebelum Kuliah',
      shortLabel: 'Pre-Alert',
      triggerMin: Math.max(0, startMin - 15),
      windowEndMin: Math.max(0, startMin - 1),
      buildMessage: (subject, timeStr) =>
        `Kelas ${subject} dimulai pukul ${timeStr}. Bersiap masuk kelas atau buka tautan ETHOL.`
    },
    {
      key: 'interval_1',
      label: 'Interval 1 dari 3 (Kelas Dimulai)',
      shortLabel: 'Interval 1/3',
      triggerMin: startMin,
      windowEndMin: Math.max(startMin + 4, int2Min - 1),
      buildMessage: (subject) =>
        `Kuliah ${subject} sudah dimulai. Segera lakukan presensi ETHOL sekarang.`
    },
    {
      key: 'interval_2',
      label: 'Interval 2 dari 3 (Pengingat Tengah Kelas)',
      shortLabel: 'Interval 2/3',
      triggerMin: int2Min,
      windowEndMin: Math.max(int2Min + 4, int3Min - 1),
      buildMessage: (subject) =>
        `Pengingat kedua: pastikan presensi ETHOL untuk ${subject} sudah tercatat.`
    },
    {
      key: 'interval_3',
      label: 'Interval 3 dari 3 (Pengingat Akhir)',
      shortLabel: 'Interval 3/3',
      triggerMin: int3Min,
      windowEndMin: endMin,
      buildMessage: (subject) =>
        `Pengingat terakhir sebelum kelas ${subject} selesai. Cek kembali status presensi ETHOL Anda.`
    }
  ];
}

/**
 * Return current day name, YYYY-MM-DD key, and minute-of-day in WIB (Asia/Jakarta).
 * @param {Date} [now]
 */
export function getWibClock(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(now);

  const pick = (type) => parts.find((p) => p.type === type)?.value || '00';
  const year = pick('year');
  const month = pick('month');
  const day = pick('day');
  const hour = Number(pick('hour')) % 24;
  const minute = Number(pick('minute'));

  const weekday = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    weekday: 'long'
  }).format(now);

  return {
    dayName: weekday,
    normalizedDay: normalizeWeekday(weekday),
    dateKey: `${year}-${month}-${day}`,
    minutesNow: hour * 60 + minute,
    timeLabel: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
  };
}

/**
 * Build a stable per-course daily key for attendance and dedupe tracking.
 * @param {Record<string, any>} schedule
 */
export function buildScheduleKey(schedule) {
  return String(
    schedule?.id ||
      `${normalizeWeekday(schedule?.day)}_${String(schedule?.subject || '').trim().toLowerCase()}_${schedule?.time_range || schedule?.time || ''}`
  );
}

/**
 * Evaluate which due reminder slots should fire right now for today's schedules.
 * @param {{
 *   schedules: Array<Record<string, any>>,
 *   nowClock: { normalizedDay: string, dateKey: string, minutesNow: number },
 *   attendedMap: Record<string, boolean>,
 *   notifiedMap: Record<string, boolean>
 * }} params
 */
export function evaluateDueNotifications({
  schedules = [],
  nowClock,
  attendedMap = {},
  notifiedMap = {}
}) {
  const due = [];

  for (const schedule of schedules) {
    if (schedule?.ethol_reminder === false) continue;
    if (normalizeWeekday(schedule?.day) !== nowClock.normalizedDay) continue;

    const scheduleKey = buildScheduleKey(schedule);
    if (attendedMap[`${nowClock.dateKey}:${scheduleKey}`]) continue;

    const timeText = schedule.time_range || schedule.time || '';
    const slots = computeScheduleNotificationSlots(timeText);

    for (const slot of slots) {
      const slotLogKey = `${nowClock.dateKey}:${scheduleKey}:${slot.key}`;
      if (notifiedMap[slotLogKey]) continue;

      if (
        nowClock.minutesNow >= slot.triggerMin &&
        nowClock.minutesNow <= slot.windowEndMin
      ) {
        due.push({
          schedule,
          scheduleKey,
          slot,
          slotLogKey,
          message: slot.buildMessage(schedule.subject || 'Mata Kuliah', timeText)
        });
      }
    }
  }

  return due;
}

const HOUR_MS = 60 * 60 * 1000;

/**
 * Evaluate incomplete tasks approaching deadline (H-1 window 3h..24h and final 3h window 0h..3h).
 * @param {{
 *   tasks: Array<Record<string, any>>,
 *   nowMs?: number,
 *   notifiedMap?: Record<string, boolean>
 * }} params
 */
export function evaluateDueTaskDeadlines({
  tasks = [],
  nowMs = Date.now(),
  notifiedMap = {}
}) {
  const due = [];

  for (const task of tasks) {
    if (!task || task.status === 'completed' || !task.deadline) continue;
    const deadlineMs = new Date(task.deadline).getTime();
    if (Number.isNaN(deadlineMs)) continue;

    const remainingMs = deadlineMs - nowMs;
    if (remainingMs <= 0 || remainingMs > 24 * HOUR_MS) continue;

    const isFinalWindow = remainingMs <= 3 * HOUR_MS;
    const stageKey = isFinalWindow ? 'task_3h' : 'task_h1';
    const taskKey = String(task.id || String(task.title || '').trim().toLowerCase());
    const slotLogKey = `task:${taskKey}:${stageKey}`;
    if (notifiedMap[slotLogKey]) continue;

    const hoursLeft = Math.max(1, Math.ceil(remainingMs / HOUR_MS));
    const deadlineLabel = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(deadlineMs));

    due.push({
      task,
      taskId: task.id || '',
      taskKey,
      slotLogKey,
      stageKey,
      shortLabel: isFinalWindow ? 'Deadline <= 3 Jam' : 'Deadline H-1',
      stageLabel: isFinalWindow
        ? 'Pengingat Akhir Deadline Tugas'
        : 'Pengingat H-1 Deadline Tugas',
      deadlineLabel: `${deadlineLabel} WIB`,
      message: isFinalWindow
        ? `Tugas "${task.title}" berakhir dalam ~${hoursLeft} jam (${deadlineLabel} WIB). Segera kumpulkan atau tandai selesai.`
        : `Tugas "${task.title}" jatuh tempo dalam ~${hoursLeft} jam (${deadlineLabel} WIB).`
    });
  }

  return due;
}

/**
 * Read daily boolean map from localStorage safely.
 * @param {string} storageKey
 * @returns {Record<string, boolean>}
 */
function readStorageMap(storageKey) {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Persist daily boolean map to localStorage safely.
 * @param {string} storageKey
 * @param {Record<string, boolean>} map
 */
function writeStorageMap(storageKey, map) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(map));
  } catch {
    // Ignore storage quota issues in restricted browsing modes
  }
}

export function loadAttendanceMap() {
  return readStorageMap(ATTENDANCE_STORAGE_KEY);
}

/** @param {Record<string, boolean>} map */
export function saveAttendanceMap(map) {
  writeStorageMap(ATTENDANCE_STORAGE_KEY, map);
}

export function loadNotifiedMap() {
  return readStorageMap(NOTIFIED_STORAGE_KEY);
}

/** @param {Record<string, boolean>} map */
export function saveNotifiedMap(map) {
  writeStorageMap(NOTIFIED_STORAGE_KEY, map);
}

/**
 * Show a browser desktop notification if Notification permission is granted.
 * @param {{ title: string, body: string, tag?: string }} params
 */
export function showBrowserNotification({ title, body, tag }) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    new Notification(title, { body, tag });
  } catch {
    // Some embedded environments disallow Notification construction
  }
}

/**
 * Request email delivery status from backend (/api/notifications/status).
 * @returns {Promise<{ emailConfigured: boolean, emailFrom: string } | null>}
 */
export async function fetchNotificationStatus() {
  try {
    const res = await fetch('/api/notifications/status');
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Dispatch email reminder request to backend (/api/notifications/send).
 * @param {{
 *   toEmail: string,
 *   studentName?: string,
 *   schedule: Record<string, any>,
 *   stageLabel: string,
 *   stageKey: string,
 *   dateKey: string,
 *   message: string,
 *   isTest?: boolean
 * }} payload
 */
export async function dispatchReminderEmail(payload) {
  const res = await fetch('/api/notifications/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    throw new Error('Server Backend AI (port 3001) belum berjalan atau perlu di-restart.');
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || `Email API error (${res.status})`);
  }
  return data;
}
