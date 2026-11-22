import { readJsonBody, sendJson } from '../utils/http.js';
import { log } from '../utils/logger.js';
import { sendEtholReminderEmail } from '../services/email.service.js';

/**
 * Handle GET /api/notifications/status to report Gmail SMTP delivery configuration.
 * @param {import('node:http').IncomingMessage} _req
 * @param {import('node:http').ServerResponse} res
 * @param {{ smtpUser?: string, smtpPass?: string, emailFrom?: string }} env
 */
export function handleNotifyStatusRoute(_req, res, env) {
  sendJson(res, 200, {
    emailConfigured: Boolean(env.smtpUser && env.smtpPass),
    emailFrom: env.emailFrom || 'PENS Copilot'
  });
}

/**
 * Handle POST /api/notifications/send for live ETHOL class reminder emails.
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 * @param {{ smtpHost?: string, smtpPort?: number, smtpUser?: string, smtpPass?: string, emailFrom?: string }} env
 */
export async function handleSendNotificationRoute(req, res, env) {
  const t0 = Date.now();
  try {
    const body = await readJsonBody(req);
    const toEmail = typeof body.toEmail === 'string' ? body.toEmail.trim() : '';
    const studentName =
      typeof body.studentName === 'string'
        ? body.studentName.trim()
        : 'Mahasiswa PENS';
    const schedule =
      body.schedule && typeof body.schedule === 'object' ? body.schedule : {};
    const stageLabel =
      typeof body.stageLabel === 'string'
        ? body.stageLabel.trim()
        : 'Pengingat Jadwal';
    const stageKey =
      typeof body.stageKey === 'string' ? body.stageKey.trim() : 'manual';
    const dateKey = typeof body.dateKey === 'string' ? body.dateKey.trim() : '';
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const isTest = Boolean(body.isTest);

    if (!toEmail) {
      sendJson(res, 400, { error: 'Email penerima wajib diisi.' });
      return;
    }

    log(
      'REQ',
      `POST /api/notifications/send | to=${toEmail} | stage=${stageKey} | subject="${schedule?.subject || '-'}"`
    );

    const result = await sendEtholReminderEmail({
      toEmail,
      studentName,
      schedule,
      stageLabel,
      stageKey,
      dateKey,
      message,
      isTest,
      env
    });

    sendJson(res, 200, { ok: true, ...result });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Gagal mengirim notifikasi email.';
    log('ERROR', `Endpoint /api/notifications/send gagal: ${message}`, t0);
    sendJson(res, 500, { error: message });
  }
}
