/**
 * ============================================================
 * JDI Pulse Media · Analytics Suite
 * ============================================================
 * 集中管理所有網站分析工具，避免每個 HTML 都塞一堆 script
 *
 * 目前追蹤：
 *   1. Cloudflare Web Analytics (即時流量 / 隱私友善 / 無 cookie)
 *   2. Google Analytics 4 (深度事件追蹤 / 轉換分析)
 *   3. Meta Pixel (Facebook / Instagram 廣告受眾建立 & 轉換追蹤)
 *
 * 隱私原則：
 *   - 敏感頁面（含身分證/銀行/合約檢視）→ 只追蹤 pageview，不追蹤欄位內容
 *   - 遮罩合約編號等敏感 URL 參數
 *   - 遵循 GDPR / 台灣個資法
 *
 * 使用方式（在 HTML head 底部加一行）：
 *   <script src="/js/analytics.js?v=20260906" defer></script>
 * ============================================================
 */

(function () {
  'use strict';

  // ============ 設定 ============
  const CF_TOKEN = '2ebdcb57b2a64ae6b412fc6e2d606ce9';
  const GA_ID = 'G-74RJK20F2B';
  const META_PIXEL_ID = '2246962252754517';

  // 敏感頁面白名單（只追蹤 pageview，不記詳細參數）
  const SENSITIVE_PATHS = [
    '/sign/step-',        // 主播基本資料/身分證/簽名
    '/ops/step-',         // 運營基本資料/銀行/大小章
    '/sign/contract-view', // 合約檢視（含身分證圖）
    '/ops/contract-view',  // 合約檢視（含銀行資訊）
    '/sign/admin',         // 後台
    '/ops/admin',
  ];
  const isSensitive = SENSITIVE_PATHS.some(p => location.pathname.startsWith(p));

  // ============ 1. Cloudflare Web Analytics ============
  // 用 module script 動態載入，避免阻擋 first paint
  (function loadCFAnalytics() {
    const s = document.createElement('script');
    s.type = 'module';
    s.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    s.setAttribute('data-cf-beacon', JSON.stringify({ token: CF_TOKEN }));
    document.head.appendChild(s);
  })();

  // ============ 2. Google Analytics 4 ============
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;

  gtag('js', new Date());

  // 敏感頁面：關閉個資追蹤，只留基本 pageview
  if (isSensitive) {
    gtag('config', GA_ID, {
      // 移除 query string（例如 ?no=JDI-OPS-xxx&phone_last4=1234）
      page_path: location.pathname,
      page_location: location.origin + location.pathname,
      anonymize_ip: true,
      allow_google_signals: false,
    });
  } else {
    gtag('config', GA_ID, {
      anonymize_ip: true,
    });
  }

  // 載入 gtag.js
  (function loadGtag() {
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(s);
  })();

  // ============ 3. Meta Pixel (Facebook / Instagram) ============
  // https://developers.facebook.com/docs/meta-pixel/
  // 進階配對（Advanced Matching）說明：
  //   - 首次 init 時匿名訪客沒資料 → 傳空物件 {} 讓 Pixel 啟用自動進階配對
  //   - 當用戶揭露 email/phone（如訂閱電子報）→ 呼叫 jdiFbqSetUser()
  //     會用新資料重新 fbq('init', ...)，Pixel 自動用 SHA-256 hash
  //   - 資料會存進 sessionStorage，SPA 切頁後仍保留配對
  //   - 參考 https://developers.facebook.com/docs/meta-pixel/advanced/advanced-matching/
  const AM_STORAGE_KEY = 'jdi_am';  // Advanced Matching session cache

  // 正規化進階配對欄位（Meta 要求：小寫、trim、去空格/+號）
  function normalizeAM(raw) {
    if (!raw || typeof raw !== 'object') return {};
    const out = {};
    // em: email，全小寫、trim
    if (raw.em) out.em = String(raw.em).trim().toLowerCase();
    // ph: phone，去除 + 空白 - ( )，轉純數字
    if (raw.ph) out.ph = String(raw.ph).replace(/[^0-9]/g, '');
    // fn/ln: first/last name 小寫、trim
    if (raw.fn) out.fn = String(raw.fn).trim().toLowerCase();
    if (raw.ln) out.ln = String(raw.ln).trim().toLowerCase();
    // ct/st/zp/country: 其他配對欄位
    if (raw.ct) out.ct = String(raw.ct).trim().toLowerCase().replace(/\s+/g, '');
    if (raw.st) out.st = String(raw.st).trim().toLowerCase().replace(/\s+/g, '');
    if (raw.zp) out.zp = String(raw.zp).trim().toLowerCase().replace(/\s+/g, '');
    if (raw.country) out.country = String(raw.country).trim().toLowerCase();
    // ge: gender (m/f)
    if (raw.ge) {
      const g = String(raw.ge).trim().toLowerCase();
      if (g === 'm' || g === 'f') out.ge = g;
    }
    // 過濾空值
    Object.keys(out).forEach(k => { if (!out[k]) delete out[k]; });
    return out;
  }

  // 從 sessionStorage 載入已知的進階配對資料
  function loadStoredAM() {
    try {
      const raw = sessionStorage.getItem(AM_STORAGE_KEY);
      if (!raw) return {};
      return normalizeAM(JSON.parse(raw));
    } catch (e) { return {}; }
  }

  // 儲存進階配對資料到 sessionStorage（合併既有的）
  function saveAM(newData) {
    try {
      const merged = Object.assign({}, loadStoredAM(), normalizeAM(newData));
      sessionStorage.setItem(AM_STORAGE_KEY, JSON.stringify(merged));
      return merged;
    } catch (e) { return normalizeAM(newData); }
  }

  // 敏感頁面不收集進階配對（避免身分證/合約相關頁面誤傳）
  function amAllowed() {
    return !isSensitive;
  }

  (function initMetaPixel() {
    if (!META_PIXEL_ID) return;
    // 官方 snippet (轉為 IIFE 安全版)
    !function(f,b,e,v,n,t,s){
      if(f.fbq)return;
      n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;
      n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];
      t=b.createElement(e);t.async=!0;t.src=v;
      s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s);
    }(window, document,'script','https://connect.facebook.net/en_US/fbevents.js');

    // 進階配對：若 session 裡已有資料就帶上；沒有則傳空物件啟用自動進階配對
    const amData = amAllowed() ? loadStoredAM() : {};
    window.fbq('init', META_PIXEL_ID, amData);
    window.fbq('track', 'PageView');
  })();

  // 統一送出到 GA4 + Meta Pixel 的 helper
  // 用法：fbqTrack('Lead', { content_name: 'LINE click' })
  //       fbqTrack('CustomEvent', {...}, true)  ← 第三個參數 true 送 trackCustom
  function fbqTrack(event, params, isCustom) {
    if (!window.fbq) return;
    try {
      if (isCustom) {
        window.fbq('trackCustom', event, params || {});
      } else {
        window.fbq('track', event, params || {});
      }
    } catch (e) { /* silent */ }
  }

  // 進階配對：收到用戶 email/phone 時呼叫（例如訂閱成功、填完表單）
  // 用法：window.jdiFbqSetUser({ em: 'user@example.com' })
  //       window.jdiFbqSetUser({ em: '...', ph: '0912345678' })
  // 效果：合併到 session cache，並用新資料重新 fbq('init', ...) 讓後續事件帶 hash
  function jdiFbqSetUser(userData) {
    if (!window.fbq || !META_PIXEL_ID) return;
    if (!amAllowed()) return;  // 敏感頁面不收集
    try {
      const merged = saveAM(userData);
      if (Object.keys(merged).length > 0) {
        // Meta 官方做法：用新資料重新 init，Pixel 會自動 SHA-256 hash
        window.fbq('init', META_PIXEL_ID, merged);
      }
    } catch (e) { /* silent */ }
  }

  // ============ 4. 自訂事件追蹤 helper ============
  // 給其他 JS 呼叫：window.jdiTrack('event_name', { param: value })
  window.jdiTrack = function (eventName, params) {
    try {
      gtag('event', eventName, params || {});
    } catch (e) { /* 靜默失敗，不影響網站運作 */ }
  };

  // 也對外暴露 fbqTrack，讓其他頁面 JS 可以主動觸發（例如訂閱成功回呼）
  window.jdiFbqTrack = fbqTrack;

  // 進階配對 setter：收到 email / phone 時呼叫（會自動 hash）
  window.jdiFbqSetUser = jdiFbqSetUser;

  // ============ 5. 自動追蹤重要互動 ============
  document.addEventListener('DOMContentLoaded', function () {
    // 5-1: LINE 按鈕點擊 → GA4 line_click + Meta Pixel Lead
    document.querySelectorAll('a[href*="line.me"], a[href*="line://"]').forEach(el => {
      el.addEventListener('click', () => {
        window.jdiTrack('line_click', {
          link_url: el.href,
          link_text: (el.textContent || '').trim().substring(0, 30),
          page_path: location.pathname,
        });
        // Meta Pixel: LINE 諮詢 = 高意圖 Lead
        fbqTrack('Lead', {
          content_name: 'LINE Contact',
          content_category: 'line_click',
          source: location.pathname,
        });
      });
    });

    // 5-2: 電話按鈕點擊 → GA4 phone_click + Meta Pixel Contact
    document.querySelectorAll('a[href^="tel:"]').forEach(el => {
      el.addEventListener('click', () => {
        window.jdiTrack('phone_click', {
          phone: el.getAttribute('href').replace('tel:', ''),
          page_path: location.pathname,
        });
        fbqTrack('Contact', {
          content_name: 'Phone Call',
          content_category: 'phone_click',
          source: location.pathname,
        });
      });
    });

    // 5-3: Email 點擊 → GA4 email_click + Meta Pixel Contact
    document.querySelectorAll('a[href^="mailto:"]').forEach(el => {
      el.addEventListener('click', () => {
        window.jdiTrack('email_click', {
          email: el.getAttribute('href').replace('mailto:', '').split('?')[0],
          page_path: location.pathname,
        });
        fbqTrack('Contact', {
          content_name: 'Email Contact',
          content_category: 'email_click',
          source: location.pathname,
        });
      });
    });

    // 5-4: 主播測驗完成頁 → Meta Pixel CompleteRegistration
    // 兩個測驗都導向 /streamer-test/thanks/
    if (location.pathname.indexOf('/streamer-test/thanks') === 0) {
      fbqTrack('CompleteRegistration', {
        content_name: 'Streamer Test Complete',
        status: true,
      });
    }

    // 5-5: 外部連結點擊
    document.querySelectorAll('a[target="_blank"]').forEach(el => {
      const href = el.href || '';
      if (!href) return;
      // 只追蹤真的外部連結
      try {
        const url = new URL(href, location.origin);
        if (url.hostname && url.hostname !== location.hostname) {
          el.addEventListener('click', () => {
            window.jdiTrack('outbound_click', {
              link_domain: url.hostname,
              link_url: href.substring(0, 200),
              link_text: (el.textContent || '').trim().substring(0, 30),
            });
          });
        }
      } catch (e) { /* invalid URL */ }
    });

    // 5-6: 表單送出（通用）
    document.querySelectorAll('form').forEach(form => {
      form.addEventListener('submit', () => {
        window.jdiTrack('form_submit', {
          form_id: form.id || 'unnamed',
          form_action: form.action || location.pathname,
          page_path: location.pathname,
        });
      });
    });
  });

  // ============ 6. 頁面停留時間追蹤 ============
  let pageStart = Date.now();
  window.addEventListener('beforeunload', function () {
    const duration = Math.round((Date.now() - pageStart) / 1000);
    if (duration > 3 && duration < 3600) {
      window.jdiTrack('page_engagement', {
        engagement_time_seconds: duration,
        page_path: location.pathname,
      });
    }
  });
})();
