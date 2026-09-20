/**
 * ============================================================
 * lottery-result.js - 抽獎結果頁
 * ============================================================
 * 職責：
 *  - 從 URL ?t=&s=&d= 讀取
 *  - 呼叫 /api/lottery/result 拿完整資料
 *  - 分別渲染「中獎」/「未中獎」兩種畫面
 *  - 顯示推薦分享連結
 *  - 支援「再抽一次」（若還有機會）
 * ============================================================
 */
(function () {
  'use strict';

  var urlParams = new URLSearchParams(window.location.search);
  var ticket = urlParams.get('t') || '';
  var sig = urlParams.get('s') || '';
  var drawId = urlParams.get('d') || '';
  var latest = urlParams.get('latest') || '';

  var loading = document.getElementById('lfResultLoading');
  var body = document.getElementById('lfResultBody');
  var errorEl = document.getElementById('lfResultError');

  var LINE_URL = 'https://line.me/R/ti/p/@354ykfbp';
  var SITE_BASE = window.location.origin;

  // 快取上次的資料，用於 diff 檢測
  var lastData = null;

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.classList.add('is-visible');
    loading.style.display = 'none';
  }

  if (!ticket || !sig) {
    showError('⚠️ 缺少參數，請重新登記');
    setTimeout(function () { window.location.href = '/lottery/register/'; }, 2000);
    return;
  }

  function buildFetchUrl() {
    var url = '/api/lottery/result?t=' + encodeURIComponent(ticket) + '&s=' + encodeURIComponent(sig);
    if (drawId) url += '&d=' + encodeURIComponent(drawId);
    if (latest) url += '&latest=1';
    return url;
  }

  function loadResult(isRefresh) {
    return fetch(buildFetchUrl(), { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.ok) {
          if (!isRefresh) showError(data.error || '無法載入結果');
          return;
        }
        if (isRefresh && lastData) {
          // Diff 檢查：invite_count 或 chances_total 有變化 → 顯示 toast + 重新渲染
          var oldInvites = lastData.participant.invite_count;
          var newInvites = data.participant.invite_count;
          var oldChances = lastData.participant.chances_remaining;
          var newChances = data.participant.chances_remaining;
          if (newInvites > oldInvites) {
            showInviteToast(newInvites - oldInvites);
            // 觸發 bump 動畫
            setTimeout(function () {
              var el = document.getElementById('lfInviteCount');
              if (el) {
                el.classList.add('is-bump');
                setTimeout(function () { el.classList.remove('is-bump'); }, 700);
              }
            }, 100);
          }
          if (newChances > oldChances) {
            showChancesToast(newChances - oldChances);
          }
        }
        lastData = data;
        renderResult(data);
      })
      .catch(function (err) {
        console.error('[lottery-result]', err);
        if (!isRefresh) showError('網路錯誤');
      });
  }

  loadResult(false);

  // === 即時更新機制 ===
  // 1. 頁面重新變為可見時 refresh（用戶從分享 → LINE → 回來）
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && lastData) {
      loadResult(true);
    }
  });

  // 2. pageshow 事件（處理 bfcache 從快取回來的狀況）
  window.addEventListener('pageshow', function (e) {
    if (e.persisted && lastData) {
      loadResult(true);
    }
  });

  // === Toast 通知 ===
  function showInviteToast(count) {
    var toast = document.createElement('div');
    toast.className = 'lf-toast lf-toast--success';
    toast.innerHTML = '🎉 恭喜！有 <strong>' + count + '</strong> 位朋友加入了！';
    document.body.appendChild(toast);
    setTimeout(function () { toast.classList.add('is-visible'); }, 30);
    setTimeout(function () {
      toast.classList.remove('is-visible');
      setTimeout(function () { toast.remove(); }, 400);
    }, 4500);
  }

  function showChancesToast(count) {
    var toast = document.createElement('div');
    toast.className = 'lf-toast lf-toast--gold';
    toast.innerHTML = '🎁 你獲得了 <strong>' + count + ' 次</strong> 額外抽獎機會！';
    document.body.appendChild(toast);
    setTimeout(function () { toast.classList.add('is-visible'); }, 30);
    setTimeout(function () {
      toast.classList.remove('is-visible');
      setTimeout(function () { toast.remove(); }, 400);
    }, 4500);
  }

  function renderResult(data) {
    loading.style.display = 'none';
    body.style.display = 'block';

    var p = data.participant;
    var d = data.draw;
    var isWinner = d && d.is_winner;
    var isNone = d && d.prize_id === 'none';
    var hasHistoryWin = (data.history || []).some(function (h) { return h.is_winner; });

    var refLink = SITE_BASE + '/lottery/register/?ref=' + encodeURIComponent(p.referral_code);
    var chancesLeft = p.chances_remaining;

    // 建構分享文字
    var shareText = isWinner
      ? '我在 JDI 脈動傳媒抽獎抽中 ' + d.prize_name + '！🎉\n\n你也來玩主播模擬器抽獎：\n'
      : '我剛剛在 JDI 脈動傳媒玩主播模擬器抽獎！\n本月抽直播聲卡、補光燈、TikTok 支架、特大杯冰拿鐵 🎁\n\n用我的邀請連結還能加 1 次抽獎機會：\n';

    // ==== 主結果卡（截圖用） ====
    var screenshotHtml = '';
    if (d) {
      screenshotHtml =
        '<div class="lf-screenshot-card ' + (isWinner ? 'is-winner' : '') + '">' +
          '<div class="lf-prize-display ' + (isNone ? 'is-none' : '') + '">' +
            '<span class="lf-prize-emoji">' + (d.prize_emoji || '🎁') + '</span>' +
            (d.prize_tier && d.prize_tier !== '無' ? '<span class="lf-prize-tier">' + escapeHtml(d.prize_tier) + '</span><br/>' : '') +
            '<span class="lf-prize-name">' + escapeHtml(d.prize_name) + '</span>' +
          '</div>' +
          '<div class="lf-ticket-info">' +
            '<div class="lf-ticket-info-row">' +
              '<span class="lf-ticket-info-label">🎫 抽獎編號</span>' +
              '<span class="lf-ticket-info-value is-big">' + escapeHtml(p.ticket_no) + '</span>' +
            '</div>' +
            '<div class="lf-ticket-info-row">' +
              '<span class="lf-ticket-info-label">👤 姓名</span>' +
              '<span class="lf-ticket-info-value">' + escapeHtml(p.name_masked) + '</span>' +
            '</div>' +
            '<div class="lf-ticket-info-row">' +
              '<span class="lf-ticket-info-label">📱 手機</span>' +
              '<span class="lf-ticket-info-value">' + escapeHtml(p.phone_masked) + '</span>' +
            '</div>' +
            '<div class="lf-ticket-info-row">' +
              '<span class="lf-ticket-info-label">✉️ Email</span>' +
              '<span class="lf-ticket-info-value">' + escapeHtml(p.email_masked) + '</span>' +
            '</div>' +
            '<div class="lf-ticket-info-row">' +
              '<span class="lf-ticket-info-label">📅 抽獎時間</span>' +
              '<span class="lf-ticket-info-value">' + escapeHtml(formatDate(d.drawn_at)) + '</span>' +
            '</div>' +
            (isWinner && d.claim_deadline ? (
              '<div class="lf-ticket-info-row">' +
                '<span class="lf-ticket-info-label">⏰ 領獎期限</span>' +
                '<span class="lf-ticket-info-value" style="color:#FFC53D;">' + escapeHtml(formatDeadline(d.claim_deadline)) + '</span>' +
              '</div>'
            ) : '') +
          '</div>' +
          '<div class="lf-brand-strip">' +
            '<span class="lf-brand-txt">JDI 脈動傳媒 · JDI-PULSE.COM</span>' +
          '</div>' +
        '</div>';
    }

    // ==== 標題 ====
    var titleHtml = '';
    if (isWinner) {
      titleHtml =
        '<h1 class="lf-result-title is-winner">🎉 恭喜中獎！</h1>' +
        '<p class="lf-result-sub">' +
          '你抽中了 <strong style="color:#FFC53D;">' + escapeHtml(d.prize_name) + '</strong>！' +
          '<br/>請截圖此頁面 → 加官方 LINE 領獎' +
        '</p>';
    } else if (isNone || (d && !isWinner)) {
      titleHtml =
        '<h1 class="lf-result-title">😊 銘謝惠顧</h1>' +
        '<p class="lf-result-sub">別灰心！分享給朋友加碼再抽 · 每月 1 日獎池重置</p>';
    } else {
      titleHtml =
        '<h1 class="lf-result-title">📋 你的抽獎資訊</h1>' +
        '<p class="lf-result-sub">尚未抽獎 · 可回抽獎頁翻牌</p>';
    }

    // ==== 領獎流程（中獎才顯示） ====
    var claimHtml = '';
    if (isWinner) {
      claimHtml =
        '<div class="lf-claim-steps">' +
          '<h3>🎁 領獎 3 步驟</h3>' +
          '<ol>' +
            '<li><strong>截圖</strong>上方「中獎憑證」（含抽獎編號）</li>' +
            '<li>點下方按鈕加 <strong>官方 LINE @354ykfbp</strong></li>' +
            '<li>傳「<strong>領獎</strong>」+ 截圖 → 客服會回覆你確認地址</li>' +
          '</ol>' +
        '</div>' +
        '<a href="' + LINE_URL + '" target="_blank" rel="noopener" class="lf-btn lf-btn--line">' +
          '💬 加官方 LINE 領獎' +
        '</a>';
    }

    // ==== 再抽一次（若還有機會） ====
    var drawMoreHtml = '';
    if (chancesLeft > 0) {
      drawMoreHtml =
        '<a href="/lottery/draw/?t=' + encodeURIComponent(ticket) + '&s=' + encodeURIComponent(sig) + '" class="lf-btn lf-btn--primary">' +
          '🎲 再抽一次（剩 ' + chancesLeft + ' 次）' +
        '</a>';
    }

    // ==== 分享區塊（含里程碑進度條）====
    var milestones = [
      { threshold: 1, emoji: '🌱', label: '第 1 位朋友' },
      { threshold: 3, emoji: '🚀', label: '3 位達標' },
      { threshold: 5, emoji: '👑', label: '滿貫 5 位！' },
    ];
    var milestonesHtml = milestones.map(function (m) {
      var reached = p.invite_count >= m.threshold;
      return '<div class="lf-milestone ' + (reached ? 'is-reached' : '') + '">' +
        '<span class="lf-milestone-emoji">' + m.emoji + '</span>' +
        '<span class="lf-milestone-label">' + m.label + '</span>' +
      '</div>';
    }).join('');

    var progressPct = Math.min(100, (p.invite_count / 5) * 100);

    var shareHtml =
      '<div class="lf-share-block">' +
        '<h3>📢 分享給朋友 +1 次抽獎機會</h3>' +
        '<p>朋友用你的連結登記 → 你就多 1 次抽獎（上限 +5）</p>' +
        '<div class="lf-share-progress-wrap">' +
          '<div class="lf-share-progress-header">' +
            '<span class="lf-share-progress-num" id="lfInviteCount">' + p.invite_count + ' / 5</span>' +
            '<span class="lf-share-progress-label">已成功邀請人數</span>' +
          '</div>' +
          '<div class="lf-share-progress-bar">' +
            '<div class="lf-share-progress-fill" style="width:' + progressPct + '%;"></div>' +
          '</div>' +
          '<div class="lf-milestones">' + milestonesHtml + '</div>' +
        '</div>' +
        '<div class="lf-share-url">' +
          '<input type="text" id="lfRefLink" value="' + escapeHtml(refLink) + '" readonly />' +
          '<button id="lfCopyBtn">複製</button>' +
        '</div>' +
        '<div class="lf-share-buttons">' +
          '<button id="lfShareLine" class="lf-share-line" type="button">💬 LINE</button>' +
          '<button id="lfShareThreads" class="lf-share-threads" type="button">🧵 Threads</button>' +
          '<button id="lfShareIg" class="lf-share-ig" type="button">📷 Instagram</button>' +
        '</div>' +
        '<button id="lfShareNative" class="lf-share-more-btn" type="button" style="margin-top:8px; width:100%; padding:10px; background:rgba(255,255,255,0.04); border:1px solid var(--lf-border); border-radius:10px; color:var(--lf-text-dim); font-size:12px; font-weight:600; cursor:pointer;">📤 其他分享方式（含 FB、複製連結等）</button>' +
      '</div>';

    // ==== 歷史紀錄（若抽過 > 1 次） ====
    var historyHtml = '';
    if ((data.history || []).length > 1) {
      historyHtml =
        '<div class="lf-card" style="padding: 16px;">' +
          '<h2 style="font-size: 14px; margin-bottom: 12px; color: var(--lf-text-dim); font-weight: 600;">📋 我的抽獎紀錄</h2>' +
          '<div style="display: grid; gap: 8px; font-size: 13px;">' +
            data.history.map(function (h) {
              return '<div style="display:flex; justify-content:space-between; padding:8px 12px; background:rgba(255,255,255,0.03); border-radius:8px;' + (h.is_winner ? ' border:1px solid rgba(255,197,61,0.4);' : '') + '">' +
                '<span>第 ' + h.draw_no + ' 次：' + h.prize_emoji + ' ' + escapeHtml(h.prize_name) + '</span>' +
                '<span style="color:' + (h.is_winner ? 'var(--lf-gold)' : 'var(--lf-text-dim)') + '; font-weight:700;">' +
                  (h.is_winner ? '🎉 中獎' : '銘謝惠顧') +
                '</span>' +
              '</div>';
            }).join('') +
          '</div>' +
        '</div>';
    }

    body.innerHTML =
      titleHtml +
      screenshotHtml +
      (isWinner ? claimHtml : '') +
      '<div class="lf-actions">' +
        drawMoreHtml +
      '</div>' +
      shareHtml +
      historyHtml +
      '<div class="lf-actions">' +
        '<a href="/lottery/" class="lf-btn lf-btn--ghost">回活動說明頁</a>' +
        '<a href="/streamer-simulator/" class="lf-btn lf-btn--ghost">重玩主播模擬器</a>' +
      '</div>';

    // === 綁定分享事件 ===
    bindShareEvents(refLink, shareText);
  }

  function bindShareEvents(refLink, shareText) {
    var copyBtn = document.getElementById('lfCopyBtn');
    var refInput = document.getElementById('lfRefLink');
    var lineBtn = document.getElementById('lfShareLine');
    var threadsBtn = document.getElementById('lfShareThreads');
    var igBtn = document.getElementById('lfShareIg');
    var nativeBtn = document.getElementById('lfShareNative');

    // 給 Threads/IG 用的完整文案（把連結明確放在最後）
    var fullShareText = shareText + refLink;

    function copyToClipboard(text) {
      // 優先用 navigator.clipboard，fallback 用 execCommand
      if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(text);
      }
      return new Promise(function (resolve, reject) {
        try {
          var ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.left = '-9999px';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          resolve();
        } catch (e) { reject(e); }
      });
    }

    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        copyToClipboard(refLink).then(function () {
          copyBtn.textContent = '✅ 已複製';
          setTimeout(function () { copyBtn.textContent = '複製'; }, 1800);
        }).catch(function () {
          alert('複製失敗，請手動長按選取複製');
        });
      });
    }

    // === LINE ===
    // 用 LINE 官方 lineit 分享，會把 text + url 一起帶入 LINE 聊天視窗
    if (lineBtn) {
      lineBtn.addEventListener('click', function () {
        var lineShare = 'https://social-plugins.line.me/lineit/share?url=' + encodeURIComponent(refLink) + '&text=' + encodeURIComponent(shareText);
        window.open(lineShare, '_blank', 'noopener');
      });
    }

    // === Threads ===
    // Threads 官方 intent URL：把「文字 + 連結」全部塞進 text 參數
    if (threadsBtn) {
      threadsBtn.addEventListener('click', function () {
        // Threads 官方分享格式：https://www.threads.net/intent/post?text=...
        var threadsShare = 'https://www.threads.net/intent/post?text=' + encodeURIComponent(fullShareText);
        // 先複製一份到剪貼簿（保險：iOS Threads App 有時只讀剪貼簿）
        copyToClipboard(fullShareText).catch(function () {});
        window.open(threadsShare, '_blank', 'noopener');
      });
    }

    // === Instagram ===
    // IG 沒有 web 分享 intent；改為「複製文案 + 開啟 IG App」
    if (igBtn) {
      igBtn.addEventListener('click', function () {
        copyToClipboard(fullShareText).then(function () {
          showToastLike('📋 分享文案已複製！請在 IG 貼上到限時動態或貼文', 3500);
          // 3 秒後嘗試打開 IG（讓用戶看到 toast 訊息）
          setTimeout(function () {
            // iOS: instagram://camera 開限動；Android 可用 https 通用連結
            var ua = navigator.userAgent;
            if (/iPhone|iPad|iPod/.test(ua)) {
              // 嘗試 URL Scheme（若沒裝 IG 會 fail，fallback https）
              window.location.href = 'instagram://library';
              setTimeout(function () {
                window.open('https://www.instagram.com/', '_blank', 'noopener');
              }, 800);
            } else {
              window.open('https://www.instagram.com/', '_blank', 'noopener');
            }
          }, 1500);
        }).catch(function () {
          alert('複製失敗，請手動長按複製上方連結，然後打開 IG 貼上');
        });
      });
    }

    // === 其他分享（Native Share Sheet）===
    if (nativeBtn) {
      nativeBtn.addEventListener('click', function () {
        if (navigator.share) {
          navigator.share({
            title: 'JDI 脈動傳媒 · 抽獎活動',
            text: shareText,
            url: refLink,
          }).catch(function () {});
        } else {
          copyToClipboard(refLink).then(function () {
            showToastLike('✅ 連結已複製，可以貼到任何地方分享！', 3000);
          });
        }
      });
    }
  }

  // 頁面內 toast（給分享區塊用，複用主 toast 樣式）
  function showToastLike(msg, duration) {
    var toast = document.createElement('div');
    toast.className = 'lf-toast lf-toast--success';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(function () { toast.classList.add('is-visible'); }, 30);
    setTimeout(function () {
      toast.classList.remove('is-visible');
      setTimeout(function () { toast.remove(); }, 400);
    }, duration || 3000);
  }

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function formatDate(iso) {
    if (!iso) return '-';
    // iso is 'YYYY-MM-DD HH:MM:SS' (already TW time)
    return iso.replace(' ', ' ');
  }

  function formatDeadline(iso) {
    if (!iso) return '-';
    try {
      var d = new Date(iso);
      // TW 時間
      d = new Date(d.getTime() + 8 * 3600 * 1000);
      return d.getUTCFullYear() + '/' +
        String(d.getUTCMonth() + 1).padStart(2, '0') + '/' +
        String(d.getUTCDate()).padStart(2, '0') + ' ' +
        String(d.getUTCHours()).padStart(2, '0') + ':' +
        String(d.getUTCMinutes()).padStart(2, '0');
    } catch (e) {
      return iso;
    }
  }
})();
