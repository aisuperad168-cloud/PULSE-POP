/**
 * ============================================================
 * Newsletter Cron Handlers (Cloudflare Workers 內建 cron)
 * ============================================================
 *
 * 替代 GitHub Actions 的兩個 workflow：
 *   - newsletter-runner.yml       (每 5 分鐘)  → runBroadcastRunner()
 *   - newsletter-weekly.yml       (週一 11:00) → runWeeklyDigest()
 *
 * 觸發方式：wrangler.toml 的 [triggers] crons
 *   - '*.5 * * * *'   → cron 事件 → 判斷 UTC 週幾/時間 → 決定跑哪個
 *
 * 優點：
 *   - 100% 準時 (不像 GitHub Actions schedule 會延遲/漏跑)
 *   - 不用 GitHub App workflows 權限
 *   - 直接呼叫本 Worker 的 handler，不用 self-fetch HTTP
 *
 * 注意事項：
 *   - scheduled() 沒有 request 物件，我們必須手動 fake 一個帶 X-Cron-Secret header 的 Request
 *   - broadcast-run 的原 handler 是 onRequestPost，接受 { request, env, ctx }
 * ============================================================
 */

import * as nlAdminBroadcastRun from '../api/newsletter/admin-broadcast-run.js';
import * as nlScheduleWeekly from '../api/newsletter/schedule-weekly.js';

/**
 * 建立 fake request 呼叫 broadcast-run（原本給 GitHub Action 打的）
 */
async function callBroadcastRun(env, ctx) {
  const req = new Request('https://jdi-pulse.com/api/newsletter/admin-broadcast-run', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Cron-Secret': env.NEWSLETTER_CRON_SECRET,
    },
    body: '{}',
  });
  return await nlAdminBroadcastRun.onRequestPost({ request: req, env, ctx });
}

/**
 * 週報排除的分類 (訂閱者主要是主播，不寄求職者導向內容給他們)
 *
 * 目前排除：
 *   - career (產業職涯) — 這個分類是給求職者看的，寄給主播訂閱者不相關
 *
 * 如果之後有其他分類想排除，加到這個 Set 即可。
 */
const EXCLUDED_NEWSLETTER_CATEGORIES = new Set([
  'career',   // 💼 產業職涯 (給求職者看，非主播)
]);

/**
 * 從 sitemap.xml 抓過去 7 天新增的 live-center 文章
 * 回傳 [{slug, title, description, date, hero, category}, ...]
 *
 * 注意：會過濾掉 EXCLUDED_NEWSLETTER_CATEGORIES 內的分類
 */
async function scanRecentArticles(env) {
  // 讀取 sitemap.xml（靜態檔）
  const sitemapReq = new Request('https://jdi-pulse.com/sitemap.xml');
  const sitemapResp = await env.ASSETS.fetch(sitemapReq);
  if (!sitemapResp.ok) {
    console.error('[cron] Failed to fetch sitemap:', sitemapResp.status);
    return [];
  }
  const xml = await sitemapResp.text();

  // 找過去 7 天內的 /live-center/article/*/
  const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const cutoffStr = cutoffDate.toISOString().slice(0, 10); // YYYY-MM-DD

  // 解析 <url> blocks
  const urlBlockRegex = /<url>([\s\S]*?)<\/url>/g;
  const recent = [];
  let m;
  while ((m = urlBlockRegex.exec(xml)) !== null) {
    const block = m[1];
    const locMatch = block.match(/<loc>([^<]+)<\/loc>/);
    const lastmodMatch = block.match(/<lastmod>([^<]+)<\/lastmod>/);
    if (!locMatch || !lastmodMatch) continue;

    const loc = locMatch[1];
    const lastmod = lastmodMatch[1].slice(0, 10);

    // 只要 /live-center/article/*/
    const slugMatch = loc.match(/\/live-center\/article\/([^\/]+)\/?$/);
    if (!slugMatch) continue;

    // 只要過去 7 天
    if (lastmod < cutoffStr) continue;

    recent.push({ slug: slugMatch[1], url: loc, date: lastmod });
  }

  // 取每篇文章的 HTML metadata
  const articles = [];
  for (const item of recent) {
    try {
      const htmlReq = new Request(item.url);
      const htmlResp = await env.ASSETS.fetch(htmlReq);
      if (!htmlResp.ok) {
        console.warn(`[cron] Failed to fetch article HTML: ${item.slug} (${htmlResp.status})`);
        continue;
      }
      const html = await htmlResp.text();

      const extract = (pattern, def = '') => {
        const m = html.match(pattern);
        return m ? m[1].trim() : def;
      };

      const rawTitle = extract(/<title>([^<｜|]+)/);
      const title = rawTitle || item.slug;
      const description = extract(/<meta name="description" content="([^"]+)"/).slice(0, 200);
      const date = extract(/<meta property="article:published_time" content="([^"]+)"/) || item.date;
      // og:image 可能是完整 URL，只取 /assets/... 部分
      const heroMatch = html.match(/<meta property="og:image" content="[^"]*(\/assets\/[^"]+)"/);
      const hero = heroMatch ? heroMatch[1] : '';

      // 分類：從 lc-tag--{cat} 抓
      let category = '📚 直播中心';
      let categoryKey = null;
      const catMatch = html.match(/lc-tag lc-tag--(\w+)/);
      if (catMatch) {
        categoryKey = catMatch[1];
        const catMap = {
          creator: '🎨 主播專欄',
          policy: '📢 活動政策',
          tutorial: '📚 直播教學',
          revenue: '💰 收益策略',
          glory: '🏆 榮耀時刻',
          career: '💼 產業職涯',
        };
        category = catMap[categoryKey] || category;
      }

      // 過濾掉不想寄給主播訂閱者的分類 (例如求職者導向的 career)
      if (categoryKey && EXCLUDED_NEWSLETTER_CATEGORIES.has(categoryKey)) {
        console.log(`[cron] Skip article ${item.slug} (excluded category: ${categoryKey})`);
        continue;
      }

      articles.push({
        slug: item.slug,
        title,
        description,
        date,
        hero,
        category,
      });
    } catch (err) {
      console.error(`[cron] Error parsing article ${item.slug}:`, err);
    }
  }

  // 依日期新到舊排序
  articles.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return articles;
}

