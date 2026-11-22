import { requestJsonIPv4 } from "../utils/http.js";
import { log } from "../utils/logger.js";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";
const FAST_FALLBACK_MODEL = "gemini-3.5-flash-lite";
const RETRYABLE_STATUSES = new Set([429, 500, 503]);

/**
 * Generate a 768-dimension embedding via Gemini Embedding 2.
 * @param {string} text
 * @param {string} apiKey
 * @returns {Promise<number[]>}
 */
export async function embedTextServer(text, apiKey) {
  const res = await requestJsonIPv4({
    url: `${GEMINI_BASE}/models/gemini-embedding-2:embedContent`,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: {
      model: "models/gemini-embedding-2",
      content: { parts: [{ text }] },
      outputDimensionality: 768,
    },
    timeoutMs: 20000,
  });

  if (!res.ok) {
    const detail =
      res.json?.error?.message ||
      res.text ||
      `Embedding API error (${res.status})`;
    throw new Error(detail);
  }

  return res.json?.embedding?.values || [];
}

/**
 * Build system instruction combining PENS student profile, schedules, tasks, and RAG chunks.
 * @param {{
 *   name?: string,
 *   nrp?: string,
 *   prodi?: string,
 *   schedules?: Array<any>,
 *   tasks?: Array<any>
 * }} userContext
 * @param {Array<{ content?: string }>} ragChunks
 * @returns {string}
 */
export function buildSystemInstruction(userContext = {}, ragChunks = []) {
  const now = new Date();
  const wibFormatter = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowDay = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
  }).format(tomorrow);

  const scheduleSummary =
    userContext.schedules && userContext.schedules.length > 0
      ? userContext.schedules
          .map(
            (s) =>
              `- [id: ${s.id || "none"}] ${s.day} (${s.time_range || s.time || "-"}): ${s.subject} | Dosen: ${s.lecturer || "-"} | Ruang: ${s.room || "-"}`,
          )
          .join("\n")
      : "Belum ada jadwal tersimpan.";

  const taskSummary =
    userContext.tasks && userContext.tasks.length > 0
      ? userContext.tasks
          .map(
            (t) =>
              `- [id: ${t.id || "none"}] [${t.status}] ${t.title} (Prioritas: ${t.priority}, Deadline: ${t.deadline || "Belum ditentukan"})`,
          )
          .join("\n")
      : "Belum ada tugas tersimpan.";

  const ragSummary =
    ragChunks && ragChunks.length > 0
      ? ragChunks
          .map((c, i) => `[Referensi Materi ${i + 1}]\n${c.content}`)
          .join("\n\n")
      : "Tidak ada potongan materi khusus yang cocok.";

  return `Kamu adalah PENS Copilot, asisten AI akademik khusus mahasiswa Politeknik Elektronika Negeri Surabaya (PENS).
Jawablah dengan ramah, ringkas, langsung ke inti, terstruktur, dan menggunakan Bahasa Indonesia yang baik.

=== WAKTU SAAT INI (WIB) ===
Sekarang: ${wibFormatter.format(now)} WIB
Besok: ${tomorrowDay}

=== DATA MAHASISWA ===
Nama: ${userContext.name || "Mahasiswa PENS"}
NRP: ${userContext.nrp || "-"}
Program Studi: ${userContext.prodi || "-"}

=== JADWAL KULIAH & PRESENSI ETHOL ===
${scheduleSummary}

=== DAFTAR TUGAS & DEADLINE ===
${taskSummary}

=== KONTEKS MATERI KULIAH (RAG) ===
${ragSummary}

Jika pertanyaan berkaitan dengan materi kuliah yang ada di KONTEKS MATERI KULIAH (RAG), utamakan referensi tersebut. Jika berkaitan dengan jadwal atau tugas, gunakan data jadwal & tugas di atas secara akurat.`;
}

/**
 * Extract reply text from Gemini Interactions API response structures.
 * @param {any} data
 * @returns {string}
 */
export function extractTextFromInteractionPayload(data) {
  return (
    data?.output_text ||
    data?.outputs
      ?.map((o) => o?.text || o?.content?.map((c) => c?.text).join(""))
      .filter(Boolean)
      .join("\n") ||
    data?.steps
      ?.filter((s) => s?.type === "model_output" || !s?.type)
      ?.flatMap((s) => s?.content || [])
      ?.map((c) => c?.text)
      ?.filter(Boolean)
      ?.join("\n") ||
    ""
  );
}

