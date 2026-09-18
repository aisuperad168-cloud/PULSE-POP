/*!
 * JDI 熱門文章載入器 v1.0 · 2026-09-17
 * ────────────────────────────────────────
 * 從 /api/stats/hot-articles 拉 TOP 5 動態渲染到 #lcHotList
 */
(function () {
  'use strict';

  var container = document.getElementById('lcHotList');
  if (!container) return;

  function formatViews(n) {
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(n);
  }

  function renderItems(articles) {
    if (!articles || !articles.length) {
      container.innerHTML = '<li class="lc-hot-item lc-hot-item--empty" style="opacity:0.5;text-align:center;padding:24px;">暫無數據，請稍後再訪。</li>';
      return;
    }

    var html = articles.slice(0, 5).map(function (a, i) {
      var rank = i + 1;
      var views7d = formatViews(a.views_7d || 0);
      return (
        '<li>' +
        '<a class="lc-hot-item" data-rank="' + rank + '" href="' + a.url + '">' +
        '<span class="lc-hot-rank">' + rank + '</span>' +
        '<span class="lc-hot-body">' +
        '<span class="lc-hot-title">' + escapeHtml(a.title || a.slug) + '</span>' +
        '<span class="lc-hot-meta">本週 <span class="lc-hot-views">' + views7d + '</span> 人閱讀 · 累積 ' + formatViews(a.views || 0) + '</span>' +
        '</span>' +
        '</a>' +
        '</li>'
      );
    }).join('');

    container.innerHTML = html;
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function loadHotArticles() {
    fetch('/api/stats/hot-articles?limit=5', { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.ok && Array.isArray(data.articles)) {
          renderItems(data.articles);
        } else {
          renderItems([]);
        }
      })
      .catch(function () {
        renderItems([]);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadHotArticles);
  } else {
    loadHotArticles();
  }
})();
