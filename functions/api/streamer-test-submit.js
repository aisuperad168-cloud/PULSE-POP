/**
 * ============================================================
 * JDI 脈動傳媒 · Streamer Test Submission Endpoint
 * POST /api/streamer-test-submit
 *
 * Environment Variables:
 *   RESEND_API_KEY   — Resend API key
 *   MAIL_FROM        — 寄件人 email (noreply@jdi-pulse.com)
 *   MAIL_FROM_NAME   — 寄件人顯示名稱 (JDI 脈動傳媒)
 *   MAIL_NOTIFY      — 內部通知信箱
 *
 * Bindings:
 *   DB               — D1 database (streamer_test_leads table)
 *
 * Request payload:
 *   {
 *     name, email, lineId, consent,
 *     gender, age, region, experience,
 *     answers: { "1": 5, "2": 3, ..., "60": 4 },
 *     lieAnswers: { "L1": 2, "L2": 3, "L3": 2 },  // optional
 *     source
 *   }
 *
 * 安全策略：
 *   前端傳答案，後端「自己重算」結果 → 避免被竄改
 * ============================================================
 */

import { buildResult } from './_streamer-test-core.js';
import {
  renderStreamerReportEmail,
  renderStreamerReportText,
  renderStreamerNotifyEmail,
  getCTAByProfile,
} from './_streamer-test-email.js';

// ============ CORS ============
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS },
  });
}

// ============ Constants ============
const ALLOWED_GENDERS = ['男', '女', '其他', '不方便透露'];
const ALLOWED_AGES = ['18-24', '25-29', '30-34', '35+'];
const ALLOWED_REGIONS = ['北北基', '桃竹苗', '中彰投', '雲嘉南', '高屏', '宜花東', '離島', '海外'];
const ALLOWED_EXPERIENCES = ['new', 'experienced', 'current'];
const EXPERIENCE_LABELS = {
  new: '新手 / 從未做過',
  experienced: '曾經做過',
  current: '目前正在做',
};

