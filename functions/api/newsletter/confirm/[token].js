/**
 * ============================================================
 * GET /api/newsletter/confirm/{token}
 * ============================================================
 * Double opt-in 確認端點
 * 使用者從確認信點連結進來 → 更新狀態為 confirmed → 寄歡迎信
 * 顯示成功 / 失敗頁面（HTML，不是 JSON）
 * ============================================================
 */

import { getClientIp, getClientUa, sendResendEmail, taipeiNow, escapeHtml, siteBase } from '../_utils.js';
import { renderWelcomeEmail } from '../_templates.js';

export async function onRequestGet({ request, env, params }) {
  const token = params.token;
  const site = siteBase(env);

  if (!token || !/^[0-9a-f]{32}$/i.test(token)) {
    return htmlResult({
      icon: '❌',
      title: '連結格式錯誤',
      message: '這個確認連結看起來不太對，請確認你點的是最新的確認信。',
      ctaLabel: '回到直播中心',
      ctaHref: `${site}/live-center/`,
      env,
    });
  }

  const db = env.DB;
  if (!db) return htmlResult({ icon: '❌', title: '系統暫時無法處理', message: '資料庫未設定', env });

  const sub = await db.prepare(`
    SELECT id, email, status, nickname, unsubscribe_token
    FROM newsletter_subscribers WHERE confirm_token = ?
  `).bind(token).first();

  if (!sub) {
    return htmlResult({
      icon: '⚠️',
      title: '找不到這個確認連結',
      message: '可能是連結已過期，或已被使用。你可以回到直播中心重新訂閱。',
      ctaLabel: '重新訂閱',
      ctaHref: `${site}/live-center/`,
      env,
    });
  }

  if (sub.status === 'confirmed') {
    return htmlResult({
      icon: '✅',
      title: '你早就訂閱過了',
      message: '這個信箱已完成訂閱，之後每週一會收到精選文章 :)',
      ctaLabel: '造訪直播中心',
      ctaHref: `${site}/live-center/`,
      env,
    });
  }

  if (sub.status === 'unsubscribed') {
    return htmlResult({
      icon: '⚠️',
      title: '這個信箱已退訂',
      message: '若想重新訂閱，請到直播中心再次填寫訂閱表單。',
      ctaLabel: '重新訂閱',
      ctaHref: `${site}/live-center/`,
      env,
    });
  }

  // pending → confirmed
  const now = taipeiNow();
  await db.prepare(`
    UPDATE newsletter_subscribers
    SET status='confirmed', confirmed_at=?, confirm_ip=?, confirm_ua=?, updated_at=?
    WHERE id=?
  `).bind(now, getClientIp(request), getClientUa(request), now, sub.id).run();

  // 寄歡迎信（非阻塞：失敗不影響確認流程）
  const welcome = renderWelcomeEmail(env, {
    email: sub.email,
    unsubscribeToken: sub.unsubscribe_token,
    nickname: sub.nickname,
  });
  sendResendEmail(env, {
    to: sub.email,
    subject: welcome.subject,
    html: welcome.html,
    tags: [{ name: 'category', value: 'newsletter_welcome' }],
  }).then(r => {
    return db.prepare(`
      INSERT INTO newsletter_email_logs (subscriber_id, to_email, template, subject, status, resend_id, error_message)
      VALUES (?, ?, 'welcome', ?, ?, ?, ?)
    `).bind(
      sub.id, sub.email, welcome.subject,
      r.ok ? 'sent' : 'failed',
      r.id || null, r.ok ? null : (r.error || 'unknown'),
    ).run().catch(e => console.error('[newsletter/confirm] log err:', e.message));
  }).catch(e => console.error('[newsletter/confirm] welcome send err:', e.message));

  return htmlResult({
    icon: '🎉',
    title: '訂閱完成！',
    message: `你已成功訂閱 <strong>${escapeHtml(sub.email)}</strong> 到 JDI 直播中心電子報。<br/>從下週一開始，你會收到精選文章。歡迎信也已寄出到你的信箱！`,
    ctaLabel: '逛逛直播中心',
    ctaHref: `${site}/live-center/`,
    env,
    isSuccess: true,
  });
}

// ---------- HTML 結果頁 ----------
function htmlResult({ icon, title, message, ctaLabel, ctaHref, env, isSuccess = false }) {
  const site = siteBase(env);
  const accent = isSuccess ? '#10b981' : '#FE2C55';
  const html = `<!DOCTYPE html>
<html lang="zh-Hant-TW">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${escapeHtml(title)}｜JDI 脈動傳媒</title>
<meta name="robots" content="noindex,nofollow"/>
<link rel="icon" href="${site}/assets/favicon-32.png"/>
<style>
  body { margin:0; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans TC",sans-serif;
         background:linear-gradient(135deg,#0e1017 0%,#1a1d26 100%); color:#fff; min-height:100vh;
         display:flex; align-items:center; justify-content:center; padding:20px; }
  .card { max-width:520px; width:100%; background:#fff; color:#111827; border-radius:16px;
          padding:56px 32px 40px; text-align:center; box-shadow:0 24px 60px rgba(0,0,0,0.35); }
  .icon { font-size:64px; margin-bottom:20px; line-height:1; }
  h1 { font-size:26px; font-weight:900; margin:0 0 16px; color:${accent}; }
  p { font-size:15px; line-height:1.85; color:#4b5563; margin:0 0 24px; }
  .btn { display:inline-block; background:${accent}; color:#fff !important; padding:14px 32px;
         border-radius:10px; font-weight:700; font-size:15px; text-decoration:none;
         transition:transform 0.15s; }
  .btn:hover { transform:translateY(-2px); }
  .brand { margin-top:32px; font-size:12px; color:#9ca3af; letter-spacing:2px; }
  .brand strong { color:#6b7280; }
</style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1>${escapeHtml(title)}</h1>
    <p>${message}</p>
    ${ctaHref ? `<a href="${ctaHref}" class="btn">${escapeHtml(ctaLabel || '返回')} →</a>` : ''}
    <div class="brand"><strong>JDI 脈動傳媒</strong> · JDI PULSE MEDIA</div>
  </div>
</body>
</html>`;
  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
