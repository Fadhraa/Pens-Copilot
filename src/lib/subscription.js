// src/lib/subscription.js
// Pengelolaan Tier Langganan & Batasan Kuota RAG PENS Copilot

const TIER_KEY = 'pens_subscription_tier';
const RAG_USAGE_DATE_KEY = 'pens_rag_usage_date';
const RAG_USAGE_COUNT_KEY = 'pens_rag_usage_count';
const RAG_SESSIONS_KEY = 'pens_rag_sessions';

export const FREE_LIMITS = {
  tier: 'free',
  name: 'Free Tier',
  price: 0,
  priceLabel: 'Gratis',
  maxDocuments: 3,
  maxFileSizeBytes: 5 * 1024 * 1024, // 5 MB
  maxFileSizeLabel: '5 MB',
  maxRagChatsPerDay: 10,
  hasQuizGenerator: false,
  hasWhatsAppAlerts: false,
  hasLapresAssistant: false
};

export const PRO_LIMITS = {
  tier: 'pro',
  name: 'PENS Copilot Pro',
  price: 50000,
  priceLabel: 'Rp 50.000 / bln',
  maxDocuments: 1000, // Unlimited praktis
  maxFileSizeBytes: 25 * 1024 * 1024, // 25 MB
  maxFileSizeLabel: '25 MB',
  maxRagChatsPerDay: 10000, // Unlimited praktis
  hasQuizGenerator: true,
  hasWhatsAppAlerts: true,
  hasLapresAssistant: true
};

/**
 * Mendapatkan tanggal WIB hari ini dalam format YYYY-MM-DD.
 * @returns {string}
 */
export function getWibDateString() {
  const now = new Date();
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta'
  }).format(now);
}

/**
 * Mendapatkan tier langganan pengguna saat ini ('free' atau 'pro').
 * @returns {'free' | 'pro'}
 */
export function getSubscriptionTier() {
  if (typeof window === 'undefined') return 'free';
  const val = localStorage.getItem(TIER_KEY);
  return val === 'pro' ? 'pro' : 'free';
}

/**
 * Mengubah tier langganan pengguna (digunakan untuk demo/simulasi dan perpanjangan).
 * @param {'free' | 'pro'} tier
 * @returns {'free' | 'pro'}
 */
export function setSubscriptionTier(tier) {
  if (typeof window === 'undefined') return 'free';
  const normalized = tier === 'pro' ? 'pro' : 'free';
  localStorage.setItem(TIER_KEY, normalized);
  window.dispatchEvent(
    new CustomEvent('pens_subscription_changed', { detail: { tier: normalized } })
  );
  return normalized;
}

/**
 * Mengambil konfigurasi batasan untuk tier yang aktif.
 * @param {'free' | 'pro'} [tier]
 */
export function getSubscriptionLimits(tier = getSubscriptionTier()) {
  return tier === 'pro' ? PRO_LIMITS : FREE_LIMITS;
}

/**
 * Mengambil status penggunaan harian percakapan RAG.
 * @param {'free' | 'pro'} [tier]
 * @returns {{
 *   date: string,
 *   count: number,
 *   limit: number,
 *   remaining: number,
 *   isLimitReached: boolean
 * }}
 */
export function getRagUsageState(tier = getSubscriptionTier()) {
  const today = getWibDateString();
  if (typeof window === 'undefined') {
    return { date: today, count: 0, limit: 10, remaining: 10, isLimitReached: false };
  }

  const savedDate = localStorage.getItem(RAG_USAGE_DATE_KEY);
  let count = 0;

  if (savedDate === today) {
    count = parseInt(localStorage.getItem(RAG_USAGE_COUNT_KEY) || '0', 10);
    if (Number.isNaN(count) || count < 0) count = 0;
  } else {
    // Hari baru: reset hitungan dan bersihkan kunci sesi harian
    localStorage.setItem(RAG_USAGE_DATE_KEY, today);
    localStorage.setItem(RAG_USAGE_COUNT_KEY, '0');
    localStorage.removeItem(RAG_SESSIONS_KEY);
    count = 0;
  }

  const limits = getSubscriptionLimits(tier);
  const limit = limits.maxRagChatsPerDay;
  const isLimitReached = tier === 'free' && count >= limit;
  const remaining = Math.max(0, limit - count);

  return {
    date: today,
    count,
    limit,
    remaining,
    isLimitReached
  };
}

/**
 * Mengambil daftar ID sesi chat yang pernah memanggil materi RAG hari ini.
 * @returns {string[]}
 */
export function getRagSessionIds() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RAG_SESSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Mengecek apakah suatu sesi percakapan pernah memanggil materi RAG.
 * @param {string | null | undefined} sessionId
 * @returns {boolean}
 */
export function isSessionMarkedRag(sessionId) {
  if (!sessionId) return false;
  const list = getRagSessionIds();
  return list.includes(String(sessionId));
}

/**
 * Menandai suatu sesi percakapan telah memanggil atau merujuk materi kuliah.
 * @param {string | null | undefined} sessionId
 */
export function markSessionAsRag(sessionId) {
  if (!sessionId || typeof window === 'undefined') return;
  const list = getRagSessionIds();
  const strId = String(sessionId);
  if (!list.includes(strId)) {
    list.push(strId);
    localStorage.setItem(RAG_SESSIONS_KEY, JSON.stringify(list));
  }
}

/**
 * Menambah hitungan penggunaan kuota RAG harian dan menandai sesi terkait.
 * @param {string | null | undefined} sessionId
 * @param {'free' | 'pro'} [tier]
 */
export function incrementRagUsage(sessionId, tier = getSubscriptionTier()) {
  if (typeof window === 'undefined') return;
  const state = getRagUsageState(tier);
  const nextCount = state.count + 1;
  localStorage.setItem(RAG_USAGE_COUNT_KEY, String(nextCount));
  if (sessionId) {
    markSessionAsRag(sessionId);
  }
  window.dispatchEvent(
    new CustomEvent('pens_rag_usage_updated', {
      detail: {
        ...state,
        count: nextCount,
        remaining: Math.max(0, state.limit - nextCount),
        isLimitReached: tier === 'free' && nextCount >= state.limit
      }
    })
  );
}

/**
 * Mengecek apakah sesi percakapan terkunci karena kuota RAG habis pada akun Free.
 * Aturan bisnis: Sesi yang sudah terlanjur melibatkan RAG tidak bisa melanjutkan lagi
 * sampai batas harian direset, namun pengguna bisa membuat sesi chat baru tanpa RAG.
 * @param {string | null | undefined} sessionId
 * @param {'free' | 'pro'} [tier]
 * @returns {boolean}
 */
export function isSessionRagLocked(sessionId, tier = getSubscriptionTier()) {
  if (tier === 'pro') return false;
  if (!sessionId) return false;
  const isRag = isSessionMarkedRag(sessionId);
  if (!isRag) return false;
  const usage = getRagUsageState(tier);
  return usage.isLimitReached;
}
