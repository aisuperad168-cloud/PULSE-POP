/**
 * ============================================================
 * POST /api/lottery/draw
 * ============================================================
 * 抽獎核心 API — 後端決定中獎結果 + 扣庫存 + 記錄
 *
 * Body: { ticket_no, sig }
 *
 * 回傳:
 * {
 *   ok: true,
 *   draw_id: 42,
 *   draw_no: 1,
 *   is_winner: 1,
 *   prize_id: "coffee",
 *   prize_name: "7-11 特大杯冰拿鐵",
 *   prize_emoji: "☕",
 *   prize_tier: "肆獎",
 *   chances_remaining: 0
 * }
 * ============================================================
 */

import {
  json,
  CORS_HEADERS,
  sha256Hex,
  ensureLotteryTables,
  initMonthInventory,
} from './_shared.js';
import { getCurrentMonthPrizes, getTaipeiMonth, getClaimDeadline } from './_prize-schedule.js';

const DEFAULT_SECRET = 'jdi-lottery-sig-2026-v1';

async function makeTicketSig(ticketNo, secret) {
  return (await sha256Hex(ticketNo + '|' + secret)).slice(0, 12);
}

/**
 * 加權隨機抽獎（考慮庫存 + 中獎率）
 *
 * @param {Array} inventory - [{ prize_id, prize_name, prize_emoji, prize_tier, stock_remaining, win_rate }]
 * @returns {Object} 中獎結果 { prize_id, prize_name, prize_emoji, prize_tier, is_winner }
 */
function drawWithWeights(inventory) {
  // 過濾掉庫存為 0 的獎品
  const available = inventory.filter(function (p) { return p.stock_remaining > 0; });

  // 計算實際中獎機率總和
  const totalRate = available.reduce(function (sum, p) { return sum + p.win_rate; }, 0);
  const noneRate = Math.max(0, 100 - totalRate);

  // 隨機一個 0-100 的數
  const roll = Math.random() * 100;

  // 累加判斷落點
  let cursor = 0;
  for (const p of available) {
    cursor += p.win_rate;
    if (roll < cursor) {
      return {
        prize_id: p.prize_id,
        prize_name: p.prize_name,
        prize_emoji: p.prize_emoji,
        prize_tier: p.prize_tier,
        is_winner: true,
      };
    }
  }

  // 沒中 → 銘謝惠顧
  return {
    prize_id: 'none',
    prize_name: '銘謝惠顧',
    prize_emoji: '😊',
    prize_tier: '無',
    is_winner: false,
  };
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

    const ticketNo = String(body.ticket_no || '').trim();
    const sig = String(body.sig || '').trim();

    if (!ticketNo || !sig) {
      return json({ ok: false, error: '缺少參數' }, 400);
    }

    // 驗簽章
    const secret = env.LOTTERY_SECRET || DEFAULT_SECRET;
    const expectedSig = await makeTicketSig(ticketNo, secret);
    if (sig !== expectedSig) {
      return json({ ok: false, error: '簽章驗證失敗' }, 403);
    }

    await ensureLotteryTables(env);

    // === 1. 找 participant ===
    const p = await env.DB.prepare(`
      SELECT id, ticket_no, month, chances_total, chances_used
      FROM lottery_participants WHERE ticket_no = ? LIMIT 1
    `).bind(ticketNo).first();

    if (!p) {
      return json({ ok: false, error: '找不到此抽獎編號' }, 404);
    }

    // === 2. 檢查剩餘機會 ===
    const remaining = p.chances_total - p.chances_used;
    if (remaining <= 0) {
      return json({ ok: false, error: '抽獎機會已用完' }, 409);
    }

    // === 3. 確保當月獎品庫存已初始化 ===
    const monthPrizes = getCurrentMonthPrizes(p.month);
    if (monthPrizes.prizes.length > 0) {
      await initMonthInventory(env, p.month, monthPrizes.prizes);
    }

    // === 4. 讀取當月庫存 ===
    const invResult = await env.DB.prepare(`
      SELECT id, prize_id, prize_name, prize_emoji, prize_tier, stock_remaining, win_rate
      FROM lottery_prize_inventory
      WHERE month = ?
    `).bind(p.month).all();

    const inventory = invResult.results || [];

    // === 5. 加權抽獎 ===
    const result = drawWithWeights(inventory);

    // === 6. 若中獎 → 扣庫存（樂觀鎖：只在庫存 > 0 才扣） ===
    if (result.is_winner) {
      const updateRes = await env.DB.prepare(`
        UPDATE lottery_prize_inventory
        SET stock_remaining = stock_remaining - 1
        WHERE month = ? AND prize_id = ? AND stock_remaining > 0
      `).bind(p.month, result.prize_id).run();

      // 若沒更新到（庫存已用完）→ 轉為銘謝惠顧
      if (!updateRes.meta || updateRes.meta.changes === 0) {
        result.prize_id = 'none';
        result.prize_name = '銘謝惠顧';
        result.prize_emoji = '😊';
        result.prize_tier = '無';
        result.is_winner = false;
      }
    }

    // === 7. 扣 participant 抽獎次數 ===
    const now = new Date(Date.now() + 8 * 3600 * 1000).toISOString().replace('T', ' ').slice(0, 19);
    await env.DB.prepare(`
      UPDATE lottery_participants
      SET chances_used = chances_used + 1, updated_at = ?
      WHERE id = ?
    `).bind(now, p.id).run();

    // === 8. 建立抽獎紀錄 ===
    const drawNo = p.chances_used + 1;
    const claimDeadline = result.is_winner ? getClaimDeadline() : null;

    const insRes = await env.DB.prepare(`
      INSERT INTO lottery_draws
        (participant_id, ticket_no, month, draw_no,
         is_winner, prize_id, prize_name, prize_tier,
         claim_status, claim_deadline, drawn_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      p.id, ticketNo, p.month, drawNo,
      result.is_winner ? 1 : 0,
      result.prize_id, result.prize_name, result.prize_tier,
      result.is_winner ? 'pending' : 'none',
      claimDeadline,
      now
    ).run();

    const drawId = insRes.meta?.last_row_id;

    return json({
      ok: true,
      draw_id: drawId,
      draw_no: drawNo,
      is_winner: result.is_winner ? 1 : 0,
      prize_id: result.prize_id,
      prize_name: result.prize_name,
      prize_emoji: result.prize_emoji,
      prize_tier: result.prize_tier,
      chances_remaining: remaining - 1,
      claim_deadline: claimDeadline,
    });

  } catch (err) {
    console.error('[/api/lottery/draw] error:', err);
    return json({ ok: false, error: '系統錯誤，請稍後再試', detail: err.message }, 500);
  }
}
