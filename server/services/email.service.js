import nodemailer from 'nodemailer';
import { log } from '../utils/logger.js';

const sentNotificationKeys = new Map();

/** @type {Map<string, nodemailer.Transporter>} */
const transporterCache = new Map();

/**
 * Get or create a cached Nodemailer SMTP transporter.
 * @param {{ smtpHost?: string, smtpPort?: number, smtpUser: string, smtpPass: string }} env
 */
function getSmtpTransporter(env) {
  const host = env.smtpHost || 'smtp.gmail.com';
  const port = Number(env.smtpPort || 465);
  const cacheKey = `${host}:${port}:${env.smtpUser}:${env.smtpPass.slice(-4)}`;

  let transporter = transporterCache.get(cacheKey);
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user: env.smtpUser,
        pass: env.smtpPass
      }
    });
    transporterCache.set(cacheKey, transporter);
  }
  return transporter;
}

/**
 * Escape HTML special characters for email body rendering.
 * @param {string} val
 * @returns {string}
 */
function escapeHtml(val) {
  return String(val || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Build a clean PENS-branded HTML email for class and ETHOL attendance reminders.
 * @param {{
 *   studentName: string,
 *   stageLabel: string,
 *   schedule: Record<string, any>,
 *   message: string
 * }} params
 */
function buildReminderEmailHtml({ studentName, stageLabel, schedule, message }) {
  const safeName = escapeHtml(studentName || 'Mahasiswa PENS');
  const safeStage = escapeHtml(stageLabel || 'Pengingat Kuliah');
  const safeSubject = escapeHtml(schedule?.subject || 'Mata Kuliah PENS');
  const safeDay = escapeHtml(schedule?.day || '-');
  const safeTime = escapeHtml(schedule?.time_range || schedule?.time || '-');
  const safeRoom = escapeHtml(schedule?.room || 'Lihat di SIM/ETHOL');
  const safeLecturer = escapeHtml(schedule?.lecturer || '-');
  const safeMessage = escapeHtml(
    message || 'Jangan lupa melakukan presensi ETHOL tepat waktu.'
  );

  return `
  <div style="font-family: Arial, Helvetica, sans-serif; background-color: #EBF0FA; padding: 24px;">
    <div style="max-width: 560px; margin: 0 auto; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; border: 1px solid #D4DEEB;">
      <div style="background: linear-gradient(135deg, #02389E, #035AB1); padding: 20px 24px; color: #FFFFFF;">
        <div style="font-size: 12px; font-weight: 700; letter-spacing: 0.08em; color: #FFC789; text-transform: uppercase;">
          ${safeStage}
        </div>
        <h1 style="margin: 6px 0 0; font-size: 20px; line-height: 1.3; color: #FFFFFF;">
          ${safeSubject}
        </h1>
      </div>

      <div style="padding: 24px; color: #1E293B; font-size: 14px; line-height: 1.6;">
        <p style="margin: 0 0 12px;">Halo <strong>${safeName}</strong>,</p>
        <p style="margin: 0 0 16px;">${safeMessage}</p>

        <div style="background-color: #F4F7FC; border: 1px solid #DCE5F2; border-radius: 12px; padding: 14px 16px; margin-bottom: 18px;">
          <div style="margin-bottom: 6px;"><strong>Hari &amp; Jam:</strong> ${safeDay}, ${safeTime} WIB</div>
          <div style="margin-bottom: 6px;"><strong>Ruang / Link:</strong> ${safeRoom}</div>
          <div><strong>Dosen:</strong> ${safeLecturer}</div>
        </div>

        <a
          href="https://ethol.pens.ac.id"
          style="display: inline-block; background-color: #FF6A00; color: #020617; font-weight: 700; text-decoration: none; padding: 10px 18px; border-radius: 10px; font-size: 13px;"
        >
          Buka ETHOL PENS
        </a>
      </div>

      <div style="padding: 14px 24px; background-color: #F8FAFC; border-top: 1px solid #E2E8F0; font-size: 11px; color: #64748B;">
        Pengingat otomatis dari PENS Copilot. Tandai "Sudah Presensi" di aplikasi untuk menghentikan interval berikutnya.
      </div>
    </div>
  </div>`;
}

/**
 * Send ETHOL attendance / schedule reminder email via Gmail SMTP (Nodemailer) or terminal preview fallback.
 * @param {{
 *   toEmail: string,
 *   studentName?: string,
 *   schedule: Record<string, any>,
 *   stageLabel: string,
 *   stageKey: string,
 *   dateKey: string,
 *   message: string,
 *   isTest?: boolean,
 *   env: { smtpHost?: string, smtpPort?: number, smtpUser?: string, smtpPass?: string, emailFrom?: string }
 * }} params
 */
export async function sendEtholReminderEmail({
  toEmail,
  studentName = 'Mahasiswa PENS',
  schedule = {},
  stageLabel = 'Pengingat Jadwal',
  stageKey = 'manual',
  dateKey = '',
  message = '',
  isTest = false,
  env = {}
}) {
  const t0 = Date.now();
  const recipient = String(toEmail || '').trim();
  if (!recipient) {
    throw new Error('Alamat email penerima belum tersedia.');
  }

  const dedupeKey = `${recipient.toLowerCase()}:${schedule?.id || schedule?.subject || 'item'}:${dateKey || 'today'}:${stageKey}`;
  if (!isTest && sentNotificationKeys.has(dedupeKey)) {
    return {
      sent: false,
      deduplicated: true,
      mode: 'deduplicated',
      detail: 'Notifikasi email untuk interval ini sudah dikirim sebelumnya.'
    };
  }

  const emailSubject = `[PENS Copilot] ${stageLabel}: ${schedule?.subject || 'Jadwal Kuliah'}`;
  const html = buildReminderEmailHtml({
    studentName,
    stageLabel,
    schedule,
    message
  });

  if (!env.smtpUser || !env.smtpPass) {
    if (!isTest) {
      sentNotificationKeys.set(dedupeKey, Date.now());
    }
    log(
      'WARN',
      `[EMAIL PREVIEW] Ke: ${recipient} | Subjek: "${emailSubject}" (SMTP_USER / SMTP_PASS belum diisi di .env)`,
      t0
    );
    return {
      sent: true,
      deduplicated: false,
      mode: 'terminal-preview',
      detail: 'SMTP_USER / SMTP_PASS belum diisi di .env; notifikasi dicatat di log terminal server.'
    };
  }

  const transporter = getSmtpTransporter({
    smtpHost: env.smtpHost,
    smtpPort: env.smtpPort,
    smtpUser: env.smtpUser,
    smtpPass: env.smtpPass
  });

  const info = await transporter.sendMail({
    from: env.emailFrom || `PENS Copilot <${env.smtpUser}>`,
    to: recipient,
    subject: emailSubject,
    html
  });

  if (!isTest) {
    sentNotificationKeys.set(dedupeKey, Date.now());
  }

  log(
    'SERVER',
    `[EMAIL TERKIRIM GMAIL SMTP] Ke: ${recipient} | Subjek: "${emailSubject}" | id=${info?.messageId || '-'}`,
    t0
  );

  return {
    sent: true,
    deduplicated: false,
    mode: 'gmail-smtp',
    id: info?.messageId || null,
    detail: `Email terkirim via Gmail SMTP ke ${recipient}`
  };
}
