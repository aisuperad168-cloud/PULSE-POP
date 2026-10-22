/**
 * ============================================================
 * JDI 脈動傳媒 · Mission Star 練習生培訓計畫 Submit Endpoint
 * POST /api/mission-star-submit
 *
 * 對象：填寫 /mission-star/ 練習生報名表單的候選人
 * 徵選規則：性別不限、1996-2010 出生、持續徵選、一人僅一次
 * 防刷：Email + 手機 任一命中既有紀錄即拒
 *
 * Environment Variables:
 *   RESEND_API_KEY   — Resend API key (re_xxx)
 *   MAIL_FROM        — 寄件人 email
 *   MAIL_FROM_NAME   — 寄件人顯示名稱
 *   MAIL_NOTIFY      — 內部通知信箱 (pulsepop9@gmail.com)
 *
 * Bindings:
 *   DB               — D1 database (mission_star_applications table)
 * ============================================================
 */

import {
  renderMissionStarConfirmEmail,
  renderMissionStarNotifyEmail
} from './_email-templates.js';

// ============ 允許值白名單 ============
const AUDITION_CATEGORIES = new Set(['vocal', 'rap', 'dance', 'other']);
const GENDERS = new Set(['male', 'female', 'other']);
const NATIONALITIES = new Set(['tw', 'cn', 'hk', 'mo', 'sg', 'my', 'jp', 'kr', 'us', 'other']);

const CATEGORY_LABELS = {
  vocal: '🎤 歌唱',
  rap:   '🎙️ RAP',
  dance: '💃 舞蹈',
  other: '🌟 其他'
};

