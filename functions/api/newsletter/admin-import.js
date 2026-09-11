/**
 * ============================================================
 * POST /api/newsletter/admin-import
 * ============================================================
 * 批量匯入 email（例：Meta 廣告 leads）
 * Body: { emails: [...], source, source_detail, send_reengagement: boolean }
 * - 只寫入 pending 狀態 + 產生 tokens
 * - 若 send_reengagement=true，寄「再度徵求同意信」讓對方選擇要不要加入
 * - 已存在 email 跳過（不覆蓋）
 * 回傳: { ok, inserted, skipped_existing, reengagement_sent }
 * ============================================================
 */

import { requireAdmin, authFailedResponse } from '../sign/_auth.js';
import {
  generateToken, isValidEmail, normalizeEmail, taipeiNow,
  jsonResponse, errorResponse, sendResendEmail,
} from './_utils.js';
import { renderReengagementEmail } from './_templates.js';

export async function onRequestPost({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (!auth.ok) return authFailedResponse(auth);

  let body;
  try { body = await request.json(); }
  catch { return errorResponse('Invalid JSON', 400); }

  const rawEmails = Array.isArray(body.emails) ? body.emails : [];
  const source = (body.source || 'manual_import').slice(0, 50);
  const sourceDetail = (body.source_detail || '').slice(0, 200);
  const sendReengagement = !!body.send_reengagement;

  if (!rawEmails.length) return errorResponse('emails 陣列為空', 400);
  if (rawEmails.length > 5000) return errorResponse('單次最多 5000 筆', 400);

  const db = env.DB;
  const now = taipeiNow();

  // 正規化 + 去重 + 驗證
  const validEmails = [...new Set(
    rawEmails.map(e => normalizeEmail(e)).filter(e => isValidEmail(e))
  )];

  if (!validEmails.length) return errorResponse('沒有任何有效 email', 400);

  let inserted = 0;
  let skippedExisting = 0;
  const newSubscribers = []; // 供後續 reengagement 用

  for (const email of validEmails) {
    const existing = await db.prepare(`SELECT id FROM newsletter_subscribers WHERE email = ?`).bind(email).first();
    if (existing) { skippedExisting++; continue; }

    const confirmToken = generateToken();
    const unsubscribeToken = generateToken();
    await db.prepare(`
      INSERT INTO newsletter_subscribers (
        email, status, source, source_detail,
        confirm_token, unsubscribe_token,
        created_at, updated_at
      ) VALUES (?, 'pending', ?, ?, ?, ?, ?, ?)
    `).bind(email, source, sourceDetail || null, confirmToken, unsubscribeToken, now, now).run();
    inserted++;
    newSubscribers.push({ email, confirmToken, unsubscribeToken });
  }

  // 若啟用 reengagement，逐一寄信（batch API 不方便帶不同 token，故單發）
  let reengagementSent = 0;
  let reengagementFailed = 0;
  if (sendReengagement && newSubscribers.length) {
    // 平行寄，但每批 20 個避免打爆 Resend rate limit
    for (let i = 0; i < newSubscribers.length; i += 20) {
      const chunk = newSubscribers.slice(i, i + 20);
      const results = await Promise.allSettled(chunk.map(async s => {
        const tpl = renderReengagementEmail(env, {
          email: s.email,
          confirmToken: s.confirmToken,
          unsubscribeToken: s.unsubscribeToken,
          sourceLabel: sourceDetail || source,
        });
        const send = await sendResendEmail(env, {
          to: s.email,
          subject: tpl.subject,
          html: tpl.html,
          tags: [{ name: 'category', value: 'newsletter_reengagement' }],
        });
        if (send.ok) reengagementSent++;
        else reengagementFailed++;

        // 寫 log
        try {
          await db.prepare(`
            INSERT INTO newsletter_email_logs (subscriber_id, to_email, template, subject, status, resend_id, error_message)
            SELECT id, ?, 'reengagement', ?, ?, ?, ?
            FROM newsletter_subscribers WHERE email = ?
          `).bind(
            s.email, tpl.subject,
            send.ok ? 'sent' : 'failed',
            send.id || null, send.ok ? null : (send.error || 'unknown'),
            s.email,
          ).run();
        } catch (e) { /* silent */ }
      }));
      // 每批間隔避免 rate limit
      if (i + 20 < newSubscribers.length) await new Promise(r => setTimeout(r, 1000));
    }
  }

  return jsonResponse({
    ok: true,
    total_input: rawEmails.length,
    valid_count: validEmails.length,
    inserted,
    skipped_existing: skippedExisting,
    reengagement_sent: reengagementSent,
    reengagement_failed: reengagementFailed,
    imported_by: auth.email,
  });
}
