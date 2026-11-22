import dns from "node:dns";
import fs from "node:fs";
import path from "node:path";

dns.setDefaultResultOrder("ipv4first");

/**
 * Parse .env file into a key-value map without modifying the file.
 * @returns {Record<string, string>}
 */
function parseDotEnv() {
  const envMap = {};
  try {
    const envPath = path.resolve(process.cwd(), ".env");
    if (!fs.existsSync(envPath)) return envMap;

    const raw = fs.readFileSync(envPath, "utf-8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;

      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      envMap[key] = val;
    }
  } catch {
    // Fallback cleanly to process.env if .env cannot be read
  }
  return envMap;
}

/**
 * Load backend configuration from process.env and workspace .env.
 */
export function loadEnv() {
  const envMap = parseDotEnv();
  const portRaw = process.env.PORT || envMap.PORT || "3001";
  const smtpUser = process.env.SMTP_USER || envMap.SMTP_USER || "";
  const smtpPassRaw = process.env.SMTP_PASS || envMap.SMTP_PASS || "";

  return {
    port: Number(portRaw) || 3001,
    geminiModel:
      process.env.GEMINI_MODEL || envMap.GEMINI_MODEL || "gemini-3.6-flash",
    geminiApiKey:
      process.env.VITE_GOOGLE_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      envMap.VITE_GOOGLE_API_KEY ||
      envMap.GOOGLE_API_KEY ||
      "",
    supabaseUrl:
      process.env.VITE_SUPABASE_URL || envMap.VITE_SUPABASE_URL || "",
    supabaseAnonKey:
      process.env.VITE_SUPABASE_ANON_KEY || envMap.VITE_SUPABASE_ANON_KEY || "",
    smtpHost: process.env.SMTP_HOST || envMap.SMTP_HOST || "smtp.gmail.com",
    smtpPort: Number(process.env.SMTP_PORT || envMap.SMTP_PORT || 465),
    smtpUser,
    smtpPass: smtpPassRaw.replace(/\s+/g, ""),
    emailFrom:
      process.env.EMAIL_FROM ||
      envMap.EMAIL_FROM ||
      (smtpUser ? `PENS Copilot <${smtpUser}>` : "PENS Copilot (Preview)"),
  };
}

/**
 * Return a safe redacted preview of an API key for startup diagnostics.
 * @param {string} key
 * @returns {string}
 */
export function maskKey(key) {
  if (!key || key.length < 12) return key ? "(terkonfigurasi)" : "(kosong)";
  return `${key.slice(0, 10)}...${key.slice(-4)}`;
}
