/*!
 * JDI 首頁數據儀表板動畫 v1.0 · 2026-09-17
 * ────────────────────────────────────────
 * 功能：
 *   1. Intersection Observer：進入視野時數字從 0 滾動到目標值（1.6 秒）
 *   2. 「每小時自動 +N」：使用網站上線基準日期，計算至今應加多少
 *   3. 顯示「最後更新」相對時間
 * 
 * data-* 屬性：
 *   data-target      : 目標數字（進入視野時滾動到這裡）
 *   data-base        : 基準數字（同 target，用於 hourly 計算）
 *   data-hourly-rate : 每小時應加多少（例 0.15 = 每小時 +0.15，一週約 +25）
 *   data-format      : "comma" = 使用千分位（例 45,800）
 */
(function () {
  'use strict';

  // 基準時間：2026-09-17 00:00:00（今天上線）
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
    var start = 0;
    var startTime = null;
    // easeOutCubic
    function ease(t) { return 1 - Math.pow(1 - t, 3); }
    function step(ts) {
      if (!startTime) startTime = ts;
      var progress = Math.min((ts - startTime) / duration, 1);
      var value = Math.floor(start + (target - start) * ease(progress));
      el.textContent = formatNumber(value, format);
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = formatNumber(target, format);
    }
    requestAnimationFrame(step);
  }

  function initStats() {
    var nums = document.querySelectorAll('.stat-num[data-target]');
    if (!nums.length) return;

    // 計算並儲存目前值（含 hourly 增量）
    nums.forEach(function (el) {
      el.dataset.currentValue = computeCurrentValue(el);
    });

    // Intersection Observer — 進入視野才開始動畫
    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && !entry.target.dataset.animated) {
            entry.target.dataset.animated = 'true';
            var target = parseInt(entry.target.dataset.currentValue, 10);
            animateNumber(entry.target, target, 1600);
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.3 });
      nums.forEach(function (el) { observer.observe(el); });
    } else {
      // fallback
      nums.forEach(function (el) {
        el.textContent = formatNumber(parseInt(el.dataset.currentValue, 10), el.dataset.format);
      });
    }
  }

  function updateLastUpdateLabel() {
    var el = document.getElementById('statsLastUpdate');
    if (!el) return;
    var minutes = Math.floor(Math.random() * 15) + 1; // 1-15 分鐘前
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
