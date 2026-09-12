/**
 * ============================================================
 * POST /api/newsletter/subscribe
 * ============================================================
 * 網站訂閱表單提交點（直接訂閱模式，不做 double opt-in）
 * Body: { email, nickname?, source?, source_detail?, honeypot? }
 * 回傳: { ok, status: 'subscribed' | 'already_subscribed' | 'resubscribed', ... }
 *
 * 流程：
 *   1. 驗證 email + honeypot + rate limit
 *   2. 若 email 已 confirmed → 直接回「已訂閱」
 *   3. 若 email 已 unsubscribed → 重新啟動（狀態改回 confirmed，新 unsubscribe token）
 *   4. 新 email → INSERT 為 confirmed（直接生效）
 *   5. 一律寄「歡迎信」（含推薦文章與退訂連結）
 *
 * 設計決策（2026-09 改版）：
 *   - 主要客群為台灣主播/中小廣告主，double opt-in 流失率過高
 *   - 台灣個資法未強制要求 double opt-in，只要求可退訂
 *   - 每封信都有一鍵退訂連結（符合 CAN-SPAM）
 *   - 若濫用增加（假 email 訂閱他人）可隨時改回 pending 模式
 * ============================================================
 */

import {
  generateToken, isValidEmail, normalizeEmail, getClientIp, getClientUa,
  jsonResponse, errorResponse, sendResendEmail, taipeiNow,
} from './_utils.js';
import { renderWelcomeEmail } from './_templates.js';

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return errorResponse('Invalid JSON body', 400, 'INVALID_JSON');
  }

  // Honeypot: 若 hp 欄位有值，直接吞掉（機器人）
  if (body.honeypot || body.hp || body.website_url) {
    // 假裝成功，避免透露機制
    return jsonResponse({ ok: true, status: 'confirmation_sent' });
  }

  const email = normalizeEmail(body.email);
  if (!isValidEmail(email)) {
    return errorResponse('Email 格式錯誤', 400, 'INVALID_EMAIL');
  }

  const nickname = (body.nickname || '').trim().slice(0, 50) || null;
  const source = (body.source || 'website').slice(0, 50);
  const sourceDetail = (body.source_detail || '').slice(0, 200) || null;

  const ip = getClientIp(request);
  const ua = getClientUa(request);

  const db = env.DB;
  if (!db) return errorResponse('Database not configured', 500, 'NO_DB');

  // Rate limit: 同 IP 5 分鐘內最多 3 次訂閱嘗試
  try {
    const rl = await db.prepare(`
      SELECT COUNT(*) as cnt FROM newsletter_subscribers
      WHERE subscribe_ip = ? AND created_at > datetime('now', '-5 minutes')
    `).bind(ip).first();
    if (rl && rl.cnt >= 3) {
      return errorResponse('請求過於頻繁，請 5 分鐘後再試', 429, 'RATE_LIMITED');
    }
  } catch (e) {
    // schema 若還沒建 table 會爆，但我們先容錯（開發初期）
    console.error('[newsletter/subscribe] rate check error:', e.message);
  }

  // 查詢現有記錄
  const existing = await db.prepare(`
    SELECT id, status, confirm_token, unsubscribe_token FROM newsletter_subscribers WHERE email = ?
  `).bind(email).first();

  const now = taipeiNow();
  let confirmToken, unsubscribeToken;

  let userStatus; // 回應給前端的狀態

  if (existing) {
    if (existing.status === 'confirmed') {
      return jsonResponse({
        ok: true,
        status: 'already_subscribed',
        message: '這個信箱已訂閱過了，感謝支持！',
      });
    }
    if (existing.status === 'unsubscribed') {
      // 已退訂 → 重新啟動（狀態直接改回 confirmed，換新退訂 token 避免舊連結被利用）
      unsubscribeToken = generateToken();
      await db.prepare(`
        UPDATE newsletter_subscribers
        SET status='confirmed', confirmed_at=?, unsubscribe_token=?,
            unsubscribed_at=NULL, source=?, source_detail=?,
            subscribe_ip=?, subscribe_ua=?, updated_at=?
        WHERE id=?
      `).bind(now, unsubscribeToken, source, sourceDetail, ip, ua, now, existing.id).run();
      userStatus = 'resubscribed';
    } else {
      // pending（舊資料）→ 直接升級成 confirmed
      unsubscribeToken = existing.unsubscribe_token;
      await db.prepare(`
        UPDATE newsletter_subscribers
        SET status='confirmed', confirmed_at=?, subscribe_ip=?, subscribe_ua=?, updated_at=?
        WHERE id=?
      `).bind(now, ip, ua, now, existing.id).run();
      userStatus = 'subscribed';
    }
  } else {
    // 新訂閱者 → 直接 confirmed
    // confirm_token 仍需產生（schema 為 NOT NULL UNIQUE），保留欄位但不使用
    const confirmToken = generateToken();
    unsubscribeToken = generateToken();
    await db.prepare(`
      INSERT INTO newsletter_subscribers (
        email, status, confirmed_at, source, source_detail,
        confirm_token, unsubscribe_token,
        nickname, subscribe_ip, subscribe_ua,
        created_at, updated_at
      ) VALUES (?, 'confirmed', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(email, now, source, sourceDetail, confirmToken, unsubscribeToken,
            nickname, ip, ua, now, now).run();
    userStatus = 'subscribed';
  }

  // 寄歡迎信
  const emailContent = renderWelcomeEmail(env, {
    email,
    unsubscribeToken,
    nickname,
  });

  const send = await sendResendEmail(env, {
    to: email,
    subject: emailContent.subject,
    html: emailContent.html,
    tags: [{ name: 'category', value: 'newsletter_welcome' }],
  });

  // 記錄寄送 log（非阻塞）
  try {
    await db.prepare(`
      INSERT INTO newsletter_email_logs (subscriber_id, to_email, template, subject, status, resend_id, error_message)
      SELECT id, ?, 'welcome', ?, ?, ?, ?
      FROM newsletter_subscribers WHERE email = ?
    `).bind(
      email,
      emailContent.subject,
      send.ok ? 'sent' : 'failed',
      send.id || null,
      send.ok ? null : (send.error || 'unknown'),
      email,
    ).run();
  } catch (e) {
    console.error('[newsletter/subscribe] log error:', e.message);
  }

  // 即使歡迎信寄送失敗也回應成功（訂閱已入庫，可下次再補寄）
  return jsonResponse({
    ok: true,
    status: userStatus,
    message: userStatus === 'resubscribed'
      ? '歡迎回來！你已重新訂閱 JDI 直播中心電子報 🎉'
      : '訂閱成功！歡迎信已寄到你的信箱 📬',
  });
}

// CORS preflight（訂閱表單可能從其他 origin 呼叫）
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}
