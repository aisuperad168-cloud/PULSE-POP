/**
 * ============================================================
 * GET /api/newsletter/admin-email-logs
 * ============================================================
 * 診斷用：查 newsletter_email_logs 看寄信狀況
 * Query: ?limit=50&status=failed&email=xxx@xxx
 * 回傳: {
 *   ok, total,
 *   stats: { sent, failed },
 *   items: [{ id, to_email, template, subject, status, resend_id, error_message, created_at }]
 * }
 * ============================================================
 */

import { requireAdmin, authFailedResponse } from '../sign/_auth.js';
import { jsonResponse } from './_utils.js';

export async function onRequestGet({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (!auth.ok) return authFailedResponse(auth);

  const db = env.DB;
  if (!db) return jsonResponse({ ok: false, error: 'no db' }, 500);

  const url = new URL(request.url);
  const limit = Math.min(500, Math.max(10, parseInt(url.searchParams.get('limit') || '50', 10)));
  const status = url.searchParams.get('status');   // sent / failed / all
  const email = url.searchParams.get('email');     // 特定 email 的寄送 log
  const template = url.searchParams.get('template'); // welcome / reengagement / confirm / weekly_digest

  const conditions = [];
  const bindings = [];
  if (status && status !== 'all') {
    conditions.push('status = ?'); bindings.push(status);
  }
  if (email) {
    conditions.push('to_email = ?'); bindings.push(email.toLowerCase());
  }
  if (template) {
    conditions.push('template = ?'); bindings.push(template);
  }
  const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  // 總計
  const stats = await db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status='sent' THEN 1 ELSE 0 END) as sent,
      SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) as failed
    FROM newsletter_email_logs
  `).first();

  // 篩選後結果
  const rows = await db.prepare(`
    SELECT id, subscriber_id, to_email, template, subject, status,
           resend_id, error_message, created_at
    FROM newsletter_email_logs
    ${whereSql}
    ORDER BY id DESC
    LIMIT ?
  `).bind(...bindings, limit).all();

  // 環境檢查（幫你 debug）
  const envCheck = {
    has_resend_key: !!env.RESEND_API_KEY,
    mail_from: env.MAIL_FROM || 'noreply@jdi-pulse.com',
    mail_from_name: env.MAIL_FROM_NAME || 'JDI 脈動傳媒',
    site_base: env.SITE_BASE || 'https://jdi-pulse.com',
  };

  return jsonResponse({
    ok: true,
    stats,
    env_check: envCheck,
    items: rows.results || [],
  });
}
