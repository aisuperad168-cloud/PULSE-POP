/**
 * ============================================================
 * GET /api/lottery/check-referrer?code=XXXX
 * ============================================================
 * 檢查推薦碼是否有效 + 是否已達邀請上限
 *
 * 回傳:
 *   { ok: true, valid: true, referrer_name: "王X明", invite_count: 3, max_invites: 5 }
 *   { ok: true, valid: false, reason: "not_found" | "capped" | "not_current_month" }
 * ============================================================
 */

import {
  json,
  CORS_HEADERS,
  maskName,
  ensureLotteryTables,
} from './_shared.js';
import { getTaipeiMonth } from './_prize-schedule.js';

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const code = String(url.searchParams.get('code') || '').trim().toUpperCase().slice(0, 8);

    if (!code || code.length !== 4) {
      return json({ ok: true, valid: false, reason: 'invalid_format' });
    }

    await ensureLotteryTables(env);
    const month = getTaipeiMonth();

    const p = await env.DB.prepare(`
      SELECT name, invite_count, month
      FROM lottery_participants
      WHERE referral_code = ? LIMIT 1
    `).bind(code).first();

    if (!p) {
      return json({ ok: true, valid: false, reason: 'not_found' });
    }

    // 只有當月推薦有效
    if (p.month !== month) {
      return json({ ok: true, valid: false, reason: 'not_current_month' });
    }

    // 邀請上限
    if (p.invite_count >= 5) {
      return json({ ok: true, valid: false, reason: 'capped', referrer_name: maskName(p.name) });
    }

    return json({
      ok: true,
      valid: true,
      referrer_name: maskName(p.name),
      invite_count: p.invite_count,
      max_invites: 5,
    });
  } catch (err) {
    console.error('[/api/lottery/check-referrer] error:', err);
    return json({ ok: false, error: err.message }, 500);
  }
}
