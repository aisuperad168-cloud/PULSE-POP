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

  // ==================================================
  // Dedup Layer 1：檢查目前是否有 pending broadcast
  // ==================================================
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

  // ==================================================
  // Dedup Layer 2：檢查目前是否有 sending broadcast（正在寄）
  // 這是 bug fix 關鍵！之前只擋 pending，若剛好在寄送中會漏
  // ==================================================
  const sending = await db.prepare(`
    SELECT id, started_at FROM newsletter_broadcasts
    WHERE status='sending'
    LIMIT 1
  `).first();
  if (sending) {
    return jsonResponse({
      ok: false,
      skipped: true,
      reason: 'sending_broadcast_in_progress',
      sending_broadcast_id: sending.id,
      started_at: sending.started_at,
      message: '有一筆 broadcast 正在寄送中，請等它完成再排程',
    }, 409);
  }

  // ==================================================
  // Dedup Layer 3：檢查最近 6 小時內是否已寄過相同 slug 組合
  // 防止「寄完後 newsletter_articles_sent 寫入延遲」或
  // 「broadcast 卡在 sent/failed 但 articles_sent 沒寫入」造成重複
  // ==================================================
  const sixHoursAgo = new Date(Date.now() - 6 * 3600 * 1000).toISOString();
  const recentBroadcasts = await db.prepare(`
    SELECT id, status, articles_json, created_at FROM newsletter_broadcasts
    WHERE created_at > ? AND status IN ('sent', 'sending', 'partial')
    ORDER BY id DESC LIMIT 5
  `).bind(sixHoursAgo).all();

  const newSlugsSorted = newArticles.map(a => a.slug).sort().join(',');
  for (const rb of (recentBroadcasts.results || [])) {
    try {
      const rbArticles = JSON.parse(rb.articles_json || '[]');
      const rbSlugsSorted = rbArticles.map(a => a.slug).sort().join(',');
      // 完全相同的 slug 組合 → 一定是重複
      if (rbSlugsSorted === newSlugsSorted) {
        return jsonResponse({
          ok: false,
          skipped: true,
          reason: 'duplicate_slugs_in_recent_broadcast',
          duplicate_broadcast_id: rb.id,
          duplicate_status: rb.status,
          duplicate_created_at: rb.created_at,
          slugs: newArticles.map(a => a.slug),
          message: `最近 6 小時內已有 broadcast #${rb.id} 包含完全相同的文章組合，跳過`,
        }, 409);
      }
      // 有交集但不完全相同 → 只警告不擋（可能是漸進式加篇）
      const rbSlugs = new Set(rbArticles.map(a => a.slug));
      const overlap = newArticles.filter(a => rbSlugs.has(a.slug));
      if (overlap.length > 0 && overlap.length === newArticles.length) {
        // 新 broadcast 的文章全部都在最近 broadcast 中 → 也算重複
        return jsonResponse({
          ok: false,
          skipped: true,
          reason: 'all_slugs_in_recent_broadcast',
          duplicate_broadcast_id: rb.id,
          duplicate_status: rb.status,
          overlap_slugs: overlap.map(a => a.slug),
          message: `所有文章都在最近的 broadcast #${rb.id} 中已寄出，跳過`,
        }, 409);
      }
    } catch (e) {
      // JSON parse 錯誤忽略
    }
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
