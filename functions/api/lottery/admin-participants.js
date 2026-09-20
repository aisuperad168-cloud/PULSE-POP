/**
 * ============================================================
 * GET /api/lottery/admin-participants?token=<TOKEN>&month=<YYYY-MM>&q=<search>&format=<json|csv>
 * ============================================================
 * 後台：所有參與者名單（含完整個資，需授權）
 *
 * 支援搜尋（q）：ticket_no / name / phone / email / referral_code
 * 支援 format=csv 匯出
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
    const q = String(url.searchParams.get('q') || '').trim();
    const format = url.searchParams.get('format') || 'json';
    const limit = Math.min(500, parseInt(url.searchParams.get('limit'), 10) || 100);

    await ensureLotteryTables(env);

    const conds = ['month = ?'];
    const args = [month];
    if (q) {
      conds.push('(ticket_no LIKE ? OR name LIKE ? OR phone LIKE ? OR email LIKE ? OR referral_code = ?)');
      const like = '%' + q + '%';
      args.push(like, like, like, like, q.toUpperCase());
    }

    const whereSql = conds.join(' AND ');

    const rows = await env.DB.prepare(`
      SELECT
        id, ticket_no, month,
        name, phone, email,
        quiz_result_type, quiz_score,
        referral_code, referred_by, invite_count,
        chances_total, chances_used,
        created_at, updated_at
      FROM lottery_participants
      WHERE ${whereSql}
      ORDER BY created_at DESC
      LIMIT ?
    `).bind(...args, limit).all();

    // 順便算每個參與者的中獎次數
    const participants = await Promise.all((rows.results || []).map(async function (p) {
      const winCount = await env.DB.prepare(
        `SELECT COUNT(*) as cnt FROM lottery_draws WHERE participant_id = ? AND is_winner = 1`
      ).bind(p.id).first();
      return {
        id: p.id,
        ticket_no: p.ticket_no,
        month: p.month,
        name: p.name,
        phone: p.phone,
        email: p.email,
        quiz_result_type: p.quiz_result_type,
        quiz_score: p.quiz_score,
        referral_code: p.referral_code,
        referred_by: p.referred_by,
        invite_count: p.invite_count,
        chances_total: p.chances_total,
        chances_used: p.chances_used,
        win_count: winCount ? winCount.cnt : 0,
        created_at: p.created_at,
      };
    }));

    if (format === 'csv') {
      const headers = [
        '抽獎編號', '登記時間', '姓名', '電話', 'Email',
        '模擬器結果', '模擬器分數',
        '個人推薦碼', '推薦人碼', '邀請人數',
        '總機會數', '已用機會數', '中獎次數'
      ];
      const csvRows = participants.map(function (p) {
        return [
          p.ticket_no, p.created_at, p.name, p.phone, p.email,
          p.quiz_result_type || '', p.quiz_score || '',
          p.referral_code, p.referred_by || '', p.invite_count,
          p.chances_total, p.chances_used, p.win_count,
        ].map(csvEscape).join(',');
      });
      const csvBody = '\uFEFF' + [headers.map(csvEscape).join(','), ...csvRows].join('\n');
      const filename = 'lottery-participants-' + month + '.csv';
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
      total: participants.length,
      participants,
    });
  } catch (err) {
    console.error('[/api/lottery/admin-participants] error:', err);
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
