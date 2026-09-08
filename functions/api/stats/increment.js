/**
 * ============================================================
 * POST /api/stats/increment
 * ============================================================
 * 訪客載入首頁時 async 觸發，累加瀏覽數
 *
 * 防刷機制：
 *   - 用 CF-Connecting-IP + User-Agent 做 hash 當唯一鍵
 *   - 30 分鐘內同一「IP+UA」只 +1（避免刷新 F5 灌水）
 *   - 用 KV / D1 記最後訪問時間戳（這裡簡化用 D1）
 *
 * 回傳：
 *   { ok: true, incremented: true|false }
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

async function ensureTables(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS site_stats (
      key TEXT PRIMARY KEY,
      value INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours'))
    )
  `).run();

  await env.DB.prepare(`
    INSERT OR IGNORE INTO site_stats (key, value) VALUES ('view_count', 0)
  `).run();

  // 防刷用：記錄訪客最後訪問時間
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS site_view_dedup (
      visitor_hash TEXT PRIMARY KEY,
      last_visit TEXT NOT NULL DEFAULT (datetime('now', '+8 hours'))
    )
  `).run();

  // 索引
  await env.DB.prepare(
    `CREATE INDEX IF NOT EXISTS idx_view_dedup_time ON site_view_dedup(last_visit)`
  ).run();
}

// 簡易 hash (SHA-256 前 16 字元)
async function sha256Short(str) {
  const buf = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16);
}

export async function onRequestPost({ request, env }) {
  try {
    await ensureTables(env);

    // 訪客識別
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const ua = request.headers.get('User-Agent') || 'unknown';
    const visitorHash = await sha256Short(ip + '|' + ua);

    // 檢查 30 分鐘內是否已訪問
    const existing = await env.DB.prepare(
      `SELECT last_visit FROM site_view_dedup WHERE visitor_hash = ?`
    ).bind(visitorHash).first();

    const nowMs = Date.now();
    let shouldIncrement = true;

    if (existing) {
      const lastVisitMs = new Date(existing.last_visit.replace(' ', 'T') + '+08:00').getTime();
      const diffMin = (nowMs - lastVisitMs) / 60000;
      if (diffMin < 30) {
        shouldIncrement = false;
      }
    }

    if (shouldIncrement) {
      // 累加瀏覽數
      await env.DB.prepare(
        `UPDATE site_stats SET value = value + 1, updated_at = datetime('now', '+8 hours') WHERE key = 'view_count'`
      ).run();

      // 更新訪客記錄
      await env.DB.prepare(`
        INSERT INTO site_view_dedup (visitor_hash, last_visit)
        VALUES (?, datetime('now', '+8 hours'))
        ON CONFLICT(visitor_hash) DO UPDATE SET last_visit = datetime('now', '+8 hours')
      `).bind(visitorHash).run();

      // 定期清理超過 24 小時的舊記錄（避免表無限膨脹）
      // 只在隨機 1/100 呼叫時執行，減少負擔
      if (Math.random() < 0.01) {
        await env.DB.prepare(
          `DELETE FROM site_view_dedup WHERE last_visit < datetime('now', '+8 hours', '-1 day')`
        ).run();
      }
    }

    return json({ ok: true, incremented: shouldIncrement });
  } catch (err) {
    // 靜默失敗，不影響網站
    return json({ ok: false, error: err.message }, 200);
  }
}
