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

  const finishedAt = taipeiNow();
  const successCount = batchResult.sent;
  const failCount = batchResult.failed;

  // ==================================================
  // 記錄每封 email 的 log（成功 + 失敗都記，方便追蹤真實狀況）
  // ==================================================
  // 建立 subject 引用
  const subjectRef = `週報 - ${weekLabel}`;

  // 記錄成功寄送
  const successResults = batchResult.results.filter(r => r.ok);
  for (const s of successResults) {
    try {
      await db.prepare(`
        INSERT INTO newsletter_email_logs (broadcast_id, subscriber_id, to_email, template, subject, status, resend_id)
        SELECT ?, id, ?, 'weekly_digest', ?, 'sent', ?
        FROM newsletter_subscribers WHERE email = ?
      `).bind(broadcast.id, s.to[0], subjectRef, s.id || null, s.to[0]).run();
    } catch (e) { /* silent */ }
  }

  // 記錄失敗
  const failedResults = batchResult.results.filter(r => !r.ok);
  for (const f of failedResults) {
    try {
      await db.prepare(`
        INSERT INTO newsletter_email_logs (broadcast_id, subscriber_id, to_email, template, subject, status, error_message)
        SELECT ?, id, ?, 'weekly_digest', ?, 'failed', ?
        FROM newsletter_subscribers WHERE email = ?
      `).bind(broadcast.id, f.to[0], subjectRef, f.error || 'unknown', f.to[0]).run();
    } catch (e) { /* silent */ }
  }

  // 更新訂閱者計數（只有成功的才 +1）
  const successEmails = successResults.map(r => r.to[0]);
  if (successEmails.length) {
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

  // ==================================================
  // 只有「至少 1 封成功」才記錄 articles_sent
  // 否則下次 workflow 掃描還會抓到這篇（避免全 fail 時誤登記已推過）
  // ==================================================
  if (successCount > 0) {
    for (const a of articles) {
      try {
        await db.prepare(`
          INSERT OR IGNORE INTO newsletter_articles_sent (article_slug, broadcast_id, first_included_at)
          VALUES (?, ?, ?)
        `).bind(a.slug, broadcast.id, finishedAt).run();
      } catch (e) { /* silent */ }
    }
  }

  // ==================================================
  // 收尾：更準確的 status 判斷
  // - 全部成功 → sent
  // - 全部失敗 → failed
  // - 部分成功 → partial（新增的 status）
  // ==================================================
  let finalStatus;
  let errorSummary = null;
  if (failCount === 0) {
    finalStatus = 'sent';
  } else if (successCount === 0) {
    finalStatus = 'failed';
    // 取第一個 error 當摘要（通常同批全同錯誤，例如 daily quota）
    errorSummary = failedResults[0]?.error || 'unknown';
  } else {
    finalStatus = 'partial';  // 部分成功
    errorSummary = `${failCount}/${subscribers.length} failed. First error: ${failedResults[0]?.error || 'unknown'}`;
  }

  await db.prepare(`
    UPDATE newsletter_broadcasts
    SET status=?, finished_at=?, recipient_count=?, success_count=?, fail_count=?, error_summary=?
    WHERE id=?
  `).bind(
    finalStatus,
    finishedAt,
    subscribers.length,
    successCount,
    failCount,
    errorSummary,
    broadcast.id,
  ).run();

  return jsonResponse({
    ok: true,
    broadcast_id: broadcast.id,
    recipient_count: subscribers.length,
    success_count: successCount,
    fail_count: failCount,
    final_status: finalStatus,  // ← 新欄位：sent / partial / failed
    error_summary: errorSummary,
    articles_count: articles.length,
    triggered_by: actorEmail,
    finished_at: finishedAt,
    // 第一個錯誤訊息（方便前端顯示）
    first_error: failedResults[0]?.error || null,
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
