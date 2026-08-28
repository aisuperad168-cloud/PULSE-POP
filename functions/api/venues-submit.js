/**
 * ============================================================
 * JDI 脈動傳媒 · Venues (Studio Partner) Application Endpoint
 * POST /api/venues-submit
 *
 * 對象：填寫 venues.html 「全台直播間夥伴」募集表單的屋主 / 場地業主
 *
 * Environment Variables:
 *   RESEND_API_KEY   — Resend API key (re_xxx)
 *   MAIL_FROM        — 寄件人 email
 *   MAIL_FROM_NAME   — 寄件人顯示名稱
 *   MAIL_NOTIFY      — 內部通知信箱 (pulsepop9@gmail.com)
 *
 * Bindings:
 *   DB               — D1 database (venue_applications table)
 * ============================================================
 */

import { renderVenuesConfirmEmail, renderVenuesNotifyEmail } from './_email-templates.js';

// ============ 縣市 ============
const CITIES = {
  taipei:    '台北市',
  newtaipei: '新北市',
  taoyuan:   '桃園市',
  hsinchu:   '新竹縣市',
  miaoli:    '苗栗縣',
  taichung:  '台中市',
  changhua:  '彰化縣',
  nantou:    '南投縣',
  yunlin:    '雲林縣',
  chiayi:    '嘉義縣市',
  tainan:    '台南市',
  kaohsiung: '高雄市',
  pingtung:  '屏東縣',
  yilan:     '宜蘭縣',
  hualien:   '花蓮縣',
  taitung:   '台東縣',
  penghu:    '澎湖縣',
  kinmen:    '金門縣',
  matsu:     '連江縣（馬祖）'
};

// ============ 空間大小 ============
const SPACE_SIZES = {
  under_3: '不到 3 坪',
  '3_5':   '3–5 坪',
  '5_10':  '5–10 坪',
  '10_20': '10–20 坪',
  over_20: '20 坪以上'
};

// ============ 空間類型 ============
const SPACE_TYPES = {
  home:     '一般住家 / 公寓 / 套房',
  studio:   '攝影棚 / 工作室',
  cafe:     '咖啡廳 / 餐廳',
  homestay: '民宿 / 短租空間',
  shop:     '店面 / 商業空間',
  office:   '辦公室 / 會議空間',
  other:    '其他特色空間'
};

// ============ Wi-Fi 速度 ============
const WIFI_SPEEDS = {
  under_100: '不到 100 Mbps',
  '100_300': '100–300 Mbps',
  '300_500': '300–500 Mbps',
  over_500:  '500 Mbps 以上'
};

// ============ 可用時段 ============
const TIME_SLOTS = new Set([
  'weekday_day', 'weekday_night', 'weekend_day', 'weekend_night', 'anytime'
]);
const TIME_SLOT_LABELS = {
  weekday_day:   '週間白天（09–18）',
  weekday_night: '週間晚上（18–24）',
  weekend_day:   '週末白天',
  weekend_night: '週末晚上',
  anytime:       '全時段可協商'
};

