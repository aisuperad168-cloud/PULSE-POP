/**
 * ============================================================
 * POST /api/lottery/admin-delete
 * ============================================================
 * 後台：刪除測試資料
 *
 * Body:
 *   {
 *     token: string,               // Admin token
 *     mode: 'by_ticket' | 'by_phone' | 'by_email',
 *     value: string,               // 對應的 ticket_no / phone / email
 *   }
 *
 * 動作：
 *   - 刪除 lottery_participants 該筆
 *   - 刪除該 participant 的所有 lottery_draws
 *   - 刪除該 participant 相關的 lottery_referrals
 *   - 已扣的獎品庫存「不會」恢復（避免破壞已中獎他人紀錄）
 *
 * 回傳：{ ok: true, deleted: { participant, draws, referrals } }
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

    const mode = String(body.mode || '').trim();
    const value = String(body.value || '').trim();

    if (!value) return json({ ok: false, error: '請提供 value' }, 400);

    let whereCol;
    let bindValue = value;
    if (mode === 'by_ticket') {
      whereCol = 'ticket_no';
    } else if (mode === 'by_phone') {
      whereCol = 'phone';
      bindValue = value.replace(/[\s\-]/g, ''); // 正規化
    } else if (mode === 'by_email') {
      whereCol = 'email';
      bindValue = value.toLowerCase();
    } else {
      return json({ ok: false, error: 'mode 錯誤（僅支援 by_ticket / by_phone / by_email）' }, 400);
    }

    await ensureLotteryTables(env);

    // 找出所有匹配的 participant（可能有多筆——不同月份）
    const participants = await env.DB.prepare(
      `SELECT id, ticket_no, name, phone, email, month FROM lottery_participants WHERE ${whereCol} = ?`
    ).bind(bindValue).all();

    const parts = participants.results || [];
    if (parts.length === 0) {
      return json({ ok: false, error: '找不到符合的紀錄' }, 404);
    }

    let deletedDraws = 0;
    let deletedReferrals = 0;
    const deletedParticipants = [];

    for (const p of parts) {
      // 刪 draws
      const drawRes = await env.DB.prepare(
        `DELETE FROM lottery_draws WHERE participant_id = ?`
      ).bind(p.id).run();
      deletedDraws += drawRes.meta?.changes || 0;

      // 刪 referrals（作為 referrer 或 referred_id 兩邊都刪）
      const refRes1 = await env.DB.prepare(
        `DELETE FROM lottery_referrals WHERE referrer_id = ? OR referred_id = ?`
      ).bind(p.id, p.id).run();
      deletedReferrals += refRes1.meta?.changes || 0;

      // 刪 participant
      await env.DB.prepare(
        `DELETE FROM lottery_participants WHERE id = ?`
      ).bind(p.id).run();

      deletedParticipants.push({
        id: p.id,
        ticket_no: p.ticket_no,
        name: p.name,
        phone: p.phone,
        email: p.email,
        month: p.month,
      });
    }

    return json({
      ok: true,
      deleted: {
        participants: deletedParticipants,
        participants_count: deletedParticipants.length,
        draws_count: deletedDraws,
        referrals_count: deletedReferrals,
      },
      note: '獎品庫存不會恢復（如需恢復請聯繫工程手動處理）',
    });

  } catch (err) {
    console.error('[/api/lottery/admin-delete] error:', err);
    return json({ ok: false, error: err.message }, 500);
  }
}
