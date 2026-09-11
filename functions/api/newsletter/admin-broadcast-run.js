/**
 * ============================================================
 * POST /api/newsletter/admin-broadcast-run
 * ============================================================
 * 執行 broadcast：從 D1 撈 pending broadcast → 用 Resend batch 寄給所有 confirmed 訂閱者
 * Body: { broadcast_id?, force_run?: true }
 *   - 不帶 broadcast_id → 掃 pending 且 scheduled_at <= now 的第一筆
 *   - force_run=true → 忽略 scheduled_at 時間檢查（admin 立即發）
 *
 * 認證：Admin only（GitHub Action 用 NEWSLETTER_CRON_SECRET header 也可觸發）
 * ============================================================
 */

import { requireAdmin, authFailedResponse } from '../sign/_auth.js';
import { jsonResponse, errorResponse, sendResendBatch, unsubscribeUrl, siteBase, taipeiNow } from './_utils.js';
import { renderWeeklyDigest } from './_templates.js';

export async function onRequestPost({ request, env }) {
  // 認證：admin OR shared secret（給 GitHub Action / cron 用）
  const cronSecret = request.headers.get('X-Cron-Secret');
  const isCronCall = env.NEWSLETTER_CRON_SECRET && cronSecret === env.NEWSLETTER_CRON_SECRET;

  let actorEmail = 'cron';
  if (!isCronCall) {
    const auth = await requireAdmin(request, env);
    if (!auth.ok) return authFailedResponse(auth);
    actorEmail = auth.email;
  }

  let body = {};
  try { body = await request.json(); } catch {}

  const db = env.DB;
  const forceRun = !!body.force_run;
  const broadcastId = body.broadcast_id ? parseInt(body.broadcast_id, 10) : null;

  // 撈要執行的 broadcast
  let broadcast;
  if (broadcastId) {
    broadcast = await db.prepare(`SELECT * FROM newsletter_broadcasts WHERE id = ?`).bind(broadcastId).first();
    if (!broadcast) return errorResponse('找不到這筆排程', 404);
    if (broadcast.status !== 'pending') return errorResponse(`狀態為 ${broadcast.status}，無法執行`, 400);
    if (!forceRun && broadcast.scheduled_at > new Date().toISOString()) {
      return jsonResponse({
        ok: false,
        error: 'not_yet_scheduled',
        scheduled_at: broadcast.scheduled_at,
        message: '尚未到執行時間，若要立即執行請帶 force_run: true',
      }, 409);
    }
  } else {
    // 找一筆到期 pending
    broadcast = await db.prepare(`
      SELECT * FROM newsletter_broadcasts
      WHERE status='pending' AND scheduled_at <= ?
      ORDER BY scheduled_at ASC LIMIT 1
    `).bind(new Date().toISOString()).first();
    if (!broadcast) {
      return jsonResponse({ ok: true, ran: 0, message: 'No pending broadcasts due' });
    }
  }

  // 標記 sending
  const startedAt = taipeiNow();
  await db.prepare(`UPDATE newsletter_broadcasts SET status='sending', started_at=? WHERE id=?`)
    .bind(startedAt, broadcast.id).run();

  // 撈 confirmed 訂閱者
  const subsResult = await db.prepare(`
    SELECT id, email, unsubscribe_token, nickname
    FROM newsletter_subscribers
    WHERE status='confirmed'
    ORDER BY id ASC
  `).all();
  const subscribers = subsResult.results || [];

  if (!subscribers.length) {
    const now = taipeiNow();
    await db.prepare(`
      UPDATE newsletter_broadcasts
      SET status='sent', finished_at=?, recipient_count=0, success_count=0, fail_count=0
      WHERE id=?
    `).bind(now, broadcast.id).run();
    return jsonResponse({ ok: true, broadcast_id: broadcast.id, recipient_count: 0, message: '無 confirmed 訂閱者' });
  }

  // 解析文章
  let articles;
  try { articles = JSON.parse(broadcast.articles_json); }
  catch { articles = []; }

  if (!articles.length) {
    await db.prepare(`
      UPDATE newsletter_broadcasts SET status='failed', finished_at=?, error_summary='articles_json parse fail' WHERE id=?
    `).bind(taipeiNow(), broadcast.id).run();
    return errorResponse('articles_json 解析失敗', 500);
  }

  // 決定 subject
  const weekLabel = deriveWeekLabel();

  // 準備 batch emails
  const fromAddr = `${env.MAIL_FROM_NAME || 'JDI 脈動傳媒'} <${env.MAIL_FROM || 'noreply@jdi-pulse.com'}>`;
  const site = siteBase(env);

  const emailsPayload = subscribers.map(s => {
    const tpl = renderWeeklyDigest(env, {
      articles,
      unsubscribeToken: s.unsubscribe_token,
      weekLabel,
    });
    return {
      from: fromAddr,
      to: [s.email],
      subject: tpl.subject,
      html: tpl.html,
      headers: {
        'List-Unsubscribe': `<${unsubscribeUrl(env, s.unsubscribe_token)}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
      tags: [
        { name: 'category', value: 'newsletter_weekly' },
        { name: 'broadcast_id', value: String(broadcast.id) },
      ],
    };
  });

  // 呼叫 Resend batch
  const batchResult = await sendResendBatch(env, emailsPayload);

  // 記錄每封 log（僅記 failed 節省 D1 rows；successful 只更新 subscriber counters）
  const finishedAt = taipeiNow();
  const successCount = batchResult.sent;
  const failCount = batchResult.failed;

  // 更新訂閱者計數（batch UPDATE）
  const successEmails = batchResult.results.filter(r => r.ok).map(r => r.to[0]);
  if (successEmails.length) {
    // D1 沒支援 WHERE IN with binding array，拆成小批（100/次）
    for (let i = 0; i < successEmails.length; i += 50) {
      const chunk = successEmails.slice(i, i + 50);
      const placeholders = chunk.map(() => '?').join(',');
      await db.prepare(`
        UPDATE newsletter_subscribers
        SET emails_sent = emails_sent + 1, last_email_at = ?, updated_at = ?
        WHERE email IN (${placeholders})
      `).bind(finishedAt, finishedAt, ...chunk).run().catch(e => console.error('[broadcast] update counter err:', e.message));
    }
  }

  // 記錄失敗 log
  const failedResults = batchResult.results.filter(r => !r.ok);
  for (const f of failedResults) {
    try {
      await db.prepare(`
        INSERT INTO newsletter_email_logs (broadcast_id, subscriber_id, to_email, template, subject, status, error_message)
        VALUES (?, NULL, ?, 'weekly_digest', ?, 'failed', ?)
      `).bind(broadcast.id, f.to[0], `週報 - ${weekLabel}`, f.error || 'unknown').run();
    } catch (e) { /* silent */ }
  }

  // 記錄 articles_sent（避免重複推）
  for (const a of articles) {
    try {
      await db.prepare(`
        INSERT OR IGNORE INTO newsletter_articles_sent (article_slug, broadcast_id, first_included_at)
        VALUES (?, ?, ?)
      `).bind(a.slug, broadcast.id, finishedAt).run();
    } catch (e) { /* silent */ }
  }

  // 收尾
  await db.prepare(`
    UPDATE newsletter_broadcasts
    SET status=?, finished_at=?, recipient_count=?, success_count=?, fail_count=?, error_summary=?
    WHERE id=?
  `).bind(
    failCount === 0 ? 'sent' : (successCount === 0 ? 'failed' : 'sent'),
    finishedAt,
    subscribers.length,
    successCount,
    failCount,
    failCount ? `${failCount} failed out of ${subscribers.length}` : null,
    broadcast.id,
  ).run();

  return jsonResponse({
    ok: true,
    broadcast_id: broadcast.id,
    recipient_count: subscribers.length,
    success_count: successCount,
    fail_count: failCount,
    articles_count: articles.length,
    triggered_by: actorEmail,
    finished_at: finishedAt,
  });
}

// 取本週標籤（例：「9/8-9/14」）
function deriveWeekLabel() {
  const now = new Date();
  // Asia/Taipei 現在
  const tw = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));
  // 找本週一
  const day = tw.getDay(); // 0=Sun, 1=Mon
  const daysSinceMon = (day + 6) % 7;
  const monday = new Date(tw);
  monday.setDate(tw.getDate() - daysSinceMon);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = d => `${d.getMonth() + 1}/${d.getDate()}`;
  return `${fmt(monday)}–${fmt(sunday)}`;
}
