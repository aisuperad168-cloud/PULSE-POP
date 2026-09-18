/*!
 * JDI 首頁數據儀表板 v1.2 · 2026-09-17
 * ────────────────────────────────────────
 * v1.2 修正（使用者回饋）：
 *   - 拿掉 0 → 目標值的滾動動畫（造成卡頓）
 *   - 進入視野後直接淡入顯示最終值
 *   - 保留「每小時自動 +N」邏輯（基於基準日期計算）
 *
 * data-* 屬性：
 *   data-target      : 目標數字
 *   data-base        : 基準數字（同 target，用於 hourly 計算）
 *   data-hourly-rate : 每小時應加多少
 *   data-format      : "comma" = 千分位 · "k" = K 縮寫（45800 → 45.8K）
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
    if (format === 'k') {
      // K 縮寫：45800 → 45.8K，1200 → 1.2K，350 → 350
      if (n < 1000) return String(n);
      var k = n / 1000;
      // 保留一位小數，但整數就不顯示 .0
      return (k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)) + 'K';
    }
    if (format === 'comma') return n.toLocaleString('zh-TW');
    return String(n);
  }

  function showFinalValue(el) {
    var target = parseInt(el.dataset.currentValue, 10);
    var format = el.dataset.format;
    el.textContent = formatNumber(target, format);
    el.classList.add('stat-num--revealed');
  }

  function initStats() {
    var nums = document.querySelectorAll('.stat-num[data-target]');
    if (!nums.length) return;

    nums.forEach(function (el) {
      el.dataset.currentValue = computeCurrentValue(el);
      // 預先設定為最終值（讓非 JS 用戶也看到）
      el.textContent = formatNumber(parseInt(el.dataset.currentValue, 10), el.dataset.format);
      // 加入 fade-in class 起始狀態
      el.classList.add('stat-num--fade-init');
    });

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && !entry.target.dataset.animated) {
            entry.target.dataset.animated = 'true';
            // 錯開啟動時間讓 5 個數字依序淡入
            var siblings = Array.prototype.slice.call(entry.target.closest('.stats-container').querySelectorAll('.stat-num'));
            var idx = siblings.indexOf(entry.target);
            setTimeout(function () {
              showFinalValue(entry.target);
            }, idx * 120);
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.2 });
      nums.forEach(function (el) { observer.observe(el); });
    } else {
      // 無 IO 支援 → 直接顯示
      nums.forEach(function (el) {
        el.classList.add('stat-num--revealed');
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
