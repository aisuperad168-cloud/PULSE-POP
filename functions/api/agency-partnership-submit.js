/**
 * ============================================================
 * JDI 脈動傳媒 · 藝人／經紀公司合作方案 Submit Endpoint (B2B)
 * POST /api/agency-partnership-submit
 *
 * 身份別：經紀公司 / 工作室 / 藝人本人
 * 權益：月扶持影片 5 隻、週直播間加熱 2 次、藝人保底可談
 * 面向平台：大陸抖音 & TikTok
 * 防刷：Email + 手機 + 統編 任一命中既有紀錄即拒
 * ============================================================
 */

import {
  renderAgencyConfirmEmail,
  renderAgencyNotifyEmail
} from './_email-templates.js';

// ============ 允許值白名單 ============
const ENTITY_TYPES  = new Set(['agency', 'studio', 'artist']);
const ARTIST_TYPES  = new Set(['singer', 'actor', 'influencer', 'dancer', 'rapper', 'host', 'other']);
const PLATFORMS     = new Set(['tiktok', 'douyin', 'ig', 'yt', 'threads', 'xhs', 'other']);
const COUNT_BUCKETS = new Set(['1', '2_5', '6_10', '11_20', '20_plus']);
const COOP_AREAS    = new Set(['traffic', 'livestream', 'guarantee', 'revenue', 'cn_expansion']);
const BUDGET_RANGES = new Set(['under_3', '3_5', '5_10', '10_30', '30_plus', 'negotiable']);

const MAX_FOLLOWERS = 100000000; // 1 億

// ============ 工具 ============
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

