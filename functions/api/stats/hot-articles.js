/**
 * ============================================================
 * GET /api/stats/hot-articles?limit=5
 * ============================================================
 * 回傳本週熱門文章 TOP N（依 views_7d 排序）
 *
 * 回傳：{ ok: true, articles: [{ slug, title, views_7d, views, url }] }
 * Cache: 5 分鐘 CDN cache
 * ============================================================
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
      ...CORS_HEADERS,
    },
  });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '5', 10), 1), 20);

    // 若表尚未存在（第一次呼叫），回空陣列
    const tableCheck = await env.DB.prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='article_views' LIMIT 1`
    ).first();
    if (!tableCheck) {
      return json({ ok: true, articles: [] });
    }

    const rows = await env.DB.prepare(
      `SELECT slug, title, views, views_7d
       FROM article_views
       ORDER BY views_7d DESC, views DESC
       LIMIT ?`
    ).bind(limit).all();

    const articles = (rows.results || []).map(r => ({
      slug: r.slug,
      title: r.title,
      views: r.views,
      views_7d: r.views_7d,
      url: `/live-center/article/${r.slug}/`,
    }));

    return json({ ok: true, articles });
  } catch (err) {
    return json({ ok: false, error: err.message, articles: [] }, 200);
  }
}
