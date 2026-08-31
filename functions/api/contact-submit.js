/**
 * ============================================================
 * JDI 脈動傳媒 · Business Cooperation Contact Endpoint
 * POST /api/contact-submit
 *
 * 對象：品牌 / 廠商 / 經紀公司填寫 partnership.html 表單
 *
 * Environment Variables (set via wrangler / Cloudflare Dashboard):
 *   RESEND_API_KEY   — Resend API key (re_xxx)
 *   MAIL_FROM        — 寄件人 email (e.g. onboarding@resend.dev)
 *   MAIL_FROM_NAME   — 寄件人顯示名稱 (e.g. JDI 脈動傳媒)
 *   MAIL_NOTIFY      — 內部通知信箱 (e.g. pulsepop9@gmail.com)
 *
 * Bindings:
 *   DB               — D1 database (contact_leads table)
 * ============================================================
 */

import { renderContactConfirmEmail, renderContactNotifyEmail } from './_email-templates.js';

// ============ ALLOWED COOPERATION TYPES ============
// 對應 partnership.html 表單 checkbox。比對時會 normalize:
//   - 去除所有空白（空格、全形空格）
//   - 統一斜線（全形 ／ → /）
// 這樣 "A · 經紀公司合作" / "經紀公司合作" / "直播節目 / 活動策劃" / "直播節目/活動策劃"
// 都能對上，避免因為前後端字串細節不一致而擋掉送出。
const ALLOWED_TYPES_RAW = [
  // 主軸三大方案（partnership.html 主軸 checkbox）
  'A · 經紀公司合作',
  'B · 跨公會聯播 / 資源互換',
  'C · 個體戶主播經紀簽約',
  // 輔助服務
  '品牌業配代言媒合',
  '達人資源短期租借',
  '直播節目 / 活動策劃',
  // 舊版與短版別名（backwards-compat）
  '經紀公司合作',
  '跨公會聯播',
  '個體戶主播經紀簽約',
  '業配代言媒合',
  '達人資源租借',
  '直播節目/活動策劃'
];
const normalizeType = s => String(s).replace(/[\s\u3000]+/g, '').replace(/／/g, '/');
const ALLOWED_TYPES = new Set(ALLOWED_TYPES_RAW.map(normalizeType));

const ALLOWED_SCALES = new Set([
  '初次合作（單次專案）',
  '中型專案（多次合作）',
  '長期合作（年度合約）',
  '待討論',
  ''
]);

// ============ CORS ============
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400'
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS }
  });
}

