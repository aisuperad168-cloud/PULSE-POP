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
 * ============================================================
 */

// 通用表單 handlers
import * as quizHandler from './functions/api/quiz-submit.js';
import * as contactHandler from './functions/api/contact-submit.js';
import * as streamerTestHandler from './functions/api/streamer-test-submit.js';
import * as rookieTestHandler from './functions/api/rookie-test-submit.js';
import * as careersHandler from './functions/api/careers-submit.js';
import * as venuesHandler from './functions/api/venues-submit.js';

// 主播端簽約系統 (/sign/*)
import * as signSubmit from './functions/api/sign/submit.js';
import * as signQuery from './functions/api/sign/query.js';
import * as signAdminList from './functions/api/sign/admin-list.js';
import * as signAdminDetail from './functions/api/sign/admin-detail.js';
import * as signAdminApprove from './functions/api/sign/admin-approve.js';
import * as signAdminDelete from './functions/api/sign/admin-delete.js';
import * as signGetContract from './functions/api/sign/get-contract.js';

// 運營端簽約系統 (/ops/*)
import * as opsSubmit from './functions/api/ops/submit.js';
import * as opsQuery from './functions/api/ops/query.js';
import * as opsGetContract from './functions/api/ops/get-contract.js';
import * as opsAdminList from './functions/api/ops/admin-list.js';
import * as opsAdminDetail from './functions/api/ops/admin-detail.js';
import * as opsAdminApprove from './functions/api/ops/admin-approve.js';
import * as opsAdminDelete from './functions/api/ops/admin-delete.js';

// 公開統計數字（首頁數字條）
import * as statsPublic from './functions/api/stats/public.js';
import * as statsIncrement from './functions/api/stats/increment.js';

// ============ API 路由表 ============
const API_ROUTES = {
  '/api/quiz-submit': quizHandler,
  '/api/contact-submit': contactHandler,
  '/api/streamer-test-submit': streamerTestHandler,
  '/api/rookie-test-submit': rookieTestHandler,
  '/api/careers-submit': careersHandler,
  '/api/venues-submit': venuesHandler,

  // 主播端簽約系統
  '/api/sign/submit': signSubmit,
  '/api/sign/query': signQuery,
  '/api/sign/admin-list': signAdminList,
  '/api/sign/admin-detail': signAdminDetail,
  '/api/sign/admin-approve': signAdminApprove,
  '/api/sign/admin-delete': signAdminDelete,
  '/api/sign/get-contract': signGetContract,

  // 運營端簽約系統
  '/api/ops/submit': opsSubmit,
  '/api/ops/query': opsQuery,
  '/api/ops/get-contract': opsGetContract,
  '/api/ops/admin-list': opsAdminList,
  '/api/ops/admin-detail': opsAdminDetail,
  '/api/ops/admin-approve': opsAdminApprove,
  '/api/ops/admin-delete': opsAdminDelete,

  // 公開統計
  '/api/stats/public': statsPublic,
  '/api/stats/increment': statsIncrement,
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const hostname = url.hostname;

    // ============ 0-A. sign.jdi-pulse.com 子網域 → 主站 /sign/ ============
    if (hostname === 'sign.jdi-pulse.com') {
      if (path.startsWith('/api/')) {
        // API 呼叫 fall through
      } else {
        let targetPath = path;
        if (!path.startsWith('/sign/') && path !== '/sign') {
          targetPath = '/sign' + (path === '/' ? '/' : path);
        }
        const targetUrl = 'https://jdi-pulse.com' + targetPath + url.search;
        return Response.redirect(targetUrl, 301);
      }
    }

    // ============ 0-B. ops.jdi-pulse.com 子網域 → 主站 /ops/ ============
    if (hostname === 'ops.jdi-pulse.com') {
      if (path.startsWith('/api/')) {
        // API 呼叫 fall through
      } else {
        let targetPath = path;
        if (!path.startsWith('/ops/') && path !== '/ops') {
          targetPath = '/ops' + (path === '/' ? '/' : path);
        }
        const targetUrl = 'https://jdi-pulse.com' + targetPath + url.search;
        return Response.redirect(targetUrl, 301);
      }
    }

    // ============ 1. API 路由處理 ============
    const handler = API_ROUTES[path];
    if (handler) {
      const method = request.method.toUpperCase();
      const handlerName = `onRequest${method.charAt(0)}${method.slice(1).toLowerCase()}`;

      if (typeof handler[handlerName] === 'function') {
        try {
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

    // ============ 2. 關鍵靜態檔案：防 SPA fallback ============
    const CRITICAL_STATIC_FILES = new Set([
      '/llms.txt',
      '/robots.txt',
      '/sitemap.xml',
      '/brand-entities.json',
    ]);
    if (CRITICAL_STATIC_FILES.has(path)) {
      const resp = await env.ASSETS.fetch(request);
      const ct = resp.headers.get('content-type') || '';
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
    return env.ASSETS.fetch(request);
  },
};
