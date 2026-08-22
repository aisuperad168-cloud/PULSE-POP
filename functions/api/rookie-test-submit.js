/**
 * ============================================================
 * JDI 脈動傳媒 · Rookie Test Submission Endpoint
 * POST /api/rookie-test-submit
 *
 * Environment Variables:
 *   RESEND_API_KEY   — Resend API key
 *   MAIL_FROM        — 寄件人 email
 *   MAIL_FROM_NAME   — 寄件人顯示名稱
 *   MAIL_NOTIFY      — 內部通知信箱
 *
 * Bindings:
 *   DB               — D1 database (rookie_test_leads table)
 *
 * Request payload:
 *   {
 *     nickname, email, lineId, consent,
 *     ageRange, identity, liveExperience,
 *     interestDirections: [...],
 *     intentLevel,
 *     answers: { "1": 5, "2": 3, ..., "24": 4 },
 *     source
 *   }
 *
 * 安全策略：
 *   前端傳答案，後端「自己重算」結果 → 避免被竄改
 * ============================================================
 */

import { buildResult } from './_rookie-test-core.js';
import {
  renderRookieReportEmail,
  renderRookieReportText,
  renderRookieNotifyEmail,
  getCTAByProfile,
} from './_rookie-test-email.js';

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

// ============ Enum whitelists ============
const ALLOWED_AGE_RANGES  = ['under_18', '18-24', '25-29', '30-34', '35+'];
const ALLOWED_IDENTITIES  = ['student', 'office_worker', 'freelancer', 'stay_home', 'between_jobs', 'other'];
const ALLOWED_EXPERIENCES = ['none', 'tried', 'short_active'];
const ALLOWED_INTENTS     = ['curious', 'considering', 'ready_now'];
const ALLOWED_INTERESTS   = ['entertainment', 'companion', 'content_knowledge', 'commerce', 'gaming', 'lifestyle', 'not_sure'];

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
    nickname, email, lineId, consent,
    ageRange, identity, liveExperience,
    interestDirections, intentLevel,
    answers, source,
  } = payload || {};

  // 2. Validate 必填欄位
  if (!nickname || !email || !lineId) {
    return json({ error: 'MISSING_FIELDS', message: '缺少暱稱 / Email / LINE ID' }, 400);
  }
  if (consent !== true) {
    return json({ error: 'CONSENT_REQUIRED', message: '請勾選隱私同意' }, 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'INVALID_EMAIL', message: 'Email 格式錯誤' }, 400);
  }
  if (!liveExperience) {
    return json({ error: 'MISSING_EXPERIENCE', message: '請選擇直播經驗' }, 400);
  }
  if (!ALLOWED_EXPERIENCES.includes(liveExperience)) {
    return json({ error: 'INVALID_EXPERIENCE', message: '直播經驗欄位不合法' }, 400);
  }
  if (!intentLevel) {
    return json({ error: 'MISSING_INTENT', message: '請選擇意願強度' }, 400);
  }
  if (!ALLOWED_INTENTS.includes(intentLevel)) {
    return json({ error: 'INVALID_INTENT', message: '意願強度欄位不合法' }, 400);
  }

  // 選填但若給了要合法
  if (ageRange && !ALLOWED_AGE_RANGES.includes(ageRange)) {
    return json({ error: 'INVALID_AGE_RANGE', message: '年齡區間不合法' }, 400);
  }
  if (identity && !ALLOWED_IDENTITIES.includes(identity)) {
    return json({ error: 'INVALID_IDENTITY', message: '身份欄位不合法' }, 400);
  }

  // 興趣方向：多選，需為陣列且每項在白名單中
  let safeInterests = [];
  if (interestDirections != null) {
    if (!Array.isArray(interestDirections)) {
      return json({ error: 'INVALID_INTERESTS', message: '興趣方向格式錯誤' }, 400);
    }
    safeInterests = interestDirections
      .filter(v => typeof v === 'string' && ALLOWED_INTERESTS.includes(v))
      .slice(0, 7);
  }

  // 3. Validate answers + 後端重算結果
  if (!answers || typeof answers !== 'object') {
    return json({ error: 'MISSING_ANSWERS', message: '缺少答題資料' }, 400);
  }

  let result;
  try {
    result = buildResult(answers, { requireAll: true });
  } catch (err) {
    return json({
      error: 'INVALID_ANSWERS',
      message: '答題資料不完整或有誤',
      detail: err.message,
    }, 400);
  }

  // 4. Sanitize
  const safeNickname = String(nickname).trim().slice(0, 20);
  const safeEmail    = String(email).trim().toLowerCase().slice(0, 80);
  const safeLineId   = String(lineId).trim().slice(0, 40);
  const safeAge      = ageRange ? String(ageRange).slice(0, 20) : null;
  const safeIdentity = identity ? String(identity).slice(0, 20) : null;
  const safeExp      = String(liveExperience).slice(0, 20);
  const safeIntent   = String(intentLevel).slice(0, 20);

  const ip = request.headers.get('CF-Connecting-IP') || '';
  const country = request.headers.get('CF-IPCountry') || '';
  const ua = request.headers.get('User-Agent') || '';

  // 5. Store to D1
  let leadId = null;
  if (env.DB) {
    // 5a. 首次呼叫時自動建表（IF NOT EXISTS 所以安全）
    try {
      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS rookie_test_leads (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nickname TEXT NOT NULL,
          email TEXT NOT NULL,
          line_id TEXT NOT NULL,
          age_range TEXT,
          identity TEXT,
          live_experience TEXT NOT NULL,
          interest_directions TEXT,
          intent_level TEXT NOT NULL,
          consent INTEGER NOT NULL DEFAULT 1,
          total_score REAL NOT NULL,
          tier_key TEXT NOT NULL,
          tier_label TEXT NOT NULL,
          profile_key TEXT NOT NULL,
          profile_name TEXT NOT NULL,
          secondary_profile_key TEXT,
          secondary_profile_name TEXT,
          score_expression REAL,
          score_interaction REAL,
          score_stability REAL,
          score_discipline REAL,
          score_content_potential REAL,
          score_boundary REAL,
          risk_count INTEGER NOT NULL DEFAULT 0,
          risk_flags TEXT,
          answers TEXT,
          full_result TEXT,
          source TEXT,
          ip TEXT,
          user_agent TEXT,
          country TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
          notified INTEGER NOT NULL DEFAULT 0
        )
      `).run();
      await env.DB.batch([
        env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_rook_email ON rookie_test_leads (email)'),
        env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_rook_profile ON rookie_test_leads (profile_key)'),
        env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_rook_total ON rookie_test_leads (total_score)'),
        env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_rook_created ON rookie_test_leads (created_at)'),
        env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_rook_intent ON rookie_test_leads (intent_level)'),
      ]);
    } catch (schemaErr) {
      console.error('[rookie-test] Schema init failed (may be ok if already exists):', schemaErr.message);
      // 不阻斷主流程
    }

    // 5b. 寫入
    try {
      const dbResult = await env.DB.prepare(`
        INSERT INTO rookie_test_leads (
          nickname, email, line_id,
          age_range, identity, live_experience, interest_directions, intent_level, consent,
          total_score, tier_key, tier_label, profile_key, profile_name,
          secondary_profile_key, secondary_profile_name,
          score_expression, score_interaction, score_stability,
          score_discipline, score_content_potential, score_boundary,
          risk_count, risk_flags,
          answers, full_result,
          source, ip, user_agent, country
        ) VALUES (
          ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?, ?,
          ?, ?,
          ?, ?, ?, ?
        )
      `).bind(
        safeNickname, safeEmail, safeLineId,
        safeAge, safeIdentity, safeExp,
        JSON.stringify(safeInterests),
        safeIntent,
        1, // consent
        result.totalScore,
        result.tier.key, result.tier.label,
        result.profile.key, result.profile.name,
        result.secondaryProfile ? result.secondaryProfile.key : null,
        result.secondaryProfile ? result.secondaryProfile.name : null,
        modulePercent(result, 'expression'),
        modulePercent(result, 'interaction'),
        modulePercent(result, 'stability'),
        modulePercent(result, 'discipline'),
        modulePercent(result, 'contentPotential'),
        modulePercent(result, 'boundary'),
        result.riskFlags.length,
        JSON.stringify(result.riskFlags.map(f => f.key)),
        JSON.stringify(answers),
        JSON.stringify(result),
        String(source || 'rookie-test-page').slice(0, 30),
        ip.slice(0, 45),
        ua.slice(0, 200),
        country.slice(0, 2),
      ).run();
      leadId = dbResult.meta?.last_row_id || null;
    } catch (dbErr) {
      console.error('[rookie-test] D1 insert failed:', dbErr);
      // 不阻斷後續寄信
    }
  }

  // 6. Send emails via Resend
  const RESEND_API_KEY = env.RESEND_API_KEY;
  const MAIL_FROM      = env.MAIL_FROM || 'onboarding@resend.dev';
  const MAIL_FROM_NAME = env.MAIL_FROM_NAME || 'JDI 脈動傳媒';
  const MAIL_NOTIFY    = env.MAIL_NOTIFY || 'pulsepop9@proton.me';

  if (!RESEND_API_KEY) {
    console.error('[rookie-test] Missing RESEND_API_KEY');
    return json({
      ok: true,
      leadId,
      result: buildClientResult(result),
      cta: getCTAByProfile(result.profile.key),
      warn: 'Email service not configured yet (missing API key)',
    });
  }

  const demographics = {
    ageRange:           safeAge,
    identity:           safeIdentity,
    liveExperience:     safeExp,
    interestDirections: safeInterests,
    intentLevel:        safeIntent,
  };

  // 6a. User report email
  const reportHtml = renderRookieReportEmail({
    nickname: safeNickname,
    result,
    demographics,
  });
  const reportText = renderRookieReportText({ nickname: safeNickname, result });

  // 6b. Admin notify email
  const notifyHtml = renderRookieNotifyEmail({
    nickname: safeNickname,
    email: safeEmail,
    lineId: safeLineId,
    demographics,
    result,
    source: source || 'rookie-test-page',
    country,
    ip,
    leadId,
  });
  const notifySubject = `✨ [JDI 官網] 新素人測驗名單 · ${safeNickname} · ${result.totalScore}分 · ${result.profile.name}`;

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
        subject: `✨ ${safeNickname}，你的素人主播潛力報告：${result.profile.name}（${result.totalScore}分） | JDI 脈動傳媒`,
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
    console.error('[rookie-test] user email failed:', detail);
  }
  if (!adminOk) {
    let detail = 'unknown';
    try {
      detail = adminResp.status === 'fulfilled'
        ? await adminResp.value.text()
        : String(adminResp.reason);
    } catch (_) {}
    console.error('[rookie-test] admin email failed:', detail);
  }

  // Mark notified in D1
  if (env.DB && leadId && userOk) {
    try {
      await env.DB.prepare('UPDATE rookie_test_leads SET notified = 1 WHERE id = ?').bind(leadId).run();
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

function buildClientResult(result) {
  return result;
}
