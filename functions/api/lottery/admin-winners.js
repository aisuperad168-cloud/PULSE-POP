/**
 * ============================================================
 * GET /api/lottery/admin-winners?token=<TOKEN>&month=<YYYY-MM>&status=<all|pending|claimed|expired>&prize=<prize_id>
 * ============================================================
 * 後台：中獎名單（含完整個資，需授權）
 *
 * 回傳（含 CSV 匯出用完整資料）：
 * {
 *   ok: true,
 *   winners: [
 *     {
 *       draw_id, ticket_no, month, drawn_at,
 *       prize_id, prize_name, prize_tier,
 *       claim_status, claim_deadline, claimed_at, claim_note,
 *       name, phone, email,
 *       quiz_result_type,
 *       invite_count,
 *       referred_by,
 *     }
 *   ],
 *   total: number
 * }
 * ============================================================
 */

import { json, CORS_HEADERS, ensureLotteryTables } from './_shared.js';
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
    const status = url.searchParams.get('status') || 'all';   // all | pending | claimed | expired
    const prizeFilter = url.searchParams.get('prize') || '';  // 特定 prize_id
    const format = url.searchParams.get('format') || 'json';  // json | csv

    await ensureLotteryTables(env);

    // 動態組 WHERE
    const conds = ['d.month = ?', 'd.is_winner = 1'];
    const args = [month];
    if (status !== 'all') { conds.push('d.claim_status = ?'); args.push(status); }
    if (prizeFilter) { conds.push('d.prize_id = ?'); args.push(prizeFilter); }

    const whereSql = conds.join(' AND ');

    const rows = await env.DB.prepare(`
      SELECT
        d.id as draw_id, d.ticket_no, d.month, d.drawn_at,
        d.prize_id, d.prize_name, d.prize_tier,
        d.claim_status, d.claim_deadline, d.claimed_at, d.claim_note,
        p.name, p.phone, p.email,
        p.quiz_result_type, p.invite_count, p.referred_by,
        p.chances_total, p.chances_used
      FROM lottery_draws d
      JOIN lottery_participants p ON p.id = d.participant_id
      WHERE ${whereSql}
      ORDER BY d.drawn_at DESC
    `).bind(...args).all();

    const winners = (rows.results || []).map(function (r) {
      return {
        draw_id: r.draw_id,
        ticket_no: r.ticket_no,
        month: r.month,
        drawn_at: r.drawn_at,
        prize_id: r.prize_id,
        prize_name: r.prize_name,
        prize_tier: r.prize_tier,
        claim_status: r.claim_status,
        claim_deadline: r.claim_deadline,
        claimed_at: r.claimed_at,
        claim_note: r.claim_note,
        name: r.name,
        phone: r.phone,
        email: r.email,
        quiz_result_type: r.quiz_result_type,
        invite_count: r.invite_count,
        referred_by: r.referred_by,
        chances_total: r.chances_total,
        chances_used: r.chances_used,
      };
    });

    if (format === 'csv') {
      // CSV 匯出
      const headers = [
        '抽獎編號', '獎項', '獎品', '姓名', '電話', 'Email',
        '抽獎時間', '領獎狀態', '領獎期限', '領獎時間', '備註',
        '模擬器結果', '邀請人數', '推薦人推薦碼'
      ];
      const statusMap = { pending: '待領獎', claimed: '已領獎', expired: '已過期', none: '未中獎' };
      const csvRows = winners.map(function (w) {
        return [
          w.ticket_no,
          w.prize_tier,
          w.prize_name,
          w.name,
          w.phone,
          w.email,
          w.drawn_at,
          statusMap[w.claim_status] || w.claim_status,
          w.claim_deadline || '',
          w.claimed_at || '',
          w.claim_note || '',
          w.quiz_result_type || '',
          w.invite_count,
          w.referred_by || '',
        ].map(csvEscape).join(',');
      });
      const csvBody = '\uFEFF' + [headers.map(csvEscape).join(','), ...csvRows].join('\n');
      const filename = 'lottery-winners-' + month + '-' + status + '.csv';
      return new Response(csvBody, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="' + filename + '"',
          ...CORS_HEADERS,
        },
      });
    }

    return json({
      ok: true,
      month,
      status,
      total: winners.length,
      winners,
    });
  } catch (err) {
    console.error('[/api/lottery/admin-winners] error:', err);
    return json({ ok: false, error: err.message }, 500);
  }
}

function csvEscape(v) {
  const s = String(v == null ? '' : v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}
