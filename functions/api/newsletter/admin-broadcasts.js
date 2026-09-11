/**
 * ============================================================
 * GET  /api/newsletter/admin-broadcasts     → 列出所有排程/歷史
 * POST /api/newsletter/admin-broadcasts     → 手動建立一筆排程
 *   Body: { articles: [{slug, title, hero, description, date, category}], delay_minutes?: 30 }
 * ============================================================
 */

import { requireAdmin, authFailedResponse } from '../sign/_auth.js';
import { jsonResponse, errorResponse, taipeiNow } from './_utils.js';

export async function onRequestGet({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (!auth.ok) return authFailedResponse(auth);

  const db = env.DB;
  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const limit = Math.min(200, parseInt(url.searchParams.get('limit') || '50', 10));

  const whereSql = status && status !== 'all' ? `WHERE status = ?` : '';
  const bindings = status && status !== 'all' ? [status] : [];

  const rows = await db.prepare(`
    SELECT id, status, scheduled_at, triggered_by, articles_json, articles_count,
           started_at, finished_at, cancelled_at, cancelled_by,
           recipient_count, success_count, fail_count, error_summary, created_at
    FROM newsletter_broadcasts
    ${whereSql}
    ORDER BY created_at DESC
    LIMIT ?
  `).bind(...bindings, limit).all();

  const items = (rows.results || []).map(r => ({
    ...r,
    articles: safeParseArticles(r.articles_json),
  }));

  return jsonResponse({ ok: true, items });
}

export async function onRequestPost({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (!auth.ok) return authFailedResponse(auth);

  let body;
  try { body = await request.json(); }
  catch { return errorResponse('Invalid JSON', 400); }

  const articles = Array.isArray(body.articles) ? body.articles : [];
  if (!articles.length) return errorResponse('至少需要 1 篇文章', 400);

  // 驗證每篇 article schema
  for (const a of articles) {
    if (!a.slug || !a.title) return errorResponse(`文章缺 slug/title: ${JSON.stringify(a)}`, 400);
  }

  const delayMin = Math.max(0, Math.min(1440, parseInt(body.delay_minutes ?? 30, 10)));
  const scheduledAt = new Date(Date.now() + delayMin * 60 * 1000).toISOString();

  const db = env.DB;
  const result = await db.prepare(`
    INSERT INTO newsletter_broadcasts (
      status, scheduled_at, triggered_by, articles_json, articles_count, created_at
    ) VALUES ('pending', ?, ?, ?, ?, ?)
  `).bind(
    scheduledAt,
    body.triggered_by || 'admin_manual',
    JSON.stringify(articles),
    articles.length,
    taipeiNow(),
  ).run();

  return jsonResponse({
    ok: true,
    broadcast_id: result.meta.last_row_id,
    scheduled_at: scheduledAt,
    articles_count: articles.length,
    delay_minutes: delayMin,
    message: delayMin > 0
      ? `已排程 ${delayMin} 分鐘後執行。可於後台取消。`
      : '立即執行 → 請呼叫 /api/newsletter/admin-broadcast-run',
  });
}

function safeParseArticles(json) {
  if (!json) return [];
  try { return JSON.parse(json); } catch { return []; }
}
