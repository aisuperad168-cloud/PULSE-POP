/**
 * ============================================================
 * JDI Newsletter · Email 樣板
 * ============================================================
 * - confirm       : Double opt-in 確認信
 * - welcome       : 確認成功後的歡迎信
 * - weekly_digest : 每週精選文章推送
 * - reengagement  : 重新徵求同意（既有名單）
 * - unsubscribed  : 退訂確認信（無 CTA）
 * ============================================================
 */

import { escapeHtml, unsubscribeUrl, siteBase } from './_utils.js';

const BRAND_RED = '#FE2C55';
const BRAND_CYAN = '#25F4EE';
const TEXT_DARK = '#111827';
const TEXT_MID = '#4b5563';
const TEXT_MUTE = '#6b7280';
const BG_SOFT = '#f9fafb';

// ---------- 通用 layout ----------
function layout({ preheader = '', bodyHtml, unsubToken, env, showUnsub = true }) {
  const site = siteBase(env);
  const unsubLink = unsubToken ? unsubscribeUrl(env, unsubToken) : `${site}/`;
  return `<!DOCTYPE html>
<html lang="zh-Hant-TW">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>JDI 脈動傳媒</title>
<style>
  body { margin:0; padding:0; background:${BG_SOFT}; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans TC",sans-serif; color:${TEXT_DARK}; }
  a { color:${BRAND_RED}; text-decoration:none; }
  .wrap { width:100%; background:${BG_SOFT}; padding:32px 0; }
  .container { max-width:600px; margin:0 auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.06); }
  .hero { background:linear-gradient(135deg,${BRAND_RED} 0%,#b81e3f 100%); padding:32px 32px 28px; text-align:center; }
  .hero-brand { font-size:20px; font-weight:900; color:#fff; letter-spacing:1px; }
  .hero-sub { font-size:12px; color:rgba(255,255,255,0.85); letter-spacing:4px; margin-top:4px; }
  .body { padding:36px 32px 32px; }
  h1 { font-size:24px; font-weight:800; margin:0 0 16px; color:${TEXT_DARK}; line-height:1.4; }
  h2 { font-size:18px; font-weight:800; margin:24px 0 12px; color:${TEXT_DARK}; }
  p { font-size:15px; line-height:1.85; color:${TEXT_MID}; margin:0 0 16px; }
  .btn { display:inline-block; background:${BRAND_RED}; color:#fff !important; padding:14px 32px; border-radius:10px; font-weight:700; font-size:15px; margin:20px 0; }
  .btn-outline { display:inline-block; background:#fff; color:${BRAND_RED} !important; border:2px solid ${BRAND_RED}; padding:12px 28px; border-radius:10px; font-weight:700; font-size:14px; margin:8px 4px; }
  .article-card { display:block; text-decoration:none; color:${TEXT_DARK} !important; background:#fff; border:1px solid #e5e7eb; border-radius:10px; overflow:hidden; margin:16px 0; }
  .article-card img { display:block; width:100%; height:auto; }
  .article-card-body { padding:16px 20px; }
  .article-card-tag { display:inline-block; font-size:11px; font-weight:700; color:${BRAND_RED}; background:rgba(254,44,85,0.08); padding:4px 10px; border-radius:999px; margin-bottom:8px; }
  .article-card-title { font-size:17px; font-weight:800; margin:6px 0; color:${TEXT_DARK}; line-height:1.4; }
  .article-card-desc { font-size:13px; color:${TEXT_MUTE}; line-height:1.7; margin:6px 0 0; }
  .article-card-date { font-size:12px; color:${TEXT_MUTE}; margin-top:8px; }
  .divider { height:1px; background:#e5e7eb; border:0; margin:24px 0; }
  .footer { padding:24px 32px 32px; background:${BG_SOFT}; text-align:center; border-top:1px solid #e5e7eb; }
  .footer p { font-size:12px; color:${TEXT_MUTE}; margin:6px 0; line-height:1.7; }
  .footer a { color:${TEXT_MUTE}; text-decoration:underline; }
  .preheader { display:none !important; visibility:hidden; opacity:0; color:transparent; height:0; width:0; }
</style>
</head>
<body>
  ${preheader ? `<span class="preheader">${escapeHtml(preheader)}</span>` : ''}
  <div class="wrap">
    <div class="container">
      <div class="hero">
        <div class="hero-brand">JDI 脈動傳媒</div>
        <div class="hero-sub">JDI PULSE MEDIA</div>
      </div>
      <div class="body">
        ${bodyHtml}
      </div>
      <div class="footer">
        <p><strong>JDI 脈動傳媒</strong> · 艾超數位傳媒有限公司</p>
        <p>台中市北屯區大連路三段 2 號 · 統編 60413705</p>
        ${showUnsub ? `<p style="margin-top:12px;">你收到這封信是因為你訂閱了 JDI 脈動傳媒的電子報。<br/>
        <a href="${unsubLink}">取消訂閱</a> · <a href="${site}/live-center/">造訪直播中心</a> · <a href="${site}/privacy-policy.html">隱私權政策</a></p>` : ''}
        <p style="margin-top:12px; color:#9ca3af; font-size:11px;">© 2026 JDI 脈動傳媒 · JDI PULSE MEDIA. All Rights Reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ---------- 1. 確認信（Double opt-in）----------
export function renderConfirmEmail(env, { email, confirmToken, unsubscribeToken, nickname }) {
  const site = siteBase(env);
  const confirmLink = `${site}/api/newsletter/confirm/${confirmToken}`;
  const displayName = nickname ? escapeHtml(nickname) : escapeHtml(email);
  const bodyHtml = `
    <h1>再一步就完成訂閱 🎉</h1>
    <p>嗨 ${displayName}，</p>
    <p>感謝你想訂閱 <strong>JDI 脈動傳媒</strong> 的電子報！</p>
    <p>為了確認這是你本人操作（避免有人拿你的信箱亂訂），請點擊下方按鈕完成確認：</p>
    <p style="text-align:center;">
      <a href="${confirmLink}" class="btn">✓ 確認訂閱</a>
    </p>
    <p style="font-size:13px; color:${TEXT_MUTE};">按鈕沒反應？複製這個連結到瀏覽器：<br/>
    <span style="word-break:break-all;">${confirmLink}</span></p>
    <hr class="divider"/>
    <h2>你會收到什麼？</h2>
    <p>
      · 📅 <strong>每週一</strong>寄送一封精選文章週報<br/>
      · 📚 內容涵蓋：平台演算法、直播技巧、分潤策略、法規解析<br/>
      · 🚫 沒有廣告、沒有推銷，只有實戰乾貨<br/>
      · 🔓 隨時可一鍵取消訂閱
    </p>
    <p style="font-size:13px; color:${TEXT_MUTE}; margin-top:24px;">
      如果你沒有主動訂閱這封電子報，直接忽略這封信即可，我們不會再寄任何信給你。
    </p>
  `;
  return {
    subject: '請確認你的 JDI 直播中心電子報訂閱',
    html: layout({ preheader: '點一下確認訂閱按鈕，即可開始每週收到直播乾貨', bodyHtml, unsubToken: unsubscribeToken, env, showUnsub: false }),
  };
}

// ---------- 2. 歡迎信（確認成功後）----------
export function renderWelcomeEmail(env, { email, unsubscribeToken, nickname }) {
  const site = siteBase(env);
  const displayName = nickname ? escapeHtml(nickname) : '';
  const bodyHtml = `
    <h1>訂閱成功！歡迎加入 🎊</h1>
    <p>${displayName ? `嗨 ${displayName}，` : '嗨，'}</p>
    <p>你已經成功訂閱 <strong>JDI 脈動傳媒直播中心電子報</strong>！</p>
    <p>從下週一開始，你會固定收到上週的精選文章。</p>
    <h2>💡 你可以先看看這些熱門文章</h2>
    <p>
      · <a href="${site}/live-center/article/video-livestream-double-traffic-hack/">為什麼發完影片就要馬上開播？主播必學的「雙倍流量密技」</a><br/>
      · <a href="${site}/live-center/article/tiktok-live-12-red-lines-guide/">新手避雷實戰教學：TikTok 直播間 12 條紅線一次看懂</a><br/>
      · <a href="${site}/live-center/article/3000-budget-live-streaming-setup/">開播必備 5 大設備清單：新手 3000 元也能開播</a>
    </p>
    <p style="text-align:center;">
      <a href="${site}/live-center/" class="btn">🔗 逛逛直播中心</a>
    </p>
    <hr class="divider"/>
    <p style="font-size:13px; color:${TEXT_MUTE};">
      如果你有任何直播、簽約、合作的疑問，歡迎直接回覆這封信，或加 LINE <a href="https://line.me/R/ti/p/@354ykfbp">@354ykfbp</a> 找我們。
    </p>
  `;
  return {
    subject: '🎉 訂閱成功！JDI 直播中心電子報',
    html: layout({ preheader: '從下週一開始，每週送上精選直播乾貨', bodyHtml, unsubToken: unsubscribeToken, env }),
  };
}

// ---------- 3. 週報（多篇文章）----------
export function renderWeeklyDigest(env, { articles, unsubscribeToken, weekLabel }) {
  const site = siteBase(env);
  const label = weekLabel || '本週';

  const articleCards = articles.map(a => {
    const url = `${site}/live-center/article/${a.slug}/`;
    const hero = a.hero ? `${site}${a.hero}` : `${site}/assets/live-center/rookie-hero.jpg`;
    const tag = a.category || '📚 直播中心';
    return `
      <a href="${url}" class="article-card">
        <img src="${hero}" alt="${escapeHtml(a.title)}" width="600" />
        <div class="article-card-body">
          <div class="article-card-tag">${escapeHtml(tag)}</div>
          <div class="article-card-title">${escapeHtml(a.title)}</div>
          ${a.description ? `<div class="article-card-desc">${escapeHtml(a.description)}</div>` : ''}
          <div class="article-card-date">📅 ${escapeHtml(a.date)}</div>
        </div>
      </a>
    `;
  }).join('');

  const bodyHtml = `
    <h1>📬 ${escapeHtml(label)}新文章來了</h1>
    <p>嗨，這是 JDI 脈動傳媒直播中心的每週精選：</p>
    ${articleCards}
    <hr class="divider"/>
    <p style="text-align:center;">
      <a href="${site}/live-center/" class="btn-outline">看更多直播中心文章 →</a>
    </p>
    <p style="font-size:13px; color:${TEXT_MUTE}; text-align:center; margin-top:16px;">
      喜歡這些內容嗎？直接回覆這封信告訴我們 💌
    </p>
  `;
  return {
    subject: `📬 ${label}的直播乾貨來了（${articles.length} 篇）`,
    html: layout({ preheader: `${articles.length} 篇精選文章 · 平台演算法 / 直播技巧 / 分潤策略`, bodyHtml, unsubToken: unsubscribeToken, env }),
  };
}

// ---------- 4. 退訂確認信 ----------
export function renderUnsubscribedEmail(env, { email }) {
  const bodyHtml = `
    <h1>已為你取消訂閱 👋</h1>
    <p>${escapeHtml(email)}</p>
    <p>你已成功取消訂閱 <strong>JDI 脈動傳媒直播中心</strong> 的電子報。</p>
    <p>從此以後，我們不會再寄任何電子報給你。</p>
    <p style="font-size:13px; color:${TEXT_MUTE}; margin-top:24px;">
      如果是不小心點到退訂，可以回到<a href="${siteBase(env)}/live-center/">直播中心</a>再次訂閱。<br/>
      若有任何直播 / 合作問題，仍歡迎透過 LINE <a href="https://line.me/R/ti/p/@354ykfbp">@354ykfbp</a> 或 Email
      <a href="mailto:pulsepop9@gmail.com">pulsepop9@gmail.com</a> 聯繫我們。
    </p>
  `;
  return {
    subject: '已為你取消訂閱｜JDI 脈動傳媒',
    html: layout({ preheader: '你已成功取消訂閱，我們不會再寄信給你', bodyHtml, env, showUnsub: false }),
  };
}

// ---------- 5. Reengagement（既有名單重新徵求同意）----------
export function renderReengagementEmail(env, { email, confirmToken, unsubscribeToken, sourceLabel }) {
  const site = siteBase(env);
  const confirmLink = `${site}/api/newsletter/confirm/${confirmToken}`;
  const bodyHtml = `
    <h1>Hi，還記得我們嗎？</h1>
    <p>你之前${sourceLabel ? `（${escapeHtml(sourceLabel)}）` : ''}在 JDI 脈動傳媒留下過信箱。</p>
    <p>我們最近開通了 <strong>直播中心電子報</strong>，每週一寄送 1 封精選文章，內容包含：</p>
    <p>
      · 平台演算法與流量密技<br/>
      · 直播實戰教學（設備、話術、心理學）<br/>
      · 分潤策略與合約解析<br/>
      · TikTok 政策與活動更新
    </p>
    <p><strong>有興趣繼續收到嗎？</strong>請點下方按鈕確認，沒興趣的話直接忽略這封信即可，我們不會再寄。</p>
    <p style="text-align:center;">
      <a href="${confirmLink}" class="btn">✓ 我想繼續收到</a>
    </p>
    <p style="font-size:13px; color:${TEXT_MUTE};">
      這是一封一次性徵求同意信 —— 你不點確認就不會加入電子報名單。
    </p>
  `;
  return {
    subject: '👋 想繼續收到 JDI 直播中心的精選文章嗎？',
    html: layout({ preheader: '一次性確認信，不點就當沒發生過', bodyHtml, unsubToken: unsubscribeToken, env, showUnsub: false }),
  };
}
