/**
 * ============================================================
 * GET /api/lottery/result?t=<ticket_no>&s=<sig>&d=<draw_id>
 * ============================================================
 * 回傳單次抽獎結果（結果頁截圖用）
 *
 * 也支援 &latest=1：回傳該 ticket 最新的抽獎結果
 * ============================================================
 */

import {
  json,
  CORS_HEADERS,
  sha256Hex,
  maskName,
  maskPhone,
  maskEmail,
  ensureLotteryTables,
} from './_shared.js';

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
    const drawId = url.searchParams.get('d');
    const latest = url.searchParams.get('latest');

    if (!ticketNo || !sig) {
      return json({ ok: false, error: '缺少參數' }, 400);
    }

    const secret = env.LOTTERY_SECRET || DEFAULT_SECRET;
    const expectedSig = await makeTicketSig(ticketNo, secret);
    if (sig !== expectedSig) {
      return json({ ok: false, error: '簽章驗證失敗' }, 403);
    }

    await ensureLotteryTables(env);

    // 抓 participant
    const p = await env.DB.prepare(`
      SELECT id, ticket_no, month, name, phone, email,
             referral_code, referred_by, invite_count,
             chances_total, chances_used, quiz_result_type, created_at
      FROM lottery_participants WHERE ticket_no = ? LIMIT 1
    `).bind(ticketNo).first();

    if (!p) {
      return json({ ok: false, error: '找不到此抽獎編號' }, 404);
    }

    // 抓對應的 draw
    let draw = null;
    if (drawId) {
      draw = await env.DB.prepare(`
        SELECT id, draw_no, is_winner, prize_id, prize_name, prize_tier,
               claim_status, claim_deadline, claimed_at, drawn_at
        FROM lottery_draws
        WHERE id = ? AND participant_id = ? LIMIT 1
      `).bind(drawId, p.id).first();
    } else if (latest) {
      draw = await env.DB.prepare(`
        SELECT id, draw_no, is_winner, prize_id, prize_name, prize_tier,
               claim_status, claim_deadline, claimed_at, drawn_at
        FROM lottery_draws
        WHERE participant_id = ?
        ORDER BY id DESC LIMIT 1
      `).bind(p.id).first();
    }

    // 讀所有抽獎歷史（用戶可看自己抽過的所有紀錄）
    const historyRes = await env.DB.prepare(`
      SELECT id, draw_no, is_winner, prize_id, prize_name, prize_tier, drawn_at
      FROM lottery_draws
      WHERE participant_id = ?
      ORDER BY id ASC
    `).bind(p.id).all();

    const emojiMap = {
      soundcard: '🎙️', light: '💡', holder: '📱', coffee: '☕', none: '😊',
    };

    return json({
      ok: true,
      participant: {
        ticket_no: p.ticket_no,
        month: p.month,
        name: p.name,
        name_masked: maskName(p.name),
        phone_masked: maskPhone(p.phone),
        email_masked: maskEmail(p.email),
        referral_code: p.referral_code,
        referred_by: p.referred_by,
        invite_count: p.invite_count,
        chances_total: p.chances_total,
        chances_used: p.chances_used,
        chances_remaining: p.chances_total - p.chances_used,
        quiz_result_type: p.quiz_result_type,
        created_at: p.created_at,
      },
      draw: draw ? {
        id: draw.id,
        draw_no: draw.draw_no,
        is_winner: draw.is_winner === 1,
        prize_id: draw.prize_id,
        prize_name: draw.prize_name,
        prize_tier: draw.prize_tier,
        prize_emoji: emojiMap[draw.prize_id] || '🎁',
        claim_status: draw.claim_status,
        claim_deadline: draw.claim_deadline,
        claimed_at: draw.claimed_at,
        drawn_at: draw.drawn_at,
      } : null,
      history: (historyRes.results || []).map(function (h) {
        return {
          id: h.id,
          draw_no: h.draw_no,
          is_winner: h.is_winner === 1,
          prize_name: h.prize_name,
          prize_emoji: emojiMap[h.prize_id] || '🎁',
          drawn_at: h.drawn_at,
        };
      }),
    });
  } catch (err) {
    console.error('[/api/lottery/result] error:', err);
    return json({ ok: false, error: '系統錯誤', detail: err.message }, 500);
  }
}
