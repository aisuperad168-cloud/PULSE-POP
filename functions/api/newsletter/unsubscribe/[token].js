/**
 * ============================================================
 * GET /api/newsletter/unsubscribe/{token}
 * ============================================================
 * 一鍵退訂端點（不需登入、不需再次確認 —— 符合 CAN-SPAM / GDPR）
 * ============================================================
 */

import { sendResendEmail, taipeiNow, escapeHtml, siteBase } from '../_utils.js';
import { renderUnsubscribedEmail } from '../_templates.js';

export async function onRequestGet({ request, env, params }) {
  const token = params.token;
  const site = siteBase(env);

  if (!token || !/^[0-9a-f]{32}$/i.test(token)) {
    return htmlResult({
      icon: '⚠️',
      title: '連結格式錯誤',
      message: '這個退訂連結看起來不完整。若你想取消訂閱，可以直接回覆最近一封電子報告訴我們。',
      env,
    });
  }

  const db = env.DB;
  if (!db) return htmlResult({ icon: '❌', title: '系統暫時無法處理', message: '', env });

  const sub = await db.prepare(`
    SELECT id, email, status FROM newsletter_subscribers WHERE unsubscribe_token = ?
  `).bind(token).first();

  if (!sub) {
    return htmlResult({
      icon: '⚠️',
      title: '找不到這筆訂閱',
      message: '可能是這個連結已失效。若你想確認訂閱狀態，可透過 <a href="mailto:pulsepop9@gmail.com">pulsepop9@gmail.com</a> 聯繫我們。',
      env,
    });
  }

  if (sub.status === 'unsubscribed') {
    return htmlResult({
      icon: '✅',
      title: '你之前已退訂',
      message: `<strong>${escapeHtml(sub.email)}</strong> 這個信箱已在名單外，我們不會再寄任何電子報給你。`,
      env,
      isSuccess: true,
    });
  }

  // 執行退訂
  const now = taipeiNow();
  await db.prepare(`
    UPDATE newsletter_subscribers
    SET status='unsubscribed', unsubscribed_at=?, updated_at=?
    WHERE id=?
  `).bind(now, now, sub.id).run();

  // 寄一封退訂確認信（非阻塞）
  const unsub = renderUnsubscribedEmail(env, { email: sub.email });
  sendResendEmail(env, {
    to: sub.email,
    subject: unsub.subject,
    html: unsub.html,
    tags: [{ name: 'category', value: 'newsletter_unsubscribed' }],
  }).then(r => {
    return db.prepare(`
      INSERT INTO newsletter_email_logs (subscriber_id, to_email, template, subject, status, resend_id, error_message)
      VALUES (?, ?, 'unsubscribed', ?, ?, ?, ?)
    `).bind(
      sub.id, sub.email, unsub.subject,
      r.ok ? 'sent' : 'failed',
      r.id || null, r.ok ? null : (r.error || 'unknown'),
    ).run().catch(e => console.error('[newsletter/unsub] log err:', e.message));
  }).catch(e => console.error('[newsletter/unsub] send err:', e.message));

  return htmlResult({
    icon: '👋',
    title: '已為你取消訂閱',
    message: `<strong>${escapeHtml(sub.email)}</strong> 已從電子報名單移除。<br/>感謝你曾經支持 JDI 脈動傳媒！`,
    env,
    isSuccess: true,
  });
}

// POST 也接受（有些郵件用戶端會 prefetch GET，用 POST 避免誤觸）
export const onRequestPost = onRequestGet;

// ---------- HTML 結果頁 ----------
function htmlResult({ icon, title, message, env, isSuccess = false }) {
  const site = siteBase(env);
  const accent = isSuccess ? '#6b7280' : '#FE2C55';
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
  p a { color:#FE2C55; text-decoration:underline; }
  .btn { display:inline-block; background:#FE2C55; color:#fff !important; padding:14px 32px;
         border-radius:10px; font-weight:700; font-size:15px; text-decoration:none; margin:8px 4px; }
  .btn-ghost { display:inline-block; background:#fff; color:#4b5563 !important; padding:12px 28px;
               border:2px solid #e5e7eb; border-radius:10px; font-weight:600; font-size:14px;
               text-decoration:none; margin:8px 4px; }
  .brand { margin-top:32px; font-size:12px; color:#9ca3af; letter-spacing:2px; }
  .brand strong { color:#6b7280; }
</style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1>${escapeHtml(title)}</h1>
    <p>${message}</p>
    <div>
      <a href="${site}/live-center/" class="btn">回直播中心</a>
      <a href="${site}/" class="btn-ghost">回首頁</a>
    </div>
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
