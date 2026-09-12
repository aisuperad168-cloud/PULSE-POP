/**
 * ============================================================
 * POST /api/newsletter/admin-retry-failed
 * ============================================================
 * 重寄「上次寄信失敗（rate limit / bounced etc.）」的訂閱者
 *
 * Body:
 *   template?: 'welcome' | 'reengagement' | 'weekly_digest' | ...
 *              (預設 'welcome'，篩 admin-import 匯入的失敗 log)
 *   limit?: number (預設 100，最多 500)
 *
 * 邏輯：
 *   1. 從 newsletter_email_logs 找 status='failed' + 沒有後續 status='sent' 的 email
 *   2. 根據該 email 目前在 newsletter_subscribers 的狀態決定寄哪種信
 *   3. 用 ctx.waitUntil() 背景寄，每批 8 封 + 1.2 秒間隔
 * ============================================================
 */

import { requireAdmin, authFailedResponse } from '../sign/_auth.js';
import {
  jsonResponse, errorResponse, sendResendEmail,
} from './_utils.js';
import { renderWelcomeEmail, renderReengagementEmail } from './_templates.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const auth = await requireAdmin(request, env);
  if (!auth.ok) return authFailedResponse(auth);

  let body;
  try { body = await request.json(); }
  catch { body = {}; }

  const template = body.template || 'welcome';
  const limit = Math.min(500, Math.max(1, parseInt(body.limit || 100, 10)));

  const db = env.DB;

  // 找出所有「最後一次寄 template 是 failed」的訂閱者
  // 用 max(id) 找每個 email 最新一筆的 status
  const rows = await db.prepare(`
    SELECT s.email, s.status as sub_status, s.confirm_token, s.unsubscribe_token
    FROM newsletter_subscribers s
    WHERE s.email IN (
      SELECT to_email FROM newsletter_email_logs
      WHERE template = ? AND status = 'failed'
      GROUP BY to_email
      HAVING MAX(CASE WHEN status='sent' THEN id ELSE 0 END) = 0
    )
      AND s.status IN ('confirmed', 'pending')
    LIMIT ?
  `).bind(template, limit).all();

  const targets = rows.results || [];

  if (!targets.length) {
    return jsonResponse({
      ok: true,
      message: '沒有需要重寄的訂閱者（所有失敗都已補寄成功）',
      total_retried: 0,
    });
  }

  // 背景重寄
  if (context.waitUntil) {
    context.waitUntil(retryEmailsAsync(env, targets, template));
  }

  return jsonResponse({
    ok: true,
    message: `已排入背景重寄 ${targets.length} 封 ${template} 信件`,
    total_retried: targets.length,
    email_dispatch: 'background',
    retried_by: auth.email,
  });
}

async function retryEmailsAsync(env, targets, template) {
  const db = env.DB;
  const BATCH_SIZE = 8;
  const BATCH_INTERVAL_MS = 1200;

  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    const chunk = targets.slice(i, i + BATCH_SIZE);
    await Promise.allSettled(chunk.map(async s => {
      try {
        let tpl;
        if (template === 'welcome') {
          tpl = renderWelcomeEmail(env, {
            email: s.email,
            unsubscribeToken: s.unsubscribe_token,
          });
        } else if (template === 'reengagement') {
          tpl = renderReengagementEmail(env, {
            email: s.email,
            confirmToken: s.confirm_token,
            unsubscribeToken: s.unsubscribe_token,
            sourceLabel: 'JDI 名單',
          });
        } else {
          return; // unsupported
        }

        const send = await sendResendEmail(env, {
          to: s.email,
          subject: tpl.subject,
          html: tpl.html,
          tags: [{ name: 'category', value: `newsletter_${template}_retry` }],
        });

        const nowIso = new Date().toISOString();

        // 寫 log
        try {
          await db.prepare(`
            INSERT INTO newsletter_email_logs (subscriber_id, to_email, template, subject, status, resend_id, error_message)
            SELECT id, ?, ?, ?, ?, ?, ?
            FROM newsletter_subscribers WHERE email = ?
          `).bind(
            s.email, template, tpl.subject,
            send.ok ? 'sent' : 'failed',
            send.id || null, send.ok ? null : (send.error || 'unknown'),
            s.email,
          ).run();
        } catch (e) { /* silent */ }

        // 寄信成功 → UPDATE emails_sent
        if (send.ok) {
          try {
            await db.prepare(`
              UPDATE newsletter_subscribers
              SET emails_sent = emails_sent + 1, last_email_at = ?, updated_at = ?
              WHERE email = ?
            `).bind(nowIso, nowIso, s.email).run();
          } catch (e) { /* silent */ }
        }
      } catch (err) {
        console.error(`[retry-failed bg] Failed for ${s.email}:`, err.message);
      }
    }));

    if (i + BATCH_SIZE < targets.length) {
      await new Promise(r => setTimeout(r, BATCH_INTERVAL_MS));
    }
  }
}
