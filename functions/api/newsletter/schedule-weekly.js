/**
 * ============================================================
 * POST /api/newsletter/schedule-weekly
 * ============================================================
 * 排程本週的週報（給 GitHub Action / cron 呼叫）
 * Body: { articles: [{slug, title, hero, description, date, category}], delay_minutes?: 30 }
 *
 * 認證：X-Cron-Secret header（不需 CF Access）
 *
 * 行為：
 *   1. 過濾掉 newsletter_articles_sent 中已推過的文章
 *   2. 若剩餘 0 篇 → 不排程（回 skipped）
 *   3. 若有文章 → 建立 pending broadcast，scheduled_at = now + delay_minutes
 *   4. 寄通知 email 給管理員（含取消連結）
 * ============================================================
 */

import { jsonResponse, errorResponse, sendResendEmail, siteBase, taipeiNow } from './_utils.js';

export async function onRequestPost({ request, env }) {
  const cronSecret = request.headers.get('X-Cron-Secret');
  if (!env.NEWSLETTER_CRON_SECRET || cronSecret !== env.NEWSLETTER_CRON_SECRET) {
    return errorResponse('Unauthorized', 401, 'UNAUTHORIZED');
  }

  let body;
  try { body = await request.json(); }
  catch { return errorResponse('Invalid JSON', 400); }

  const articlesIn = Array.isArray(body.articles) ? body.articles : [];
  if (!articlesIn.length) return errorResponse('articles 陣列為空', 400);

  const delayMin = Math.max(0, Math.min(1440, parseInt(body.delay_minutes ?? 30, 10)));
  const db = env.DB;

  // 過濾已推過的文章
  const slugs = articlesIn.map(a => a.slug).filter(Boolean);
  if (!slugs.length) return errorResponse('文章缺 slug', 400);

  const placeholders = slugs.map(() => '?').join(',');
  const sentRows = await db.prepare(`
    SELECT article_slug FROM newsletter_articles_sent WHERE article_slug IN (${placeholders})
  `).bind(...slugs).all();
  const sentSet = new Set((sentRows.results || []).map(r => r.article_slug));

  const newArticles = articlesIn.filter(a => !sentSet.has(a.slug));

  if (!newArticles.length) {
    return jsonResponse({
      ok: true,
      skipped: true,
      reason: 'all_articles_already_sent',
      total_input: articlesIn.length,
      already_sent: articlesIn.length,
    });
  }

  // 也需檢查目前是否有 pending broadcast — 避免重複排程
  const pending = await db.prepare(`
    SELECT id, scheduled_at FROM newsletter_broadcasts
    WHERE status='pending' AND scheduled_at > ?
    LIMIT 1
  `).bind(new Date().toISOString()).first();
  if (pending) {
    return jsonResponse({
      ok: false,
      skipped: true,
      reason: 'pending_broadcast_exists',
      pending_broadcast_id: pending.id,
      pending_scheduled_at: pending.scheduled_at,
      message: '已有一筆 pending broadcast，取消它或等它執行後再排程',
    }, 409);
  }

  const scheduledAt = new Date(Date.now() + delayMin * 60 * 1000).toISOString();
  const result = await db.prepare(`
    INSERT INTO newsletter_broadcasts (status, scheduled_at, triggered_by, articles_json, articles_count, created_at)
    VALUES ('pending', ?, ?, ?, ?, ?)
  `).bind(
    scheduledAt,
    body.triggered_by || 'github_action',
    JSON.stringify(newArticles),
    newArticles.length,
    taipeiNow(),
  ).run();

  const broadcastId = result.meta.last_row_id;

  // 通知管理員
  const notifyEmail = env.MAIL_NOTIFY || 'pulsepop9@gmail.com';
  const site = siteBase(env);
  const adminUrl = `${site}/sign/admin/#newsletter`;
  const cancelHint = `${site}/sign/admin/#newsletter (在後台可取消)`;

  const listHtml = newArticles.map(a =>
    `<li><strong>${escapeHtml(a.title)}</strong> <br/><span style="color:#6b7280;font-size:13px;">/${escapeHtml(a.slug)}/ · ${escapeHtml(a.date || '')}</span></li>`
  ).join('');

  const notifyHtml = `
    <div style="font-family:sans-serif; max-width:600px; margin:0 auto; padding:24px;">
      <h2 style="color:#FE2C55;">⏰ 週報已排程：${delayMin} 分鐘後自動寄出</h2>
      <p>你設定的每週一週報排程已建立，包含 <strong>${newArticles.length} 篇</strong>新文章：</p>
      <ol style="line-height:2;">${listHtml}</ol>
      <p style="margin:24px 0;">
        <strong>執行時間：</strong>${escapeHtml(scheduledAt)}<br/>
        <strong>Broadcast ID：</strong>#${broadcastId}
      </p>
      <p>
        <a href="${adminUrl}" style="background:#FE2C55; color:#fff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:700;">
          進後台查看 / 取消
        </a>
      </p>
      <p style="font-size:13px; color:#6b7280;">
        如果不用取消，${delayMin} 分鐘後系統會自動寄給所有已確認訂閱者。
      </p>
    </div>
  `;

  sendResendEmail(env, {
    to: notifyEmail,
    subject: `⏰ 週報已排程（${newArticles.length} 篇 · ${delayMin} 分鐘後寄出）`,
    html: notifyHtml,
    tags: [{ name: 'category', value: 'newsletter_admin_notify' }],
  }).catch(e => console.error('[schedule-weekly] admin notify err:', e.message));

  return jsonResponse({
    ok: true,
    broadcast_id: broadcastId,
    scheduled_at: scheduledAt,
    delay_minutes: delayMin,
    articles_count: newArticles.length,
    articles: newArticles.map(a => ({ slug: a.slug, title: a.title })),
    admin_cancel_url: adminUrl,
  });
}

function escapeHtml(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