/**
 * Send single request to /v1beta/interactions with IPv4 transport.
 * @param {{
 *   model: string,
 *   systemInstruction: string,
 *   fullPrompt: string,
 *   apiKey: string,
 *   timeoutMs: number
 * }} params
 */
async function postInteraction({
  model,
  systemInstruction,
  fullPrompt,
  apiKey,
  timeoutMs,
}) {
  return requestJsonIPv4({
    url: `${GEMINI_BASE}/interactions`,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: {
      model,
      system_instruction: systemInstruction,
      input: fullPrompt,
      generation_config: {
        thinking_level: "minimal",
        temperature: 0.6,
      },
    },
    timeoutMs,
  });
}

/**
 * Call Gemini Interactions API with automatic fast fallback when 3.6-flash stalls or returns 503.
 * @param {{
 *   prompt: string,
 *   history?: Array<{ sender: string, text: string }>,
 *   userContext?: Record<string, any>,
 *   ragChunks?: Array<any>,
 *   apiKey: string,
 *   model?: string
 * }} params
 */
export async function callGeminiInteraction({
  prompt,
  history = [],
  userContext = {},
  ragChunks = [],
  apiKey,
  model = "gemini-3.6-flash",
}) {
  const t0 = Date.now();
  const primaryModel = model || "gemini-3.6-flash";
  const systemInstruction = buildSystemInstruction(userContext, ragChunks);

  const historyText =
    Array.isArray(history) && history.length > 0
      ? history
          .map(
            (m) =>
              `${m.sender === "user" ? "Mahasiswa" : "PENS Copilot"}: ${m.text}`,
          )
          .join("\n\n")
      : "";

  const fullPrompt = historyText
    ? `=== RIWAYAT PERCAKAPAN SEBELUMNYA ===\n${historyText}\n\n=== PERTANYAAN TERBARU MAHASISWA ===\n${prompt}`
    : prompt;

  log(
    "GEMINI",
    `Mengirim request ke model ${primaryModel} (/v1beta/interactions)...`,
  );

  let usedModel = primaryModel;
  let res;
  let fallbackReason = "";

  try {
    res = await postInteraction({
      model: primaryModel,
      systemInstruction,
      fullPrompt,
      apiKey,
      timeoutMs: primaryModel === "gemini-3.6-flash" ? 35000 : 30000,
    });
    if (
      primaryModel === "gemini-3.6-flash" &&
      !res.ok &&
      RETRYABLE_STATUSES.has(res.status)
    ) {
      fallbackReason = `HTTP ${res.status}`;
    }
  } catch (err) {
    if (primaryModel !== "gemini-3.6-flash") {
      throw err;
    }
    const msg = err instanceof Error ? err.message : "Timeout";
    fallbackReason = /timeout/i.test(msg) ? "timeout > 35s" : msg;
  }

  if (fallbackReason) {
    log(
      "WARN",
      `Model ${primaryModel} lambat/sibuk di server Google (${fallbackReason}), otomatis fallback ke ${FAST_FALLBACK_MODEL}...`,
      t0,
    );
    usedModel = FAST_FALLBACK_MODEL;
    res = await postInteraction({
      model: FAST_FALLBACK_MODEL,
      systemInstruction,
      fullPrompt,
      apiKey,
      timeoutMs: 30000,
    });
  }

  if (!res || !res.ok) {
    const detail =
      res?.json?.error?.message ||
      res?.json?.message ||
      res?.text ||
      "Interactions API error";
    throw new Error(`${detail} (HTTP ${res?.status || 500})`);
  }

  const reply = extractTextFromInteractionPayload(res.json);
  const usage = res.json?.usage || null;
  const totalTokens = usage?.total_tokens ?? "-";
  const thoughtTokens = usage?.total_thought_tokens ?? 0;

  log(
    "GEMINI",
    `Respons diterima dari ${usedModel} | status=${res.status} | tokens=${totalTokens} (thought=${thoughtTokens})`,
    t0,
  );

  return {
    reply,
    modelUsed: usedModel,
    usage,
  };
}

const VALID_DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const SCHEDULE_EXTRACT_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3.6-flash",
];

/**
 * Normalize day strings from AI output into standard Indonesian weekday names.
 * @param {string} rawDay
 * @returns {string}
 */
