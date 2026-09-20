/**
 * ============================================================
 * GET /api/lottery/admin-summary?token=<TOKEN>&month=<YYYY-MM>
 * ============================================================
 * 後台：整體統計摘要（Dashboard 首頁）
 *
 * 回傳：
 *  {
 *    ok: true,
 *    month: '2026-09',
 *    stats: {
 *      total_participants,    // 本月登記人數
 *      total_draws,           // 本月總抽獎次數
 *      total_winners,         // 中獎人數
 *      total_referrals,       // 邀請成功總數
 *    },
 *    prizes: [
 *      { prize_id, prize_name, stock_total, stock_remaining, drawn_count, claimed_count, pending_count }
 *    ],
 *    top_referrers: [
 *      { ticket_no, name_masked, invite_count }
 *    ]
 *  }
 * ============================================================
 */

import { json, CORS_HEADERS, maskName, ensureLotteryTables } from './_shared.js';
import { getTaipeiMonth } from './_prize-schedule.js';

const DEFAULT_ADMIN_TOKEN = 'jdi-lottery-admin-2026';

function checkAuth(request, env) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token') || request.headers.get('X-Admin-Token');
  const expected = env.LOTTERY_ADMIN_TOKEN || DEFAULT_ADMIN_TOKEN;
  return token === expected;
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestGet({ request, env }) {
  try {
    if (!checkAuth(request, env)) {
      return json({ ok: false, error: 'unauthorized' }, 401);
    }

    const url = new URL(request.url);
    const month = url.searchParams.get('month') || getTaipeiMonth();

    await ensureLotteryTables(env);

    // 統計
    const partCount = await env.DB.prepare(
      `SELECT COUNT(*) as cnt FROM lottery_participants WHERE month = ?`
    ).bind(month).first();

    const drawCount = await env.DB.prepare(
      `SELECT COUNT(*) as cnt FROM lottery_draws WHERE month = ?`
    ).bind(month).first();

    const winnerCount = await env.DB.prepare(
      `SELECT COUNT(*) as cnt FROM lottery_draws WHERE month = ? AND is_winner = 1`
    ).bind(month).first();

    const referralCount = await env.DB.prepare(
      `SELECT COUNT(*) as cnt FROM lottery_referrals WHERE month = ?`
    ).bind(month).first();

    // 各獎品詳情
    const prizesRes = await env.DB.prepare(`
      SELECT i.prize_id, i.prize_name, i.prize_emoji, i.prize_tier,
             i.stock_total, i.stock_remaining, i.win_rate,
             (SELECT COUNT(*) FROM lottery_draws d WHERE d.month = i.month AND d.prize_id = i.prize_id AND d.is_winner = 1) as drawn_count,
             (SELECT COUNT(*) FROM lottery_draws d WHERE d.month = i.month AND d.prize_id = i.prize_id AND d.is_winner = 1 AND d.claim_status = 'claimed') as claimed_count,
             (SELECT COUNT(*) FROM lottery_draws d WHERE d.month = i.month AND d.prize_id = i.prize_id AND d.is_winner = 1 AND d.claim_status = 'pending') as pending_count,
             (SELECT COUNT(*) FROM lottery_draws d WHERE d.month = i.month AND d.prize_id = i.prize_id AND d.is_winner = 1 AND d.claim_status = 'expired') as expired_count
      FROM lottery_prize_inventory i
      WHERE i.month = ?
      ORDER BY i.win_rate ASC
    `).bind(month).all();

    // Top 5 邀請王
    const topRefRes = await env.DB.prepare(`
      SELECT ticket_no, name, invite_count, chances_total, chances_used
      FROM lottery_participants
      WHERE month = ? AND invite_count > 0
      ORDER BY invite_count DESC, created_at ASC
      LIMIT 5
    `).bind(month).all();

    return json({
      ok: true,
      month,
      stats: {
        total_participants: partCount ? partCount.cnt : 0,
        total_draws: drawCount ? drawCount.cnt : 0,
        total_winners: winnerCount ? winnerCount.cnt : 0,
        total_referrals: referralCount ? referralCount.cnt : 0,
      },
      prizes: (prizesRes.results || []).map(function (r) {
        return {
          prize_id: r.prize_id,
          prize_name: r.prize_name,
          prize_emoji: r.prize_emoji,
          prize_tier: r.prize_tier,
          stock_total: r.stock_total,
          stock_remaining: r.stock_remaining,
          win_rate: r.win_rate,
          drawn_count: r.drawn_count,
          claimed_count: r.claimed_count,
          pending_count: r.pending_count,
          expired_count: r.expired_count,
        };
      }),
      top_referrers: (topRefRes.results || []).map(function (r) {
        return {
          ticket_no: r.ticket_no,
          name_masked: maskName(r.name),
          invite_count: r.invite_count,
          chances_total: r.chances_total,
          chances_used: r.chances_used,
        };
      }),
    });
  } catch (err) {
    console.error('[/api/lottery/admin-summary] error:', err);
    return json({ ok: false, error: err.message }, 500);
  }
}