// ============ 合作模式 ============
const COOPERATION_MODES = {
  profit_share: '模式 A：綁定主播月分潤 10-20%',
  hourly_rate:  '模式 B：場地使用費 500-1,200 元 / 4hr',
  both:         '兩種都想了解'
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
    name, email, phone, lineId,
    city, district,
    spaceSize, spaceType, wifiSpeed, hasLighting,
    availableTime,
    cooperationMode,
    photosUrl, spaceFeatures, message,
    consent, source
  } = payload || {};

  // 2. Validate required fields
  if (!name || !email || !phone || !city || !spaceSize || !spaceType || !wifiSpeed || !cooperationMode) {
    return json({
      error: 'MISSING_FIELDS',
      message: '缺少必要欄位（姓名 / Email / 電話 / 縣市 / 空間大小 / 空間類型 / Wi-Fi 速度 / 合作模式）'
    }, 400);
  }

  // Email format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'INVALID_EMAIL', message: 'Email 格式錯誤' }, 400);
  }

  // Phone format
  const phoneClean = String(phone).replace(/[\s\-()]/g, '');
  if (!/^\+?\d{8,15}$/.test(phoneClean)) {
    return json({ error: 'INVALID_PHONE', message: '電話格式錯誤（請輸入 8-15 位數字）' }, 400);
  }

  // Enum checks
  if (!CITIES[city])                       return json({ error: 'INVALID_CITY',   message: '縣市不在清單內' }, 400);
  if (!SPACE_SIZES[spaceSize])             return json({ error: 'INVALID_SIZE',   message: '空間大小不在清單內' }, 400);
  if (!SPACE_TYPES[spaceType])             return json({ error: 'INVALID_TYPE',   message: '空間類型不在清單內' }, 400);
  if (!WIFI_SPEEDS[wifiSpeed])             return json({ error: 'INVALID_WIFI',   message: 'Wi-Fi 速度不在清單內' }, 400);
  if (!COOPERATION_MODES[cooperationMode]) return json({ error: 'INVALID_MODE',   message: '合作模式不在清單內' }, 400);

  // Photos URL (optional but strongly recommended) — if provided, must be valid
  if (photosUrl && !isValidUrl(photosUrl)) {
    return json({ error: 'INVALID_PHOTOS_URL', message: '場地照片連結格式錯誤（請提供 Google Drive / Photos 等雲端連結）' }, 400);
  }

  // Available time (optional)
  const safeTimeSlots = Array.isArray(availableTime)
    ? availableTime.filter(s => TIME_SLOTS.has(s))
    : [];

  if (!consent) {
    return json({ error: 'CONSENT_REQUIRED', message: '請勾選同意個資使用條款' }, 400);
  }

  // 3. Sanitize
  const safeName          = String(name).trim().slice(0, 40);
  const safeEmail         = String(email).trim().toLowerCase().slice(0, 80);
  const safePhone         = String(phone).trim().slice(0, 30);
  const safeLineId        = String(lineId || '').trim().slice(0, 40);
  const safeCity          = city;
  const safeDistrict      = String(district || '').trim().slice(0, 40);
  const safeSpaceSize     = spaceSize;
  const safeSpaceType     = spaceType;
  const safeWifiSpeed     = wifiSpeed;
  const safeHasLighting   = hasLighting ? 1 : 0;
  const safeMode          = cooperationMode;
  const safePhotosUrl     = String(photosUrl || '').trim().slice(0, 500);
  const safeSpaceFeatures = String(spaceFeatures || '').trim().slice(0, 500);
  const safeMessage       = String(message || '').trim().slice(0, 500);
  const safeSource        = String(source || 'venues-page').slice(0, 30);

  const ip = request.headers.get('CF-Connecting-IP') || '';
  const country = request.headers.get('CF-IPCountry') || '';
  const ua = request.headers.get('User-Agent') || '';

  // 4. Store to D1
  let appId = null;
  if (env.DB) {
    try {
      const result = await env.DB.prepare(`
        INSERT INTO venue_applications
          (name, email, phone, line_id,
           city, district,
           space_size, space_type, wifi_speed, has_lighting,
           available_time,
           cooperation_mode,
           photos_url, space_features, message,
           source, ip, user_agent, country)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        safeName, safeEmail, safePhone, safeLineId,
        safeCity, safeDistrict,
        safeSpaceSize, safeSpaceType, safeWifiSpeed, safeHasLighting,
        JSON.stringify(safeTimeSlots),
        safeMode,
        safePhotosUrl, safeSpaceFeatures, safeMessage,
        safeSource,
        ip.slice(0, 45),
        ua.slice(0, 200),
        country.slice(0, 2)
      ).run();
      appId = result.meta?.last_row_id || null;
    } catch (dbErr) {
      console.error('[venues] D1 insert failed:', dbErr);
    }
  }

  // 5. Send emails via Resend
  const RESEND_API_KEY = env.RESEND_API_KEY;
  const MAIL_FROM      = env.MAIL_FROM || 'noreply@jdi-pulse.com';
  const MAIL_FROM_NAME = env.MAIL_FROM_NAME || 'JDI 脈動傳媒';
  const MAIL_NOTIFY    = env.MAIL_NOTIFY || 'pulsepop9@gmail.com';

  if (!RESEND_API_KEY) {
    console.error('[venues] Missing RESEND_API_KEY');
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
    lineId: safeLineId,
    cityKey: safeCity,
    cityLabel: CITIES[safeCity],
    district: safeDistrict,
    spaceSizeLabel: SPACE_SIZES[safeSpaceSize],
    spaceTypeLabel: SPACE_TYPES[safeSpaceType],
    wifiSpeedLabel: WIFI_SPEEDS[safeWifiSpeed],
    hasLighting: !!safeHasLighting,
    availableTimeLabels: safeTimeSlots.map(s => TIME_SLOT_LABELS[s]).filter(Boolean),
    cooperationModeLabel: COOPERATION_MODES[safeMode],
    cooperationModeKey: safeMode,
    photosUrl: safePhotosUrl,
    spaceFeatures: safeSpaceFeatures,
    message: safeMessage,
    source: safeSource,
    country,
    appId
  };

  // ==== 5a. Confirmation email to owner ====
  const userHtml = renderVenuesConfirmEmail(appData);
  const userText = `你好 ${safeName}，

感謝您登記成為 JDI 脈動傳媒的直播間夥伴！我們已收到您的場地資料：

━━━━━━━━━━━━━━━━
場地地區：${appData.cityLabel}${safeDistrict ? ' ' + safeDistrict : ''}
空間大小：${appData.spaceSizeLabel}
空間類型：${appData.spaceTypeLabel}
Wi-Fi 速度：${appData.wifiSpeedLabel}
基本補光：${appData.hasLighting ? '有' : '無'}
合作模式：${appData.cooperationModeLabel}
${appData.availableTimeLabels.length ? '可用時段：' + appData.availableTimeLabels.join('、') + '\n' : ''}${safePhotosUrl ? '場地照片：' + safePhotosUrl + '\n' : ''}━━━━━━━━━━━━━━━━

📞 我們的場地媒合團隊會在 3 個工作天內主動聯繫您，安排線上初談或現場場勘。

若有急件，歡迎直接聯絡：
• LINE 官方：https://line.me/R/ti/p/@354ykfbp
• 電話：04-3603-3191

JDI 脈動傳媒 JDI Pulse MEDIA
TikTok LIVE 官方合作經紀公會 · 全台直播間夥伴計畫
https://jdi-pulse.com/`;

  // ==== 5b. Notify email to admin ====
  const notifyHtml = renderVenuesNotifyEmail(appData);
  const notifySubject = `🏠 [JDI 場地] ${appData.cityLabel}${safeDistrict ? ' ' + safeDistrict : ''} · ${appData.spaceSizeLabel} · ${safeName} · ${safePhone}`;

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
        subject: `✅ 已收到您的場地登記 | JDI 脈動傳媒 · 全台直播間夥伴`,
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
        from: `JDI 場地媒合 <${MAIL_FROM}>`,
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
    console.error('[venues] user email failed:', errDetail);
  }
  if (!adminOk) {
    let errDetail = 'unknown';
    try {
      errDetail = adminResp.status === 'fulfilled'
        ? await adminResp.value.text()
        : String(adminResp.reason);
    } catch(_) {}
    console.error('[venues] admin email failed:', errDetail);
  }

  // Mark notified in D1
  if (env.DB && appId && userOk) {
    try {
      await env.DB.prepare('UPDATE venue_applications SET notified = 1 WHERE id = ?').bind(appId).run();
    } catch(_) {}
  }

  return json({
    ok: true,
    appId,
    userEmailSent: userOk,
    adminEmailSent: adminOk
  });
}
