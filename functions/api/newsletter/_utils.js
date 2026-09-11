/**
 * ============================================================
 * JDI Newsletter · 共用工具函式
 * ============================================================
 * - Token 產生（32 hex chars，用 Web Crypto）
 * - Email 驗證
 * - IP / UA 提取
 * - JSON response helper
 * - Resend API 封裝（含重試 + rate limit）
 * ============================================================
 */

// ---------- Token ----------
export function generateToken() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ---------- Email 驗證 ----------
const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
export function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  const trimmed = email.trim().toLowerCase();
  return trimmed.length >= 5 && trimmed.length <= 254 && EMAIL_RE.test(trimmed);
}
export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

// ---------- Request 資訊 ----------
export function getClientIp(request) {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    'unknown'
  );
}
export function getClientUa(request) {
  return (request.headers.get('user-agent') || '').slice(0, 500);
}

// ---------- JSON response ----------
export function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
  });
}
export function errorResponse(message, status = 400, code = 'BAD_REQUEST') {
  return jsonResponse({ ok: false, error: { code, message } }, status);
}

// ---------- Resend API 封裝 ----------
export async function sendResendEmail(env, { to, subject, html, text, from, replyTo, tags }) {
  const RESEND_API_KEY = env.RESEND_API_KEY;
  if (!RESEND_API_KEY) throw new Error('Missing RESEND_API_KEY');

  const fromAddr = from || `${env.MAIL_FROM_NAME || 'JDI 脈動傳媒'} <${env.MAIL_FROM || 'noreply@jdi-pulse.com'}>`;

  const body = {
    from: fromAddr,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
  };
  if (text) body.text = text;
  if (replyTo) body.reply_to = replyTo;
  if (tags && Array.isArray(tags)) body.tags = tags;

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    return { ok: false, error: data.message || `HTTP ${resp.status}`, status: resp.status };
  }
  return { ok: true, id: data.id };
}

// ---------- Resend Batch API ----------
// 一次最多 100 封；超過需分批。回傳 { ok, sent, failed, results[] }
export async function sendResendBatch(env, emails) {
  const RESEND_API_KEY = env.RESEND_API_KEY;
  if (!RESEND_API_KEY) throw new Error('Missing RESEND_API_KEY');
  if (!emails.length) return { ok: true, sent: 0, failed: 0, results: [] };

  const results = [];
  let sent = 0;
  let failed = 0;

  // Resend batch endpoint: /emails/batch
  // 分批 100 封
  for (let i = 0; i < emails.length; i += 100) {
    const chunk = emails.slice(i, i + 100);
    const resp = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(chunk),
    });
    const data = await resp.json().catch(() => ({}));

    if (resp.ok && Array.isArray(data.data)) {
      // 成功
      data.data.forEach((r, idx) => {
        results.push({ ok: true, id: r.id, to: chunk[idx].to });
        sent++;
      });
    } else {
      // 整批失敗
      chunk.forEach(email => {
        results.push({ ok: false, to: email.to, error: data.message || `HTTP ${resp.status}` });
        failed++;
      });
    }

    // 分批間 rate limit（避免 429）
    if (i + 100 < emails.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  return { ok: failed === 0, sent, failed, results };
}

// ---------- URL helpers ----------
export function siteBase(env) {
  return env.SITE_BASE || 'https://jdi-pulse.com';
}
export function confirmUrl(env, token) {
  return `${siteBase(env)}/api/newsletter/confirm/${token}`;
}
export function unsubscribeUrl(env, token) {
  return `${siteBase(env)}/api/newsletter/unsubscribe/${token}`;
}

// ---------- HTML escape ----------
export function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ---------- Taipei timezone helper ----------
export function taipeiNow() {
  // ISO string in Asia/Taipei zone (yyyy-mm-dd HH:MM:SS)
  const d = new Date();
  const parts = d.toLocaleString('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
  return parts.replace(', ', ' ');
}
