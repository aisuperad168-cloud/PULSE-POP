/**
 * ============================================================
 * POST /api/lottery/admin-claim
 * ============================================================
 * 後台：標記領獎狀態
 *
 * Body:
 *   {
 *     token: string,          // Admin token
 *     draw_id: number,        // 抽獎紀錄 ID
 *     new_status: 'claimed' | 'pending' | 'expired',
 *     note: string?           // 備註（例：實體寄出單號）
 *   }
 *
 * 回傳: { ok: true, draw_id, new_status, claimed_at }
 * ============================================================
 */

import { json, CORS_HEADERS, ensureLotteryTables } from './_shared.js';

const DEFAULT_ADMIN_TOKEN = 'jdi-lottery-admin-2026';

function checkAuth(body, env) {
  const token = body.token || '';
  const expected = env.LOTTERY_ADMIN_TOKEN || DEFAULT_ADMIN_TOKEN;
  return token === expected;
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestPost({ request, env }) {
  try {
    let body = {};
    try { body = await request.json(); } catch (e) {
      return json({ ok: false, error: '請求格式錯誤' }, 400);
    }

    if (!checkAuth(body, env)) {
      return json({ ok: false, error: 'unauthorized' }, 401);
    }

    const drawId = parseInt(body.draw_id, 10);
    const newStatus = String(body.new_status || '').trim();
    const note = String(body.note || '').trim().slice(0, 300) || null;

    if (!drawId || !['claimed', 'pending', 'expired'].includes(newStatus)) {
      return json({ ok: false, error: '參數錯誤' }, 400);
    }

    await ensureLotteryTables(env);

    // 檢查紀錄存在且是中獎紀錄
    const draw = await env.DB.prepare(
      `SELECT id, is_winner, claim_status FROM lottery_draws WHERE id = ? LIMIT 1`
    ).bind(drawId).first();

    if (!draw) return json({ ok: false, error: '找不到此抽獎紀錄' }, 404);
    if (!draw.is_winner) return json({ ok: false, error: '此紀錄非中獎紀錄' }, 400);

    const now = new Date(Date.now() + 8 * 3600 * 1000).toISOString().replace('T', ' ').slice(0, 19);
    const claimedAt = newStatus === 'claimed' ? now : null;

    await env.DB.prepare(`
      UPDATE lottery_draws
      SET claim_status = ?, claimed_at = ?, claim_note = ?
      WHERE id = ?
    `).bind(newStatus, claimedAt, note, drawId).run();

    return json({
      ok: true,
      draw_id: drawId,
      new_status: newStatus,
      claimed_at: claimedAt,
      note,
    });
  } catch (err) {
    console.error('[/api/lottery/admin-claim] error:', err);
    return json({ ok: false, error: err.message }, 500);
  }
}
