/**
 * GET /api/newsletter/admin-diagnostics
 * 診斷用：看 broadcasts / articles_sent 狀態
 */

import { requireAdmin, authFailedResponse } from '../sign/_auth.js';
import { jsonResponse } from './_utils.js';

export async function onRequestGet({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (!auth.ok) return authFailedResponse(auth);

  const db = env.DB;

  // 所有 broadcasts
  const broadcasts = await db.prepare(`
    SELECT id, status, scheduled_at, articles_count, triggered_by, created_at
    FROM newsletter_broadcasts ORDER BY id DESC LIMIT 20
  `).all();

  // 所有已推過的文章
  const articlesSent = await db.prepare(`
    SELECT id, article_slug, broadcast_id, first_included_at
    FROM newsletter_articles_sent ORDER BY id DESC LIMIT 50
  `).all();

  // 訂閱者 confirmed 數
  const subCount = await db.prepare(`
    SELECT COUNT(*) as c FROM newsletter_subscribers WHERE status='confirmed'
  `).first();

  return jsonResponse({
    ok: true,
    broadcasts: broadcasts.results || [],
    articles_sent: articlesSent.results || [],
    confirmed_subscribers: subCount?.c || 0,
    env_check: {
      has_cron_secret: !!env.NEWSLETTER_CRON_SECRET,
      has_resend_key: !!env.RESEND_API_KEY,
      site_base: env.SITE_BASE || 'https://jdi-pulse.com',
    },
  });
}