// ============ URL 驗證 ============
function isValidUrl(u) {
  if (!u) return false;
  try {
    const url = new URL(u);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

// ============ 手機正規化（防刷用）============
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
    chineseName, stageName,
    birthYear, birthMonth, birthDay,
    gender, nationality,
    heightCm, weightKg,
    phone, email, igHandle, city,
    auditionCategory,
    worksUrl, experience, additionalInfo, photosUrl,
    consent, source
  } = payload || {};

  // 2. 必填欄位
  const required = {
    chineseName, stageName,
    birthYear, birthMonth, birthDay,
    gender, nationality,
    heightCm, weightKg,
    phone, email, igHandle, city,
    auditionCategory, worksUrl, photosUrl
  };
  for (const [k, v] of Object.entries(required)) {
    if (v === undefined || v === null || String(v).trim() === '') {
      return json({ error: 'MISSING_FIELDS', message: `缺少必填欄位：${k}` }, 400);
    }
  }

  // 3. 格式驗證
  const by = parseInt(birthYear, 10);
  const bm = parseInt(birthMonth, 10);
  const bd = parseInt(birthDay, 10);
  if (!Number.isInteger(by) || by < 1996 || by > 2010) {
    return json({ error: 'INVALID_BIRTH_YEAR', message: '出生年份需在 1996–2010 之間' }, 400);
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
  if (!NATIONALITIES.has(nationality)) {
    return json({ error: 'INVALID_NATIONALITY', message: '國籍選項錯誤' }, 400);
  }
  if (!AUDITION_CATEGORIES.has(auditionCategory)) {
    return json({ error: 'INVALID_CATEGORY', message: '徵選項目錯誤' }, 400);
  }

  const h = parseInt(heightCm, 10);
  const w = parseInt(weightKg, 10);
  if (!Number.isInteger(h) || h < 100 || h > 230) {
    return json({ error: 'INVALID_HEIGHT', message: '身高需在 100–230 cm' }, 400);
  }
  if (!Number.isInteger(w) || w < 30 || w > 200) {
    return json({ error: 'INVALID_WEIGHT', message: '體重需在 30–200 kg' }, 400);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'INVALID_EMAIL', message: 'Email 格式錯誤' }, 400);
  }

  const phoneClean = normalizePhone(phone);
  if (!/^\d{8,15}$/.test(phoneClean)) {
    return json({ error: 'INVALID_PHONE', message: '手機格式錯誤（8-15 位數字）' }, 400);
  }

  if (!isValidUrl(worksUrl)) {
    return json({
      error: 'INVALID_WORKS_URL',
      message: '作品連結格式錯誤（請提供 YouTube / IG / TikTok / Google Drive 等 https 連結）'
    }, 400);
  }
  if (!isValidUrl(photosUrl)) {
    return json({
      error: 'INVALID_PHOTOS_URL',
      message: '照片連結格式錯誤（請提供 Google Drive / Dropbox / iCloud 等 https 連結）'
    }, 400);
  }

  if (!consent) {
    return json({ error: 'CONSENT_REQUIRED', message: '請勾選同意個資使用條款' }, 400);
  }

  // 4. Sanitize
  const safeChineseName   = String(chineseName).trim().slice(0, 40);
  const safeStageName     = String(stageName).trim().slice(0, 40);
  const safeGender        = gender;
  const safeNationality   = nationality;
  const safePhone         = phoneClean.slice(0, 20);
  const safeEmail         = String(email).trim().toLowerCase().slice(0, 80);
  const safeIgRaw         = String(igHandle).trim().replace(/^@+/, '').slice(0, 50);
  const safeIg            = safeIgRaw ? '@' + safeIgRaw : '';
  const safeCity          = String(city).trim().slice(0, 40);
  const safeCategory      = auditionCategory;
  const safeWorksUrl      = String(worksUrl).trim().slice(0, 500);
  const safePhotosUrl     = String(photosUrl).trim().slice(0, 500);
  const safeExperience    = String(experience || '').trim().slice(0, 800);
  const safeAdditional    = String(additionalInfo || '').trim().slice(0, 800);
  const safeSource        = String(source || 'mission-star-page').slice(0, 30);

  const ip = request.headers.get('CF-Connecting-IP') || '';
  const country = request.headers.get('CF-IPCountry') || '';
  const ua = request.headers.get('User-Agent') || '';

  // 5. 防刷：Email + 手機 任一命中即視為重複
  if (env.DB) {
    try {
      const dup = await env.DB.prepare(`
        SELECT id, created_at FROM mission_star_applications
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
      console.error('[mission-star] dedup check failed:', dbErr);
      // 不中斷流程 — 繼續讓它寫入（失敗由後端處理）
    }
  }

  // 6. 寫入 D1
  let appId = null;
  if (env.DB) {
    try {
      const result = await env.DB.prepare(`
        INSERT INTO mission_star_applications
          (chinese_name, stage_name, birth_year, birth_month, birth_day,
           gender, nationality, height_cm, weight_kg,
           phone, email, ig_handle, city,
           audition_category, works_url, experience, additional_info, photos_url,
           source, ip, user_agent, country)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        safeChineseName, safeStageName, by, bm, bd,
        safeGender, safeNationality, h, w,
        safePhone, safeEmail, safeIg, safeCity,
        safeCategory, safeWorksUrl, safeExperience, safeAdditional, safePhotosUrl,
        safeSource, ip.slice(0, 45), ua.slice(0, 200), country.slice(0, 2)
      ).run();
      appId = result.meta?.last_row_id || null;
    } catch (dbErr) {
      console.error('[mission-star] D1 insert failed:', dbErr);
      // 若因 UNIQUE 衝突（手動加上去的話）觸發，回報為重複
      if (String(dbErr).toLowerCase().includes('unique')) {
        return json({
          error: 'ALREADY_APPLIED',
          message: '這組 Email 或手機已經報名過。每人僅限報名一次。'
        }, 409);
      }
      // 其他錯誤：仍然嘗試寄 email，不中斷
    }
  }

  // 7. Email 準備（給前台顯示用的 label）
  const RESEND_API_KEY = env.RESEND_API_KEY;
  const MAIL_FROM      = env.MAIL_FROM || 'noreply@jdi-pulse.com';
  const MAIL_FROM_NAME = env.MAIL_FROM_NAME || 'JDI Mission Star';
  const MAIL_NOTIFY    = env.MAIL_NOTIFY || 'pulsepop9@gmail.com';

  if (!RESEND_API_KEY) {
    console.error('[mission-star] Missing RESEND_API_KEY');
    return json({
      ok: true,
      appId,
      categoryLabel: CATEGORY_LABELS[safeCategory],
      warn: 'Email service not configured yet (missing API key)'
    }, 200);
  }

  const emailData = {
    chineseName: safeChineseName,
    stageName: safeStageName,
    birthYear: by, birthMonth: bm, birthDay: bd,
    gender: safeGender,
    nationality: safeNationality,
    heightCm: h, weightKg: w,
    phone: safePhone,
    email: safeEmail,
    igHandle: safeIg,
    city: safeCity,
    auditionCategory: safeCategory,
    worksUrl: safeWorksUrl,
    experience: safeExperience,
    additionalInfo: safeAdditional,
    photosUrl: safePhotosUrl,
    source: safeSource,
    country,
    appId
  };

  const userHtml = renderMissionStarConfirmEmail(emailData);
  const userText = `${safeStageName}（${safeChineseName}）您好，

感謝您報名 Mission Star 練習生培訓計畫！

━━━━━━━━━━━━━━━━
徵選項目：${CATEGORY_LABELS[safeCategory]}
藝名 / 本名：${safeStageName} / ${safeChineseName}
生日：${by}-${String(bm).padStart(2,'0')}-${String(bd).padStart(2,'0')}
身高 / 體重：${h} cm / ${w} kg
聯絡：${safePhone} · ${safeEmail}
IG：${safeIg}
作品：${safeWorksUrl}
照片：${safePhotosUrl}
━━━━━━━━━━━━━━━━

🎬 我們將在 14 個工作天內審核回覆。若您進入下一關，星探團隊將透過 Email 聯繫面試。

有急件請聯絡：
• LINE 官方：https://line.me/R/ti/p/@354ykfbp
• Email：pulsepop9@gmail.com

★ MISSION STAR · Initiated ★
JDI 脈動傳媒 · 練習生培訓計畫
https://jdi-pulse.com/mission-star/`;

  const notifyHtml = renderMissionStarNotifyEmail(emailData);
  const notifySubject = `⭐ [Mission Star] ${CATEGORY_LABELS[safeCategory]} · ${safeStageName}（${safeChineseName}）· ${safePhone}`;

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
        subject: `⭐ 已收到您的報名 | Mission Star · ${CATEGORY_LABELS[safeCategory]}`,
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
        from: `JDI Mission Star 通知 <${MAIL_FROM}>`,
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
    console.error('[mission-star] user email failed:', errDetail);
  }
  if (!adminOk) {
    let errDetail = 'unknown';
    try {
      errDetail = adminResp.status === 'fulfilled' ? await adminResp.value.text() : String(adminResp.reason);
    } catch(_) {}
    console.error('[mission-star] admin email failed:', errDetail);
  }

  // 標記為已通知
  if (env.DB && appId && userOk) {
    try {
      await env.DB.prepare('UPDATE mission_star_applications SET notified = 1 WHERE id = ?').bind(appId).run();
    } catch(_) {}
  }

  return json({
    ok: true,
    appId,
    categoryLabel: CATEGORY_LABELS[safeCategory],
    userEmailSent: userOk,
    adminEmailSent: adminOk
  });
}
