/**
 * ============================================================
 * JDI 脈動傳媒 · Careers Application Endpoint
 * POST /api/careers-submit
 *
 * 對象：填寫 careers.html 職缺應徵表單的應徵者
 *
 * Environment Variables:
 *   RESEND_API_KEY   — Resend API key (re_xxx)
 *   MAIL_FROM        — 寄件人 email
 *   MAIL_FROM_NAME   — 寄件人顯示名稱
 *   MAIL_NOTIFY      — 內部通知信箱 (pulsepop9@gmail.com)
 *
 * Bindings:
 *   DB               — D1 database (careers_applications table)
 * ============================================================
 */

import { renderCareersConfirmEmail, renderCareersNotifyEmail } from './_email-templates.js';

// ============ 8 大職缺 ============
// key → { name, department }
const POSITIONS = {
  agent:       { name: '主播經紀人',           department: 'online'  },
  bd:          { name: '主播招募 BD',          department: 'online'  },
  editor:      { name: '短影音企劃剪輯師',     department: 'online'  },
  studio_lead: { name: '直播間店長 / 場控',    department: 'studio'  },
  tech:        { name: '直播技術工程師',       department: 'studio'  },
  makeup:      { name: '化妝造型師',           department: 'studio'  },
  social:      { name: '社群小編 / 內容編輯',  department: 'support' },
  hr:          { name: '行政人資',             department: 'support' }
};

const INTERVIEW_SLOTS = new Set([
  'weekday_day',    // 週間白天
  'weekday_night',  // 週間晚上
  'weekend'         // 週末
]);
const SLOT_LABELS = {
  weekday_day:   '週間白天（09:00-18:00）',
  weekday_night: '週間晚上（18:00-21:00）',
  weekend:       '週末'
};