function normalizeTaxId(t) {
  return String(t || '').replace(/[^0-9]/g, '');
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
    entityType,
    contactName, contactTitle,
    companyName, taxId, website,
    phone, email, lineId,
    artistCount, artistTypes, platforms,
    artist1Name, artist1Url, artist1Followers,
    artist2Name, artist2Url, artist2Followers,
    artist3Name, artist3Url, artist3Followers,
    cooperationAreas, coopArtistCount, guaranteeBudget,
    additionalInfo,
    consent, source,
    // honeypot
    website_hp
  } = payload || {};

  // 蜜罐命中 → 假 OK 不入庫
  if (website_hp && String(website_hp).trim() !== '') {
    return json({ ok: true, appId: null, bot: true });
  }

  // 2. 身份別
  if (!ENTITY_TYPES.has(entityType)) {
    return json({ error: 'INVALID_ENTITY_TYPE', message: '身份別錯誤' }, 400);
  }

  // 3. 必填欄位（依身份別調整：藝人本人 tax_id 選填）
  const baseRequired = {
    contactName, contactTitle,
    companyName, website,
    phone, email, lineId,
    artistCount, artistTypes, platforms,
    artist1Name, artist1Url, artist1Followers,
    cooperationAreas, coopArtistCount
  };
  for (const [k, v] of Object.entries(baseRequired)) {
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

  // 經紀公司 / 工作室 → 統編必填且需 8 碼
  const taxIdClean = normalizeTaxId(taxId);
  if (entityType === 'agency' || entityType === 'studio') {
    if (!taxIdClean) {
      return json({ error: 'MISSING_TAX_ID', message: '經紀公司／工作室請填寫統一編號' }, 400);
    }
    if (!/^\d{8}$/.test(taxIdClean)) {
      return json({ error: 'INVALID_TAX_ID', message: '統一編號需為 8 位數字' }, 400);
    }
  }

  // 4. 格式驗證
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'INVALID_EMAIL', message: 'Email 格式錯誤' }, 400);
  }

  const phoneClean = normalizePhone(phone);
  if (!/^\d{8,15}$/.test(phoneClean)) {
    return json({ error: 'INVALID_PHONE', message: '手機格式錯誤（8-15 位數字）' }, 400);
  }

  if (!isValidUrl(website)) {
    return json({
      error: 'INVALID_WEBSITE',
      message: '公司／個人官網格式錯誤（請提供 https:// 開頭的完整網址）'
    }, 400);
  }

  // 代表藝人 URL 檢查
  if (!isValidUrl(artist1Url)) {
    return json({ error: 'INVALID_ARTIST1_URL', message: '代表藝人 1 的主要社群連結格式錯誤' }, 400);
  }
  const a1Followers = parseInt(artist1Followers, 10);
  if (!Number.isInteger(a1Followers) || a1Followers < 0 || a1Followers > MAX_FOLLOWERS) {
    return json({ error: 'INVALID_ARTIST1_FOLLOWERS', message: '代表藝人 1 粉絲數格式錯誤' }, 400);
  }

  // 代表藝人 2、3 選填：若有名字就要有 URL + 粉絲數
  let a2Followers = null, a3Followers = null;
  const hasArtist2 = !!(artist2Name && String(artist2Name).trim());
  const hasArtist3 = !!(artist3Name && String(artist3Name).trim());
  if (hasArtist2) {
    if (!isValidUrl(artist2Url)) {
      return json({ error: 'INVALID_ARTIST2_URL', message: '代表藝人 2 的主要社群連結格式錯誤' }, 400);
    }
    a2Followers = parseInt(artist2Followers, 10);
    if (!Number.isInteger(a2Followers) || a2Followers < 0 || a2Followers > MAX_FOLLOWERS) {
      return json({ error: 'INVALID_ARTIST2_FOLLOWERS', message: '代表藝人 2 粉絲數格式錯誤' }, 400);
    }
  }
  if (hasArtist3) {
    if (!isValidUrl(artist3Url)) {
      return json({ error: 'INVALID_ARTIST3_URL', message: '代表藝人 3 的主要社群連結格式錯誤' }, 400);
    }
    a3Followers = parseInt(artist3Followers, 10);
    if (!Number.isInteger(a3Followers) || a3Followers < 0 || a3Followers > MAX_FOLLOWERS) {
      return json({ error: 'INVALID_ARTIST3_FOLLOWERS', message: '代表藝人 3 粉絲數格式錯誤' }, 400);
    }
  }

  // 旗下規模桶
  if (!COUNT_BUCKETS.has(artistCount)) {
    return json({ error: 'INVALID_ARTIST_COUNT', message: '旗下藝人數量選項錯誤' }, 400);
  }
  if (!COUNT_BUCKETS.has(coopArtistCount)) {
    return json({ error: 'INVALID_COOP_COUNT', message: '預計合作藝人數量選項錯誤' }, 400);
  }

  // 類型 / 平台 / 合作意向
  const safeArtistTypes = Array.isArray(artistTypes)
    ? artistTypes.filter(t => ARTIST_TYPES.has(t))
    : [];
  if (!safeArtistTypes.length) {
    return json({ error: 'INVALID_ARTIST_TYPES', message: '請至少選一個藝人類型' }, 400);
  }

  const safePlatforms = Array.isArray(platforms)
    ? platforms.filter(p => PLATFORMS.has(p))
    : [];
  if (!safePlatforms.length) {
    return json({ error: 'INVALID_PLATFORMS', message: '請至少選一個經營平台' }, 400);
  }

  const safeCoopAreas = Array.isArray(cooperationAreas)
    ? cooperationAreas.filter(c => COOP_AREAS.has(c))
    : [];
  if (!safeCoopAreas.length) {
    return json({ error: 'INVALID_COOP_AREAS', message: '請至少選一個合作意向' }, 400);
  }

  // 預算（選填）
  const safeBudget = (guaranteeBudget && BUDGET_RANGES.has(guaranteeBudget)) ? guaranteeBudget : null;

  if (!consent) {
    return json({ error: 'CONSENT_REQUIRED', message: '請勾選同意個資使用條款' }, 400);
  }

  // 5. Sanitize
  const safeContactName  = String(contactName).trim().slice(0, 40);
  const safeContactTitle = String(contactTitle).trim().slice(0, 40);
  const safeCompanyName  = String(companyName).trim().slice(0, 80);
  const safeTaxId        = taxIdClean ? taxIdClean.slice(0, 20) : null;
  const safeWebsite      = String(website).trim().slice(0, 500);
  const safePhone        = phoneClean.slice(0, 20);
  const safeEmail        = String(email).trim().toLowerCase().slice(0, 80);
  const safeLineIdRaw    = String(lineId).trim().replace(/^@+/, '').slice(0, 50);
  const safeLineId       = safeLineIdRaw ? '@' + safeLineIdRaw : '';

  const safeA1Name = String(artist1Name).trim().slice(0, 60);
  const safeA1Url  = String(artist1Url).trim().slice(0, 500);
  const safeA2Name = hasArtist2 ? String(artist2Name).trim().slice(0, 60) : null;
  const safeA2Url  = hasArtist2 ? String(artist2Url).trim().slice(0, 500) : null;
  const safeA3Name = hasArtist3 ? String(artist3Name).trim().slice(0, 60) : null;
  const safeA3Url  = hasArtist3 ? String(artist3Url).trim().slice(0, 500) : null;

  const safeAdditional = String(additionalInfo || '').trim().slice(0, 1000);
  const safeSource     = String(source || 'agency-partnership-page').slice(0, 40);

  const ip = request.headers.get('CF-Connecting-IP') || '';
  const country = request.headers.get('CF-IPCountry') || '';
  const ua = request.headers.get('User-Agent') || '';

  // 6. 防刷：Email + 手機 + 統編 任一命中即視為重複
  if (env.DB) {
    try {
      // 動態組 WHERE：有 tax_id 才查 tax_id
      let dupSql = 'SELECT id, created_at, entity_type FROM agency_applications WHERE email = ? OR phone = ?';
      const binds = [safeEmail, safePhone];
      if (safeTaxId) {
        dupSql += ' OR tax_id = ?';
        binds.push(safeTaxId);
      }
      dupSql += ' LIMIT 1';

      const dup = await env.DB.prepare(dupSql).bind(...binds).first();
      if (dup) {
        return json({
          error: 'ALREADY_APPLIED',
          message: '這組 Email／手機／統編 已經有申請紀錄囉！每一個單位僅限申請一次。若需更新資料或追加藝人，請透過 LINE 聯絡我們：@354ykfbp',
          existingId: dup.id,
          existingAt: dup.created_at
        }, 409);
      }
    } catch (dbErr) {
      console.error('[agency] dedup check failed:', dbErr);
    }
  }

  // 7. 寫入 D1
  let appId = null;
  if (env.DB) {
    try {
      const result = await env.DB.prepare(`
        INSERT INTO agency_applications
          (entity_type,
           contact_name, contact_title,
           company_name, tax_id, website,
           phone, email, line_id,
           artist_count, artist_types, platforms,
           artist1_name, artist1_url, artist1_followers,
           artist2_name, artist2_url, artist2_followers,
           artist3_name, artist3_url, artist3_followers,
           cooperation_areas, coop_artist_count, guarantee_budget,
           additional_info,
           source, ip, user_agent, country)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        entityType,
        safeContactName, safeContactTitle,
        safeCompanyName, safeTaxId, safeWebsite,
        safePhone, safeEmail, safeLineId,
        artistCount, JSON.stringify(safeArtistTypes), JSON.stringify(safePlatforms),
        safeA1Name, safeA1Url, a1Followers,
        safeA2Name, safeA2Url, a2Followers,
        safeA3Name, safeA3Url, a3Followers,
        JSON.stringify(safeCoopAreas), coopArtistCount, safeBudget,
        safeAdditional,
        safeSource, ip.slice(0, 45), ua.slice(0, 200), country.slice(0, 2)
      ).run();
      appId = result.meta?.last_row_id || null;
    } catch (dbErr) {
      console.error('[agency] D1 insert failed:', dbErr);
      if (String(dbErr).toLowerCase().includes('unique')) {
        return json({
          error: 'ALREADY_APPLIED',
          message: '這組 Email／手機／統編 已經有申請紀錄。每一個單位僅限申請一次。'
        }, 409);
      }
    }
  }

  // 8. Email 準備
  const RESEND_API_KEY = env.RESEND_API_KEY;
  const MAIL_FROM      = env.MAIL_FROM || 'noreply@jdi-pulse.com';
  const MAIL_FROM_NAME = env.MAIL_FROM_NAME || 'JDI 藝人／經紀合作方案';
  const MAIL_NOTIFY    = env.MAIL_NOTIFY || 'pulsepop9@gmail.com';

  if (!RESEND_API_KEY) {
    console.error('[agency] Missing RESEND_API_KEY');
    return json({
      ok: true,
      appId,
      warn: 'Email service not configured yet'
    }, 200);
  }

  const emailData = {
    entityType,
    contactName: safeContactName,
    contactTitle: safeContactTitle,
    companyName: safeCompanyName,
    taxId: safeTaxId,
    website: safeWebsite,
    phone: safePhone,
    email: safeEmail,
    lineId: safeLineId,
    artistCount,
    artistTypes: safeArtistTypes,
    platforms: safePlatforms,
    artist1: { name: safeA1Name, url: safeA1Url, followers: a1Followers },
    artist2: hasArtist2 ? { name: safeA2Name, url: safeA2Url, followers: a2Followers } : null,
    artist3: hasArtist3 ? { name: safeA3Name, url: safeA3Url, followers: a3Followers } : null,
    cooperationAreas: safeCoopAreas,
    coopArtistCount,
    guaranteeBudget: safeBudget,
    additionalInfo: safeAdditional,
    source: safeSource,
    country,
    appId
  };

  const entityLabelMap = { agency: '🏢 經紀公司', studio: '🎬 工作室', artist: '⭐ 藝人本人' };
  const entityLabel = entityLabelMap[entityType] || entityType;

  const userHtml = renderAgencyConfirmEmail(emailData);
  const userText = `${safeContactName}（${safeCompanyName}）您好，

感謝您申請 JDI 2026 藝人／經紀公司合作方案！

━━━━━━━━━━━━━━━━
身份別：${entityLabel}
公司／藝名：${safeCompanyName}
聯絡人：${safeContactName}（${safeContactTitle}）
官網：${safeWebsite}
代表藝人：${safeA1Name}（${a1Followers.toLocaleString()} 粉）
LINE：${safeLineId}
━━━━━━━━━━━━━━━━

🎯 合作權益：
• 月扶持影片 5 隻
• 週直播間加熱 2 次
• 藝人保底可談（詳情面談）
• 面向直播平台：大陸抖音 & TikTok

💬 專人將於 3 個工作天內聯繫，如需加速審核請主動加 LINE。
📧 商務對接 Email：pulsepop9@gmail.com
💬 LINE 官方：https://line.me/R/ti/p/@354ykfbp

★ 2026 ARTIST / AGENCY PARTNERSHIP ★
JDI 脈動傳媒 · https://jdi-pulse.com/agency-partnership/`;

  const notifyHtml = renderAgencyNotifyEmail(emailData);
  const notifySubject = `🏢 [藝人/經紀] ${entityLabel} · ${safeCompanyName} · ${safeContactName} · ${safePhone}`;

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
        subject: `✅ 已收到您的合作申請 | JDI 藝人／經紀合作 · ${safeCompanyName}`,
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
        from: `JDI 藝人經紀合作通知 <${MAIL_FROM}>`,
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
    console.error('[agency] user email failed:', errDetail);
  }
  if (!adminOk) {
    let errDetail = 'unknown';
    try {
      errDetail = adminResp.status === 'fulfilled' ? await adminResp.value.text() : String(adminResp.reason);
    } catch(_) {}
    console.error('[agency] admin email failed:', errDetail);
  }

  if (env.DB && appId && userOk) {
    try {
      await env.DB.prepare('UPDATE agency_applications SET notified = 1 WHERE id = ?').bind(appId).run();
    } catch(_) {}
  }

  return json({
    ok: true,
    appId,
    entityType,
    userEmailSent: userOk,
    adminEmailSent: adminOk
  });
}
