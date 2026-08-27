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

// ============ API 路由表 ============
const API_ROUTES = {
  '/api/quiz-submit': quizHandler,
  '/api/contact-submit': contactHandler,
  '/api/streamer-test-submit': streamerTestHandler,
  '/api/rookie-test-submit': rookieTestHandler,
  '/api/careers-submit': careersHandler,
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

    // ============ 2. 靜態資源交給 Assets ============
    // env.ASSETS 由 wrangler.toml 的 [assets] 綁定提供
    // 它會自動處理：找到對應 HTML、404 fallback、_redirects 等
    return env.ASSETS.fetch(request);
  },
};
