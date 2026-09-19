/**
 * ============================================================
 * POST /api/simulator/lottery-entry
 * ============================================================
 * 記錄使用者點擊「LINE 抽獎」按鈕的行為
 * 用於月底統計參加人數 + 追蹤模擬器 → 抽獎轉換
 *
 * Body: { result_type: string, score: number }
 *
 * 回傳：{ ok: true, month: "2026-09" }
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

async function ensureTable(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS simulator_lottery_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      month TEXT NOT NULL,
      result_type TEXT,
      score INTEGER,
      visitor_hash TEXT,
      ip_hash TEXT,
      user_agent TEXT,
      referer TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours'))
    )
  `).run();

  await env.DB.prepare(
    `CREATE INDEX IF NOT EXISTS idx_lottery_month ON simulator_lottery_entries(month, created_at)`
  ).run();

  await env.DB.prepare(
    `CREATE INDEX IF NOT EXISTS idx_lottery_visitor ON simulator_lottery_entries(visitor_hash)`
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

function getCurrentMonth() {
  // 台北時區 YYYY-MM
  const now = new Date(Date.now() + 8 * 3600 * 1000);
  return now.getUTCFullYear() + '-' + String(now.getUTCMonth() + 1).padStart(2, '0');
}

export async function onRequestPost({ request, env }) {
  try {
    let body = {};
    try { body = await request.json(); } catch (e) { /* ignore */ }

    const resultType = String(body.result_type || '').trim().slice(0, 50);
    const score = parseInt(body.score, 10) || 0;

    await ensureTable(env);

    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const ua = (request.headers.get('User-Agent') || 'unknown').slice(0, 300);
    const referer = (request.headers.get('Referer') || '').slice(0, 300);

    const visitorHash = await sha256Short(ip + '|' + ua);
    const ipHash = await sha256Short(ip);
    const month = getCurrentMonth();

    // 防重複：同一 visitor 一個月只計一次
    const existing = await env.DB.prepare(
      `SELECT id FROM simulator_lottery_entries
       WHERE visitor_hash = ? AND month = ?
       LIMIT 1`
    ).bind(visitorHash, month).first();

    let deduped = false;
    if (existing) {
      deduped = true;
    } else {
      await env.DB.prepare(`
        INSERT INTO simulator_lottery_entries
          (month, result_type, score, visitor_hash, ip_hash, user_agent, referer)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(month, resultType, score, visitorHash, ipHash, ua, referer).run();
    }

    // 回傳本月參加總數（讓前端有個 social proof 可以顯示）
    const countRow = await env.DB.prepare(
      `SELECT COUNT(DISTINCT visitor_hash) as cnt FROM simulator_lottery_entries WHERE month = ?`
    ).bind(month).first();

    return json({
      ok: true,
      month: month,
      deduped: deduped,
      participants_this_month: countRow ? countRow.cnt : 0,
    });
  } catch (err) {
    return json({ ok: false, error: err.message }, 200);
  }
}
