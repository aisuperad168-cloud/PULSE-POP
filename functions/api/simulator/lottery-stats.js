/**
 * ============================================================
 * GET /api/simulator/lottery-stats?month=2026-09
 * ============================================================
 * 統計某個月的抽獎參加人數 + 分型分布
 * 主要給你自己月底統計用（可設 admin token 保護）
 *
 * Query: month=YYYY-MM (預設當月)
 *        token=xxx (需與 env.LOTTERY_ADMIN_TOKEN 匹配)
 *
 * 回傳：{ ok, month, total, by_result_type: {...}, recent_entries: [...] }
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
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS_HEADERS },
  });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

function getCurrentMonth() {
  const now = new Date(Date.now() + 8 * 3600 * 1000);
  return now.getUTCFullYear() + '-' + String(now.getUTCMonth() + 1).padStart(2, '0');
}

export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);

    // Token 驗證（管理員用）
    const requiredToken = env.LOTTERY_ADMIN_TOKEN || 'jdi-lottery-2026';
    const providedToken = url.searchParams.get('token');
    if (providedToken !== requiredToken) {
      return json({ ok: false, error: 'unauthorized' }, 401);
    }

    const month = url.searchParams.get('month') || getCurrentMonth();
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return json({ ok: false, error: 'invalid month format (use YYYY-MM)' }, 400);
    }

    // 檢查表存在
    const tableCheck = await env.DB.prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='simulator_lottery_entries' LIMIT 1`
    ).first();
    if (!tableCheck) {
      return json({ ok: true, month, total: 0, by_result_type: {}, recent_entries: [] });
    }

    // 該月參加者總數（去重）
    const totalRow = await env.DB.prepare(
      `SELECT COUNT(DISTINCT visitor_hash) as cnt FROM simulator_lottery_entries WHERE month = ?`
    ).bind(month).first();

    // 按分型統計
    const byTypeRows = await env.DB.prepare(
      `SELECT result_type, COUNT(*) as cnt
       FROM simulator_lottery_entries
       WHERE month = ?
       GROUP BY result_type
       ORDER BY cnt DESC`
    ).bind(month).all();

    const byResultType = {};
    (byTypeRows.results || []).forEach(r => {
      byResultType[r.result_type || 'unknown'] = r.cnt;
    });

    // 最近 20 筆（給你手動看）
    const recentRows = await env.DB.prepare(
      `SELECT id, result_type, score, created_at, ip_hash, user_agent
       FROM simulator_lottery_entries
       WHERE month = ?
       ORDER BY created_at DESC
       LIMIT 20`
    ).bind(month).all();

    return json({
      ok: true,
      month: month,
      total: totalRow ? totalRow.cnt : 0,
      by_result_type: byResultType,
      recent_entries: recentRows.results || [],
    });
  } catch (err) {
    return json({ ok: false, error: err.message }, 500);
  }
}
