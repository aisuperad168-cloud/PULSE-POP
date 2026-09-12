/**
 * ============================================================
 * POST /api/newsletter/admin-import
 * ============================================================
 * 批量匯入 email（例：Meta 廣告 leads）
 *
 * Body:
 *   emails: string[]                    要匯入的 email 陣列
 *   source: string                      來源標籤（meta_ads / quiz_legacy / manual_import ...）
 *   source_detail?: string              來源詳細說明
 *   import_mode: 'direct' | 'reengagement'
 *     - 'direct'       : 直接標記為 confirmed（適用於已 opt-in 的來源，
 *                        例如 Meta Lead Ads —— 客戶已主動填寫、同意接收訊息）
 *     - 'reengagement' : 標記為 pending + 寄「再度徵求同意信」（適用於
 *                        來源不明或舊名單，讓對方主動確認才生效）
 *
 * 相容舊 API：若傳入 send_reengagement=true 等同 import_mode='reengagement'
 *
 * 已存在 email 跳過（不覆蓋、不重寄信）。
 *
 * 回傳: {
 *   ok, total_input, valid_count, inserted, skipped_existing,
 *   mode,
 *   welcome_sent?, reengagement_sent?, welcome_failed?, reengagement_failed?,
 * }
 * ============================================================
 */

import { requireAdmin, authFailedResponse } from '../sign/_auth.js';
import {
  generateToken, isValidEmail, normalizeEmail, taipeiNow,
  jsonResponse, errorResponse, sendResendEmail,
} from './_utils.js';
import { renderReengagementEmail, renderWelcomeEmail } from './_templates.js';

export async function onRequestPost({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (!auth.ok) return authFailedResponse(auth);

  let body;
  try { body = await request.json(); }
  catch { return errorResponse('Invalid JSON', 400); }

  const rawEmails = Array.isArray(body.emails) ? body.emails : [];
  const source = (body.source || 'manual_import').slice(0, 50);
  const sourceDetail = (body.source_detail || '').slice(0, 200);

  // 決定匯入模式（相容舊參數）
  let mode = body.import_mode || (body.send_reengagement ? 'reengagement' : 'direct');
  if (mode !== 'direct' && mode !== 'reengagement') mode = 'reengagement';

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
  const newSubscribers = []; // { email, confirmToken, unsubscribeToken }

  for (const email of validEmails) {
    const existing = await db.prepare(`SELECT id FROM newsletter_subscribers WHERE email = ?`).bind(email).first();
    if (existing) { skippedExisting++; continue; }

    const confirmToken = generateToken();
    const unsubscribeToken = generateToken();

    if (mode === 'direct') {
      // Direct mode：Meta 廣告 leads → 直接 confirmed
      await db.prepare(`
        INSERT INTO newsletter_subscribers (
          email, status, confirmed_at, source, source_detail,
          confirm_token, unsubscribe_token,
          created_at, updated_at
        ) VALUES (?, 'confirmed', ?, ?, ?, ?, ?, ?, ?)
      `).bind(email, now, source, sourceDetail || null, confirmToken, unsubscribeToken, now, now).run();
    } else {
      // Reengagement mode：pending，需點連結確認
      await db.prepare(`
        INSERT INTO newsletter_subscribers (
          email, status, source, source_detail,
          confirm_token, unsubscribe_token,
          created_at, updated_at
        ) VALUES (?, 'pending', ?, ?, ?, ?, ?, ?)
      `).bind(email, source, sourceDetail || null, confirmToken, unsubscribeToken, now, now).run();
    }

    inserted++;
    newSubscribers.push({ email, confirmToken, unsubscribeToken });
  }

  // 寄信邏輯（依 mode 決定寄哪種）
  let sent = 0;
  let failed = 0;

  if (newSubscribers.length) {
    // 平行寄，但每批 20 個避免打爆 Resend rate limit
    for (let i = 0; i < newSubscribers.length; i += 20) {
      const chunk = newSubscribers.slice(i, i + 20);
      await Promise.allSettled(chunk.map(async s => {
        let tpl, template;
        if (mode === 'direct') {
          tpl = renderWelcomeEmail(env, {
            email: s.email,
            unsubscribeToken: s.unsubscribeToken,
          });
          template = 'welcome';
        } else {
          tpl = renderReengagementEmail(env, {
            email: s.email,
            confirmToken: s.confirmToken,
            unsubscribeToken: s.unsubscribeToken,
            sourceLabel: sourceDetail || source,
          });
          template = 'reengagement';
        }

        const send = await sendResendEmail(env, {
          to: s.email,
          subject: tpl.subject,
          html: tpl.html,
          tags: [{ name: 'category', value: `newsletter_${template}` }],
        });
        if (send.ok) sent++;
        else failed++;

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
      }));
      // 每批間隔避免 rate limit
      if (i + 20 < newSubscribers.length) await new Promise(r => setTimeout(r, 1000));
    }
  }

  const result = {
    ok: true,
    mode,
    total_input: rawEmails.length,
    valid_count: validEmails.length,
    inserted,
    skipped_existing: skippedExisting,
    imported_by: auth.email,
  };
  if (mode === 'direct') {
    result.welcome_sent = sent;
    result.welcome_failed = failed;
  } else {
    result.reengagement_sent = sent;
    result.reengagement_failed = failed;
  }
  return jsonResponse(result);
}
