/**
 * ============================================================
 * JDI 脈動傳媒 · Worker with Assets Entry Point
 * ============================================================
 *
 * 這個 Worker 同時：
 *   1. 服務靜態檔案（HTML/CSS/JS/圖片）— 透過 [assets] 綁定
 *   2. 處理 /api/* 動態請求 — 手動路由到 functions/api/*.js 的 handler
 *
 * 為什麼不用 Pages Functions 自動路由？
 *   因為現在部署為 Worker（非 Pages），需要自己接 /api/* 路由。
 *
 * 路由對應表：
 *   POST   /api/quiz-submit           → functions/api/quiz-submit.js
 *   POST   /api/contact-submit        → functions/api/contact-submit.js
 *   POST   /api/streamer-test-submit  → functions/api/streamer-test-submit.js
 *   POST   /api/rookie-test-submit    → functions/api/rookie-test-submit.js
 *   POST   /api/careers-submit        → functions/api/careers-submit.js
 *   （每個都同時支援 OPTIONS for CORS）
 * ============================================================
 */

// 動態 import handlers（Cloudflare Workers 支援 ES modules）
import * as quizHandler from './functions/api/quiz-submit.js';
import * as contactHandler from './functions/api/contact-submit.js';
import * as streamerTestHandler from './functions/api/streamer-test-submit.js';
import * as rookieTestHandler from './functions/api/rookie-test-submit.js';
import * as careersHandler from './functions/api/careers-submit.js';
import * as venuesHandler from './functions/api/venues-submit.js';

// ============ API 路由表 ============
const API_ROUTES = {
  '/api/quiz-submit': quizHandler,
  '/api/contact-submit': contactHandler,
  '/api/streamer-test-submit': streamerTestHandler,
  '/api/rookie-test-submit': rookieTestHandler,
  '/api/careers-submit': careersHandler,
  '/api/venues-submit': venuesHandler,
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // ============ 1. API 路由處理 ============
    const handler = API_ROUTES[path];
    if (handler) {
      const method = request.method.toUpperCase();

      // 對應 Pages Functions 的 onRequest{Method} 命名
      const handlerName = `onRequest${method.charAt(0)}${method.slice(1).toLowerCase()}`;
      // 例：POST → onRequestPost, OPTIONS → onRequestOptions

      if (typeof handler[handlerName] === 'function') {
        try {
          // Pages Functions 的呼叫慣例：{ request, env, ctx, params, data, next, ...}
          return await handler[handlerName]({ request, env, ctx, params: {}, data: {} });
        } catch (err) {
          console.error(`[${path}] handler error:`, err);
          return new Response(
            JSON.stringify({ ok: false, error: 'Server error', detail: err.message }),
            {
              status: 500,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              },
            }
          );
        }
      } else {
        // Method not allowed
        return new Response(
          JSON.stringify({ ok: false, error: `Method ${method} not allowed on ${path}` }),
          {
            status: 405,
            headers: {
              'Content-Type': 'application/json',
              'Allow': Object.keys(handler)
                .filter(k => k.startsWith('onRequest'))
                .map(k => k.replace('onRequest', '').toUpperCase())
                .join(', '),
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }
    }

    // ============ 2. AI/Search 抓取用的關鍵靜態檔案：防 SPA fallback ============
    // wrangler.toml 的 not_found_handling = "single-page-application" 會讓
    // 找不到的檔案 fallback 到 index.html body。這對 HTML 頁面沒問題，但對
    // llms.txt / sitemap.xml / brand-entities.json 這種給 bot 抓的檔案是災難：
    // header 是 text/plain 但 body 是整個 index.html HTML。
    //
    // 解法：這些檔案先明確 fetch，若 assets 回傳的 content-type 是 HTML
    // 就代表發生了 fallback，此時我們直接回 404，不要騙 AI/bot。
    const CRITICAL_STATIC_FILES = new Set([
      '/llms.txt',
      '/robots.txt',
      '/sitemap.xml',
      '/brand-entities.json',
    ]);
    if (CRITICAL_STATIC_FILES.has(path)) {
      const resp = await env.ASSETS.fetch(request);
      const ct = resp.headers.get('content-type') || '';
      // 若 assets 誤 fallback 到 index.html（body 是 HTML），
      // 明確回傳 404 避免給 bot 錯誤內容
      if (ct.includes('text/html')) {
        return new Response(
          `File not found: ${path}\n\nThis file is expected to be served as a static asset.\nIf you see this message in production, the deployment is misconfigured.\n`,
          {
            status: 404,
            headers: {
              'Content-Type': 'text/plain; charset=utf-8',
              'X-Debug-Reason': 'spa-fallback-blocked-for-critical-static-file',
            },
          }
        );
      }
      return resp;
    }

    // ============ 3. 其他靜態資源交給 Assets ============
    // env.ASSETS 由 wrangler.toml 的 [assets] 綁定提供
    // 它會自動處理：找到對應 HTML、404 fallback、_redirects 等
    return env.ASSETS.fetch(request);
  },
};