export function normalizeScheduleDay(rawDay) {
  const cleaned = String(rawDay || "")
    .trim()
    .toLowerCase()
    .replace(/'/g, "");
  if (cleaned.includes("senin") || cleaned === "mon") return "Senin";
  if (cleaned.includes("selasa") || cleaned === "tue") return "Selasa";
  if (cleaned.includes("rabu") || cleaned === "wed") return "Rabu";
  if (cleaned.includes("kamis") || cleaned === "thu") return "Kamis";
  if (cleaned.includes("jumat") || cleaned === "fri") return "Jumat";
  if (cleaned.includes("sabtu") || cleaned === "sat") return "Sabtu";
  const matched = VALID_DAYS.find((d) => d.toLowerCase() === cleaned);
  return matched || "Senin";
}

const SCHEDULE_RESPONSE_SCHEMA = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      day: { type: "STRING" },
      time: { type: "STRING" },
      subject: { type: "STRING" },
      lecturer: { type: "STRING" },
      room: { type: "STRING" },
    },
    required: ["day", "time", "subject", "lecturer", "room"],
  },
};

/**
 * Parse JSON array output even if wrapped in markdown code fences or object keys (e.g. grouped by day).
 * @param {string} rawText
 * @returns {Array<any>}
 */
function parseJsonScheduleList(rawText) {
  const stripped = String(rawText || "")
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();
  if (!stripped) return [];

  const parsed = JSON.parse(stripped);
  if (Array.isArray(parsed)) return parsed;
  if (!parsed || typeof parsed !== "object") return [];

  if (Array.isArray(parsed.schedules)) return parsed.schedules;
  if (Array.isArray(parsed.jadwal)) return parsed.jadwal;

  const flattened = [];
  for (const [key, val] of Object.entries(parsed)) {
    if (!Array.isArray(val)) continue;
    for (const item of val) {
      if (item && typeof item === "object") {
        flattened.push({ day: key, ...item });
      }
    }
  }
  return flattened;
}

/**
 * Normalize extracted schedule items and unify Indonesian time separators ("sd" / "s.d." -> "-").
 * @param {Array<any>} rawList
 * @returns {Array<{ day: string, time: string, subject: string, lecturer: string, room: string }>}
 */
function normalizeExtractedSchedules(rawList) {
  return rawList
    .map((item) => {
      const rawTime = String(
        item?.time || item?.time_range || item?.jam || "",
      ).trim();
      const normalizedTime = rawTime
        .replace(/\s*(?:sd|s\.?d\.?|s\/d|–|—)\s*/gi, " - ")
        .replace(/\s*-\s*/g, " - ")
        .trim();

      return {
        day: normalizeScheduleDay(item?.day || item?.hari || ""),
        time: normalizedTime,
        subject: String(
          item?.subject || item?.mata_kuliah || item?.matkul || "",
        ).trim(),
        lecturer: String(item?.lecturer || item?.dosen || "").trim(),
        room: String(item?.room || item?.ruang || "").trim(),
      };
    })
    .filter((item) => item.subject.length > 0);
}

/**
 * Extract structured PENS course schedules from KRS file (PDF/image) or raw text via Gemini.
 * @param {{
 *   fileData?: string,
 *   mimeType?: string,
 *   fileName?: string,
 *   rawText?: string,
 *   apiKey: string
 * }} params
 * @returns {Promise<{
 *   schedules: Array<{ day: string, time: string, subject: string, lecturer: string, room: string }>,
 *   modelUsed: string
 * }>}
 */
