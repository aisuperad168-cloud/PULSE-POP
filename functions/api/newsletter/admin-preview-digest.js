/**
 * ============================================================
 * POST /api/newsletter/admin-preview-digest
 * ============================================================
 * 寄一封「週報預覽信」到指定 email（測試用）
 *
 * Body:
 *   to_email?: string           - 收件 email（預設寄給呼叫者 = 管理員本人）
 *   articles?: Article[]        - 要放的文章；不給則用預設 3 篇熱門文章
 *   week_label?: string         - 例如「本週 (12/9-12/15)」；不給用「測試版」
 *
 * ★ 這個 endpoint 只寄 1 封，不會動到 broadcast 排程表、
 *   不會影響其他 60 位訂閱者。純用來預覽樣板。
 * ============================================================
 */

import { requireAdmin, authFailedResponse } from '../sign/_auth.js';
import { jsonResponse, errorResponse, sendResendEmail, isValidEmail } from './_utils.js';
import { renderWeeklyDigest } from './_templates.js';

// 預設 3 篇 fallback 文章（沒指定 articles 時用這批）
const DEFAULT_ARTICLES = [
  {
    slug: 'video-livestream-double-traffic-hack',
    title: '為什麼發完影片就要馬上開播？主播必學的「雙倍流量密技」',
    hero: '/assets/live-center/double-traffic-hero.jpg',
    description: '搞懂 TikTok 演算法對「短影音 → 直播」的加權邏輯，讓你單場觀看數翻倍。',
    date: '2026-09-12',
    category: '📈 流量密技',
  },
  {
    slug: 'tiktok-live-12-red-lines-guide',
    title: '新手避雷實戰教學：TikTok 直播間 12 條紅線一次看懂',
    hero: '/assets/live-center/rookie-hero.jpg',
    description: '從封鎖詞、直播時段到 PK 規則，12 條紅線讓你少被砍一半流量。',
    date: '2026-09-05',
    category: '🚨 平台規則',
  },
  {
    slug: '3000-budget-live-streaming-setup',
    title: '開播必備 5 大設備清單：新手 3000 元也能開播',
    hero: '/assets/live-center/rookie-hero.jpg',
    description: '手機 + 麥 + 燈 + 支架 + 網速，3000 元建構一個像樣的直播間。',
    date: '2026-08-28',
    category: '🎬 設備推薦',
  },
];

export async function onRequestPost(context) {
  const { request, env } = context;
  const auth = await requireAdmin(request, env);
  if (!auth.ok) return authFailedResponse(auth);

  let body;
  try { body = await request.json(); }
  catch { body = {}; }

  // 預設寄給管理員本人（安全，不會誤寄給訂閱者）
  const toEmail = (body.to_email || auth.email || '').toLowerCase().trim();
  if (!isValidEmail(toEmail)) {
    return errorResponse('to_email 無效', 400);
  }

  const articles = Array.isArray(body.articles) && body.articles.length
    ? body.articles
    : DEFAULT_ARTICLES;

  const weekLabel = body.week_label || '測試版（預覽）';

  // 找該 email 的 unsubscribe_token（若已訂閱），否則產隨機 token（純預覽）
  const db = env.DB;
  let unsubToken = null;
  try {
    const row = await db.prepare(
      `SELECT unsubscribe_token FROM newsletter_subscribers WHERE email = ? LIMIT 1`
    ).bind(toEmail).first();
    unsubToken = row?.unsubscribe_token || 'preview-token-not-real';
  } catch (e) {
    unsubToken = 'preview-token-not-real';
  }

  // Render 週報
  const tpl = renderWeeklyDigest(env, {
    articles,
    unsubscribeToken: unsubToken,
    weekLabel,
  });

  // 加「預覽版」前綴，方便管理員辨識
  const subject = `[預覽] ${tpl.subject}`;

  // 寄
  const send = await sendResendEmail(env, {
    to: toEmail,
    subject,
    html: tpl.html,
    tags: [{ name: 'category', value: 'newsletter_preview' }],
  });

  if (!send.ok) {
    return jsonResponse({
      ok: false,
      error: send.error || 'Resend send failed',
      resend_status: send.status,
      articles_count: articles.length,
      preview_to: toEmail,
    }, 500);
  }

  return jsonResponse({
    ok: true,
    message: `✅ 預覽週報已寄到 ${toEmail}`,
    resend_id: send.id,
    articles_count: articles.length,
    subject,
    articles: articles.map(a => ({ slug: a.slug, title: a.title })),
    preview_to: toEmail,
    sent_by: auth.email,
  });
}