/**
 * 呼叫 schedule-weekly handler
 */
async function callScheduleWeekly(env, ctx, articles) {
  const req = new Request('https://jdi-pulse.com/api/newsletter/schedule-weekly', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Cron-Secret': env.NEWSLETTER_CRON_SECRET,
    },
    body: JSON.stringify({
      articles,
      delay_minutes: 30,
      triggered_by: 'cf_cron',
    }),
  });
  return await nlScheduleWeekly.onRequestPost({ request: req, env, ctx });
}

/**
 * ============================================================
 * 每 5 分鐘 cron: 執行 broadcast-run
 * ============================================================
 */
export async function runBroadcastRunner(env, ctx) {
  const startedAt = new Date().toISOString();
  console.log(`[cron:broadcast-run] Start at ${startedAt}`);

  try {
    const resp = await callBroadcastRun(env, ctx);
    const body = await resp.text();
    console.log(`[cron:broadcast-run] HTTP ${resp.status} · ${body}`);
    return { ok: resp.ok, status: resp.status, body };
  } catch (err) {
    console.error('[cron:broadcast-run] Error:', err);
    return { ok: false, error: err.message };
  }
}

/**
 * ============================================================
 * 週一 UTC 03:00 (台灣 11:00) cron: 掃描 + 排程週報
 * ============================================================
 */
export async function runWeeklyDigest(env, ctx) {
  const startedAt = new Date().toISOString();
  console.log(`[cron:weekly-digest] Start at ${startedAt}`);

  try {
    const articles = await scanRecentArticles(env);
    console.log(`[cron:weekly-digest] Found ${articles.length} recent articles`);
    if (!articles.length) {
      console.log('[cron:weekly-digest] No new articles this week, skip');
      return { ok: true, skipped: true, reason: 'no_new_articles' };
    }

    for (const a of articles) {
      console.log(`  · ${a.date} ${a.category} · ${a.slug}`);
    }

    const resp = await callScheduleWeekly(env, ctx, articles);
    const body = await resp.text();
    console.log(`[cron:weekly-digest] schedule-weekly HTTP ${resp.status} · ${body}`);
    return { ok: resp.ok, status: resp.status, body, articles_count: articles.length };
  } catch (err) {
    console.error('[cron:weekly-digest] Error:', err);
    return { ok: false, error: err.message };
  }
}

/**
 * ============================================================
 * scheduled() 進入點：依 cron pattern 分派
 * ============================================================
 *
 * event.cron 是觸發此次事件的 cron pattern string (例 '*.5 * * * *')
 * 用 pattern 分派到不同 handler
 */
export async function handleScheduled(event, env, ctx) {
  const cron = event.cron || '';
  console.log(`[scheduled] cron="${cron}" scheduledTime=${new Date(event.scheduledTime).toISOString()}`);

  // 週一 UTC 03:00 (台灣 11:00) — 週報
  if (cron === '0 3 * * 1') {
    return await runWeeklyDigest(env, ctx);
  }

  // 其他 (每 5 分鐘) — broadcast runner
  return await runBroadcastRunner(env, ctx);
}
