/**
 * ============================================================
 * lottery-draw.js - 抽獎動畫控制
 * ============================================================
 * 職責：
 *  - 讀取 URL ?t=<ticket>&s=<sig>
 *  - 顯示剩餘機會數
 *  - 3 張翻牌動畫
 *  - 點卡片 → 呼叫 /api/lottery/draw
 *  - 動畫結束 → 導向 /lottery/result/?t=&s=&d=<draw_id>
 * ============================================================
 */
(function () {
  'use strict';

  var urlParams = new URLSearchParams(window.location.search);
  var ticket = urlParams.get('t') || '';
  var sig = urlParams.get('s') || '';

  // 若 URL 沒帶但 sessionStorage 有 → 回填
  if (!ticket) {
    try { ticket = sessionStorage.getItem('jdi_lottery_ticket') || ''; } catch (e) {}
  }
  if (!sig) {
    try { sig = sessionStorage.getItem('jdi_lottery_sig') || ''; } catch (e) {}
  }

  var errorEl = document.getElementById('lfDrawError');
  var chancesNumEl = document.getElementById('lfChancesNum');
  var drawHint = document.getElementById('lfDrawHint');
  var cards = document.querySelectorAll('.lf-card-flip');
  var stockList = document.getElementById('lfStockList');

  var isDrawing = false;
  var currentTicketInfo = null;

  // === 錯誤顯示 ===
  function showError(msg, redirectUrl) {
    errorEl.innerHTML = msg + (redirectUrl ? ' <a href="' + redirectUrl + '" style="color:#25F4EE;text-decoration:underline;">前往 →</a>' : '');
    errorEl.classList.add('is-visible');
  }

  // === 若無 ticket → 導回登記頁 ===
  if (!ticket || !sig) {
    showError('⚠️ 尚未登記抽獎', '/lottery/register/');
    document.getElementById('lfDrawHero').style.display = 'none';
    document.getElementById('lfCards').style.display = 'none';
    drawHint.style.display = 'none';
    return;
  }

  // === 載入 ticket 資訊 ===
  function loadTicketInfo() {
    return fetch('/api/lottery/ticket-info?t=' + encodeURIComponent(ticket) + '&s=' + encodeURIComponent(sig))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.ok) {
          showError(data.error || '無法載入抽獎資訊', '/lottery/register/');
          throw new Error(data.error);
        }
        currentTicketInfo = data;
        var remaining = data.chances_total - data.chances_used;
        chancesNumEl.textContent = remaining;

        if (remaining <= 0) {
          // 已用完 → 導向結果頁看歷史
          drawHint.innerHTML = '你今天的抽獎機會已用完 · <a href="/lottery/result/?t=' + encodeURIComponent(ticket) + '&s=' + encodeURIComponent(sig) + '&latest=1" style="color:#25F4EE;">查看最新結果 →</a>';
          cards.forEach(function (c) { c.classList.add('is-disabled'); });
        }

        // 更新庫存顯示
        renderStock(data.prizes || []);
        return data;
      })
      .catch(function (err) {
        console.error('[lottery-draw] loadTicketInfo error:', err);
      });
  }

  function renderStock(prizes) {
    if (!prizes.length) {
      stockList.innerHTML = '<div style="color: var(--lf-text-dim);">尚無資料</div>';
      return;
    }
    stockList.innerHTML = prizes.map(function (p) {
      var soldOut = p.stock_remaining <= 0;
      return '<div style="display:flex; justify-content:space-between; align-items:center; padding:6px 10px; background:rgba(255,255,255,0.03); border-radius:8px;' + (soldOut ? 'opacity:0.4;' : '') + '">' +
        '<span>' + p.emoji + ' ' + p.name + '</span>' +
        '<span style="color:' + (soldOut ? 'var(--lf-text-dim)' : 'var(--lf-gold)') + '; font-weight:700; font-size:12px;">' +
          (soldOut ? '已抽完' : '剩 ' + p.stock_remaining) +
        '</span>' +
      '</div>';
    }).join('');
  }

  // === 卡片點擊 → 抽獎 ===
  function bindCardClick() {
    cards.forEach(function (card) {
      card.addEventListener('click', function () { doDraw(card); });
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          doDraw(card);
        }
      });
    });
  }

  function doDraw(clickedCard) {
    if (isDrawing) return;
    if (clickedCard.classList.contains('is-flipped')) return;
    if (clickedCard.classList.contains('is-disabled')) return;

    // 檢查機會數
    if (!currentTicketInfo || (currentTicketInfo.chances_total - currentTicketInfo.chances_used) <= 0) {
      showError('抽獎機會已用完，可分享推薦碼賺取更多機會');
      return;
    }

    isDrawing = true;
    drawHint.textContent = '🎰 開獎中...';
    clickedCard.classList.add('is-drawing');

    // 呼叫 API
    fetch('/api/lottery/draw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticket_no: ticket, sig: sig }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.ok) {
          showError(data.error || '抽獎失敗');
          isDrawing = false;
          clickedCard.classList.remove('is-drawing');
          drawHint.textContent = '👆 點擊任一張卡片開始抽獎';
          return;
        }

        // 準備 3 張卡的結果：中獎那張放實際獎品，另外兩張放隨機干擾項
        var actualResult = {
          prize_id: data.prize_id,
          prize_name: data.prize_name,
          prize_emoji: data.prize_emoji,
          prize_tier: data.prize_tier,
          is_winner: data.is_winner === 1 || data.is_winner === true,
        };

        // 隨機決定：使用者點的那張顯示實際結果
        var clickedIdx = parseInt(clickedCard.getAttribute('data-idx'), 10);
        renderCard(clickedIdx, actualResult);

        // 另外兩張顯示不同的結果（增加真實感）
        var fakeResults = generateFakeResults(actualResult);
        cards.forEach(function (card, idx) {
          if (idx === clickedIdx) return;
          renderCard(idx, fakeResults.shift());
        });

        // 延遲 300ms 讓「搖晃」動畫先跑，再翻牌
        setTimeout(function () {
          clickedCard.classList.remove('is-drawing');
          clickedCard.classList.add('is-flipped');
          // 其他兩張也翻開（讓用戶看到自己「選對了」）
          setTimeout(function () {
            cards.forEach(function (card, idx) {
              if (idx !== clickedIdx) card.classList.add('is-flipped');
            });
          }, 500);
        }, 400);

        // 2.5 秒後導向結果頁
        setTimeout(function () {
          var url = '/lottery/result/?t=' + encodeURIComponent(ticket) +
                    '&s=' + encodeURIComponent(sig) +
                    '&d=' + encodeURIComponent(data.draw_id);
          window.location.href = url;
        }, 2800);
      })
      .catch(function (err) {
        console.error('[lottery-draw] draw error:', err);
        showError('網路錯誤，請重試');
        isDrawing = false;
        clickedCard.classList.remove('is-drawing');
      });
  }

  function renderCard(idx, result) {
    var front = document.getElementById('lfCardFront' + idx);
    if (!front) return;
    var isWinner = result.is_winner;
    var isNone = result.prize_id === 'none';

    front.classList.remove('is-winner', 'is-none');
    if (isWinner) front.classList.add('is-winner');
    if (isNone) front.classList.add('is-none');

    front.innerHTML =
      '<span class="lf-card-emoji">' + (result.prize_emoji || '🎁') + '</span>' +
      '<div class="lf-card-name">' + escapeHtml(result.prize_name) + '</div>' +
      (result.prize_tier && result.prize_tier !== '無' ? '<div class="lf-card-tier">' + escapeHtml(result.prize_tier) + '</div>' : '');
  }

  function generateFakeResults(actual) {
    // 從獎品池中挑 2 個「不是實際結果」的獎品當干擾項
    var pool = [
      { prize_id: 'soundcard', prize_name: '直播聲卡套組', prize_emoji: '🎙️', prize_tier: '頭獎', is_winner: false },
      { prize_id: 'light',     prize_name: '直播補光燈',   prize_emoji: '💡', prize_tier: '貳獎', is_winner: false },
      { prize_id: 'holder',    prize_name: 'TikTok 手機支架', prize_emoji: '📱', prize_tier: '參獎', is_winner: false },
      { prize_id: 'coffee',    prize_name: '7-11 燕麥拿鐵',   prize_emoji: '☕', prize_tier: '肆獎', is_winner: false },
      { prize_id: 'none',      prize_name: '銘謝惠顧',      prize_emoji: '😊', prize_tier: '無',   is_winner: false },
    ];
    // 過濾掉「跟實際結果一樣」的
    var filtered = pool.filter(function (p) { return p.prize_id !== actual.prize_id; });
    // 洗牌
    filtered.sort(function () { return Math.random() - 0.5; });
    return filtered.slice(0, 2);
  }

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // === 執行 ===
  loadTicketInfo().then(function () {
    bindCardClick();
  });

  console.log('[lottery-draw] initialized, ticket =', ticket);
})();
