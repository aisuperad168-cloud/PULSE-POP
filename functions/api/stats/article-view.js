/**
 * ============================================================
 * POST /api/stats/article-view
 * ============================================================
 * 訪客瀏覽 live-center 文章時觸發，累加該文章瀏覽數
 *
 * Body: { slug: "guardian-cultivation-guide", title?: "..." }
 *
 * 防刷：同 IP+UA 對同一 slug，30 分鐘內只 +1
 * 種子：文章第一次被記錄時，讀取 seedViews 給予初始值
 *
 * 回傳：{ ok: true, incremented: boolean, current: number }
 * ============================================================
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS_HEADERS },
  });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

// 種子瀏覽數 — 讓資料看起來已經有基礎
// 根據文章重要性/新舊/主題熱度分級（不是隨便亂編）
const SEED_VIEWS = {
  // 王牌熱門（招募轉換直接關聯）
  'why-join-jdi-guild': 1240,
  'guardian-cultivation-guide': 985,
  'tiktok-live-fandom-guide': 862,
  'rookie-to-golden-hour-in-6-months': 743,
  'streamer-cross-room-visits-and-fan-badges': 692,

  // 高關注（收益/新人）
  'gift-psychology-4-techniques': 618,
  'live-pk-benefits-guide': 572,
  '2026-q2-tiktok-live-payout-update': 548,
  'how-to-choose-tiktok-guild-payout-guide': 511,
  'live-menu-and-viewer-wishes-guide': 486,

  // 中等
  'tiktok-guild-3-contract-traps': 432,
  'tiktok-live-12-red-lines-guide': 398,
  '3000-budget-live-streaming-setup': 375,
  'how-to-leave-tiktok-guild': 341,
  'video-livestream-double-traffic-hack': 328,
  'livestream-is-a-micro-startup': 302,
  'yycam-tikfinity-menu-streamer-combo': 287,

  // 招募活動類
  'august-2026-allstar-top3': 264,
  '2026-09-official-events-overview': 248,
  'vtuber-national-team-recruitment': 231,
  'voice-only-streamer-recruitment': 215,
  'mentor-program-2026': 198,

  // 產業/職涯
  '2026-live-industry-job-guide': 176,
  'streamer-agent-day-in-life': 152,
  'join-guild-employee-vs-streamer': 138,
};

async function ensureTables(env) {
  // 文章瀏覽數表
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS article_views (
      slug TEXT PRIMARY KEY,
      title TEXT,
      views INTEGER NOT NULL DEFAULT 0,
      views_7d INTEGER NOT NULL DEFAULT 0,
      last_reset_7d TEXT NOT NULL DEFAULT (datetime('now', '+8 hours')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours'))
    )
  `).run();

  // 索引：加速排序
  await env.DB.prepare(
    `CREATE INDEX IF NOT EXISTS idx_article_views_7d ON article_views(views_7d DESC)`
  ).run();

  // 防刷表：訪客對特定文章的最後訪問時間
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS article_view_dedup (
      key TEXT PRIMARY KEY,
      last_visit TEXT NOT NULL DEFAULT (datetime('now', '+8 hours'))
    )
  `).run();

  await env.DB.prepare(
    `CREATE INDEX IF NOT EXISTS idx_article_dedup_time ON article_view_dedup(last_visit)`
  ).run();
}

async function sha256Short(str) {
  const buf = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16);
}

// slug 白名單驗證（防止亂造 slug 灌爆表）
function isValidSlug(slug) {
  return typeof slug === 'string'
    && /^[a-z0-9-]{3,100}$/.test(slug);
}

// 明顯是測試值的 title 就忽略（不覆寫 DB）
function isJunkTitle(title) {
  if (!title) return true;
  var t = title.trim().toLowerCase();
  if (t.length < 4) return true; // 太短
  if (/^(test|測試|hello|debug|foo|bar)$/i.test(t)) return true;
  return false;
}

export async function onRequestPost({ request, env }) {
  try {
    let body = {};
    try { body = await request.json(); } catch (e) { /* ignore */ }
    const slug = String(body.slug || '').trim();
    const title = String(body.title || '').trim().slice(0, 200);

    if (!isValidSlug(slug)) {
      return json({ ok: false, error: 'invalid slug' }, 400);
    }

    // 過濾垃圾 title（測試值）
    var safeTitle = isJunkTitle(title) ? '' : title;

    await ensureTables(env);

    // 訪客識別
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const ua = request.headers.get('User-Agent') || 'unknown';
    const visitorHash = await sha256Short(ip + '|' + ua + '|' + slug);

    // 檢查 30 分鐘內是否對此文章已訪問
    const existing = await env.DB.prepare(
      `SELECT last_visit FROM article_view_dedup WHERE key = ?`
    ).bind(visitorHash).first();

    const nowMs = Date.now();
    let shouldIncrement = true;
    if (existing) {
      const lastMs = new Date(existing.last_visit.replace(' ', 'T') + '+08:00').getTime();
      if ((nowMs - lastMs) / 60000 < 30) shouldIncrement = false;
    }

    // 讀取或初始化這篇文章
    let article = await env.DB.prepare(
      `SELECT views, views_7d, last_reset_7d FROM article_views WHERE slug = ?`
    ).bind(slug).first();

    if (!article) {
      // 首次寫入：套用 seed 值
      const seed = SEED_VIEWS[slug] || 60; // 沒定義的文章給 60 起跳
      const seed7d = Math.floor(seed * 0.25); // 7 天佔總量 25%
      await env.DB.prepare(`
        INSERT INTO article_views (slug, title, views, views_7d)
        VALUES (?, ?, ?, ?)
      `).bind(slug, safeTitle || slug, seed, seed7d).run();
      article = { views: seed, views_7d: seed7d, last_reset_7d: null };
    }

    // 7 天視窗重置檢查
    if (article.last_reset_7d) {
      const resetMs = new Date(article.last_reset_7d.replace(' ', 'T') + '+08:00').getTime();
      if ((nowMs - resetMs) > 7 * 24 * 3600 * 1000) {
        // 超過 7 天，重置 views_7d 為總量的 15% (讓熱門文章維持一定基數)
        const newBase = Math.floor(article.views * 0.15);
        await env.DB.prepare(`
          UPDATE article_views
          SET views_7d = ?, last_reset_7d = datetime('now', '+8 hours')
          WHERE slug = ?
        `).bind(newBase, slug).run();
        article.views_7d = newBase;
      }
    }

    if (shouldIncrement) {
      // 累加 · 只在 safeTitle 非空時覆寫（避免測試值污染）
      await env.DB.prepare(`
        UPDATE article_views
        SET views = views + 1, views_7d = views_7d + 1,
            title = COALESCE(NULLIF(?, ''), title),
            updated_at = datetime('now', '+8 hours')
        WHERE slug = ?
      `).bind(safeTitle, slug).run();

      // 更新訪客記錄
      await env.DB.prepare(`
        INSERT INTO article_view_dedup (key, last_visit)
        VALUES (?, datetime('now', '+8 hours'))
        ON CONFLICT(key) DO UPDATE SET last_visit = datetime('now', '+8 hours')
      `).bind(visitorHash).run();

      // 隨機清理舊 dedup（1% 機率）
      if (Math.random() < 0.01) {
        await env.DB.prepare(
          `DELETE FROM article_view_dedup WHERE last_visit < datetime('now', '+8 hours', '-1 day')`
        ).run();
      }

      article.views += 1;
      article.views_7d += 1;
    }

    return json({
      ok: true,
      incremented: shouldIncrement,
      slug,
      views: article.views,
      views_7d: article.views_7d,
    });
  } catch (err) {
    return json({ ok: false, error: err.message }, 200);
  }
}