export async function extractSchedulesWithGemini({
  fileData = "",
  mimeType = "",
  fileName = "",
  rawText = "",
  apiKey,
}) {
  const t0 = Date.now();
  const instruction = `Ekstrak semua jadwal mata kuliah dari dokumen/teks KRS Politeknik Elektronika Negeri Surabaya (PENS) berikut ke dalam JSON array.
Setiap elemen JSON WAJIB memiliki tepat 5 properti string:
- "day": salah satu dari "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"
- "time": rentang jam format "HH:MM - HH:MM" (contoh: "08:00 - 10:30")
- "subject": nama mata kuliah lengkap tanpa kode SKS bila tidak perlu
- "lecturer": nama dosen pengampu (atau "" jika tidak tercantum)
- "room": nama ruangan, lab, gedung, atau link kelas (atau "" jika tidak tercantum)

Jika tidak ada jadwal valid yang ditemukan, kembalikan array kosong [].`;

  /** @type {Array<Record<string, any>>} */
  const parts = [{ text: instruction }];
  if (fileData && mimeType) {
    parts.push({
      inline_data: {
        mime_type: mimeType,
        data: fileData,
      },
    });
    if (fileName) {
      parts.push({ text: `Nama file sumber: ${fileName}` });
    }
  }
  if (rawText && rawText.trim()) {
    parts.push({ text: `Teks jadwal yang ditempel:\n${rawText.trim()}` });
  }

  let lastError = "Gagal mengekstrak jadwal dari AI.";
  let lastEmptyModel = "";

  for (const model of SCHEDULE_EXTRACT_MODELS) {
    log("GEMINI", `Mengekstrak jadwal via ${model} (:generateContent)...`);
    try {
      const res = await requestJsonIPv4({
        url: `${GEMINI_BASE}/models/${model}:generateContent`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: {
          contents: [{ parts }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: SCHEDULE_RESPONSE_SCHEMA,
            temperature: 0.1,
          },
        },
        timeoutMs: model === "gemini-3.6-flash" ? 40000 : 25000,
      });

      if (!res.ok) {
        const detail =
          res.json?.error?.message || res.text || `HTTP ${res.status}`;
        lastError = `${detail} (HTTP ${res.status})`;
        if (RETRYABLE_STATUSES.has(res.status)) {
          log(
            "WARN",
            `Ekstraksi via ${model} gagal (${res.status}), mencoba model berikutnya...`,
            t0,
          );
          continue;
        }
        throw new Error(lastError);
      }

      const rawOutput =
        res.json?.candidates?.[0]?.content?.parts
          ?.map((p) => p?.text || "")
          .join("") || "";
      const parsedList = parseJsonScheduleList(rawOutput);
      const schedules = normalizeExtractedSchedules(parsedList);

      if (schedules.length === 0) {
        lastEmptyModel = model;
        log(
          "WARN",
          `Model ${model} mengembalikan 0 jadwal (preview=${rawOutput.slice(0, 180)}), mencoba model berikutnya...`,
          t0,
        );
        continue;
      }

      log(
        "GEMINI",
        `Ekstraksi jadwal berhasil via ${model} (${schedules.length} mata kuliah)`,
        t0,
      );
      return { schedules, modelUsed: model };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      lastError = msg;
      if (/timeout|HTTP (429|500|503)/i.test(msg)) {
        log(
          "WARN",
          `Model ${model} mengalami kendala (${msg}), fallback ke model berikutnya...`,
          t0,
        );
        continue;
      }
      throw err;
    }
  }

  if (lastEmptyModel) {
    return { schedules: [], modelUsed: lastEmptyModel };
  }

  throw new Error(lastError);
}

