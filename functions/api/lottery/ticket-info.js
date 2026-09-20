/**
 * ============================================================
 * GET /api/lottery/ticket-info?t=<ticket_no>&s=<sig>
 * ============================================================
 * 回傳 ticket 的抽獎狀態 + 剩餘機會數 + 獎品庫存
 *
 * 回傳：
 * {
 *   ok: true,
 *   ticket_no, month, name (masked), referral_code,
 *   chances_total, chances_used, invite_count,
 *   prizes: [{ id, name, emoji, tier, stock_remaining, stock_total }],
 * }
 * ============================================================
 */

import {
  json,
  CORS_HEADERS,
  sha256Hex,
  maskName,
  ensureLotteryTables,
  initMonthInventory,
} from './_shared.js';
import { getCurrentMonthPrizes, getTaipeiMonth } from './_prize-schedule.js';

const DEFAULT_SECRET = 'jdi-lottery-sig-2026-v1';

async function makeTicketSig(ticketNo, secret) {
  return (await sha256Hex(ticketNo + '|' + secret)).slice(0, 12);
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const ticketNo = url.searchParams.get('t');
    const sig = url.searchParams.get('s');

    if (!ticketNo || !sig) {
      return json({ ok: false, error: '缺少參數' }, 400);
    }

    const secret = env.LOTTERY_SECRET || DEFAULT_SECRET;
    const expectedSig = await makeTicketSig(ticketNo, secret);
    if (sig !== expectedSig) {
      return json({ ok: false, error: '簽章驗證失敗' }, 403);
    }

    await ensureLotteryTables(env);

    const p = await env.DB.prepare(`
      SELECT id, ticket_no, month, name, referral_code, referred_by,
             chances_total, chances_used, invite_count, quiz_result_type, created_at
      FROM lottery_participants WHERE ticket_no = ? LIMIT 1
    `).bind(ticketNo).first();

    if (!p) {
      return json({ ok: false, error: '找不到此抽獎編號' }, 404);
    }

    // 確保當月獎品庫存已初始化
    const month = getTaipeiMonth();
    const monthPrizes = getCurrentMonthPrizes(month);
    if (monthPrizes.prizes.length > 0) {
      await initMonthInventory(env, month, monthPrizes.prizes);
    }

    // 查詢當前參與者 month 的獎品庫存
    const inv = await env.DB.prepare(`
      SELECT prize_id, prize_name, prize_emoji, prize_tier, stock_total, stock_remaining, win_rate
      FROM lottery_prize_inventory
      WHERE month = ?
      ORDER BY win_rate ASC
    `).bind(p.month).all();

    const prizes = (inv.results || []).map(function (r) {
      return {
        id: r.prize_id,
        name: r.prize_name,
        emoji: r.prize_emoji,
        tier: r.prize_tier,
        stock_total: r.stock_total,
        stock_remaining: r.stock_remaining,
      };
    });

    return json({
      ok: true,
      ticket_no: p.ticket_no,
      month: p.month,
      name: maskName(p.name),
      referral_code: p.referral_code,
      referred_by: p.referred_by,
      chances_total: p.chances_total,
      chances_used: p.chances_used,
      invite_count: p.invite_count,
      quiz_result_type: p.quiz_result_type,
      prizes,
    });
  } catch (err) {
    console.error('[/api/lottery/ticket-info] error:', err);
    return json({ ok: false, error: '系統錯誤', detail: err.message }, 500);
  }
}
