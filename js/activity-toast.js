/*!
 * JDI 訪客即時活動氣泡 v1.0 · 2026-09-17
 * ────────────────────────────────────────
 * 只在指定頁面顯示（首頁 + landing pages）
 * 通用文案（不涉及真實人名），營造網站活力感
 * 
 * 顯示邏輯：
 *   - 頁面載入 15 秒後首次顯示
 *   - 之後每 45-75 秒隨機一次
 *   - 每次顯示 6 秒後淡出
 *   - 使用 sessionStorage 記錄已顯示過的訊息避免重複
 *   - 使用者關閉後 10 分鐘內不再顯示
 */
(function () {
  'use strict';

  // 只在這些頁面顯示
  var ALLOWED_PATHS = [
    '/',
    '/index.html',
    '/join.html',
    '/join',
    '/partnership.html',
    '/partnership',
    '/careers.html',
    '/careers',
    '/venues.html',
    '/venues',
    '/faq.html',
    '/faq'
  ];

  var path = window.location.pathname;
  // 允許尾部 slash 差異
  var normalizedPath = path.replace(/\/+$/, '') || '/';
  var allowed = ALLOWED_PATHS.some(function (p) {
    var np = p.replace(/\/+$/, '') || '/';
    return np === normalizedPath;
  });
  if (!allowed) return;

  // 使用者按 X 關閉後，10 分鐘內不再顯示
  var DISMISS_KEY = 'jdi_activity_toast_dismissed';
  var dismissedAt = parseInt(sessionStorage.getItem(DISMISS_KEY) || '0', 10);
  if (dismissedAt && Date.now() - dismissedAt < 10 * 60 * 1000) return;

  // 訊息池（icon + 文字 + 隨機城市 for 部分訊息）
  var CITIES = ['台北', '新北', '桃園', '台中', '台南', '高雄', '新竹', '嘉義', '彰化', '雲林'];
  function city() { return CITIES[Math.floor(Math.random() * CITIES.length)]; }

  function minAgo(a, b) {
    var m = Math.floor(Math.random() * (b - a + 1)) + a;
    return m + ' 分鐘前';
  }

  var MESSAGES = [
    { icon: '🎯', text: function () { return '剛才有位訪客完成了主播測驗'; } },
    { icon: '💬', text: function () { return city() + '有訪客正在瀏覽職缺頁'; } },
    { icon: '📱', text: function () { return '有人剛透過 LINE 諮詢加入公會'; } },
    { icon: '📊', text: function () { return '本月已新增 12 位主播 · 你也可以是下一位'; } },
    { icon: '🔥', text: function () { return minAgo(2, 8) + '有人閱讀了「守護培養攻略」'; } },
    { icon: '👀', text: function () { return Math.floor(Math.random() * 8 + 3) + ' 人正在看「新人 3 天速成班」'; } },
    { icon: '💎', text: function () { return city() + '主播剛完成本週開播任務'; } },
    { icon: '🌟', text: function () { return minAgo(5, 15) + '有人加入了「LINE 官方帳號」'; } },
    { icon: '🎬', text: function () { return '剛有位新主播完成 3 天速簽流程'; } },
    { icon: '📈', text: function () { return '本週有 4 位主播首次月收破 5 萬'; } },
    { icon: '💡', text: function () { return city() + '有訪客瀏覽了「為什麼選 JDI」文章'; } },
    { icon: '🎁', text: function () { return '本週已媒合 2 個品牌業配案給主播'; } }
  ];

  var shownIndices = new Set();

  function pickMessage() {
    // 如果全部都顯示過，重置
    if (shownIndices.size >= MESSAGES.length) shownIndices.clear();
    var idx;
    do {
      idx = Math.floor(Math.random() * MESSAGES.length);
    } while (shownIndices.has(idx));
    shownIndices.add(idx);
    return MESSAGES[idx];
  }

  // 建立 DOM 容器（一次）
  function ensureContainer() {
    var c = document.getElementById('jdiActivityToastContainer');
    if (c) return c;
    c = document.createElement('div');
    c.id = 'jdiActivityToastContainer';
    c.setAttribute('aria-live', 'polite');
    c.setAttribute('aria-atomic', 'true');
    document.body.appendChild(c);
    return c;
  }

  function showToast() {
    var container = ensureContainer();
    var msg = pickMessage();
    var toast = document.createElement('div');
    toast.className = 'jdi-activity-toast';
    toast.innerHTML =
      '<span class="jdi-toast-icon">' + msg.icon + '</span>' +
      '<span class="jdi-toast-text">' + msg.text() + '</span>' +
      '<button class="jdi-toast-close" aria-label="關閉">&times;</button>';

    container.appendChild(toast);

    // 進場動畫
    requestAnimationFrame(function () {
      toast.classList.add('is-visible');
    });

    // 6 秒後自動移除
    var removeTimer = setTimeout(function () {
      toast.classList.remove('is-visible');
      toast.classList.add('is-leaving');
      setTimeout(function () { toast.remove(); }, 400);
    }, 6000);

    // 關閉按鈕：這次 session 內不再顯示
    toast.querySelector('.jdi-toast-close').addEventListener('click', function () {
      clearTimeout(removeTimer);
      toast.classList.remove('is-visible');
      toast.classList.add('is-leaving');
      setTimeout(function () { toast.remove(); }, 300);
      sessionStorage.setItem(DISMISS_KEY, Date.now().toString());
      stopScheduler();
    });
  }

  var schedulerTimer = null;
  function stopScheduler() {
    if (schedulerTimer) {
      clearTimeout(schedulerTimer);
      schedulerTimer = null;
    }
  }

  function scheduleNext(isFirst) {
    var delay = isFirst ? 15000 : (45000 + Math.random() * 30000); // 首次 15s、之後 45-75s
    schedulerTimer = setTimeout(function () {
      // 若使用者已滾動離開，仍然顯示（右下角浮出）
      if (!document.hidden) {
        showToast();
      }
      scheduleNext(false);
    }, delay);
  }

  // 頁面隱藏時暫停
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stopScheduler();
    else if (!schedulerTimer) scheduleNext(false);
  });

  // 啟動
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { scheduleNext(true); });
  } else {
    scheduleNext(true);
  }
})();