const INTERACTIVE_CHAT_SCHEMA = {
  type: "OBJECT",
  properties: {
    reply: {
      type: "STRING",
      description:
        "Kalimat pengantar atau jawaban percakapan natural dalam Bahasa Indonesia.",
    },
    intent: {
      type: "STRING",
      enum: [
        "chat",
        "show_schedule",
        "show_tasks",
        "show_summary",
        "create_schedule",
        "update_schedule",
        "delete_schedule",
        "create_task",
        "update_task",
        "delete_task",
      ],
    },
    includeScheduleList: {
      type: "BOOLEAN",
      description:
        "True jika jawaban perlu menampilkan kartu daftar jadwal kuliah (bisa digabung dengan includeTaskList).",
    },
    scheduleFilterDay: {
      type: "STRING",
      description:
        "Hari jadwal ('Semua', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu').",
    },
    includeTaskList: {
      type: "BOOLEAN",
      description:
        "True jika jawaban perlu menampilkan kartu daftar tugas (bisa digabung dengan includeScheduleList).",
    },
    summaryCard: {
      type: "OBJECT",
      properties: {
        title: { type: "STRING" },
        subtitle: { type: "STRING" },
        style: {
          type: "STRING",
          enum: ["bullet", "numbered"],
        },
        points: {
          type: "ARRAY",
          items: { type: "STRING" },
        },
        tip: { type: "STRING" },
      },
      required: ["title", "points"],
    },
    codeLanguage: {
      type: "STRING",
      description:
        "Nama bahasa pemrograman (misal java, c, python, javascript, sql) jika mahasiswa meminta contoh kode/implementasi, atau string kosong '' jika tidak meminta kode.",
    },
    codeTitle: {
      type: "STRING",
      description:
        "Judul singkat contoh kode (misal Contoh Method Overloading) jika ada kode, atau string kosong '' jika tidak ada.",
    },
    codeSnippet: {
      type: "STRING",
      description:
        "WAJIB berisi kode sumber program lengkap yang siap dijalankan (TANPA tanda tiga backtick) setiap kali mahasiswa meminta contoh kode/implementasi/sintaks, atau string kosong '' jika mahasiswa tidak meminta kode.",
    },
    schedulePayload: {
      type: "OBJECT",
      properties: {
        id: { type: "STRING" },
        day: { type: "STRING" },
        time: { type: "STRING" },
        subject: { type: "STRING" },
        lecturer: { type: "STRING" },
        room: { type: "STRING" },
      },
    },
    taskPayload: {
      type: "OBJECT",
      properties: {
        id: {
          type: "STRING",
          description: "UUID tugas yang cocok dari DAFTAR TUGAS (untuk update_task/delete_task)",
        },
        title: {
          type: "STRING",
          description: "Judul singkat tugas saja tanpa catatan tambahan atau komentar",
        },
        description: {
          type: "STRING",
          description: "Deskripsi singkat atau string kosong jika tidak disebut",
        },
        deadline: {
          type: "STRING",
          description: "Format ISO-8601 WIB seperti 2026-11-23T23:59:00+07:00, atau string kosong jika tidak disebut",
        },
        status: {
          type: "STRING",
          enum: ["pending", "in_progress", "completed"],
          description: "Status pengerjaan tugas",
        },
        priority: {
          type: "STRING",
          enum: ["low", "medium", "high"],
          description: "Prioritas tugas (default medium jika tidak disebut)",
        },
      },
      required: ["title", "status", "priority", "deadline"],
    },
  },
  required: [
    "reply",
    "intent",
    "includeScheduleList",
    "includeTaskList",
    "codeLanguage",
    "codeTitle",
    "codeSnippet",
  ],
};

/**
 * Call Gemini with structured JSON schema so the AI semantically decides cards, schedule CRUD, and task CRUD actions.
 * @param {{
 *   prompt: string,
 *   history?: Array<{ sender: string, text: string }>,
 *   userContext?: Record<string, any>,
 *   ragChunks?: Array<any>,
 *   apiKey: string,
 *   model?: string
 * }} params
 */
