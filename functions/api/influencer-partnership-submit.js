/**
 * ============================================================
 * JDI 脈動傳媒 · 網紅合作專案 2026 Q4 Submit Endpoint
 * POST /api/influencer-partnership-submit
 *
 * 徵選規則：粉絲數 >= 3000、持續徵選、一人僅一次
 * 防刷：Email + 手機 任一命中既有紀錄即拒
 * ============================================================
 */

import {
  renderInfluencerConfirmEmail,
  renderInfluencerNotifyEmail
} from './_email-templates.js';

// ============ 允許值白名單 ============
const PLATFORMS = new Set(['tiktok', 'ig', 'yt', 'threads', 'fb', 'xhs', 'douyin', 'x', 'other']);
const CATEGORIES = new Set([
  'beauty', 'fashion', 'food', 'travel', 'game', 'knowledge',
  'entertainment', 'sport', 'pet', 'parenting', 'emotion', 'other'
]);
const FREQUENCIES = new Set(['daily', '3x_week', 'weekly', '2x_month', 'monthly', 'irregular']);
const GOALS = new Set(['traffic', 'livestream', 'sponsorship', 'agency', 'trainee']);
const GENDERS = new Set(['male', 'female', 'other']);

// 粉絲數硬門檻
const MIN_FOLLOWERS = 3000;
const MAX_FOLLOWERS = 100000000;  // 1 億（防打錯超高）

