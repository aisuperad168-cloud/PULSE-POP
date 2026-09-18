/*!
 * JDI 文章瀏覽追蹤 v1.0 · 2026-09-17
 * ────────────────────────────────────────
 * 自動偵測是否在 /live-center/article/{slug}/ 頁面
 * 頁面停留 5 秒後 async ping /api/stats/article-view
 * 一次 session 內同一文章只 ping 一次
 */
(function () {
  'use strict';

  var match = window.location.pathname.match(/^\/live-center\/article\/([a-z0-9-]+)\/?/);
  if (!match) return;

  var slug = match[1];
  var sessionKey = 'jdi_article_pinged_' + slug;

  // 一次 session 內只 ping 一次
  if (sessionStorage.getItem(sessionKey)) return;

  // 停留 5 秒後才記錄（避免搜尋引擎爬蟲、快速跳出）
  var STAY_MS = 5000;
  var timerId = null;

  function pingView() {
    if (sessionStorage.getItem(sessionKey)) return;
    sessionStorage.setItem(sessionKey, '1');

    // 取文章 title
    var title = document.title.split(' | ')[0].split(' - ')[0].trim().slice(0, 200);

    // 使用 sendBeacon 或 fetch keepalive
    var body = JSON.stringify({ slug: slug, title: title });
    if (navigator.sendBeacon) {
      var blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon('/api/stats/article-view', blob);
    } else {
      fetch('/api/stats/article-view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body,
        keepalive: true,
      }).catch(function () { /* silent */ });
    }
  }

  function start() {
    timerId = setTimeout(pingView, STAY_MS);
    // 如果使用者在 5 秒內就離開頁面，也 ping 一次（避免遺漏）
    window.addEventListener('pagehide', function () {
      if (timerId) {
        clearTimeout(timerId);
        pingView();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