// ============ MAIN HANDLER ============
export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestPost({ request, env }) {
  // 1. Parse
  let payload;
  try {
    payload = await request.json();
  } catch (e) {
    return json({ error: 'INVALID_JSON', message: '無效的請求內容' }, 400);
  }

  const {
    company, name, email, phone,
    types, scale, message, startTime,
    consent, source
  } = payload || {};

  // 2. Validate
  if (!company || !name || !email || !message) {
    return json({ error: 'MISSING_FIELDS', message: '缺少必要欄位（公司/姓名/Email/需求說明）' }, 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'INVALID_EMAIL', message: 'Email 格式錯誤' }, 400);
  }
  if (!Array.isArray(types) || types.length === 0) {
    return json({ error: 'MISSING_TYPES', message: '請至少勾選一項合作類型' }, 400);
  }
  // Filter valid types only (defensive) — normalize whitespace / slash before matching
  const safeTypes = types
    .filter(t => typeof t === 'string' && ALLOWED_TYPES.has(normalizeType(t)))
    .map(t => String(t).slice(0, 60));
  if (safeTypes.length === 0) {
    return json({ error: 'INVALID_TYPES', message: '合作類型不在允許清單內' }, 400);
  }
  const safeScale = (typeof scale === 'string' && ALLOWED_SCALES.has(scale)) ? scale : '';
  if (!consent) {
    return json({ error: 'CONSENT_REQUIRED', message: '請勾選同意隱私條款' }, 400);
  }

  // 3. Sanitize
  const safeCompany   = String(company).trim().slice(0, 80);
  const safeName      = String(name).trim().slice(0, 40);
  const safeEmail     = String(email).trim().toLowerCase().slice(0, 80);
  const safePhone     = String(phone || '').trim().slice(0, 30);
  const safeMessage   = String(message).trim().slice(0, 1000);
  const safeStartTime = String(startTime || '').trim().slice(0, 40);
  const safeSource    = String(source || 'partnership-page').slice(0, 30);

  if (safeMessage.length < 5) {
    return json({ error: 'MESSAGE_TOO_SHORT', message: '合作需求說明至少 5 字' }, 400);
  }

  const ip = request.headers.get('CF-Connecting-IP') || '';
  const country = request.headers.get('CF-IPCountry') || '';
  const ua = request.headers.get('User-Agent') || '';

  // 4. Store to D1 (if available)
  let leadId = null;
  if (env.DB) {
    try {
      const result = await env.DB.prepare(`
        INSERT INTO contact_leads
          (company, name, email, phone, types, scale, message, start_time, source, ip, user_agent, country)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        safeCompany, safeName, safeEmail, safePhone,
        JSON.stringify(safeTypes),
        safeScale,
        safeMessage,
        safeStartTime,
        safeSource,
        ip.slice(0, 45),
        ua.slice(0, 200),
        country.slice(0, 2)
      ).run();
      leadId = result.meta?.last_row_id || null;
    } catch (dbErr) {
      console.error('[contact] D1 insert failed:', dbErr);
    }
  }

  // 5. Send emails via Resend
  const RESEND_API_KEY = env.RESEND_API_KEY;
  const MAIL_FROM      = env.MAIL_FROM || 'onboarding@resend.dev';
  const MAIL_FROM_NAME = env.MAIL_FROM_NAME || 'JDI 脈動傳媒';
  const MAIL_NOTIFY    = env.MAIL_NOTIFY || 'pulsepop9@gmail.com';

  if (!RESEND_API_KEY) {
    console.error('[contact] Missing RESEND_API_KEY');
    return json({
      ok: true,
      leadId,
      warn: 'Email service not configured yet (missing API key)'
    }, 200);
  }

  const contactData = {
    company: safeCompany,
    name: safeName,
    email: safeEmail,
    phone: safePhone,
    types: safeTypes,
    scale: safeScale,
    message: safeMessage,
    startTime: safeStartTime,
    source: safeSource,
    country,
    leadId
  };

  // ==== 5a. Confirmation email to user ====
  const userHtml = renderContactConfirmEmail(contactData);
  const userText = `你好 ${safeName}，

感謝您聯繫 JDI 脈動傳媒！我們已收到您的合作需求，內容摘要如下：

━━━━━━━━━━━━━━━━
公司/組織：${safeCompany}
聯絡人：${safeName}
Email：${safeEmail}
${safePhone ? '電話：' + safePhone + '\n' : ''}合作類型：${safeTypes.join('、')}
${safeScale ? '合作規模：' + safeScale + '\n' : ''}${safeStartTime ? '希望開始時間：' + safeStartTime + '\n' : ''}
需求說明：
${safeMessage}
━━━━━━━━━━━━━━━━

📞 我們的專案顧問將在 24 小時內主動聯繫您。

若有急件，歡迎直接聯絡：
• LINE 官方：https://line.me/R/ti/p/@354ykfbp
• 電話：04-3603-3191

JDI 脈動傳媒 JDI Pulse MEDIA
TikTok LIVE 官方合作經紀公會
https://jdi-pulse.com/`;

  // ==== 5b. Notify email to admin ====
  const notifyHtml = renderContactNotifyEmail(contactData);
  const notifySubject = `🤝 [JDI 商業合作] ${safeCompany} · ${safeName} · ${safeTypes.join('/')}`;

  // Send both in parallel
  const [userResp, adminResp] = await Promise.allSettled([
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `${MAIL_FROM_NAME} <${MAIL_FROM}>`,
        to: [safeEmail],
        subject: `✅ 已收到您的合作需求 | JDI 脈動傳媒`,
        html: userHtml,
        text: userText,
        reply_to: MAIL_NOTIFY
      })
    }),
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `JDI 官網通知 <${MAIL_FROM}>`,
        to: [MAIL_NOTIFY],
        subject: notifySubject,
        html: notifyHtml,
        reply_to: safeEmail
      })
    })
  ]);

  const userOk  = userResp.status === 'fulfilled'  && userResp.value.ok;
  const adminOk = adminResp.status === 'fulfilled' && adminResp.value.ok;

  if (!userOk) {
    let errDetail = 'unknown';
    try {
      errDetail = userResp.status === 'fulfilled'
        ? await userResp.value.text()
        : String(userResp.reason);
    } catch(_) {}
    console.error('[contact] user email failed:', errDetail);
  }
  if (!adminOk) {
    let errDetail = 'unknown';
    try {
      errDetail = adminResp.status === 'fulfilled'
        ? await adminResp.value.text()
        : String(adminResp.reason);
    } catch(_) {}
    console.error('[contact] admin email failed:', errDetail);
  }

  // Mark notified in D1
  if (env.DB && leadId && userOk) {
    try {
      await env.DB.prepare('UPDATE contact_leads SET notified = 1 WHERE id = ?').bind(leadId).run();
    } catch(_) {}
  }

  return json({
    ok: true,
    leadId,
    userEmailSent: userOk,
    adminEmailSent: adminOk
  });
}
