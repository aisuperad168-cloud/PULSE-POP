/**
 * ============================================================
 * POST /api/newsletter/admin-broadcast-retry
 * ============================================================
 * 重寄某次 broadcast 的失敗名單（例：Resend daily quota 撞牆後補寄）
 *
 * Body:
 *   broadcast_id: number (必要)
 *
 * 邏輯：
 *   1. 從 newsletter_email_logs 找該 broadcast 中 status='failed' 的 email
 *   2. 排除已在後續 log 中補寄成功的 email
 *   3. 重新 render 週報信 + 呼叫 Resend batch
 *   4. 更新 broadcast 統計數字（success_count += retry_sent）
 *   5. 若全部補寄成功 → status 從 partial/failed → sent
 * ============================================================
 */

import { requireAdmin, authFailedResponse } from '../sign/_auth.js';
import {
  jsonResponse, errorResponse, sendResendBatch,
  unsubscribeUrl, siteBase, taipeiNow,
} from './_utils.js';
import { renderWeeklyDigest } from './_templates.js';

export async function onRequestPost({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (!auth.ok) return authFailedResponse(auth);

  let body;
  try { body = await request.json(); }
  catch { return errorResponse('Invalid JSON', 400); }

  const broadcastId = parseInt(body.broadcast_id, 10);
  if (!broadcastId) return errorResponse('缺 broadcast_id', 400);

  const db = env.DB;

  // 撈 broadcast
  const broadcast = await db.prepare(
    `SELECT * FROM newsletter_broadcasts WHERE id = ?`
  ).bind(broadcastId).first();

  if (!broadcast) return errorResponse('找不到該 broadcast', 404);
  if (!['sent', 'partial', 'failed'].includes(broadcast.status)) {
    return errorResponse(`此 broadcast 狀態為 ${broadcast.status}，無法重寄失敗名單`, 400);
  }

  // 找該 broadcast 中所有失敗的 email
  const failedRows = await db.prepare(`
    SELECT DISTINCT to_email FROM newsletter_email_logs
    WHERE broadcast_id = ? AND status = 'failed'
  `).bind(broadcastId).all();
  const failedEmails = new Set((failedRows.results || []).map(r => r.to_email));

  // 找該 broadcast 中已成功寄送的 email（排除掉 → 避免重寄）
  const sentRows = await db.prepare(`
    SELECT DISTINCT to_email FROM newsletter_email_logs
    WHERE broadcast_id = ? AND status = 'sent'
  `).bind(broadcastId).all();
  const sentEmails = new Set((sentRows.results || []).map(r => r.to_email));

  // 差集
  const needRetry = [...failedEmails].filter(e => !sentEmails.has(e));

  if (!needRetry.length) {
    return jsonResponse({
      ok: true,
      message: '沒有需要重寄的 email（所有失敗都已補寄成功）',
      broadcast_id: broadcastId,
      retried: 0,
    });
  }

  // 撈訂閱者資料（要 unsubscribe_token）
  const placeholders = needRetry.map(() => '?').join(',');
  const subsResult = await db.prepare(`
    SELECT id, email, unsubscribe_token, nickname
    FROM newsletter_subscribers
    WHERE email IN (${placeholders})
      AND status='confirmed'
  `).bind(...needRetry).all();
  const subscribers = subsResult.results || [];

  if (!subscribers.length) {
    return jsonResponse({
      ok: true,
      message: '失敗名單對應的訂閱者已退訂或不存在',
      broadcast_id: broadcastId,
      retried: 0,
      debug: {
        failed_count: failedEmails.size,
        sent_count: sentEmails.size,
        need_retry_count: needRetry.length,
      },
    });
  }

  // 解析原本的 articles
  let articles;
  try { articles = JSON.parse(broadcast.articles_json); }
  catch { articles = []; }

  if (!articles.length) return errorResponse('原 broadcast 沒 articles', 500);

  // 組週報 label
  const weekLabel = deriveWeekLabel(broadcast.created_at);

  // 準備 Resend batch
  const fromAddr = `${env.MAIL_FROM_NAME || 'JDI 脈動傳媒'} <${env.MAIL_FROM || 'noreply@jdi-pulse.com'}>`;
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
        { name: 'category', value: 'newsletter_weekly_retry' },
        { name: 'broadcast_id', value: String(broadcastId) },
      ],
    };
  });

  const batchResult = await sendResendBatch(env, emailsPayload);
  const finishedAt = taipeiNow();
  const subjectRef = `週報 - ${weekLabel} (retry)`;

  // 寫 log
  for (const r of batchResult.results) {
    try {
      await db.prepare(`
        INSERT INTO newsletter_email_logs (broadcast_id, subscriber_id, to_email, template, subject, status, resend_id, error_message)
        SELECT ?, id, ?, 'weekly_digest', ?, ?, ?, ?
        FROM newsletter_subscribers WHERE email = ?
      `).bind(
        broadcastId,
        r.to[0],
        subjectRef,
        r.ok ? 'sent' : 'failed',
        r.id || null,
        r.ok ? null : (r.error || 'unknown'),
        r.to[0],
      ).run();
    } catch (e) { /* silent */ }
  }

  // 成功的訂閱者 emails_sent + 1
  const successEmails = batchResult.results.filter(r => r.ok).map(r => r.to[0]);
  if (successEmails.length) {
    for (let i = 0; i < successEmails.length; i += 50) {
      const chunk = successEmails.slice(i, i + 50);
      const ph = chunk.map(() => '?').join(',');
      await db.prepare(`
        UPDATE newsletter_subscribers
        SET emails_sent = emails_sent + 1, last_email_at = ?, updated_at = ?
        WHERE email IN (${ph})
      `).bind(finishedAt, finishedAt, ...chunk).run().catch(() => {});
    }
  }

  // 更新 broadcast 統計
  const newSuccessCount = (broadcast.success_count || 0) + batchResult.sent;
  const newFailCount = Math.max(0, (broadcast.recipient_count || 0) - newSuccessCount);
  let newStatus = broadcast.status;
  if (newFailCount === 0) newStatus = 'sent';
  else if (newSuccessCount === 0) newStatus = 'failed';
  else newStatus = 'partial';

  const newErrorSummary = newFailCount === 0
    ? null
    : `${newFailCount}/${broadcast.recipient_count} 仍失敗 after retry`;

  await db.prepare(`
    UPDATE newsletter_broadcasts
    SET status=?, success_count=?, fail_count=?, error_summary=?, finished_at=?
    WHERE id=?
  `).bind(newStatus, newSuccessCount, newFailCount, newErrorSummary, finishedAt, broadcastId).run();

  return jsonResponse({
    ok: true,
    broadcast_id: broadcastId,
    retried: subscribers.length,
    retry_sent: batchResult.sent,
    retry_failed: batchResult.failed,
    new_status: newStatus,
    new_success_total: newSuccessCount,
    new_fail_total: newFailCount,
    first_error: batchResult.results.find(r => !r.ok)?.error || null,
    triggered_by: auth.email,
  });
}

function deriveWeekLabel(createdAt) {
  const d = createdAt ? new Date(createdAt) : new Date();
  const tw = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));
  const day = tw.getDay();
  const daysSinceMon = (day + 6) % 7;
  const monday = new Date(tw);
  monday.setDate(tw.getDate() - daysSinceMon);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = x => `${x.getMonth() + 1}/${x.getDate()}`;
  return `${fmt(monday)}–${fmt(sunday)}`;
}
