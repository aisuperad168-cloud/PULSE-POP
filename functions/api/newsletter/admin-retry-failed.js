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

  // ==================================================
  // 找出所有失敗 email，且該 email 沒有更晚的 sent 紀錄
  // ==================================================
  // 用子查詢分別找出 failed email 集合 + sent email 集合，然後差集
  const failedRows = await db.prepare(`
    SELECT DISTINCT to_email FROM newsletter_email_logs
    WHERE template = ? AND status = 'failed'
  `).bind(template).all();

  const failedEmails = new Set((failedRows.results || []).map(r => r.to_email.toLowerCase()));

  if (!failedEmails.size) {
    return jsonResponse({
      ok: true,
      message: `沒有任何 template='${template}' 的失敗紀錄`,
      total_retried: 0,
      debug: { failed_count: 0 },
    });
  }

  const sentRows = await db.prepare(`
    SELECT DISTINCT to_email FROM newsletter_email_logs
    WHERE template = ? AND status = 'sent'
  `).bind(template).all();

  const sentEmails = new Set((sentRows.results || []).map(r => r.to_email.toLowerCase()));

  // 差集：failed - sent
  const needRetryEmails = [...failedEmails].filter(e => !sentEmails.has(e));

  if (!needRetryEmails.length) {
    return jsonResponse({
      ok: true,
      message: '沒有需要重寄的訂閱者（所有失敗都已在後續補寄成功）',
      total_retried: 0,
      debug: {
        failed_unique: failedEmails.size,
        sent_unique: sentEmails.size,
        need_retry: 0,
      },
    });
  }

  // 從 subscribers 表拿 token 資料
  const placeholders = needRetryEmails.slice(0, limit).map(() => '?').join(',');
  const rows = await db.prepare(`
    SELECT email, status as sub_status, confirm_token, unsubscribe_token
    FROM newsletter_subscribers
    WHERE email IN (${placeholders})
      AND status IN ('confirmed', 'pending')
  `).bind(...needRetryEmails.slice(0, limit)).all();

  const targets = rows.results || [];

  if (!targets.length) {
    return jsonResponse({
      ok: true,
      message: '找到失敗紀錄但對應的訂閱者已被退訂或刪除',
      total_retried: 0,
      debug: {
        failed_unique: failedEmails.size,
        need_retry: needRetryEmails.length,
        matched_subscribers: 0,
      },
    });
  }

  // ==================================================
  // 同步立即執行（20-30 封只要 3-5 秒）
  // 這樣前端可以直接看到成功/失敗數字，不用再等 waitUntil
  // ==================================================
  const result = await retryEmailsAsync(env, targets, template);

  return jsonResponse({
    ok: true,
    message: `重寄完成：成功 ${result.sent} 封，失敗 ${result.failed} 封`,
    total_retried: targets.length,
    sent: result.sent,
    failed: result.failed,
    errors: result.errors.slice(0, 5),  // 前 5 個錯誤訊息
    retried_by: auth.email,
    debug: {
      failed_unique: failedEmails.size,
      sent_unique: sentEmails.size,
      need_retry: needRetryEmails.length,
      matched_subscribers: targets.length,
    },
  });
}

async function retryEmailsAsync(env, targets, template) {
  const db = env.DB;
  const BATCH_SIZE = 8;
  const BATCH_INTERVAL_MS = 1200;

  let sent = 0;
  let failed = 0;
  const errors = [];

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
          errors.push(`${s.email}: unsupported template ${template}`);
          failed++;
          return;
        }

        const send = await sendResendEmail(env, {
          to: s.email,
          subject: tpl.subject,
          html: tpl.html,
          tags: [{ name: 'category', value: `newsletter_${template}_retry` }],
        });

        if (send.ok) sent++;
        else {
          failed++;
          errors.push(`${s.email}: ${send.error || 'unknown'}`);
        }

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
        } catch (e) { /* silent log */ }

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
        failed++;
        errors.push(`${s.email}: exception - ${err.message}`);
      }
    }));

    if (i + BATCH_SIZE < targets.length) {
      await new Promise(r => setTimeout(r, BATCH_INTERVAL_MS));
    }
  }

  return { sent, failed, errors };
}
