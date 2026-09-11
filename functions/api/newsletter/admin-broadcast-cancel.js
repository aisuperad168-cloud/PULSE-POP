/**
 * ============================================================
 * POST /api/newsletter/admin-broadcast-cancel
 * ============================================================
 * 取消一筆 pending 排程
 * Body: { broadcast_id }
 * ============================================================
 */

import { requireAdmin, authFailedResponse } from '../sign/_auth.js';
import { jsonResponse, errorResponse, taipeiNow } from './_utils.js';

export async function onRequestPost({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (!auth.ok) return authFailedResponse(auth);

  let body;
  try { body = await request.json(); }
  catch { return errorResponse('Invalid JSON', 400); }

  const broadcastId = parseInt(body.broadcast_id, 10);
  if (!broadcastId) return errorResponse('broadcast_id required', 400);

  const db = env.DB;
  const row = await db.prepare(`SELECT id, status FROM newsletter_broadcasts WHERE id = ?`).bind(broadcastId).first();
  if (!row) return errorResponse('找不到這筆排程', 404);
  if (row.status !== 'pending') return errorResponse(`此排程狀態為 ${row.status}，無法取消`, 400);

  const now = taipeiNow();
  await db.prepare(`
    UPDATE newsletter_broadcasts
    SET status='cancelled', cancelled_at=?, cancelled_by=?
    WHERE id=?
  `).bind(now, auth.email, broadcastId).run();

  return jsonResponse({ ok: true, cancelled_at: now, cancelled_by: auth.email });
}
