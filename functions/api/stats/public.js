/**
 * ============================================================
 * GET /api/stats/public
 * ============================================================
 * 對外公開的統計數字（首頁 Hero 下方數字條用）
 *
 * 回傳：
 *   {
 *     ok: true,
 *     views: 31978,            // 累計瀏覽（基礎值 + D1 累加）
 *     signed_talents: 253,     // 已簽約主播/藝人（基礎 248 + D1 approved 數）
 *     updated_at: "2026-09-07T12:34:56+08:00"
 *   }
 *
 * Cache：邊緣快取 5 分鐘（避免每次頁面載入都打 D1）
 * ============================================================
 */

// ============ 基礎值（合理起始點）============
const BASE_VIEWS = 31978;
const BASE_TALENTS = 328;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

async function ensureTable(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS site_stats (
      key TEXT PRIMARY KEY,
      value INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours'))
    )
  `).run();

  // 初始化 view_count（累加用）
  await env.DB.prepare(`
    INSERT OR IGNORE INTO site_stats (key, value) VALUES ('view_count', 0)
  `).run();
}

export async function onRequestGet({ request, env }) {
  try {
    await ensureTable(env);

    // 1. 撈瀏覽累加值
    const viewRow = await env.DB.prepare(
      `SELECT value FROM site_stats WHERE key = 'view_count'`
    ).first();
    const viewIncrement = viewRow?.value || 0;

    // 2. 撈已核准主播合約數（主播 + 運營都算「藝人」）
    // 只算 approved（真的完成的）
    let signedCount = 0;
    try {
      const signRow = await env.DB.prepare(
        `SELECT COUNT(*) AS c FROM sign_contracts WHERE status = 'approved'`
      ).first();
      signedCount += signRow?.c || 0;
    } catch (e) { /* table may not exist yet */ }

    // 目前只算主播，運營合約是另一個維度不合併
    // 若要把運營也算進來，取消下方註解：
    // try {
    //   const opsRow = await env.DB.prepare(
    //     `SELECT COUNT(*) AS c FROM ops_contracts WHERE status = 'approved'`
    //   ).first();
    //   signedCount += opsRow?.c || 0;
    // } catch (e) { /* ignore */ }

    // 3. 台北時間
    const nowTW = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Taipei' });

    return json(
      {
        ok: true,
        views: BASE_VIEWS + viewIncrement,
        signed_talents: BASE_TALENTS + signedCount,
        updated_at: nowTW.replace(' ', 'T') + '+08:00',
      },
      200,
      {
        // 邊緣快取 5 分鐘（減少 D1 讀取）
        'Cache-Control': 'public, max-age=300, s-maxage=300',
      }
    );
  } catch (err) {
    // 出錯時回基礎值，避免前端顯示 0
    return json({
      ok: false,
      views: BASE_VIEWS,
      signed_talents: BASE_TALENTS,
      error: err.message,
    });
  }
}
