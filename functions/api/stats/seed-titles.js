/**
 * ============================================================
 * POST /api/stats/seed-titles
 * ============================================================
 * 一次性批次寫入所有 25 篇文章的真實中文標題
 * 使用受保護 token 避免濫用
 *
 * Header: X-Seed-Token: (需與 env.STATS_SEED_TOKEN 匹配)
 * 若未設定 env.STATS_SEED_TOKEN，則預設為固定密碼（可修改）
 * ============================================================
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Seed-Token',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS_HEADERS },
  });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

// 25 篇文章的真實 title（從 <title> 標籤抓的）
const ARTICLE_TITLES = {
  'why-join-jdi-guild': '告別單打獨鬥！為什麼加入 JDI 脈動傳媒，是你突破 TikTok 直播的最佳捷徑？',
  'guardian-cultivation-guide': '大哥晉級系統全解析：主播該怎麼引導觀眾從送禮者 → 守護者？',
  'tiktok-live-fandom-guide': 'TikTok LIVE 進階教學：粉絲團、鐵粉、守護者完整營運手冊',
  'rookie-to-golden-hour-in-6-months': '從素人到黃金時段：一位 JDI 主播的 6 個月成長軌跡',
  'streamer-cross-room-visits-and-fan-badges': '頭部主播的「跑騷」與「馬甲軍團」：所有主播都該懂的直播社交政治',
  'gift-psychology-4-techniques': '禮物心理學：4 個讓觀眾自願送禮的直播技巧',
  'live-pk-benefits-guide': 'TikTok LIVE PK 完全指南：如何用連麥拉爆流量',
  '2026-q2-tiktok-live-payout-update': '2026 Q2 TikTok LIVE 分潤機制更新解析',
  'how-to-choose-tiktok-guild-payout-guide': '怎麼選 TikTok 公會？分潤條件比較指南',
  'live-menu-and-viewer-wishes-guide': '菜單直播完整攻略：從點單、氛圍到觀眾許願回饋',
  'tiktok-guild-3-contract-traps': '簽 TikTok 公會前必看：3 個常見合約陷阱',
  'tiktok-live-12-red-lines-guide': 'TikTok LIVE 12 條紅線：這些內容會被封號',
  '3000-budget-live-streaming-setup': '3000 元預算搞定直播設備清單（新手向）',
  'how-to-leave-tiktok-guild': '如何退出 TikTok 公會？合約解約 SOP',
  'video-livestream-double-traffic-hack': '短影音 + 直播雙開流量攻略',
  'livestream-is-a-micro-startup': '直播就是微型創業：主播必學的商業思維',
  'yycam-tikfinity-menu-streamer-combo': 'YY 掛機、Tikfinity、菜單主播三合一玩法',
  'august-2026-allstar-top3': '2026 年 8 月 JDI 脈動全明星 TOP 3',
  '2026-09-official-events-overview': '2026 年 9 月官方活動總覽',
  'vtuber-national-team-recruitment': 'VTuber 國家隊招募：JDI 虛擬主播計畫',
  'voice-only-streamer-recruitment': '純聲音主播招募：聲音好聽就能開播',
  'mentor-program-2026': '2026 大使招星戰隊：師徒計畫招募中',
  '2026-live-industry-job-guide': '2026 直播產業職涯完整指南',
  'streamer-agent-day-in-life': '主播經紀人的一天：日常工作實錄',
  'join-guild-employee-vs-streamer': '加入公會做員工還是當主播？兩條路怎麼選',
};

async function ensureTable(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS article_views (
      slug TEXT PRIMARY KEY,
      title TEXT,
      views INTEGER NOT NULL DEFAULT 0,
      views_7d INTEGER NOT NULL DEFAULT 0,
      last_reset_7d TEXT NOT NULL DEFAULT (datetime('now', '+8 hours')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours'))
    )
  `).run();
}

export async function onRequestPost({ request, env }) {
  try {
    const requiredToken = env.STATS_SEED_TOKEN || 'jdi-seed-2026-09-17';
    const providedToken = request.headers.get('X-Seed-Token');
    if (providedToken !== requiredToken) {
      return json({ ok: false, error: 'unauthorized' }, 401);
    }

    await ensureTable(env);

    let updated = 0;
    let created = 0;

    for (const [slug, title] of Object.entries(ARTICLE_TITLES)) {
      const existing = await env.DB.prepare(
        `SELECT slug FROM article_views WHERE slug = ?`
      ).bind(slug).first();

      if (existing) {
        // 只更新 title，不動 views
        await env.DB.prepare(
          `UPDATE article_views SET title = ? WHERE slug = ?`
        ).bind(title, slug).run();
        updated++;
      } else {
        // 新建（沒 views 種子，靠 article-view 首次呼叫時建立）
        // 這裡不建立空 row，避免亂序，直接讓 article-view API 自然處理
      }
    }

    return json({ ok: true, updated, created, total: Object.keys(ARTICLE_TITLES).length });
  } catch (err) {
    return json({ ok: false, error: err.message }, 500);
  }
}