// ============ Handlers ============
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
    name, email, lineId, consent,
    gender, age, region, experience,
    answers, lieAnswers, source,
  } = payload || {};

  // 2. Validate 個資
  if (!name || !email || !lineId) {
    return json({ error: 'MISSING_FIELDS', message: '缺少姓名 / Email / LINE ID' }, 400);
  }
  if (consent !== true) {
    return json({ error: 'CONSENT_REQUIRED', message: '請勾選隱私同意' }, 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'INVALID_EMAIL', message: 'Email 格式錯誤' }, 400);
  }
  // demographics（選填但若給了要合法）
  if (gender && !ALLOWED_GENDERS.includes(gender)) {
    return json({ error: 'INVALID_GENDER', message: '性別欄位不合法' }, 400);
  }
  if (age && !ALLOWED_AGES.includes(age)) {
    return json({ error: 'INVALID_AGE', message: '年齡區間不合法' }, 400);
  }
  if (region && !ALLOWED_REGIONS.includes(region)) {
    return json({ error: 'INVALID_REGION', message: '地區不合法' }, 400);
  }
  if (experience && !ALLOWED_EXPERIENCES.includes(experience)) {
    return json({ error: 'INVALID_EXPERIENCE', message: '主播經驗欄位不合法' }, 400);
  }

  // 3. Validate answers + 後端重算結果
  if (!answers || typeof answers !== 'object') {
    return json({ error: 'MISSING_ANSWERS', message: '缺少答題資料' }, 400);
  }

  let result;
  try {
    result = buildResult(answers, lieAnswers || null, { requireAll: true });
  } catch (err) {
    return json({
      error: 'INVALID_ANSWERS',
      message: '答題資料不完整或有誤',
      detail: err.message,
    }, 400);
  }

  // 4. Sanitize
  const safeName       = String(name).trim().slice(0, 30);
  const safeEmail      = String(email).trim().toLowerCase().slice(0, 80);
  const safeLineId     = String(lineId).trim().slice(0, 40);
  const safeGender     = gender ? String(gender).slice(0, 10) : null;
  const safeAge        = age ? String(age).slice(0, 10) : null;
  const safeRegion     = region ? String(region).slice(0, 10) : null;
  const safeExperience = experience ? String(experience).slice(0, 20) : null;
  const experienceLabel = safeExperience ? (EXPERIENCE_LABELS[safeExperience] || safeExperience) : null;

  const ip = request.headers.get('CF-Connecting-IP') || '';
  const country = request.headers.get('CF-IPCountry') || '';
  const ua = request.headers.get('User-Agent') || '';

  // 5. Store to D1
  let leadId = null;
  if (env.DB) {
    try {
      const dbResult = await env.DB.prepare(`
        INSERT INTO streamer_test_leads (
          name, email, line_id, gender, age, region, experience, consent,
          total_score, tier_key, tier_label, profile_key, profile_name,
          score_camera, score_audience, score_emotional,
          score_self_disc, score_creativity, score_boundary,
          risk_count, risk_flags, lie_triggered, lie_avg,
          answers, lie_answers, full_result,
          source, ip, user_agent, country
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?
        )
      `).bind(
        safeName, safeEmail, safeLineId,
        safeGender, safeAge, safeRegion, safeExperience,
        1, // consent
        result.totalScore,
        result.tier.key, result.tier.label,
        result.profile.key, result.profile.name,
        modulePercent(result, 'camera_expression'),
        modulePercent(result, 'audience_interaction'),
        modulePercent(result, 'emotional_regulation'),
        modulePercent(result, 'self_discipline'),
        modulePercent(result, 'content_creativity'),
        modulePercent(result, 'boundary_control'),
        result.riskFlags.length,
        JSON.stringify(result.riskFlags.map(f => f.key)),
        result.lieCheck && result.lieCheck.triggered ? 1 : 0,
        result.lieCheck ? result.lieCheck.avg : null,
        JSON.stringify(answers),
        JSON.stringify(lieAnswers || null),
        JSON.stringify(result),
        String(source || 'streamer-test-page').slice(0, 30),
        ip.slice(0, 45),
        ua.slice(0, 200),
        country.slice(0, 2),
      ).run();
      leadId = dbResult.meta?.last_row_id || null;
    } catch (dbErr) {
      console.error('[streamer-test] D1 insert failed:', dbErr);
      // 不阻斷後續寄信
    }
  }

  // 6. Send emails via Resend
  const RESEND_API_KEY = env.RESEND_API_KEY;
  const MAIL_FROM      = env.MAIL_FROM || 'onboarding@resend.dev';
  const MAIL_FROM_NAME = env.MAIL_FROM_NAME || 'JDI 脈動傳媒';
  const MAIL_NOTIFY    = env.MAIL_NOTIFY || 'pulsepop9@proton.me';

  if (!RESEND_API_KEY) {
    console.error('[streamer-test] Missing RESEND_API_KEY');
    return json({
      ok: true,
      leadId,
      result: buildClientResult(result),
      cta: getCTAByProfile(result.profile.key),
      warn: 'Email service not configured yet (missing API key)',
    });
  }

  const demographics = {
    gender: safeGender,
    age: safeAge,
    region: safeRegion,
    experience: experienceLabel,
  };

  // 6a. User report email
  const reportHtml = renderStreamerReportEmail({
    name: safeName, email: safeEmail, lineId: safeLineId,
    result, demographics,
  });
  const reportText = renderStreamerReportText({ name: safeName, result });

  // 6b. Admin notify email
  const notifyHtml = renderStreamerNotifyEmail({
    name: safeName, email: safeEmail, lineId: safeLineId,
    demographics, result,
    source: source || 'streamer-test-page',
    country, ip, leadId,
  });
  const notifySubject = `🎤 [JDI 官網] 新測驗名單 · ${safeName} · ${result.totalScore}分 · ${result.profile.name}`;

  // Send both in parallel
  const [userResp, adminResp] = await Promise.allSettled([
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${MAIL_FROM_NAME} <${MAIL_FROM}>`,
        to: [safeEmail],
        subject: `🎤 ${safeName}，你的主播適配度分析報告：${result.profile.name}（${result.totalScore}分） | JDI 脈動傳媒`,
        html: reportHtml,
        text: reportText,
        reply_to: MAIL_NOTIFY,
      }),
    }),
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `JDI 官網通知 <${MAIL_FROM}>`,
        to: [MAIL_NOTIFY],
        subject: notifySubject,
        html: notifyHtml,
      }),
    }),
  ]);

  const userOk  = userResp.status === 'fulfilled'  && userResp.value.ok;
  const adminOk = adminResp.status === 'fulfilled' && adminResp.value.ok;

  if (!userOk) {
    let detail = 'unknown';
    try {
      detail = userResp.status === 'fulfilled'
        ? await userResp.value.text()
        : String(userResp.reason);
    } catch (_) {}
    console.error('[streamer-test] user email failed:', detail);
  }
  if (!adminOk) {
    let detail = 'unknown';
    try {
      detail = adminResp.status === 'fulfilled'
        ? await adminResp.value.text()
        : String(adminResp.reason);
    } catch (_) {}
    console.error('[streamer-test] admin email failed:', detail);
  }

  // Mark notified in D1
  if (env.DB && leadId && userOk) {
    try {
      await env.DB.prepare('UPDATE streamer_test_leads SET notified = 1 WHERE id = ?').bind(leadId).run();
    } catch (_) {}
  }

  return json({
    ok: true,
    leadId,
    userEmailSent: userOk,
    adminEmailSent: adminOk,
    result: buildClientResult(result),
    cta: getCTAByProfile(result.profile.key),
  });
}

// ============ Helpers ============
function modulePercent(result, key) {
  const ms = result.moduleScores.find(m => m.key === key);
  return ms ? ms.percent : null;
}

/**
 * 給前端顯示用的結果物件（可以把 full result 直接回，也可以精簡）
 * 這裡直接回完整 result，前端就不用再自己算。
 */
function buildClientResult(result) {
  return result;
}
