/**
 * ============================================================
 * POST /api/newsletter/subscribe
 * ============================================================
 * 網站訂閱表單提交點
 * Body: { email, nickname?, source?, source_detail?, honeypot? }
 * 回傳: { ok, status: 'confirmation_sent' | 'already_subscribed', ... }
 *
 * 流程：
 *   1. 驗證 email
 *   2. Honeypot / 頻率限制（同 IP 5 分鐘內最多 3 次）
 *   3. 若 email 已 confirmed → 直接回「已訂閱」
 *   4. 若 email 已 pending → 重寄確認信（換新 token）
 *   5. 新 email → INSERT + 寄確認信
 * ============================================================
 */

import {
  generateToken, isValidEmail, normalizeEmail, getClientIp, getClientUa,
  jsonResponse, errorResponse, sendResendEmail, taipeiNow,
} from './_utils.js';
import { renderConfirmEmail } from './_templates.js';

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

  if (existing) {
    if (existing.status === 'confirmed') {
      return jsonResponse({
        ok: true,
        status: 'already_subscribed',
        message: '這個信箱已訂閱過了，感謝支持！',
      });
    }
    if (existing.status === 'unsubscribed') {
      // 已退訂 → 重新啟動流程（新 token、狀態改回 pending）
      confirmToken = generateToken();
      unsubscribeToken = generateToken();
      await db.prepare(`
        UPDATE newsletter_subscribers
        SET status='pending', confirm_token=?, unsubscribe_token=?,
            unsubscribed_at=NULL, source=?, source_detail=?,
            subscribe_ip=?, subscribe_ua=?, updated_at=?
        WHERE id=?
      `).bind(confirmToken, unsubscribeToken, source, sourceDetail, ip, ua, now, existing.id).run();
    } else {
      // pending → 重寄確認信，換新 confirm_token（避免舊連結被 leak）
      confirmToken = generateToken();
      unsubscribeToken = existing.unsubscribe_token;
      await db.prepare(`
        UPDATE newsletter_subscribers
        SET confirm_token=?, subscribe_ip=?, subscribe_ua=?, updated_at=?
        WHERE id=?
      `).bind(confirmToken, ip, ua, now, existing.id).run();
    }
  } else {
    // 新訂閱者
    confirmToken = generateToken();
    unsubscribeToken = generateToken();
    await db.prepare(`
      INSERT INTO newsletter_subscribers (
        email, status, source, source_detail,
        confirm_token, unsubscribe_token,
        nickname, subscribe_ip, subscribe_ua,
        created_at, updated_at
      ) VALUES (?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(email, source, sourceDetail, confirmToken, unsubscribeToken,
            nickname, ip, ua, now, now).run();
  }

  // 寄確認信
  const emailContent = renderConfirmEmail(env, {
    email,
    confirmToken,
    unsubscribeToken,
    nickname,
  });

  const send = await sendResendEmail(env, {
    to: email,
    subject: emailContent.subject,
    html: emailContent.html,
    tags: [{ name: 'category', value: 'newsletter_confirm' }],
  });

  // 記錄寄送 log
  try {
    await db.prepare(`
      INSERT INTO newsletter_email_logs (subscriber_id, to_email, template, subject, status, resend_id, error_message)
      SELECT id, ?, 'confirm', ?, ?, ?, ?
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

  if (!send.ok) {
    return errorResponse('確認信寄送失敗，請稍後再試或聯繫客服', 500, 'SEND_FAILED');
  }

  return jsonResponse({
    ok: true,
    status: 'confirmation_sent',
    message: '確認信已寄出！請至信箱點擊確認連結完成訂閱（若沒收到請檢查垃圾信匣）',
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