// ============ URL 驗證 ============
function isValidUrl(u) {
  if (!u) return false;
  try {
    const url = new URL(u);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch { return false; }
}

function normalizePhone(p) {
  return String(p || '').replace(/[^0-9]/g, '');
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

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

// ============ MAIN HANDLER ============
export async function onRequestPost({ request, env }) {
  // 1. Parse JSON
  let payload;
  try {
    payload = await request.json();
  } catch (e) {
    return json({ error: 'INVALID_JSON', message: '無效的請求內容' }, 400);
  }

  const {
    realName, stageName,
    birthYear, birthMonth, birthDay,
    gender, phone, email, lineId,
    platforms, primaryUrl, totalFollowers,
    contentCategory, activityFrequency, cooperationGoals,
    otherAccounts, additionalInfo,
    consent, source
  } = payload || {};

  // 2. 必填欄位
  const required = {
    realName, stageName,
    birthYear, birthMonth, birthDay,
    gender, phone, email, lineId,
    platforms, primaryUrl, totalFollowers,
    contentCategory, activityFrequency, cooperationGoals
  };
  for (const [k, v] of Object.entries(required)) {
    if (v === undefined || v === null) {
      return json({ error: 'MISSING_FIELDS', message: `缺少必填欄位：${k}` }, 400);
    }
    if (typeof v === 'string' && v.trim() === '') {
      return json({ error: 'MISSING_FIELDS', message: `缺少必填欄位：${k}` }, 400);
    }
    if (Array.isArray(v) && v.length === 0) {
      return json({ error: 'MISSING_FIELDS', message: `請至少選一項：${k}` }, 400);
    }
  }

  // 3. 格式驗證
  const by = parseInt(birthYear, 10);
  const bm = parseInt(birthMonth, 10);
  const bd = parseInt(birthDay, 10);
  const currentYear = new Date().getFullYear();
  if (!Number.isInteger(by) || by < 1950 || by > currentYear - 15) {
    return json({ error: 'INVALID_BIRTH_YEAR', message: `出生年份錯誤（1950–${currentYear - 15}）` }, 400);
  }
  if (!Number.isInteger(bm) || bm < 1 || bm > 12) {
    return json({ error: 'INVALID_BIRTH_MONTH', message: '出生月份錯誤' }, 400);
  }
  if (!Number.isInteger(bd) || bd < 1 || bd > 31) {
    return json({ error: 'INVALID_BIRTH_DAY', message: '出生日錯誤' }, 400);
  }

  if (!GENDERS.has(gender)) {
    return json({ error: 'INVALID_GENDER', message: '性別選項錯誤' }, 400);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'INVALID_EMAIL', message: 'Email 格式錯誤' }, 400);
  }

  const phoneClean = normalizePhone(phone);
  if (!/^\d{8,15}$/.test(phoneClean)) {
    return json({ error: 'INVALID_PHONE', message: '手機格式錯誤（8-15 位數字）' }, 400);
  }

  // Platforms: array of valid keys
  const safePlatforms = Array.isArray(platforms)
    ? platforms.filter(p => PLATFORMS.has(p))
    : [];
  if (!safePlatforms.length) {
    return json({ error: 'INVALID_PLATFORMS', message: '請至少選一個經營平台' }, 400);
  }

  if (!CATEGORIES.has(contentCategory)) {
    return json({ error: 'INVALID_CATEGORY', message: '內容類型錯誤' }, 400);
  }
  if (!FREQUENCIES.has(activityFrequency)) {
    return json({ error: 'INVALID_FREQUENCY', message: '更新頻率錯誤' }, 400);
  }

  const safeGoals = Array.isArray(cooperationGoals)
    ? cooperationGoals.filter(g => GOALS.has(g))
    : [];
  if (!safeGoals.length) {
    return json({ error: 'INVALID_GOALS', message: '請至少選一個期望合作方向' }, 400);
  }

  if (!isValidUrl(primaryUrl)) {
    return json({
      error: 'INVALID_PRIMARY_URL',
      message: '主要帳號連結格式錯誤（請提供 https:// 開頭的完整網址）'
    }, 400);
  }

  const followers = parseInt(totalFollowers, 10);
  if (!Number.isInteger(followers) || followers < 0 || followers > MAX_FOLLOWERS) {
    return json({ error: 'INVALID_FOLLOWERS', message: '粉絲數格式錯誤' }, 400);
  }

  // 🚨 硬門檻：粉絲數 < 3000 擋
  if (followers < MIN_FOLLOWERS) {
    return json({
      error: 'FOLLOWERS_BELOW_MIN',
      message: `粉絲數需達 ${MIN_FOLLOWERS.toLocaleString()} 以上才符合公會資格。目前您填寫為 ${followers.toLocaleString()}。歡迎先關注我們，待粉絲成長後再報名！`,
      minRequired: MIN_FOLLOWERS,
      yourValue: followers
    }, 400);
  }

  if (!consent) {
    return json({ error: 'CONSENT_REQUIRED', message: '請勾選同意個資使用條款' }, 400);
  }

  // 4. Sanitize
  const safeRealName    = String(realName).trim().slice(0, 40);
  const safeStageName   = String(stageName).trim().slice(0, 40);
  const safeGender      = gender;
  const safePhone       = phoneClean.slice(0, 20);
  const safeEmail       = String(email).trim().toLowerCase().slice(0, 80);
  const safeLineIdRaw   = String(lineId).trim().replace(/^@+/, '').slice(0, 50);
  const safeLineId      = safeLineIdRaw ? '@' + safeLineIdRaw : '';
  const safePrimaryUrl  = String(primaryUrl).trim().slice(0, 500);
  const safeCategory    = contentCategory;
  const safeFrequency   = activityFrequency;
  const safeOtherAcc    = String(otherAccounts || '').trim().slice(0, 1000);
  const safeAdditional  = String(additionalInfo || '').trim().slice(0, 800);
  const safeSource      = String(source || 'influencer-partnership-page').slice(0, 40);

  const ip = request.headers.get('CF-Connecting-IP') || '';
  const country = request.headers.get('CF-IPCountry') || '';
  const ua = request.headers.get('User-Agent') || '';

  // 5. 防刷：Email + 手機 任一命中即視為重複
  if (env.DB) {
    try {
      const dup = await env.DB.prepare(`
        SELECT id, created_at FROM influencer_applications
        WHERE email = ? OR phone = ?
        LIMIT 1
      `).bind(safeEmail, safePhone).first();
      if (dup) {
        return json({
          error: 'ALREADY_APPLIED',
          message: '這組 Email 或手機已經報名過囉！每人僅限報名一次。若需更新資料，請透過 LINE 聯絡我們：@354ykfbp',
          existingId: dup.id,
          existingAt: dup.created_at
        }, 409);
      }
    } catch (dbErr) {
      console.error('[influencer] dedup check failed:', dbErr);
    }
  }

  // 6. 寫入 D1
  let appId = null;
  if (env.DB) {
    try {
      const result = await env.DB.prepare(`
        INSERT INTO influencer_applications
          (real_name, stage_name, birth_year, birth_month, birth_day,
           gender, phone, email, line_id,
           platforms, primary_url, total_followers, content_category, activity_frequency,
           cooperation_goals, other_accounts, additional_info,
           source, ip, user_agent, country)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        safeRealName, safeStageName, by, bm, bd,
        safeGender, safePhone, safeEmail, safeLineId,
        JSON.stringify(safePlatforms), safePrimaryUrl, followers, safeCategory, safeFrequency,
        JSON.stringify(safeGoals), safeOtherAcc, safeAdditional,
        safeSource, ip.slice(0, 45), ua.slice(0, 200), country.slice(0, 2)
      ).run();
      appId = result.meta?.last_row_id || null;
    } catch (dbErr) {
      console.error('[influencer] D1 insert failed:', dbErr);
      if (String(dbErr).toLowerCase().includes('unique')) {
        return json({
          error: 'ALREADY_APPLIED',
          message: '這組 Email 或手機已經報名過。每人僅限報名一次。'
        }, 409);
      }
    }
  }

  // 7. Email 準備
  const RESEND_API_KEY = env.RESEND_API_KEY;
  const MAIL_FROM      = env.MAIL_FROM || 'noreply@jdi-pulse.com';
  const MAIL_FROM_NAME = env.MAIL_FROM_NAME || 'JDI 網紅合作專案';
  const MAIL_NOTIFY    = env.MAIL_NOTIFY || 'pulsepop9@gmail.com';

  if (!RESEND_API_KEY) {
    console.error('[influencer] Missing RESEND_API_KEY');
    return json({
      ok: true,
      appId,
      warn: 'Email service not configured yet'
    }, 200);
  }

  const emailData = {
    realName: safeRealName,
    stageName: safeStageName,
    birthYear: by, birthMonth: bm, birthDay: bd,
    gender: safeGender,
    phone: safePhone,
    email: safeEmail,
    lineId: safeLineId,
    platforms: safePlatforms,
    primaryUrl: safePrimaryUrl,
    totalFollowers: followers,
    contentCategory: safeCategory,
    activityFrequency: safeFrequency,
    cooperationGoals: safeGoals,
    otherAccounts: safeOtherAcc,
    additionalInfo: safeAdditional,
    source: safeSource,
    country,
    appId
  };

  const userHtml = renderInfluencerConfirmEmail(emailData);
  const userText = `${safeStageName}（${safeRealName}）您好，

感謝您報名 JDI 2026 最後一季網紅合作專案！

━━━━━━━━━━━━━━━━
總粉絲數：${followers.toLocaleString()}
主要帳號：${safePrimaryUrl}
LINE：${safeLineId}
━━━━━━━━━━━━━━━━

💬 審核詳細辦法將以 LINE 一對一私訊說明，請保持 LINE 可接收訊息。
🎯 預計 7 個工作天內聯繫。

有急件請聯絡：
• LINE 官方：https://line.me/R/ti/p/@354ykfbp
• Email：pulsepop9@gmail.com

★ 2026 Q4 · INFLUENCER PARTNERSHIP ★
JDI 脈動傳媒 · https://jdi-pulse.com/influencer-partnership/`;

  const notifyHtml = renderInfluencerNotifyEmail(emailData);
  const notifySubject = `⭐ [網紅] ${followers.toLocaleString()}粉 · ${safeStageName}（${safeRealName}）· ${safePhone}`;

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
        subject: `✅ 已收到您的報名 | JDI 網紅合作專案 · ${followers.toLocaleString()}粉`,
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
        from: `JDI 網紅合作通知 <${MAIL_FROM}>`,
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
      errDetail = userResp.status === 'fulfilled' ? await userResp.value.text() : String(userResp.reason);
    } catch(_) {}
    console.error('[influencer] user email failed:', errDetail);
  }
  if (!adminOk) {
    let errDetail = 'unknown';
    try {
      errDetail = adminResp.status === 'fulfilled' ? await adminResp.value.text() : String(adminResp.reason);
    } catch(_) {}
    console.error('[influencer] admin email failed:', errDetail);
  }

  if (env.DB && appId && userOk) {
    try {
      await env.DB.prepare('UPDATE influencer_applications SET notified = 1 WHERE id = ?').bind(appId).run();
    } catch(_) {}
  }

  return json({
    ok: true,
    appId,
    totalFollowers: followers,
    userEmailSent: userOk,
    adminEmailSent: adminOk
  });
}
