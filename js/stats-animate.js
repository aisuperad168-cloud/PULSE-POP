/*!
 * JDI 首頁數據儀表板動畫 v1.1 · 2026-09-17
 * ────────────────────────────────────────
 * v1.1 修正：
 *   - 節流：只在整數變化時才 update DOM（大數字千分位不再每 frame reflow）
 *   - 錯開 5 個數字動畫啟動時間，避免同時算
 *   - 縮短動畫時間 1600ms → 1200ms，減少總 frame 數
 *   - will-change 提示
 */
(function () {
  'use strict';

  var BASELINE_TS = new Date('2026-09-17T00:00:00+08:00').getTime();

  function computeCurrentValue(el) {
    var base = parseFloat(el.dataset.base || el.dataset.target || 0);
    var hourlyRate = parseFloat(el.dataset.hourlyRate || 0);
    if (!hourlyRate) return base;
    var hoursPassed = Math.max(0, (Date.now() - BASELINE_TS) / (1000 * 60 * 60));
    return Math.floor(base + hourlyRate * hoursPassed);
  }

  function formatNumber(n, format) {
    if (format === 'comma') return n.toLocaleString('zh-TW');
    return String(n);
  }

  function animateNumber(el, target, duration) {
    var format = el.dataset.format;
    var startTime = null;
    var lastRenderedValue = -1;
    function ease(t) { return 1 - Math.pow(1 - t, 3); }

    // 提示瀏覽器
    el.style.willChange = 'contents';

    function step(ts) {
      if (!startTime) startTime = ts;
      var progress = Math.min((ts - startTime) / duration, 1);
      var value = Math.floor(target * ease(progress));

      // 節流：只在整數值真的變化時才 update DOM
      if (value !== lastRenderedValue) {
        el.textContent = formatNumber(value, format);
        lastRenderedValue = value;
      }

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = formatNumber(target, format);
        el.style.willChange = 'auto'; // 動畫結束移除提示
      }
    }
    requestAnimationFrame(step);
  }

  function initStats() {
    var nums = document.querySelectorAll('.stat-num[data-target]');
    if (!nums.length) return;

    nums.forEach(function (el) {
      el.dataset.currentValue = computeCurrentValue(el);
    });

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && !entry.target.dataset.animated) {
            entry.target.dataset.animated = 'true';
            var target = parseInt(entry.target.dataset.currentValue, 10);
            // 錯開啟動時間：0ms / 100ms / 200ms / 300ms / 400ms
            var siblings = Array.prototype.slice.call(entry.target.closest('.stats-container').querySelectorAll('.stat-num'));
            var idx = siblings.indexOf(entry.target);
            setTimeout(function () {
              animateNumber(entry.target, target, 1200);
            }, idx * 100);
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.3 });
      nums.forEach(function (el) { observer.observe(el); });
    } else {
      nums.forEach(function (el) {
        el.textContent = formatNumber(parseInt(el.dataset.currentValue, 10), el.dataset.format);
      });
    }
  }

  function updateLastUpdateLabel() {
    var el = document.getElementById('statsLastUpdate');
    if (!el) return;
    var minutes = Math.floor(Math.random() * 15) + 1;
    if (minutes < 5) el.textContent = '剛剛';
    else el.textContent = minutes + ' 分鐘前';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initStats();
      updateLastUpdateLabel();
    });
  } else {
    initStats();
    updateLastUpdateLabel();
  }
})();
