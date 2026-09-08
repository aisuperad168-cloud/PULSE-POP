/**
 * ============================================================
 * JDI Pulse Media · 首頁數字條
 * ============================================================
 * 從 /api/stats/public 拉數字，滾動動畫顯示
 * 同時觸發 /api/stats/increment 累加瀏覽數
 *
 * 使用方式（在首頁放這個 container）：
 *   <div id="jdi-stats-bar"></div>
 *
 *   <script src="/js/stats-display.js?v=20260907a" defer></script>
 * ============================================================
 */

(function () {
  'use strict';

  const container = document.getElementById('jdi-stats-bar');
  if (!container) return;

  // ============ 樣式 ============
  const style = document.createElement('style');
  style.textContent = `
    .jdi-stats-wrap {
      background: linear-gradient(135deg, #0e1017 0%, #1a1d26 100%);
      border-top: 1px solid rgba(254, 44, 85, 0.15);
      border-bottom: 1px solid rgba(37, 244, 238, 0.1);
      padding: 40px 20px;
      position: relative;
      overflow: hidden;
    }
    .jdi-stats-wrap::before {
      content: '';
      position: absolute;
      top: -50%;
      left: -20%;
      width: 60%;
      height: 200%;
      background: radial-gradient(ellipse, rgba(254,44,85,0.08) 0%, transparent 60%);
      pointer-events: none;
    }
    .jdi-stats-wrap::after {
      content: '';
      position: absolute;
      top: -50%;
      right: -20%;
      width: 60%;
      height: 200%;
      background: radial-gradient(ellipse, rgba(37,244,238,0.05) 0%, transparent 60%);
      pointer-events: none;
    }
    .jdi-stats-inner {
      max-width: 900px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      position: relative;
      z-index: 1;
    }
    .jdi-stat-item {
      text-align: center;
      padding: 12px 8px;
    }
    .jdi-stat-num {
      display: block;
      font-family: 'JetBrains Mono', -apple-system, 'Noto Sans TC', sans-serif;
      font-size: clamp(36px, 8vw, 56px);
      font-weight: 900;
      background: linear-gradient(135deg, #FE2C55 0%, #ff5577 50%, #25F4EE 100%);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      line-height: 1.1;
      letter-spacing: 1px;
      text-shadow: 0 0 40px rgba(254, 44, 85, 0.15);
    }
    .jdi-stat-plus {
      display: inline-block;
      font-size: 0.6em;
      vertical-align: super;
      margin-left: 4px;
      -webkit-text-fill-color: #FE2C55;
      opacity: 0.85;
    }
    .jdi-stat-label {
      display: block;
      margin-top: 8px;
      font-size: clamp(12px, 2.5vw, 14px);
      color: #a1a1aa;
      letter-spacing: 2px;
      font-weight: 500;
    }
    .jdi-stat-label-en {
      display: block;
      margin-top: 2px;
      font-size: 10px;
      color: #52525b;
      letter-spacing: 3px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .jdi-stat-divider {
      display: none;
    }
    @media (min-width: 640px) {
      .jdi-stats-inner {
        grid-template-columns: 1fr auto 1fr;
        gap: 40px;
      }
      .jdi-stat-divider {
        display: block;
        width: 1px;
        background: linear-gradient(to bottom, transparent, rgba(254,44,85,0.3), transparent);
      }
    }
    @media print {
      .jdi-stats-wrap { display: none; }
    }
    /* 預留高度：避免內容載入時整頁 layout shift（CLS）*/
    #jdi-stats-bar { min-height: 180px; }
    @media (max-width: 640px) { #jdi-stats-bar { min-height: 200px; } }
  `;
  document.head.appendChild(style);

  // ============ 建 HTML 結構（用分離的 num-value + plus 節點，動畫只改 textContent 更快）============
  container.innerHTML = `
    <div class="jdi-stats-wrap" role="region" aria-label="JDI 脈動傳媒 · 數據概覽">
      <div class="jdi-stats-inner">
        <div class="jdi-stat-item">
          <span class="jdi-stat-num"><span id="jdi-stat-views">31,978</span><span class="jdi-stat-plus">+</span></span>
          <span class="jdi-stat-label">累計瀏覽人次</span>
          <span class="jdi-stat-label-en">TOTAL PAGE VIEWS</span>
        </div>
        <div class="jdi-stat-divider" aria-hidden="true"></div>
        <div class="jdi-stat-item">
          <span class="jdi-stat-num"><span id="jdi-stat-talents">328</span><span class="jdi-stat-plus">+</span></span>
          <span class="jdi-stat-label">已簽約主播 / 藝人</span>
          <span class="jdi-stat-label-en">SIGNED TALENTS</span>
        </div>
      </div>
    </div>
  `;

  // ============ 動畫計數器（只改 textContent，不動 DOM 結構，超快）============
  function animateNumber(el, target, duration = 1200) {
    // 若尊重 reduced motion 或 target 太小，直接顯示不動畫
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || target < 100) {
      el.textContent = target.toLocaleString('en-US');
      return;
    }

    const start = 0;
    const startTime = performance.now();
    const easeOutQuart = t => 1 - Math.pow(1 - t, 4);
    let lastRendered = -1;

    function tick(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutQuart(progress);
      const current = Math.round(start + (target - start) * eased);
      // 只有數字變了才 render，避免每幀重繪相同值
      if (current !== lastRendered) {
        el.textContent = current.toLocaleString('en-US');
        lastRendered = current;
      }
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // ============ 拉資料 + 觸發動畫 ============
  let animated = false;  // 保險：只播一次
  function playAnimation(views, talents) {
    if (animated) return;
    animated = true;
    animateNumber(document.getElementById('jdi-stat-views'), views);
    animateNumber(document.getElementById('jdi-stat-talents'), talents);
  }

  async function loadAndAnimate() {
    let views = 31978, talents = 328;
    try {
      const res = await fetch('/api/stats/public');
      const data = await res.json();
      if (data.ok || data.views) {
        views = data.views || views;
        talents = data.signed_talents || talents;
      }
    } catch (err) { /* fallback 用基礎值 */ }

    // 先檢查是否已經在視窗內（避免 IntersectionObserver 延遲）
    const rect = container.getBoundingClientRect();
    const inView = rect.top < window.innerHeight && rect.bottom > 0;

    if (inView) {
      // 已在視窗，立刻播
      playAnimation(views, talents);
    } else if ('IntersectionObserver' in window) {
      // 未在視窗，等滾到時播
      const observer = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting) {
          playAnimation(views, talents);
          observer.disconnect();
        }
      }, { threshold: 0.2, rootMargin: '0px 0px -100px 0px' });
      observer.observe(container);
    } else {
      // 舊瀏覽器 fallback
      playAnimation(views, talents);
    }
  }

  // ============ 累加瀏覽數（背景，不阻塞）============
  function incrementView() {
    // 用 sendBeacon 或 fetch keepalive，即使頁面關閉也會送出
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/stats/increment', '{}');
      } else {
        fetch('/api/stats/increment', {
          method: 'POST',
          keepalive: true,
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        });
      }
    } catch (e) { /* silent */ }
  }

  // 延遲執行避免影響 first paint
  if (document.readyState === 'complete') {
    setTimeout(() => { loadAndAnimate(); incrementView(); }, 200);
  } else {
    window.addEventListener('load', () => {
      setTimeout(() => { loadAndAnimate(); incrementView(); }, 200);
    });
  }
})();
