/**
 * ============================================================
 * POST /api/lottery/register
 * ============================================================
 * 抽獎登記主 API
 *
 * Body:
 *   {
 *     name: string,
 *     phone: string,
 *     email: string,
 *     referrer_code: string?,
 *     quiz_result_type: string?,
 *     quiz_score: number?,
 *     privacy_agreed: boolean
 *   }
 *
 * 回傳（成功）:
 *   {
 *     ok: true,
 *     ticket_no: "JDI-2609-0128",
 *     sig: "a3f7...",
 *     referral_code: "K9P2",
 *     chances_total: 1,
 *     referred_by: "A3F7" or null
 *   }
 *
 * 防作弊：
 *   - 電話/Email 唯一性（同月）
 *   - IP + UA 頻率（同 hash 3 次/小時）
 *   - 自我推薦阻擋（同電話/email）
 *   - 隱私權必勾
 * ============================================================
 */

import {
  json,
  CORS_HEADERS,
  sha256Short,
  sha256Hex,
  generateReferralCode,
  generateTicketNo,
  validateName,
  validatePhone,
  validateEmail,
  ensureLotteryTables,
  initMonthInventory,
} from './_shared.js';

import { getCurrentMonthPrizes, getTaipeiMonth } from './_prize-schedule.js';

// 簽章密鑰（給 ticket_no 簽名，避免用戶亂改 URL）
// 部署時可透過 env.LOTTERY_SECRET 覆蓋
const DEFAULT_SECRET = 'jdi-lottery-sig-2026-v1';

