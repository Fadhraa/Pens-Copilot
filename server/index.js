import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv, maskKey } from "./config/env.js";
import { handleChatRoute } from "./routes/chat.route.js";
import {
  handleNotifyStatusRoute,
  handleSendNotificationRoute,
} from "./routes/notify.route.js";
import { handleRagEmbedRoute, handleRagIngestRoute } from "./routes/rag.route.js";
import { handleScheduleExtractRoute } from "./routes/schedule.route.js";
import { shouldSkipRag } from "./services/rag.service.js";
import { applyCors, sendJson } from "./utils/http.js";
import { log } from "./utils/logger.js";

export { shouldSkipRag };

/**
 * Route incoming backend API requests (/api/health, /api/chat, /api/rag/embed).
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 */
export async function handleApiRequest(req, res) {
  const urlPath = (req.url || "").split("?")[0];

  if (req.method === "OPTIONS") {
    applyCors(res);
    res.writeHead(204);
    res.end();
    return;
  }

  const env = loadEnv();

  if (urlPath === "/api/health" && req.method === "GET") {
    sendJson(res, 200, {
      status: "ok",
      model: env.geminiModel,
      hasApiKey: Boolean(env.geminiApiKey),
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (urlPath === "/api/rag/embed" && req.method === "POST") {
    await handleRagEmbedRoute(req, res, env);
    return;
  }

  if (urlPath === "/api/rag/ingest" && req.method === "POST") {
    await handleRagIngestRoute(req, res, env);
    return;
  }

  if (urlPath === "/api/schedule/extract" && req.method === "POST") {
    await handleScheduleExtractRoute(req, res, env);
    return;
  }

  if (urlPath === "/api/notifications/status" && req.method === "GET") {
    handleNotifyStatusRoute(req, res, env);
    return;
  }

  if (urlPath === "/api/notifications/send" && req.method === "POST") {
    await handleSendNotificationRoute(req, res, env);
    return;
  }

  if (urlPath === "/api/chat" && req.method === "POST") {
    await handleChatRoute(req, res, env);
    return;
  }

  sendJson(res, 404, { error: "Endpoint backend tidak ditemukan." });
}

const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  const env = loadEnv();
  const server = http.createServer(handleApiRequest);

  server.listen(env.port, "0.0.0.0", () => {
    log(
      "SERVER",
      `PENS Copilot AI Backend aktif di http://localhost:${env.port}`,
    );
    log(
      "SERVER",
      `Model default: ${env.geminiModel} (auto-fallback: gemini-3.5-flash-lite)`,
    );
    log("SERVER", `Gemini API Key: ${maskKey(env.geminiApiKey)}`);
    log(
      "SERVER",
      `Email Gmail SMTP: ${env.smtpUser && env.smtpPass ? `Aktif (${env.smtpUser})` : "Mode Preview Terminal (isi SMTP_USER & SMTP_PASS di .env)"}`,
    );
    log(
      "SERVER",
      `Supabase URL: ${env.supabaseUrl || "(belum dikonfigurasi di .env)"}`,
    );
    log(
      "SERVER",
      "Routes aktif: GET /api/health | POST /api/chat | POST /api/rag/embed | POST /api/rag/ingest | POST /api/schedule/extract | GET /api/notifications/status | POST /api/notifications/send",
    );
  });
}
