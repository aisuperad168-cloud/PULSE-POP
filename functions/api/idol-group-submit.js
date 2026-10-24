/**
 * ============================================================
 * JDI 脈動傳媒 · 脈動直播男女團徵選 Submit Endpoint
 * POST /api/idol-group-submit
 *
 * 從台灣出發，走向國際舞台
 * 徵選規則：18-35 歲、男女生皆可、直接組團出道
 * 防刷：Email + 手機 任一命中既有紀錄即拒
 * ============================================================
 */

import {
  renderIdolConfirmEmail,
  renderIdolNotifyEmail
} from './_email-templates.js';

// ============ 允許值白名單 ============
const GENDERS         = new Set(['male', 'female', 'other']);
const TALENTS         = new Set(['dance', 'vocal', 'host', 'acting', 'instrument', 'rap', 'other']);
const TRAINING_YEARS  = new Set(['none', 'under_1', '1_3', '3_5', '5_plus']);
const AVAILABILITIES  = new Set(['fulltime', 'parttime']);
const PREFERRED       = new Set(['boy', 'girl', 'mixed', 'any']);

// 年齡硬門檻
const MIN_AGE = 18;
const MAX_AGE = 35;

// 身高體重合理範圍
const MIN_HEIGHT = 140, MAX_HEIGHT = 220;
const MIN_WEIGHT = 35,  MAX_WEIGHT = 150;

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
    gender,
    birthYear, birthMonth, birthDay,
    heightCm, weightKg,
    city,
    phone, email, lineId,
    mainTalents, subTalents,
    trainingYears, formalTraining, trainingDetail,
    work1Url, work2Url, work3Url,
    photo1Url, photo2Url, photo3Url,
    appearanceNote,
    availability, intensiveOk, internationalOk, preferredGroup,
    additionalInfo,
    consent, source,
    // honeypot
    website_hp
  } = payload || {};

  // 蜜罐命中 → 假 OK 不入庫
  if (website_hp && String(website_hp).trim() !== '') {
    return json({ ok: true, appId: null, bot: true });
  }

  // 2. 必填欄位
  const required = {
    realName, stageName,
    gender,
    birthYear, birthMonth, birthDay,
    heightCm, weightKg,
    city,
    phone, email, lineId,
    mainTalents, trainingYears,
    work1Url, photo1Url,
    availability, preferredGroup
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

  // 3. 格式驗證：生日 + 年齡 18-35
  const by = parseInt(birthYear, 10);
  const bm = parseInt(birthMonth, 10);
  const bd = parseInt(birthDay, 10);
  const currentYear = new Date().getFullYear();
  if (!Number.isInteger(by) || by < 1950 || by > currentYear) {
    return json({ error: 'INVALID_BIRTH_YEAR', message: '出生年份錯誤' }, 400);
  }
  if (!Number.isInteger(bm) || bm < 1 || bm > 12) {
    return json({ error: 'INVALID_BIRTH_MONTH', message: '出生月份錯誤' }, 400);
  }
  if (!Number.isInteger(bd) || bd < 1 || bd > 31) {
    return json({ error: 'INVALID_BIRTH_DAY', message: '出生日錯誤' }, 400);
  }
  const age = currentYear - by;
  if (age < MIN_AGE || age > MAX_AGE) {
    return json({
      error: 'AGE_OUT_OF_RANGE',
      message: `徵選年齡為 ${MIN_AGE} - ${MAX_AGE} 歲（您目前 ${age} 歲）`
    }, 400);
  }

  if (!GENDERS.has(gender)) {
    return json({ error: 'INVALID_GENDER', message: '性別選項錯誤' }, 400);
  }

  const h = parseInt(heightCm, 10);
  const w = parseInt(weightKg, 10);
  if (!Number.isInteger(h) || h < MIN_HEIGHT || h > MAX_HEIGHT) {
    return json({ error: 'INVALID_HEIGHT', message: `身高需介於 ${MIN_HEIGHT}-${MAX_HEIGHT} cm` }, 400);
  }
  if (!Number.isInteger(w) || w < MIN_WEIGHT || w > MAX_WEIGHT) {
    return json({ error: 'INVALID_WEIGHT', message: `體重需介於 ${MIN_WEIGHT}-${MAX_WEIGHT} kg` }, 400);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'INVALID_EMAIL', message: 'Email 格式錯誤' }, 400);
  }

  const phoneClean = normalizePhone(phone);
  if (!/^\d{8,15}$/.test(phoneClean)) {
    return json({ error: 'INVALID_PHONE', message: '手機格式錯誤（8-15 位數字）' }, 400);
  }

  // Talents 白名單
  const safeTalents = Array.isArray(mainTalents)
    ? mainTalents.filter(t => TALENTS.has(t))
    : [];
  if (!safeTalents.length) {
    return json({ error: 'INVALID_TALENTS', message: '請至少選一個主修專長' }, 400);
  }

  if (!TRAINING_YEARS.has(trainingYears)) {
    return json({ error: 'INVALID_TRAINING_YEARS', message: '訓練年資選項錯誤' }, 400);
  }

  if (!AVAILABILITIES.has(availability)) {
    return json({ error: 'INVALID_AVAILABILITY', message: '投入度選項錯誤' }, 400);
  }

  if (!PREFERRED.has(preferredGroup)) {
    return json({ error: 'INVALID_PREFERRED', message: '性別團偏好選項錯誤' }, 400);
  }

  // 作品 1 必填 + URL 格式
  if (!isValidUrl(work1Url)) {
    return json({
      error: 'INVALID_WORK1_URL',
      message: '代表作 1 連結格式錯誤（請提供 https:// 開頭的完整網址）'
    }, 400);
  }
  if (work2Url && !isValidUrl(work2Url)) {
    return json({ error: 'INVALID_WORK2_URL', message: '代表作 2 連結格式錯誤' }, 400);
  }
  if (work3Url && !isValidUrl(work3Url)) {
    return json({ error: 'INVALID_WORK3_URL', message: '代表作 3 連結格式錯誤' }, 400);
  }

  // 照片 1 必填 + URL 格式
  if (!isValidUrl(photo1Url)) {
    return json({
      error: 'INVALID_PHOTO1_URL',
      message: '照片 1 連結格式錯誤（請提供 https:// 開頭的完整網址，可用 Google Drive、Dropbox、IG 相簿）'
    }, 400);
  }
  if (photo2Url && !isValidUrl(photo2Url)) {
    return json({ error: 'INVALID_PHOTO2_URL', message: '照片 2 連結格式錯誤' }, 400);
  }
  if (photo3Url && !isValidUrl(photo3Url)) {
    return json({ error: 'INVALID_PHOTO3_URL', message: '照片 3 連結格式錯誤' }, 400);
  }

  if (!consent) {
    return json({ error: 'CONSENT_REQUIRED', message: '請勾選同意個資使用條款' }, 400);
  }

  // 4. Sanitize
  const safeRealName    = String(realName).trim().slice(0, 40);
  const safeStageName   = String(stageName).trim().slice(0, 40);
  const safeCity        = String(city).trim().slice(0, 40);
  const safePhone       = phoneClean.slice(0, 20);
  const safeEmail       = String(email).trim().toLowerCase().slice(0, 80);
  const safeLineIdRaw   = String(lineId).trim().replace(/^@+/, '').slice(0, 50);
  const safeLineId      = safeLineIdRaw ? '@' + safeLineIdRaw : '';
  const safeSubTalents  = String(subTalents || '').trim().slice(0, 200);
  const safeTrainingDet = String(trainingDetail || '').trim().slice(0, 200);
  const safeAppearance  = String(appearanceNote || '').trim().slice(0, 500);
  const safeAdditional  = String(additionalInfo || '').trim().slice(0, 1000);
  const safeSource      = String(source || 'idol-group-page').slice(0, 40);

  const safeWork1  = String(work1Url).trim().slice(0, 500);
  const safeWork2  = work2Url ? String(work2Url).trim().slice(0, 500) : null;
  const safeWork3  = work3Url ? String(work3Url).trim().slice(0, 500) : null;
  const safePhoto1 = String(photo1Url).trim().slice(0, 500);
  const safePhoto2 = photo2Url ? String(photo2Url).trim().slice(0, 500) : null;
  const safePhoto3 = photo3Url ? String(photo3Url).trim().slice(0, 500) : null;

  const formalTrainingBit = formalTraining ? 1 : 0;
  const intensiveBit      = intensiveOk ? 1 : 0;
  const internationalBit  = internationalOk ? 1 : 0;

  const ip = request.headers.get('CF-Connecting-IP') || '';
  const country = request.headers.get('CF-IPCountry') || '';
  const ua = request.headers.get('User-Agent') || '';

  // 5. 防刷：Email + 手機 任一命中即視為重複
  if (env.DB) {
    try {
      const dup = await env.DB.prepare(`
        SELECT id, created_at FROM idol_group_applications
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
      console.error('[idol] dedup check failed:', dbErr);
    }
  }

  // 6. 寫入 D1
  let appId = null;
  if (env.DB) {
    try {
      const result = await env.DB.prepare(`
        INSERT INTO idol_group_applications
          (real_name, stage_name, gender,
           birth_year, birth_month, birth_day,
           height_cm, weight_kg, city,
           phone, email, line_id,
           main_talents, sub_talents, training_years, formal_training, training_detail,
           work1_url, work2_url, work3_url,
           photo1_url, photo2_url, photo3_url,
           appearance_note,
           availability, intensive_ok, international_ok, preferred_group,
           additional_info,
           source, ip, user_agent, country)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        safeRealName, safeStageName, gender,
        by, bm, bd,
        h, w, safeCity,
        safePhone, safeEmail, safeLineId,
        JSON.stringify(safeTalents), safeSubTalents, trainingYears, formalTrainingBit, safeTrainingDet,
        safeWork1, safeWork2, safeWork3,
        safePhoto1, safePhoto2, safePhoto3,
        safeAppearance,
        availability, intensiveBit, internationalBit, preferredGroup,
        safeAdditional,
        safeSource, ip.slice(0, 45), ua.slice(0, 200), country.slice(0, 2)
      ).run();
      appId = result.meta?.last_row_id || null;
    } catch (dbErr) {
      console.error('[idol] D1 insert failed:', dbErr);
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
  const MAIL_FROM_NAME = env.MAIL_FROM_NAME || 'JDI 脈動直播男女團';
  const MAIL_NOTIFY    = env.MAIL_NOTIFY || 'pulsepop9@gmail.com';

  if (!RESEND_API_KEY) {
    console.error('[idol] Missing RESEND_API_KEY');
    return json({ ok: true, appId, warn: 'Email service not configured yet' }, 200);
  }

  const emailData = {
    realName: safeRealName, stageName: safeStageName,
    gender,
    birthYear: by, birthMonth: bm, birthDay: bd,
    heightCm: h, weightKg: w,
    city: safeCity,
    phone: safePhone, email: safeEmail, lineId: safeLineId,
    mainTalents: safeTalents, subTalents: safeSubTalents,
    trainingYears, formalTraining: formalTrainingBit, trainingDetail: safeTrainingDet,
    work1Url: safeWork1, work2Url: safeWork2, work3Url: safeWork3,
    photo1Url: safePhoto1, photo2Url: safePhoto2, photo3Url: safePhoto3,
    appearanceNote: safeAppearance,
    availability, intensiveOk: intensiveBit, internationalOk: internationalBit, preferredGroup,
    additionalInfo: safeAdditional,
    source: safeSource, country, appId
  };

  const userHtml = renderIdolConfirmEmail(emailData);
  const userText = `${safeStageName}（${safeRealName}）您好，

感謝您報名 JDI 脈動直播男女團徵選！

━━━━━━━━━━━━━━━━
性別：${gender} · ${age} 歲
身高體重：${h} cm / ${w} kg
主修專長：${safeTalents.join('、')}
加入意願：${availability} · 偏好：${preferredGroup}
LINE：${safeLineId}
━━━━━━━━━━━━━━━━

🎯 審核辦法：
• 5 個工作天內完成書審
• 通過者將邀請線下面試
• 面試通過進入培訓期

想加速審核？歡迎直接加 LINE 傳送更多作品影片
• LINE 官方：https://line.me/R/ti/p/@354ykfbp
• Email：pulsepop9@gmail.com

★ PULSE IDOL GROUP · AUDITION ★
JDI 脈動傳媒 · https://jdi-pulse.com/idol-group/`;

  const notifyHtml = renderIdolNotifyEmail(emailData);
  const genderEmoji = gender === 'male' ? '👦' : gender === 'female' ? '👧' : '🌈';
  const notifySubject = `🎤 [男女團] ${genderEmoji}${age}歲 · ${safeStageName}（${safeRealName}）· ${safePhone}`;

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
        subject: `✨ 已收到您的申請 | JDI 脈動直播男女團徵選 · ${safeStageName}`,
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
        from: `JDI 男女團徵選通知 <${MAIL_FROM}>`,
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
    console.error('[idol] user email failed:', errDetail);
  }
  if (!adminOk) {
    let errDetail = 'unknown';
    try {
      errDetail = adminResp.status === 'fulfilled' ? await adminResp.value.text() : String(adminResp.reason);
    } catch(_) {}
    console.error('[idol] admin email failed:', errDetail);
  }

  if (env.DB && appId && userOk) {
    try {
      await env.DB.prepare('UPDATE idol_group_applications SET notified = 1 WHERE id = ?').bind(appId).run();
    } catch(_) {}
  }

  return json({
    ok: true,
    appId,
    age,
    userEmailSent: userOk,
    adminEmailSent: adminOk
  });
}
