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
 * ★ 效能設計：
 *   - DB INSERT 用 db.batch() 一次送多條，快 10 倍
 *   - 寄信改用 ctx.waitUntil() 背景執行，立刻回應前端（避免手機 Safari fetch timeout）
 *
 * 回傳: {
 *   ok, total_input, valid_count, inserted, skipped_existing,
 *   mode, email_dispatch: 'background'
 * }
 * ============================================================
 */

import { requireAdmin, authFailedResponse } from '../sign/_auth.js';
import {
  generateToken, isValidEmail, normalizeEmail, taipeiNow,
  jsonResponse, errorResponse, sendResendEmail,
} from './_utils.js';
import { renderReengagementEmail, renderWelcomeEmail } from './_templates.js';

export async function onRequestPost(context) {
  const { request, env } = context;
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

  // ========================================
  // 1. 一次查出所有已存在 email（避免 N 次 SELECT）
  // ========================================
  // 用 IN 一次查全部（D1 SQLite 支援 IN + 動態 ? placeholder）
  // 但 D1 有 SQL variable 數量上限（100 個），所以分批
  const existingSet = new Set();
  const CHUNK = 90;
  for (let i = 0; i < validEmails.length; i += CHUNK) {
    const chunk = validEmails.slice(i, i + CHUNK);
    const placeholders = chunk.map(() => '?').join(',');
    const rows = await db.prepare(
      `SELECT email FROM newsletter_subscribers WHERE email IN (${placeholders})`
    ).bind(...chunk).all();
    for (const r of (rows.results || [])) existingSet.add(r.email);
  }

  // 篩出真正要新增的
  const toInsert = validEmails
    .filter(e => !existingSet.has(e))
    .map(email => ({
      email,
      confirmToken: generateToken(),
      unsubscribeToken: generateToken(),
    }));

  const skippedExisting = existingSet.size;

  // ========================================
  // 2. 用 db.batch() 一次 INSERT 全部（快 10 倍）
  // ========================================
  if (toInsert.length) {
    const statements = toInsert.map(s => {
      if (mode === 'direct') {
        return db.prepare(`
          INSERT INTO newsletter_subscribers (
            email, status, confirmed_at, source, source_detail,
            confirm_token, unsubscribe_token,
            created_at, updated_at
          ) VALUES (?, 'confirmed', ?, ?, ?, ?, ?, ?, ?)
        `).bind(s.email, now, source, sourceDetail || null, s.confirmToken, s.unsubscribeToken, now, now);
      } else {
        return db.prepare(`
          INSERT INTO newsletter_subscribers (
            email, status, source, source_detail,
            confirm_token, unsubscribe_token,
            created_at, updated_at
          ) VALUES (?, 'pending', ?, ?, ?, ?, ?, ?)
        `).bind(s.email, source, sourceDetail || null, s.confirmToken, s.unsubscribeToken, now, now);
      }
    });

    // D1 batch 支援單次多條 statement 交易化執行
    // 若超過 batch 上限（一般 100），分段送
    const BATCH = 50;
    for (let i = 0; i < statements.length; i += BATCH) {
      await db.batch(statements.slice(i, i + BATCH));
    }
  }

  // ========================================
  // 3. 寄信改用 ctx.waitUntil() 背景執行
  //    立刻回應前端 → 避免手機 Safari fetch timeout
  // ========================================
  const inserted = toInsert.length;

  if (context.waitUntil && toInsert.length) {
    context.waitUntil(sendWelcomeEmailsAsync(env, toInsert, mode, source, sourceDetail));
  }

  return jsonResponse({
    ok: true,
    mode,
    total_input: rawEmails.length,
    valid_count: validEmails.length,
    inserted,
    skipped_existing: skippedExisting,
    email_dispatch: 'background',  // 提示前端：信在背景寄
    imported_by: auth.email,
  });
}

/**
 * 背景執行寄信（不 block response）
 */
async function sendWelcomeEmailsAsync(env, subscribers, mode, source, sourceDetail) {
  const db = env.DB;
  const BATCH_SIZE = 20;

  for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
    const chunk = subscribers.slice(i, i + BATCH_SIZE);
    await Promise.allSettled(chunk.map(async s => {
      try {
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
        } catch (e) { /* silent log fail */ }
      } catch (err) {
        console.error(`[admin-import bg] Failed for ${s.email}:`, err.message);
      }
    }));
    // 每批間隔避免 Resend rate limit
    if (i + BATCH_SIZE < subscribers.length) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}
