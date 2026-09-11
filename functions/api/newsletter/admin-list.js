/**
 * ============================================================
 * GET /api/newsletter/admin-list
 * ============================================================
 * 列出訂閱者（分頁 + 篩選）
 * Query: ?status=confirmed&source=website&page=1&limit=50
 * 回傳: { ok, total, page, limit, items: [{email, status, source, created_at, ...}] }
 * ============================================================
 */

import { requireAdmin, authFailedResponse } from '../sign/_auth.js';
import { jsonResponse } from './_utils.js';

export async function onRequestGet({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (!auth.ok) return authFailedResponse(auth);

  const db = env.DB;
  if (!db) return jsonResponse({ ok: false, error: 'no db' }, 500);

  const url = new URL(request.url);
  const status = url.searchParams.get('status');   // pending / confirmed / unsubscribed / all
  const source = url.searchParams.get('source');   // website / meta_ads / manual_import / ...
  const search = url.searchParams.get('search');   // email 模糊搜尋
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const limit = Math.min(200, Math.max(10, parseInt(url.searchParams.get('limit') || '50', 10)));
  const offset = (page - 1) * limit;

  const conditions = [];
  const bindings = [];
  if (status && status !== 'all') {
    conditions.push('status = ?'); bindings.push(status);
  }
  if (source) {
    conditions.push('source = ?'); bindings.push(source);
  }
  if (search) {
    conditions.push('email LIKE ?'); bindings.push(`%${search.toLowerCase()}%`);
  }
  const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const total = (await db.prepare(`SELECT COUNT(*) as c FROM newsletter_subscribers ${whereSql}`).bind(...bindings).first())?.c || 0;

  const rows = await db.prepare(`
    SELECT id, email, status, source, source_detail, nickname,
           confirmed_at, unsubscribed_at, created_at,
           emails_sent, last_email_at
    FROM newsletter_subscribers
    ${whereSql}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).bind(...bindings, limit, offset).all();

  // 統計
  const stats = await db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status='confirmed' THEN 1 ELSE 0 END) as confirmed,
      SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status='unsubscribed' THEN 1 ELSE 0 END) as unsubscribed
    FROM newsletter_subscribers
  `).first();

  return jsonResponse({
    ok: true,
    stats,
    total,
    page,
    limit,
    items: rows.results || [],
  });
}