async function makeTicketSig(ticketNo, secret) {
  return (await sha256Hex(ticketNo + '|' + secret)).slice(0, 12);
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestPost({ request, env }) {
  try {
    // === 1. 解析 body ===
    let body = {};
    try { body = await request.json(); } catch (e) {
      return json({ ok: false, error: '請求格式錯誤' }, 400);
    }

    // === 2. 隱私權必勾 ===
    if (!body.privacy_agreed) {
      return json({ ok: false, error: '請先同意隱私權政策' }, 400);
    }

    // === 3. 欄位驗證 ===
    const nameVal = validateName(body.name);
    if (!nameVal.valid) return json({ ok: false, error: nameVal.error }, 400);

    const phoneVal = validatePhone(body.phone);
    if (!phoneVal.valid) return json({ ok: false, error: phoneVal.error }, 400);

    const emailVal = validateEmail(body.email);
    if (!emailVal.valid) return json({ ok: false, error: emailVal.error }, 400);

    const name = nameVal.normalized;
    const phone = phoneVal.normalized;
    const email = emailVal.normalized;

    // 選填
    const referrerCode = String(body.referrer_code || '').trim().toUpperCase().slice(0, 8) || null;
    const quizResultType = String(body.quiz_result_type || '').trim().slice(0, 50) || null;
    const quizScore = (typeof body.quiz_score === 'number') ? body.quiz_score : null;

    // === 4. 建表 + 當月獎品庫存初始化 ===
    await ensureLotteryTables(env);
    const month = getTaipeiMonth();
    const monthPrizes = getCurrentMonthPrizes(month);
    if (monthPrizes.prizes.length === 0) {
      return json({ ok: false, error: `本月（${month}）尚未設定獎品，請聯繫客服` }, 500);
    }
    await initMonthInventory(env, month, monthPrizes.prizes);

    // === 5. 請求資訊 ===
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const ua = (request.headers.get('User-Agent') || 'unknown').slice(0, 300);
    const visitorHash = await sha256Short(ip + '|' + ua);
    const ipHash = await sha256Short(ip);

    // === 6. 唯一性檢查（電話 / Email 同月不能重複） ===
    const dupPhone = await env.DB.prepare(
      `SELECT ticket_no FROM lottery_participants WHERE month = ? AND phone = ? LIMIT 1`
    ).bind(month, phone).first();
    if (dupPhone) {
      return json({ ok: false, error: '此手機號碼本月已登記過抽獎' }, 409);
    }

    const dupEmail = await env.DB.prepare(
      `SELECT ticket_no FROM lottery_participants WHERE month = ? AND email = ? LIMIT 1`
    ).bind(month, email).first();
    if (dupEmail) {
      return json({ ok: false, error: '此 Email 本月已登記過抽獎' }, 409);
    }

    // === 7. 頻率限制（同 visitor_hash 1 小時內最多 3 次登記） ===
    const recentSameVisitor = await env.DB.prepare(
      `SELECT COUNT(*) as cnt FROM lottery_participants
       WHERE visitor_hash = ?
         AND created_at > datetime('now', '+8 hours', '-1 hour')`
    ).bind(visitorHash).first();
    if (recentSameVisitor && recentSameVisitor.cnt >= 3) {
      return json({ ok: false, error: '偵測到異常操作，請稍後再試' }, 429);
    }

    // === 8. 推薦人檢查（存在 + 非自我推薦 + 未達 5 位邀請上限） ===
    let referrerId = null;
    let referrerNormalized = null;
    if (referrerCode) {
      const referrer = await env.DB.prepare(
        `SELECT id, phone, email, invite_count FROM lottery_participants
         WHERE referral_code = ? AND month = ? LIMIT 1`
      ).bind(referrerCode, month).first();

      if (referrer) {
        // 自我推薦檢查
        if (referrer.phone === phone || referrer.email === email) {
          // 靜默拒絕（不加抽獎機會，但仍允許登記）
          referrerNormalized = null;
        } else if (referrer.invite_count >= 5) {
          // 推薦人已達上限（5 位），仍算登記但不加獎勵
          referrerNormalized = null;
        } else {
          referrerId = referrer.id;
          referrerNormalized = referrerCode;
        }
      }
    }

    // === 9. 產生唯一推薦碼（避免碰撞 ─ 重試 5 次） ===
    let myReferralCode = null;
    for (let i = 0; i < 5; i++) {
      const candidate = generateReferralCode();
      const exists = await env.DB.prepare(
        `SELECT id FROM lottery_participants WHERE referral_code = ? LIMIT 1`
      ).bind(candidate).first();
      if (!exists) { myReferralCode = candidate; break; }
    }
    if (!myReferralCode) {
      return json({ ok: false, error: '系統忙碌，請稍後再試' }, 500);
    }

    // === 10. 產生 ticket_no（本月流水號） ===
    const seqRow = await env.DB.prepare(
      `SELECT COUNT(*) as cnt FROM lottery_participants WHERE month = ?`
    ).bind(month).first();
    const nextSeq = (seqRow ? seqRow.cnt : 0) + 1;
    const ticketNo = generateTicketNo(month, nextSeq);

    // === 11. 寫入主表 ===
    const now = new Date(Date.now() + 8 * 3600 * 1000).toISOString().replace('T', ' ').slice(0, 19);

    const insertResult = await env.DB.prepare(`
      INSERT INTO lottery_participants
        (ticket_no, month, name, phone, email,
         quiz_result_type, quiz_score,
         referral_code, referred_by, chances_total, chances_used,
         privacy_agreed, agreed_at,
         visitor_hash, ip_hash, user_agent,
         created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      ticketNo, month, name, phone, email,
      quizResultType, quizScore,
      myReferralCode, referrerNormalized, 1, 0,
      1, now,
      visitorHash, ipHash, ua,
      now, now
    ).run();

    const participantId = insertResult.meta?.last_row_id;

    // === 12. 推薦人加獎勵（+1 抽獎機會 + invite_count++） ===
    if (referrerId && participantId) {
      await env.DB.prepare(`
        UPDATE lottery_participants
        SET invite_count = invite_count + 1,
            chances_total = chances_total + 1,
            updated_at = ?
        WHERE id = ?
      `).bind(now, referrerId).run();

      await env.DB.prepare(`
        INSERT INTO lottery_referrals (referrer_id, referred_id, month)
        VALUES (?, ?, ?)
      `).bind(referrerId, participantId, month).run();
    }

    // === 13. 產生簽章（給 URL 用） ===
    const secret = env.LOTTERY_SECRET || DEFAULT_SECRET;
    const sig = await makeTicketSig(ticketNo, secret);

    return json({
      ok: true,
      ticket_no: ticketNo,
      sig,
      referral_code: myReferralCode,
      chances_total: 1,
      referred_by: referrerNormalized,
      month,
    });

  } catch (err) {
    console.error('[/api/lottery/register] error:', err);
    return json({ ok: false, error: '系統錯誤，請稍後再試', detail: err.message }, 500);
  }
}
