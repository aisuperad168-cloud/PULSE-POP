/*!
 * JDI 主播開播模擬器 v1.0 · 2026-09-17
 * ────────────────────────────────────────
 * 5 題情境 · 計分 · 分型 · Canvas 分享圖（含 JDI 浮水印）
 */
(function () {
  'use strict';

  // ============ 題目資料 ============
  var QUESTIONS = [
    {
      scenario: '你的直播間剛開播 10 分鐘',
      text: '目前只有 3 個觀眾在線，你會...',
      options: [
        { key: 'A', text: '演給空氣看，繼續維持熱度和節奏', score: 3 },
        { key: 'B', text: '暫停一下私訊朋友來看，衝一波人氣', score: 2 },
        { key: 'C', text: '關掉重開，覺得時間點不對', score: 0 },
      ],
    },
    {
      scenario: '直播中',
      text: '突然有觀眾送你一個 500 元的火箭禮物，你會...',
      options: [
        { key: 'A', text: '尖叫感謝 + 大聲喊名字 + 演一段答謝', score: 3 },
        { key: 'B', text: '主動點名，並問對方是想聽什麼歌', score: 2 },
        { key: 'C', text: '默默感謝一下，繼續原本流程', score: 1 },
      ],
    },
    {
      scenario: '一個新觀眾第 5 次在留言區問',
      text: '「主播可以私 LINE 嗎？」你會...',
      options: [
        { key: 'A', text: '引導他先加官方帳號、追隨粉絲團', score: 3 },
        { key: 'B', text: '暫時忽略，怕答錯得罪人', score: 1 },
        { key: 'C', text: '直接私訊自己的 LINE ID', score: 0 },
      ],
    },
    {
      scenario: '你正在唱一首拿手歌',
      text: '副歌部分居然忘詞了！你會...',
      options: [
        { key: 'A', text: '自嘲「哈哈忘詞了大家別罵」，順勢改編', score: 3 },
        { key: 'B', text: '停下來說「等等我重來一次」', score: 2 },
        { key: 'C', text: '假裝斷網幾秒，重新調整', score: 1 },
      ],
    },
    {
      scenario: '凌晨 1 點，你已經播了 4 小時',
      text: '螢幕還有 20 個死忠觀眾不睡，你會...',
      options: [
        { key: 'A', text: '感謝大家，延長 30 分鐘做深度聊天', score: 3 },
        { key: 'B', text: '開放點歌，唱到 2 點再下播', score: 2 },
        { key: 'C', text: '準時下播，跟大家約明天', score: 1 },
      ],
    },
  ];

  // ============ 結果分型 ============
  // 滿分 15，分為 5 型
  var RESULT_TYPES = [
    {
      min: 13, max: 15,
      title: '業界之光',
      subtitle: 'INDUSTRY STAR',
      color: '#FFC53D',
      emoji: '👑',
      desc: '<strong class="sim-result-highlight">恭喜！你的直播人格是頂尖等級。</strong>不論高潮低谷、順風逆風，你都能穩住場面且推進節奏。這種臨場感就是頭部主播的核心特質——粉絲會因為你「懂得經營每一秒」而追隨。<br/><br/>👉 <strong>適合路線</strong>：主打 <span class="sim-result-highlight">PK 競技 / 聊天陪伴 / 才藝表演</span> 三大熱門類型皆宜。JDI 通常會將這類特質的主播直接排入 <strong>3 天速簽 + 現金保底</strong> 方案。',
    },
    {
      min: 10, max: 12,
      title: '明日之星',
      subtitle: 'RISING STAR',
      color: '#25F4EE',
      emoji: '⭐',
      desc: '<strong class="sim-result-highlight">你有很強的主播潛力！</strong>反應快、懂互動，只差一些「舞台經驗」的打磨。系統性的培訓 + 一個對的經紀團隊，就能讓你在 3-6 個月內快速崛起。<br/><br/>👉 <strong>適合路線</strong>：<span class="sim-result-highlight">才藝生活型 / 綜藝互動型</span>。建議先從 JDI 的新人培訓課程開始，同時鎖定黃金時段（19:00-23:00）練基本功。',
    },
    {
      min: 7, max: 9,
      title: '穩健派',
      subtitle: 'STEADY',
      color: '#06C755',
      emoji: '🌱',
      desc: '<strong class="sim-result-highlight">你是「陪伴型主播」的優質種子。</strong>不會用高張力抓眼球，但你的耐心與穩定感，能建立死忠的鐵粉群。這類主播通常收入穩、留存率高，長期發展很紮實。<br/><br/>👉 <strong>適合路線</strong>：<span class="sim-result-highlight">聊天陪伴型 / 菜單直播 / 深夜情感電台</span>。JDI 有多位月收破 5 萬的鐵粉型主播都是這種特質。',
    },
    {
      min: 4, max: 6,
      title: '新人啟發',
      subtitle: 'BEGINNER',
      color: '#FF6B35',
      emoji: '🎯',
      desc: '<strong class="sim-result-highlight">你需要一段「刻意練習」的養成期。</strong>目前的直感還不夠成熟，但這不代表沒機會——90% 頂尖主播剛開始都是這樣！關鍵是<strong>有沒有一套系統化訓練</strong>把你補強。<br/><br/>👉 <strong>適合路線</strong>：先從 <span class="sim-result-highlight">短影音 + 小規模直播</span> 練基本功。JDI 有 3 天速成班 + 1 對 1 經紀指導，能幫你避開 90% 的新手雷區。',
    },
    {
      min: 0, max: 3,
      title: '待琢磨',
      subtitle: 'EXPLORER',
      color: '#a855f7',
      emoji: '🎭',
      desc: '<strong class="sim-result-highlight">誠實說：直播主可能不是你此刻的最佳選擇。</strong>但別灰心！直播產業有很多幕後角色（主播經紀人、剪輯師、社群小編、場控）都很缺人，這些工作**不需要臨場反應力**但一樣能參與這個有趣的行業。<br/><br/>👉 <strong>建議探索</strong>：<span class="sim-result-highlight">主播經紀 / 直播工程 / 剪輯</span> 職缺。JDI 目前開放 8 個相關職缺，月薪 30-60K，先卡位再說。',
    },
  ];

  function getResult(score) {
    for (var i = 0; i < RESULT_TYPES.length; i++) {
      if (score >= RESULT_TYPES[i].min && score <= RESULT_TYPES[i].max) {
        return RESULT_TYPES[i];
      }
    }
    return RESULT_TYPES[RESULT_TYPES.length - 1];
  }

  // ============ 狀態 ============
  var state = {
    current: 0,
    scores: [],
  };

  var $ = function (id) { return document.getElementById(id); };

  // ============ Intro → Quiz ============
  function startQuiz() {
    state.current = 0;
    state.scores = [];
    closeShareModal(); // 保險：關閉可能開著的 modal
    $('simIntro').classList.add('sim-hide');
    $('simQuiz').classList.remove('sim-hide');
    $('simResult').classList.add('sim-hide');
    $('simRetryBtn').classList.add('sim-hide');
    renderProgress();
    renderQuestion();
    // GA / Pixel 追蹤
    try {
      if (window.gtag) window.gtag('event', 'simulator_start', { event_category: 'streamer_simulator' });
      if (window.fbq) window.fbq('trackCustom', 'SimulatorStart');
    } catch (e) { /* ignore */ }
  }

  function renderProgress() {
    var p = $('simProgress');
    p.innerHTML = '';
    for (var i = 0; i < QUESTIONS.length; i++) {
      var dot = document.createElement('span');
      dot.className = 'sim-progress-dot';
      if (i < state.current) dot.classList.add('done');
      else if (i === state.current) dot.classList.add('active');
      p.appendChild(dot);
    }
  }

  function renderQuestion() {
    var q = QUESTIONS[state.current];
    $('simQNum').textContent = 'Q ' + (state.current + 1) + ' / ' + QUESTIONS.length;
    $('simQScenario').textContent = '情境：' + q.scenario;
    $('simQText').textContent = q.text;

    var opts = $('simOptions');
    opts.innerHTML = '';
    q.options.forEach(function (opt, idx) {
      var btn = document.createElement('button');
      btn.className = 'sim-option';
      btn.type = 'button';
      btn.innerHTML =
        '<span class="sim-option-key">' + opt.key + '</span>' +
        '<span class="sim-option-text">' + escapeHtml(opt.text) + '</span>';
      btn.addEventListener('click', function () { pickOption(opt); });
      opts.appendChild(btn);
    });

    // 觸發動畫（remove/add class 讓 CSS animation 重播）
    var qCard = $('simQuestion');
    qCard.style.animation = 'none';
    qCard.offsetHeight; // reflow
    qCard.style.animation = '';
  }

  function pickOption(opt) {
    state.scores.push(opt.score);
    state.current++;
    if (state.current >= QUESTIONS.length) {
      finishQuiz();
    } else {
      renderProgress();
      renderQuestion();
    }
  }

  // 儲存目前的分享資料（給 native share 用）
  var currentShare = { dataUrl: null, blob: null, file: null, result: null, score: 0 };

  function finishQuiz() {
    var total = state.scores.reduce(function (a, b) { return a + b; }, 0);
    var result = getResult(total);

    // 顯示結果頁（分型 + 詳細描述）
    $('simQuiz').classList.add('sim-hide');
    $('simResult').classList.remove('sim-hide');
    $('simResultTitle').textContent = result.emoji + ' ' + result.title;
    $('simResultScore').textContent = total;
    $('simResultDesc').innerHTML = result.desc;
    $('simRetryBtn').classList.remove('sim-hide');

    currentShare.result = result;
    currentShare.score = total;

    // 回到頁頂
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Analytics: complete
    try {
      if (window.gtag) window.gtag('event', 'simulator_complete', {
        event_category: 'streamer_simulator',
        value: total,
        result_type: result.title,
      });
      if (window.fbq) window.fbq('trackCustom', 'SimulatorComplete', {
        score: total,
        result: result.title,
      });
    } catch (e) { /* ignore */ }

    // 同步預先產生分享圖（不阻塞 modal 開啟）
    generateShareImage(result, total).catch(function () { /* ignore */ });

    // 800ms 後跳出分享 modal（此時圖通常已準備好）
    setTimeout(function () {
      openShareModal(result, total);
    }, 800);
  }

  function openShareModal(result, total) {
    var modal = $('simShareModal');
    if (!modal) return;

    // 重置狀態
    var hint = $('simShareHint');
    hint.textContent = '';
    hint.className = 'sim-share-hint';

    var nativeBtn = $('simShareNative');
    var dlBtn = $('simShareDownload');
    // 重置：預設 native 隱藏、download 顯示（primary）
    nativeBtn.classList.add('sim-hide');
    dlBtn.classList.remove('sim-hide');
    dlBtn.classList.remove('sim-btn--ghost');
    dlBtn.classList.add('sim-btn--primary');

    var preview = $('simSharePreview');
    var previewLoading = $('simPreviewLoading');
    preview.classList.add('is-loading');
    previewLoading.classList.remove('is-hidden');

    modal.classList.remove('sim-hide');
    document.body.style.overflow = 'hidden'; // 鎖 scroll

    // Analytics: modal_open
    try {
      if (window.gtag) window.gtag('event', 'simulator_share_modal_open', {
        event_category: 'streamer_simulator',
        result_type: result.title,
      });
    } catch (e) { /* ignore */ }

    // 讀取本月已參加人數（social proof · 靜默失敗）
    fetchLotteryParticipants();

    // 產生分享圖
    generateShareImage(result, total).then(function (dataUrl) {
      preview.src = dataUrl;
      preview.classList.remove('is-loading');
      previewLoading.classList.add('is-hidden');

      currentShare.dataUrl = dataUrl;
      currentShare.blob = dataUrlToBlob(dataUrl);
      try {
        currentShare.file = new File([currentShare.blob], 'jdi-streamer-type.png', { type: 'image/png' });
      } catch (e) {
        currentShare.file = null;
      }

      // dlBtn 用 blob URL 讓桌機可另開分頁看
      if (currentShare.blob) {
        // 撤銷舊 URL
        if (dlBtn._blobUrl) URL.revokeObjectURL(dlBtn._blobUrl);
        dlBtn._blobUrl = URL.createObjectURL(currentShare.blob);
        dlBtn.href = dlBtn._blobUrl;
      } else {
        dlBtn.href = dataUrl;
      }

      // 判斷該顯示哪個按鈕（不再兩顆都顯示）
      var canNative = supportsNativeShare();
      var canShareFile = canNative && currentShare.file && navigator.canShare && navigator.canShare({ files: [currentShare.file] });

      // 隱藏兩個先，再選一個顯示（避免 UI 混亂）
      nativeBtn.classList.add('sim-hide');
      dlBtn.classList.add('sim-hide');

      if (canShareFile || (canNative && isMobile())) {
        // 手機/支援檔案分享：只顯示 native
        nativeBtn.classList.remove('sim-hide');
        nativeBtn.innerHTML = '📱 立即分享到社群';
      } else {
        // 桌機/不支援：只顯示「另開圖片」
        dlBtn.classList.remove('sim-hide');
      }

    }).catch(function (err) {
      console.error('[simulator] share image error:', err);
      dlBtn.classList.remove('sim-hide');
      dlBtn.classList.add('sim-btn--primary');
      preview.classList.remove('is-loading');
      previewLoading.classList.add('is-hidden');
      hint.textContent = '⚠️ 分享圖產生失敗，請再試一次';
      hint.classList.add('is-error');
    });
  }

  function closeShareModal() {
    var modal = $('simShareModal');
    if (!modal) return;
    modal.classList.add('sim-hide');
    document.body.style.overflow = '';
  }

  // ============ Native Share 邏輯 ============
  function supportsNativeShare() {
    return typeof navigator !== 'undefined'
      && typeof navigator.share === 'function';
  }

  function isMobile() {
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent || '')
      || (navigator.maxTouchPoints && navigator.maxTouchPoints > 1);
  }

  function dataUrlToBlob(dataUrl) {
    try {
      var parts = dataUrl.split(',');
      var meta = parts[0];
      var mimeMatch = meta.match(/:([^;]+);/);
      var mime = mimeMatch ? mimeMatch[1] : 'image/png';
      var binary = atob(parts[1]);
      var len = binary.length;
      var bytes = new Uint8Array(len);
      for (var i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
      return new Blob([bytes], { type: mime });
    } catch (e) {
      return null;
    }
  }

  function handleNativeShare() {
    if (!currentShare.result) return;
    var hint = $('simShareHint');
    hint.className = 'sim-share-hint';
    hint.textContent = '';

    // 完整分享文案：結果 + 本月獎品 + 網址
    var shareText =
      '我在 JDI 開播模擬器測出了「' + currentShare.result.title + '」！臨場反應力 ' + currentShare.score + '/15 分 🎬\n\n' +
      '🎁 分享這篇 + 截圖給官方 LINE @354ykfbp\n' +
      '👉 就能參加抽獎！本月獎品：直播聲卡套組 + 補光燈 🎙️💡\n\n' +
      '你也來測看看：';

    var shareData = {
      title: '我的主播人格：' + currentShare.result.title + ' · JDI 開播模擬器',
      text: shareText,
      url: 'https://jdi-pulse.com/streamer-simulator/?utm_source=share&utm_medium=' + encodeURIComponent(currentShare.result.title),
    };

    // 有 file 且支援檔案分享
    if (currentShare.file && navigator.canShare && navigator.canShare({ files: [currentShare.file] })) {
      shareData.files = [currentShare.file];
    }

    // 標記「使用者剛按了分享」— 用來偵測回訪
    sessionStorage.setItem('jdi_just_shared', String(Date.now()));

    navigator.share(shareData).then(function () {
      hint.innerHTML = '✅ 分享成功！';
      hint.classList.add('is-success');
      trackShare('native');
      // 分享成功後跳出大提醒
      showLineReminderModal();
    }).catch(function (err) {
      // 使用者取消不算錯
      if (err && err.name === 'AbortError') {
        hint.textContent = '';
        sessionStorage.removeItem('jdi_just_shared');
        return;
      }
      console.warn('[simulator] native share failed:', err);
      hint.textContent = '⚠️ 分享失敗，請再試一次';
      hint.classList.add('is-error');
    });
  }

  // ============ 分享後大提醒 modal ============
  function showLineReminderModal() {
    // 若已顯示過就不重複
    if (document.getElementById('simLineReminderModal')) return;

    var modal = document.createElement('div');
    modal.id = 'simLineReminderModal';
    modal.className = 'sim-modal sim-line-reminder-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML =
      '<div class="sim-modal-backdrop" data-close></div>' +
      '<div class="sim-modal-panel sim-line-reminder-panel">' +
        '<button class="sim-modal-close" data-close aria-label="關閉">×</button>' +
        '<div class="sim-line-reminder-icon">📸</div>' +
        '<h2 class="sim-line-reminder-title">最後一步！</h2>' +
        '<p class="sim-line-reminder-sub">' +
          '<strong style="color:#FFC53D;font-size:17px;">截圖你剛剛分享的畫面</strong><br/>' +
          '傳給官方 LINE 就完成抽獎登記 🎁' +
        '</p>' +
        '<div class="sim-line-reminder-steps">' +
          '<div class="sim-lr-step">1. 打開你剛才分享的貼文</div>' +
          '<div class="sim-lr-step">2. 截圖分享頁面（Screenshot）</div>' +
          '<div class="sim-lr-step">3. 打開官方 LINE @354ykfbp</div>' +
          '<div class="sim-lr-step">4. 傳截圖過去 · 完成抽獎登記！</div>' +
        '</div>' +
        '<a href="https://line.me/R/ti/p/@354ykfbp" target="_blank" rel="noopener" class="sim-btn sim-btn--line sim-lr-cta-btn">' +
          '💬 打開官方 LINE 傳截圖' +
        '</a>' +
        '<button class="sim-lr-later" type="button" data-close>我知道了，晚點傳</button>' +
      '</div>';

    document.body.appendChild(modal);

    // 綁定關閉
    var closeAll = function () {
      modal.classList.add('sim-hide');
      setTimeout(function () { modal.remove(); }, 300);
    };
    modal.querySelectorAll('[data-close]').forEach(function (el) {
      el.addEventListener('click', closeAll);
    });

    // ESC 關閉
    var escHandler = function (e) {
      if (e.key === 'Escape') {
        closeAll();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);

    // 追蹤
    try {
      if (window.gtag) window.gtag('event', 'simulator_line_reminder_shown', {
        event_category: 'streamer_simulator',
      });
    } catch (e) { /* ignore */ }
  }

  // ============ 從外部返回時的提醒（visibilitychange） ============
  function setupReturnReminder() {
    // 使用者切離頁面（可能去 IG/Threads 分享）後回來 → 提醒截圖 LINE
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState !== 'visible') return;
      var justShared = sessionStorage.getItem('jdi_just_shared');
      if (!justShared) return;
      var elapsed = Date.now() - parseInt(justShared, 10);
      // 只在 3 秒 - 5 分鐘之間顯示（太快是取消、太久可能已忘）
      if (elapsed < 3000 || elapsed > 300000) return;
      // 只顯示一次
      sessionStorage.removeItem('jdi_just_shared');
      // 稍微延遲避免頁面 render 卡頓
      setTimeout(showLineReminderModal, 800);
    });
  }

  function retryQuiz() {
    closeShareModal();
    startQuiz();
  }

  // ============ Canvas 分享圖生成 v2 ============
  // Cache 已產生的圖，同一個結果不重複生成
  var _shareImageCache = null;
  var _shareImageResult = null;

  function generateShareImage(result, score) {
    // 若同結果已產生過，直接回用（重要：加速二次分享）
    if (_shareImageCache && _shareImageResult === result.title + '_' + score) {
      return Promise.resolve(_shareImageCache);
    }

    return new Promise(function (resolve, reject) {
      var canvas = $('simShareCanvas');
      var ctx = canvas.getContext('2d');
      var W = canvas.width;  // 1080
      var H = canvas.height; // 1080

      // 背景漸層（深黑→深藍紫）
      var bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, '#0a0a0f');
      bgGrad.addColorStop(0.5, '#1a1a2e');
      bgGrad.addColorStop(1, '#0a0a0f');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // 光暈裝飾（左上紅、右下青）
      var glow1 = ctx.createRadialGradient(200, 200, 0, 200, 200, 400);
      glow1.addColorStop(0, 'rgba(232, 57, 42, 0.35)');
      glow1.addColorStop(1, 'rgba(232, 57, 42, 0)');
      ctx.fillStyle = glow1;
      ctx.fillRect(0, 0, W, H);

      var glow2 = ctx.createRadialGradient(W - 200, H - 200, 0, W - 200, H - 200, 400);
      glow2.addColorStop(0, 'rgba(37, 244, 238, 0.25)');
      glow2.addColorStop(1, 'rgba(37, 244, 238, 0)');
      ctx.fillStyle = glow2;
      ctx.fillRect(0, 0, W, H);

      // 頂部標籤
      ctx.font = '600 32px "Noto Sans TC", sans-serif';
      ctx.fillStyle = 'rgba(255, 197, 61, 0.85)';
      ctx.textAlign = 'center';
      ctx.fillText('🎬 主播開播模擬器 · 結果報告', W / 2, 130);

      // Emoji 圖示
      ctx.font = '180px "Noto Sans TC", sans-serif';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText(result.emoji, W / 2, 320);

      // 主標題（結果類型名）
      ctx.font = '900 96px "Noto Sans TC", sans-serif';
      ctx.fillStyle = result.color;
      ctx.textAlign = 'center';
      ctx.fillText(result.title, W / 2, 460);

      // 英文副標
      ctx.font = '500 32px "Inter", sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.fillText(result.subtitle, W / 2, 510);

      // 分數區塊背景
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      roundRect(ctx, W / 2 - 260, 570, 520, 200, 24, true, false);
      ctx.strokeStyle = 'rgba(37, 244, 238, 0.3)';
      ctx.lineWidth = 2;
      roundRect(ctx, W / 2 - 260, 570, 520, 200, 24, false, true);

      ctx.font = '500 28px "Noto Sans TC", sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.textAlign = 'center';
      ctx.fillText('臨場反應力', W / 2, 630);

      ctx.font = '900 130px "Inter", sans-serif';
      ctx.fillStyle = '#25F4EE';
      ctx.fillText(score, W / 2 - 30, 745);

      ctx.font = '600 40px "Inter", sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.fillText('/ 15', W / 2 + 90, 745);

      // 🎁 抽獎徽章（醒目金色橢圓 · 本月獎品）
      var badgeText = '🎁 本月抽 直播聲卡 · 補光燈 · 手機支架';
      ctx.font = '700 26px "Noto Sans TC", sans-serif';
      ctx.textAlign = 'center';
      var badgeMetrics = ctx.measureText(badgeText);
      var badgeW = badgeMetrics.width + 40;
      var badgeH = 42;
      var badgeX = (W - badgeW) / 2;
      var badgeY = 820;
      // 徽章底
      var badgeGrad = ctx.createLinearGradient(0, badgeY, 0, badgeY + badgeH);
      badgeGrad.addColorStop(0, 'rgba(255, 197, 61, 0.25)');
      badgeGrad.addColorStop(1, 'rgba(232, 57, 42, 0.2)');
      ctx.fillStyle = badgeGrad;
      roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 21, true, false);
      ctx.strokeStyle = 'rgba(255, 197, 61, 0.6)';
      ctx.lineWidth = 2;
      roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 21, false, true);
      // 徽章文字
      ctx.fillStyle = '#FFD56B';
      ctx.fillText(badgeText, W / 2, badgeY + 29);

      // 呼籲文字
      ctx.font = '500 28px "Noto Sans TC", sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.textAlign = 'center';
      ctx.fillText('你也來測測看？', W / 2, 900);

      ctx.font = '700 32px "Noto Sans TC", sans-serif';
      ctx.fillStyle = '#fff';
      ctx.fillText('jdi-pulse.com/streamer-simulator', W / 2, 946);

      // ============ 品牌浮水印區（底部）============
      // 底部漸變透明遮罩
      var footerGrad = ctx.createLinearGradient(0, H - 150, 0, H);
      footerGrad.addColorStop(0, 'rgba(232, 57, 42, 0)');
      footerGrad.addColorStop(1, 'rgba(232, 57, 42, 0.15)');
      ctx.fillStyle = footerGrad;
      ctx.fillRect(0, H - 150, W, 150);

      // JDI Logo（左）— 用純文字繪製避免 CORS + 載入等待問題
      // 純文字風格：紅色 "JDI" logo + 品牌文字
      var drawBrandBottom = function (logoSuccess, logoImg) {
        if (logoSuccess && logoImg) {
          try {
            var logoH = 70;
            var logoW = (logoImg.naturalWidth * logoH / logoImg.naturalHeight);
            ctx.drawImage(logoImg, 80, H - 110, logoW, logoH);
          } catch (e) {
            drawTextLogo();
          }
        } else {
          drawTextLogo();
        }

        // 品牌文字（右）
        ctx.font = '700 36px "Noto Sans TC", sans-serif';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'right';
        ctx.fillText('JDI 脈動傳媒', W - 80, H - 80);
        ctx.font = '500 24px "Inter", sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fillText('TikTok LIVE 官方合作經紀公會', W - 80, H - 45);

        // 匯出
        try {
          var dataUrl = canvas.toDataURL('image/png', 0.9);
          _shareImageCache = dataUrl;
          _shareImageResult = result.title + '_' + score;
          resolve(dataUrl);
        } catch (err) {
          reject(err);
        }
      };

      function drawTextLogo() {
        // 純文字 JDI 標誌
        ctx.font = '900 56px "Inter", sans-serif';
        ctx.fillStyle = '#E8392A';
        ctx.textAlign = 'left';
        ctx.fillText('JDI', 80, H - 65);
        ctx.font = '600 18px "Inter", sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillText('PULSE MEDIA', 80, H - 40);
      }

      // 嘗試載入 logo，最多等 500ms（不阻塞）
      var logoImg = $('simWatermarkLogo');
      var logoResolved = false;

      function finalize(withLogo) {
        if (logoResolved) return;
        logoResolved = true;
        drawBrandBottom(withLogo, logoImg);
      }

      if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
        // 已載入
        finalize(true);
      } else if (logoImg) {
        // 未載入 → 等 500ms，超時就用文字 fallback
        var timeout = setTimeout(function () { finalize(false); }, 500);
        logoImg.onload = function () {
          clearTimeout(timeout);
          finalize(true);
        };
        logoImg.onerror = function () {
          clearTimeout(timeout);
          finalize(false);
        };
      } else {
        finalize(false);
      }
    });
  }

  // Round rect helper
  function roundRect(ctx, x, y, w, h, r, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ============ 事件綁定 ============
  function init() {
    $('simStartBtn').addEventListener('click', startQuiz);
    $('simRetryBtn').addEventListener('click', retryQuiz);

    // 分享後回來時的提醒
    setupReturnReminder();

    var nativeBtn = $('simShareNative');
    if (nativeBtn) nativeBtn.addEventListener('click', handleNativeShare);

    // 下載按鈕追蹤
    var dlBtn = $('simShareDownload');
    if (dlBtn) {
      dlBtn.addEventListener('click', function () {
        trackShare('download');
      });
    }

    // LINE 抽獎按鈕：ping API + 追蹤
    var lineBtn = $('simLineShareBtn');
    if (lineBtn) {
      lineBtn.addEventListener('click', function () {
        trackShare('line_lottery');
        registerLotteryEntry();
      });
    }

    // Modal 關閉
    var closeBtn = $('simModalClose');
    var backdrop = $('simModalBackdrop');
    var laterBtn = $('simModalLater');
    if (closeBtn) closeBtn.addEventListener('click', closeShareModal);
    if (backdrop) backdrop.addEventListener('click', closeShareModal);
    if (laterBtn) laterBtn.addEventListener('click', closeShareModal);

    // ESC 關閉
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        var modal = $('simShareModal');
        if (modal && !modal.classList.contains('sim-hide')) closeShareModal();
      }
    });
  }

  function trackShare(method) {
    try {
      if (window.gtag) window.gtag('event', 'simulator_share_' + method, {
        event_category: 'streamer_simulator',
        result_type: currentShare.result ? currentShare.result.title : 'unknown',
      });
      if (window.fbq) window.fbq('trackCustom', 'SimulatorShare', {
        method: method,
        result: currentShare.result ? currentShare.result.title : 'unknown',
      });
    } catch (e) { /* ignore */ }
  }

  function registerLotteryEntry() {
    if (!currentShare.result) return;
    var body = JSON.stringify({
      result_type: currentShare.result.title,
      score: currentShare.score,
    });
    // 用 fetch keepalive（不用 sendBeacon 因為要拿回應更新畫面）
    fetch('/api/simulator/lottery-entry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body,
      keepalive: true,
    }).then(function (r) { return r.json(); }).then(function (data) {
      if (data && data.ok && data.participants_this_month) {
        updateLotteryParticipants(data.participants_this_month);
      }
    }).catch(function () { /* silent */ });
  }

  function updateLotteryParticipants(count) {
    var el = document.getElementById('simLotteryParticipants');
    if (!el || !count || count < 5) return; // 太少就不顯示，避免尷尬
    el.innerHTML = '🔥 本月已有 <strong style="color:#FFD56B;">' + count + '</strong> 位登記抽獎！ <a href="/lottery/" style="color:#25F4EE;">查看活動 →</a>';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