// ============ URL 驗證 ============
// 允許 https:// URL（Google Drive / Dropbox / iCloud / OneDrive / 個人 Portfolio 等）
function isValidUrl(u) {
  if (!u) return false;
  try {
    const url = new URL(u);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

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
  // 1. Parse JSON
  let payload;
  try {
    payload = await request.json();
  } catch (e) {
    return json({ error: 'INVALID_JSON', message: '無效的請求內容' }, 400);
  }

  const {
    name, email, phone,
    position,        // key from POSITIONS
    startDate,       // 期望到職日
    interviewSlots,  // array of slot keys
    experience,      // 相關經驗
    motivation,      // 為什麼想加入 JDI
    resumeUrl,       // 履歷連結（必填）
    portfolioUrl,    // 作品集連結（選填）
    consent,
    source
  } = payload || {};

  // 2. Validate required fields
  if (!name || !email || !phone || !position || !motivation || !resumeUrl) {
    return json({
      error: 'MISSING_FIELDS',
      message: '缺少必要欄位（姓名 / Email / 電話 / 應徵職缺 / 加入動機 / 履歷連結）'
    }, 400);
  }

  // Email format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'INVALID_EMAIL', message: 'Email 格式錯誤' }, 400);
  }

  // Phone format (very loose — 台灣手機 / 市話 / 國際格式)
  const phoneClean = String(phone).replace(/[\s\-()]/g, '');
  if (!/^\+?\d{8,15}$/.test(phoneClean)) {
    return json({ error: 'INVALID_PHONE', message: '電話格式錯誤（請輸入 8-15 位數字）' }, 400);
  }

  // Position must be one of the 8 defined
  if (!POSITIONS[position]) {
    return json({ error: 'INVALID_POSITION', message: '應徵職缺不在允許清單內' }, 400);
  }

  // Resume URL must be valid https URL
  if (!isValidUrl(resumeUrl)) {
    return json({
      error: 'INVALID_RESUME_URL',
      message: '履歷連結格式錯誤（請提供 Google Drive / Dropbox / iCloud 等雲端連結）'
    }, 400);
  }

  // Portfolio URL (optional) — if provided, must be valid
  if (portfolioUrl && !isValidUrl(portfolioUrl)) {
    return json({ error: 'INVALID_PORTFOLIO_URL', message: '作品集連結格式錯誤' }, 400);
  }

  // Interview slots (optional)
  const safeSlots = Array.isArray(interviewSlots)
    ? interviewSlots.filter(s => INTERVIEW_SLOTS.has(s))
    : [];

  if (!consent) {
    return json({ error: 'CONSENT_REQUIRED', message: '請勾選同意個資使用條款' }, 400);
  }

  // 3. Sanitize
  const safeName        = String(name).trim().slice(0, 40);
  const safeEmail       = String(email).trim().toLowerCase().slice(0, 80);
  const safePhone       = String(phone).trim().slice(0, 30);
  const safePosition    = position;
  const positionData    = POSITIONS[safePosition];
  const safeStartDate   = String(startDate || '').trim().slice(0, 40);
  const safeExperience  = String(experience || '').trim().slice(0, 500);
  const safeMotivation  = String(motivation).trim().slice(0, 800);
  const safeResumeUrl   = String(resumeUrl).trim().slice(0, 500);
  const safePortfolio   = String(portfolioUrl || '').trim().slice(0, 500);
  const safeSource      = String(source || 'careers-page').slice(0, 30);

  if (safeMotivation.length < 10) {
    return json({ error: 'MOTIVATION_TOO_SHORT', message: '加入動機至少 10 字' }, 400);
  }

  const ip = request.headers.get('CF-Connecting-IP') || '';
  const country = request.headers.get('CF-IPCountry') || '';
  const ua = request.headers.get('User-Agent') || '';

  // 4. Store to D1
  let appId = null;
  if (env.DB) {
    try {
      const result = await env.DB.prepare(`
        INSERT INTO careers_applications
          (name, email, phone, position_key, position_name, department,
           start_date, interview_slots, experience, motivation, resume_url, portfolio_url,
           source, ip, user_agent, country)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        safeName, safeEmail, safePhone,
        safePosition, positionData.name, positionData.department,
        safeStartDate,
        JSON.stringify(safeSlots),
        safeExperience,
        safeMotivation,
        safeResumeUrl,
        safePortfolio,
        safeSource,
        ip.slice(0, 45),
        ua.slice(0, 200),
        country.slice(0, 2)
      ).run();
      appId = result.meta?.last_row_id || null;
    } catch (dbErr) {
      console.error('[careers] D1 insert failed:', dbErr);
    }
  }

  // 5. Send emails via Resend
  const RESEND_API_KEY = env.RESEND_API_KEY;
  const MAIL_FROM      = env.MAIL_FROM || 'noreply@jdi-pulse.com';
  const MAIL_FROM_NAME = env.MAIL_FROM_NAME || 'JDI 脈動傳媒';
  const MAIL_NOTIFY    = env.MAIL_NOTIFY || 'pulsepop9@gmail.com';

  if (!RESEND_API_KEY) {
    console.error('[careers] Missing RESEND_API_KEY');
    return json({
      ok: true,
      appId,
      warn: 'Email service not configured yet (missing API key)'
    }, 200);
  }

  const appData = {
    name: safeName,
    email: safeEmail,
    phone: safePhone,
    positionKey: safePosition,
    positionName: positionData.name,
    department: positionData.department,
    startDate: safeStartDate,
    interviewSlots: safeSlots,
    slotLabels: safeSlots.map(s => SLOT_LABELS[s]).filter(Boolean),
    experience: safeExperience,
    motivation: safeMotivation,
    resumeUrl: safeResumeUrl,
    portfolioUrl: safePortfolio,
    source: safeSource,
    country,
    appId
  };

  // ==== 5a. Confirmation email to applicant ====
  const userHtml = renderCareersConfirmEmail(appData);
  const userText = `你好 ${safeName}，

感謝您應徵 JDI 脈動傳媒！我們已收到您的履歷，資料摘要如下：

━━━━━━━━━━━━━━━━
應徵職缺：${positionData.name}
姓名：${safeName}
Email：${safeEmail}
電話：${safePhone}
${safeStartDate ? '期望到職日：' + safeStartDate + '\n' : ''}${appData.slotLabels.length ? '可面試時段：' + appData.slotLabels.join('、') + '\n' : ''}
履歷連結：${safeResumeUrl}
${safePortfolio ? '作品集：' + safePortfolio + '\n' : ''}
━━━━━━━━━━━━━━━━

📞 我們將在 5 個工作天內回覆您。若有進一步面試，會透過 Email 或電話聯繫。

若有急件，歡迎直接聯絡：
• LINE 官方：https://line.me/R/ti/p/@354ykfbp
• 電話：04-3603-3191

JDI 脈動傳媒 JDI Pulse MEDIA
TikTok LIVE 官方合作經紀公會
https://jdi-pulse.com/`;

  // ==== 5b. Notify email to admin ====
  const notifyHtml = renderCareersNotifyEmail(appData);
  const notifySubject = `📮 [JDI 履歷] ${positionData.name} · ${safeName} · ${safePhone}`;

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
        subject: `✅ 已收到您的履歷 | JDI 脈動傳媒 · ${positionData.name}`,
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
        from: `JDI 履歷通知 <${MAIL_FROM}>`,
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
    console.error('[careers] user email failed:', errDetail);
  }
  if (!adminOk) {
    let errDetail = 'unknown';
    try {
      errDetail = adminResp.status === 'fulfilled'
        ? await adminResp.value.text()
        : String(adminResp.reason);
    } catch(_) {}
    console.error('[careers] admin email failed:', errDetail);
  }

  // Mark notified in D1
  if (env.DB && appId && userOk) {
    try {
      await env.DB.prepare('UPDATE careers_applications SET notified = 1 WHERE id = ?').bind(appId).run();
    } catch(_) {}
  }

  return json({
    ok: true,
    appId,
    userEmailSent: userOk,
    adminEmailSent: adminOk
  });
}