export async function callGeminiInteractiveChat({
  prompt,
  history = [],
  userContext = {},
  ragChunks = [],
  apiKey,
  model = "gemini-3.6-flash",
}) {
  const t0 = Date.now();
  const baseInstruction = buildSystemInstruction(userContext, ragChunks);
  const systemInstruction = `${baseInstruction}

=== ATURAN OUTPUT INTERAKTIF MULTI-BLOK (WAJIB DIPATUHI) ===
Pahami maksud pesan mahasiswa secara semantik, tentukan "intent", dan kombinasikan komponen UI secara ADAPTIF & PROPORSIONAL (semua komponen yang kamu aktifkan akan dirender menyatu sebagai blocks[] dalam 1 bubble):
1. Sapaan atau obrolan ringan -> pilih "intent": "chat", isi "reply" saja (set includeScheduleList: false, includeTaskList: false, codeLanguage: "", codeTitle: "", codeSnippet: "").
2. Pertanyaan penjelasan konsep/materi TANPA meminta kode -> pilih "intent": "show_summary", isi "reply" (pengantar singkat) + "summaryCard" ("title", "subtitle", "points" 3-5 poin, dan "tip" Catatan Belajar), serta kosongkan codeSnippet ("").
3. Pertanyaan contoh kode / implementasi program (baik berdiri sendiri maupun digabung dengan penjelasan konsep) -> pilih "intent": "chat", isi "reply" (penjelasan singkat), WAJIB isi "codeLanguage" (misal "java"), "codeTitle" (misal "Contoh Method Overloading"), dan "codeSnippet" berisi kode sumber lengkap siap dijalankan TANPA tiga backtick, serta boleh dikombinasikan dengan "summaryCard" bila perlu merangkum poin konsep + tips belajar.
4. Pertanyaan jadwal kuliah -> aktifkan "includeScheduleList": true dan isi "scheduleFilterDay" ("Semua", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", atau "Sabtu").
5. Pertanyaan daftar/deadline/status tugas -> aktifkan "includeTaskList": true.
6. Pertanyaan gabungan (misal menanyakan jadwal kuliah SEKALIGUS daftar tugas dalam 1 pesan) -> aktifkan KEDUANYA ("includeScheduleList": true beserta "scheduleFilterDay", DAN "includeTaskList": true) supaya kedua kartu tampil bersamaan dalam satu bubble!
7. Aksi CRUD Jadwal ("create_schedule", "update_schedule", "delete_schedule") -> isi "schedulePayload" (sertakan "id" dari JADWAL KULIAH untuk update/delete).
8. Aksi CRUD Tugas ("create_task", "update_task", "delete_task") -> isi "taskPayload" (sertakan "id" dari DAFTAR TUGAS untuk update/delete, pertahankan field yang tidak diubah).`;

  const historyText =
    Array.isArray(history) && history.length > 0
      ? history
          .map(
            (m) =>
              `${m.sender === "user" ? "Mahasiswa" : "PENS Copilot"}: ${m.text}`,
          )
          .join("\n\n")
      : "";

  const fullPrompt = historyText
    ? `=== RIWAYAT PERCAKAPAN SEBELUMNYA ===\n${historyText}\n\n=== PESAN TERBARU MAHASISWA ===\n${prompt}`
    : prompt;

  const candidateModels = [
    ...new Set([
      model || "gemini-3.6-flash",
      "gemini-3.5-flash-lite",
      "gemini-3.1-flash-lite",
    ]),
  ];

  let lastError = "Gagal mendapatkan respons dari AI.";

  for (const targetModel of candidateModels) {
    log(
      "GEMINI",
      `Interactive chat via ${targetModel} (:generateContent JSON)...`,
    );
    try {
      const res = await requestJsonIPv4({
        url: `${GEMINI_BASE}/models/${targetModel}:generateContent`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: {
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: INTERACTIVE_CHAT_SCHEMA,
            temperature: 0.4,
          },
        },
        timeoutMs: targetModel === "gemini-3.6-flash" ? 30000 : 18000,
      });

      if (!res.ok) {
        const detail =
          res.json?.error?.message || res.text || `HTTP ${res.status}`;
        lastError = `${detail} (HTTP ${res.status})`;
        if (RETRYABLE_STATUSES.has(res.status)) {
          log(
            "WARN",
            `Model ${targetModel} sibuk/gagal (${res.status}), otomatis fallback ke model berikutnya...`,
            t0,
          );
          continue;
        }
        throw new Error(lastError);
      }

      const rawText =
        res.json?.candidates?.[0]?.content?.parts
          ?.map((p) => p?.text || "")
          .join("")
          .trim() || "";

      const cleaned = rawText
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "")
        .trim();
      const parsed = cleaned ? JSON.parse(cleaned) : {};
      const parsedBlocks = Array.isArray(parsed.blocks) ? parsed.blocks : [];
      const fallbackReplyFromBlocks = parsedBlocks
        .filter((b) => b?.type === "markdown" && b?.content)
        .map((b) => String(b.content).trim())
        .join("\n\n");
      const resolvedCodeBlock =
        typeof parsed.codeSnippet === "string" && parsed.codeSnippet.trim()
          ? {
              language: String(parsed.codeLanguage || "text").trim() || "text",
              title: String(parsed.codeTitle || "").trim(),
              code: parsed.codeSnippet.trim(),
            }
          : parsed.codeBlock || null;

      log(
        "GEMINI",
        `Interactive chat selesai via ${targetModel} | intent=${parsed.intent || "chat"}`,
        t0,
      );

      return {
        reply:
          parsed.reply ||
          fallbackReplyFromBlocks ||
          "Berikut informasi yang saya siapkan untuk Anda.",
        intent: parsed.intent || "chat",
        includeScheduleList: Boolean(parsed.includeScheduleList),
        scheduleFilterDay: parsed.scheduleFilterDay || "",
        includeTaskList: Boolean(parsed.includeTaskList),
        schedulePayload: parsed.schedulePayload || null,
        taskPayload: parsed.taskPayload || null,
        summaryCard: parsed.summaryCard || null,
        codeBlock: resolvedCodeBlock,
        blocks: parsedBlocks,
        modelUsed: targetModel,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      lastError = msg;
      if (/timeout|HTTP (429|500|503)|JSON/i.test(msg)) {
        log(
          "WARN",
          `Model ${targetModel} mengalami kendala (${msg}), fallback ke model berikutnya...`,
          t0,
        );
        continue;
      }
      throw err;
    }
  }

  throw new Error(lastError);
}
