/**
 * ============================================================
 * lottery-admin.js - 抽獎管理後台
 * ============================================================
 * 功能：
 *  - 密鑰登入（localStorage 保存）
 *  - Dashboard 統計、獎品庫存、中獎名單、參與者列表
 *  - 領獎狀態切換（modal + 備註）
 *  - CSV 匯出（中獎名單 / 參與者）
 *  - 搜尋、篩選、月份切換
 * ============================================================
 */
(function () {
  'use strict';

  var TOKEN_KEY = 'jdi_lottery_admin_token';
  var token = '';
  var currentMonth = ''; // e.g. '2026-09'
  var currentWinnerFilter = 'all';
  var searchTimer = null;
  var claimEditContext = null; // { draw_id, ticket_no, prize_name, current_status }

  // === DOM ===
  var loginSection = document.getElementById('laLogin');
  var dashSection = document.getElementById('laDashboard');
  var tokenInput = document.getElementById('laTokenInput');
  var loginBtn = document.getElementById('laLoginBtn');
  var loginErr = document.getElementById('laLoginErr');
  var logoutBtn = document.getElementById('laLogoutBtn');
  var monthSelect = document.getElementById('laMonthSelect');
  var statsEl = document.getElementById('laStats');
  var prizeGridEl = document.getElementById('laPrizeGrid');
  var winnersTableEl = document.getElementById('laWinnersTable');
  var topReferrersEl = document.getElementById('laTopReferrers');
  var partsTableEl = document.getElementById('laParticipantsTable');
  var searchInput = document.getElementById('laSearchInput');
  var exportWinnersBtn = document.getElementById('laExportWinners');
  var exportPartsBtn = document.getElementById('laExportParticipants');
  var winnerTabs = document.getElementById('laWinnerTabs');
  var toast = document.getElementById('laToast');

  var claimModal = document.getElementById('laClaimModal');
  var claimModalBg = document.getElementById('laClaimModalBg');
  var claimCancel = document.getElementById('laClaimCancel');
  var claimSave = document.getElementById('laClaimSave');
  var claimTitle = document.getElementById('laClaimTitle');
  var claimDesc = document.getElementById('laClaimDesc');
  var claimStatusSelect = document.getElementById('laClaimStatusSelect');
  var claimNote = document.getElementById('laClaimNote');

  // === Utilities ===
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function showToast(msg, type) {
    toast.textContent = msg;
    toast.className = 'la-toast la-toast--' + (type === 'err' ? 'err' : 'ok');
    toast.classList.add('is-visible');
    setTimeout(function () { toast.classList.remove('is-visible'); }, 2800);
  }

  function fmtMonth(m) {
    // '2026-09' → '2026 年 9 月'
    var parts = m.split('-');
    return parts[0] + ' 年 ' + parseInt(parts[1], 10) + ' 月';
  }

  function buildMonthOptions(currentM) {
    // 顯示過去 6 個月 + 未來 3 個月
    var now = new Date(Date.now() + 8 * 3600 * 1000);
    var options = [];
    for (var i = -6; i <= 3; i++) {
      var d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1));
      var y = d.getUTCFullYear();
      var m = String(d.getUTCMonth() + 1).padStart(2, '0');
      options.push(y + '-' + m);
    }
    options.reverse(); // 最新的在前
    return options;
  }

  function apiUrl(path, params) {
    var qs = new URLSearchParams(params || {});
    qs.set('token', token);
    return path + '?' + qs.toString();
  }

  function apiFetch(path, params) {
    return fetch(apiUrl(path, params), { cache: 'no-store' })
      .then(function (r) {
        if (r.status === 401) {
          logout();
          throw new Error('unauthorized');
        }
        return r.json();
      });
  }

  // === Login ===
  function tryLogin(t) {
    token = t;
    // 驗證：呼叫一次 summary
    return apiFetch('/api/lottery/admin-summary', { month: currentMonth || getDefaultMonth() })
      .then(function (data) {
        if (data && data.ok) {
          localStorage.setItem(TOKEN_KEY, token);
          loginErr.classList.remove('is-visible');
          startDashboard();
          return true;
        } else {
          throw new Error(data && data.error || '登入失敗');
        }
      })
      .catch(function (err) {
        token = '';
        loginErr.textContent = '❌ 密鑰錯誤或系統錯誤';
        loginErr.classList.add('is-visible');
        return false;
      });
  }

  function getDefaultMonth() {
    var now = new Date(Date.now() + 8 * 3600 * 1000);
    return now.getUTCFullYear() + '-' + String(now.getUTCMonth() + 1).padStart(2, '0');
  }

  function logout() {
    token = '';
    localStorage.removeItem(TOKEN_KEY);
    dashSection.style.display = 'none';
    loginSection.style.display = 'block';
    tokenInput.value = '';
  }

  loginBtn.addEventListener('click', function () {
    var t = tokenInput.value.trim();
    if (!t) return;
    tryLogin(t);
  });
  tokenInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') loginBtn.click();
  });
  logoutBtn.addEventListener('click', logout);

  // === Auto login if token exists ===
  var saved = localStorage.getItem(TOKEN_KEY);
  if (saved) {
    tokenInput.value = saved;
    tryLogin(saved);
  }

  // === Dashboard ===
  function startDashboard() {
    loginSection.style.display = 'none';
    dashSection.style.display = 'block';

    if (!currentMonth) currentMonth = getDefaultMonth();

    // 填月份下拉
    var months = buildMonthOptions();
    monthSelect.innerHTML = months.map(function (m) {
      return '<option value="' + m + '"' + (m === currentMonth ? ' selected' : '') + '>' + fmtMonth(m) + '</option>';
    }).join('');
    monthSelect.value = currentMonth;

    monthSelect.addEventListener('change', function () {
      currentMonth = monthSelect.value;
      loadAll();
    });

    winnerTabs.addEventListener('click', function (e) {
      var btn = e.target.closest('.la-tab');
      if (!btn) return;
      currentWinnerFilter = btn.getAttribute('data-status');
      winnerTabs.querySelectorAll('.la-tab').forEach(function (b) { b.classList.toggle('is-active', b === btn); });
      loadWinners();
    });

    searchInput.addEventListener('input', function () {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(loadParticipants, 400);
    });

    exportWinnersBtn.addEventListener('click', function () {
      var url = apiUrl('/api/lottery/admin-winners', {
        month: currentMonth,
        status: currentWinnerFilter,
        format: 'csv',
      });
      window.location.href = url;
    });

    exportPartsBtn.addEventListener('click', function () {
      var url = apiUrl('/api/lottery/admin-participants', {
        month: currentMonth,
        q: searchInput.value.trim(),
        format: 'csv',
      });
      window.location.href = url;
    });

    // Claim modal
    claimModalBg.addEventListener('click', closeClaimModal);
    claimCancel.addEventListener('click', closeClaimModal);
    claimSave.addEventListener('click', saveClaimChange);

    // 刪除測試資料
    var delBtn = document.getElementById('laDelBtn');
    if (delBtn) delBtn.addEventListener('click', handleDelete);

    loadAll();
  }

  function handleDelete() {
    var mode = document.getElementById('laDelMode').value;
    var value = document.getElementById('laDelValue').value.trim();
    var resultEl = document.getElementById('laDelResult');
    if (!value) {
      resultEl.innerHTML = '<span style="color:#ff9a90;">⚠️ 請輸入要刪除的值</span>';
      return;
    }

    var modeLabel = {
      by_phone: '電話',
      by_email: 'Email',
      by_ticket: '抽獎編號'
    }[mode];

    if (!confirm('⚠️ 確定要用「' + modeLabel + ' = ' + value + '」刪除紀錄嗎？\n\n此操作無法復原！')) {
      return;
    }

    var delBtn = document.getElementById('laDelBtn');
    delBtn.disabled = true;
    delBtn.textContent = '刪除中...';
    resultEl.innerHTML = '<span style="color:var(--la-text-dim);">處理中...</span>';

    fetch('/api/lottery/admin-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: token,
        mode: mode,
        value: value,
      }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.ok) {
          var d = data.deleted;
          resultEl.innerHTML = '<div style="background:rgba(6,199,85,0.12); border:1px solid rgba(6,199,85,0.35); padding:12px; border-radius:8px;">' +
            '<strong style="color:#7ff2a3;">✅ 刪除成功</strong><br/>' +
            '<span style="font-size:12px;">' +
              '• 參與者：' + d.participants_count + ' 筆<br/>' +
              '• 抽獎紀錄：' + d.draws_count + ' 筆<br/>' +
              '• 推薦紀錄：' + d.referrals_count + ' 筆' +
            '</span>' +
            '<div style="margin-top:8px; font-size:11px; color:var(--la-text-dim);">' +
              d.participants.map(function (p) {
                return '刪除：' + esc(p.ticket_no) + ' · ' + esc(p.name) + ' · ' + esc(p.phone);
              }).join('<br/>') +
            '</div>' +
          '</div>';
          document.getElementById('laDelValue').value = '';
          showToast('✅ 已刪除 ' + d.participants_count + ' 筆', 'ok');
          // 重新載入所有資料
          loadAll();
        } else {
          resultEl.innerHTML = '<span style="color:#ff9a90;">❌ ' + esc(data.error || '刪除失敗') + '</span>';
          showToast('❌ ' + (data.error || '刪除失敗'), 'err');
        }
      })
      .catch(function (err) {
        console.error(err);
        resultEl.innerHTML = '<span style="color:#ff9a90;">❌ 網路錯誤</span>';
        showToast('❌ 網路錯誤', 'err');
      })
      .finally(function () {
        delBtn.disabled = false;
        delBtn.textContent = '🗑️ 刪除';
      });
  }

  function loadAll() {
    loadSummary();
    loadWinners();
    loadParticipants();
  }

  // === Summary + Prizes + Top Referrers ===
  function loadSummary() {
    statsEl.innerHTML = '<div class="la-loading-wrap"><span class="la-spinner"></span></div>';
    prizeGridEl.innerHTML = '<div class="la-loading-wrap"><span class="la-spinner"></span></div>';
    topReferrersEl.innerHTML = '<div class="la-loading-wrap"><span class="la-spinner"></span></div>';

    apiFetch('/api/lottery/admin-summary', { month: currentMonth })
      .then(function (data) {
        if (!data.ok) throw new Error(data.error);
        renderStats(data.stats);
        renderPrizes(data.prizes);
        renderTopReferrers(data.top_referrers);
      })
      .catch(function (err) {
        console.error('loadSummary', err);
        statsEl.innerHTML = '<div class="la-empty">載入失敗</div>';
      });
  }

  function renderStats(stats) {
    statsEl.innerHTML =
      '<div class="la-stat-card">' +
        '<div class="la-stat-card-label">📝 登記人數</div>' +
        '<div class="la-stat-card-num">' + stats.total_participants + '</div>' +
      '</div>' +
      '<div class="la-stat-card">' +
        '<div class="la-stat-card-label">🎲 抽獎次數</div>' +
        '<div class="la-stat-card-num">' + stats.total_draws + '</div>' +
        '<div class="la-stat-card-hint">平均每人 ' + (stats.total_participants > 0 ? (stats.total_draws / stats.total_participants).toFixed(1) : '0') + ' 次</div>' +
      '</div>' +
      '<div class="la-stat-card">' +
        '<div class="la-stat-card-label">🏆 中獎人數</div>' +
        '<div class="la-stat-card-num" style="color:var(--la-gold);">' + stats.total_winners + '</div>' +
        '<div class="la-stat-card-hint">實際中獎率 ' + (stats.total_draws > 0 ? ((stats.total_winners / stats.total_draws) * 100).toFixed(1) : '0') + '%</div>' +
      '</div>' +
      '<div class="la-stat-card">' +
        '<div class="la-stat-card-label">🔗 邀請成功</div>' +
        '<div class="la-stat-card-num" style="color:var(--la-purple);">' + stats.total_referrals + '</div>' +
      '</div>';
  }

  function renderPrizes(prizes) {
    if (!prizes.length) {
      prizeGridEl.innerHTML = '<div class="la-empty">本月尚無獎品資料</div>';
      return;
    }
    prizeGridEl.innerHTML = prizes.map(function (p) {
      return '<div class="la-prize-card">' +
        '<div class="la-prize-card-head">' +
          '<div class="la-prize-card-title">' +
            '<span class="la-prize-card-emoji">' + p.prize_emoji + '</span>' +
            esc(p.prize_name) +
          '</div>' +
          '<span class="la-badge la-badge--head">' + esc(p.prize_tier) + '</span>' +
        '</div>' +
        '<div class="la-prize-card-stock">' +
          '<div class="la-prize-card-stock-item">' +
            '<span class="la-prize-card-stock-num" style="color:var(--la-cyan);">' + p.stock_remaining + '</span>' +
            '<span class="la-prize-card-stock-label">剩餘</span>' +
          '</div>' +
          '<div class="la-prize-card-stock-item">' +
            '<span class="la-prize-card-stock-num" style="color:var(--la-gold);">' + p.drawn_count + '</span>' +
            '<span class="la-prize-card-stock-label">已抽出</span>' +
          '</div>' +
          '<div class="la-prize-card-stock-item">' +
            '<span class="la-prize-card-stock-num" style="color:#7ff2a3;">' + p.claimed_count + '</span>' +
            '<span class="la-prize-card-stock-label">已領獎</span>' +
          '</div>' +
          '<div class="la-prize-card-stock-item">' +
            '<span class="la-prize-card-stock-num">' + p.stock_total + '</span>' +
            '<span class="la-prize-card-stock-label">總量</span>' +
          '</div>' +
        '</div>' +
        '<div style="margin-top:8px; font-size:11px; color:var(--la-text-dim);">中獎率 ' + p.win_rate.toFixed(1) + '%</div>' +
      '</div>';
    }).join('');
  }

  function renderTopReferrers(refs) {
    if (!refs.length) {
      topReferrersEl.innerHTML = '<div class="la-empty">本月尚無邀請達人 · 分享推薦連結賺抽獎機會 🎁</div>';
      return;
    }
    topReferrersEl.innerHTML =
      '<table class="la-table" style="min-width:auto;">' +
        '<thead><tr>' +
          '<th>排名</th><th>抽獎編號</th><th>姓名</th><th>邀請人數</th><th>總機會</th><th>已用</th>' +
        '</tr></thead>' +
        '<tbody>' +
          refs.map(function (r, i) {
            var medal = ['🥇','🥈','🥉','4️⃣','5️⃣'][i] || '';
            return '<tr>' +
              '<td>' + medal + ' #' + (i + 1) + '</td>' +
              '<td class="is-mono">' + esc(r.ticket_no) + '</td>' +
              '<td>' + esc(r.name_masked) + '</td>' +
              '<td><strong style="color:var(--la-gold);">' + r.invite_count + '</strong> 人</td>' +
              '<td>' + r.chances_total + ' 次</td>' +
              '<td>' + r.chances_used + ' 次</td>' +
            '</tr>';
          }).join('') +
        '</tbody>' +
      '</table>';
  }

  // === Winners ===
  function loadWinners() {
    winnersTableEl.innerHTML = '<div class="la-loading-wrap"><span class="la-spinner"></span></div>';

    apiFetch('/api/lottery/admin-winners', { month: currentMonth, status: currentWinnerFilter })
      .then(function (data) {
        if (!data.ok) throw new Error(data.error);
        renderWinners(data.winners);
        updateWinnerCounts();
      })
      .catch(function (err) {
        console.error('loadWinners', err);
        winnersTableEl.innerHTML = '<div class="la-empty">載入失敗</div>';
      });
  }

  function updateWinnerCounts() {
    // 一次撈全部狀態的 count，更新 tab 徽章
    ['all', 'pending', 'claimed', 'expired'].forEach(function (s) {
      apiFetch('/api/lottery/admin-winners', { month: currentMonth, status: s })
        .then(function (data) {
          if (data.ok) {
            var el = document.getElementById('laCount' + s.charAt(0).toUpperCase() + s.slice(1));
            if (el) el.textContent = data.total;
          }
        })
        .catch(function () {});
    });
  }

  function renderWinners(winners) {
    if (!winners.length) {
      winnersTableEl.innerHTML = '<div class="la-empty">目前沒有符合條件的中獎紀錄</div>';
      return;
    }

    var statusText = { pending: '待領獎', claimed: '已領獎', expired: '已過期' };
    var tierClass = { '頭獎': 'la-badge--head', '貳獎': 'la-badge--2nd', '參獎': 'la-badge--3rd', '肆獎': 'la-badge--4th' };

    winnersTableEl.innerHTML =
      '<table class="la-table">' +
        '<thead><tr>' +
          '<th>抽獎編號</th>' +
          '<th>獎項</th>' +
          '<th>姓名</th>' +
          '<th>電話</th>' +
          '<th>Email</th>' +
          '<th>抽獎時間</th>' +
          '<th>領獎期限</th>' +
          '<th>狀態</th>' +
          '<th>操作</th>' +
        '</tr></thead>' +
        '<tbody>' +
          winners.map(function (w) {
            var badge = tierClass[w.prize_tier] || 'la-badge--head';
            return '<tr>' +
              '<td class="is-mono">' + esc(w.ticket_no) + '</td>' +
              '<td><span class="la-badge ' + badge + '">' + esc(w.prize_tier) + '</span> ' + esc(w.prize_name) + '</td>' +
              '<td>' + esc(w.name) + '</td>' +
              '<td class="is-mono">' + esc(w.phone) + '</td>' +
              '<td>' + esc(w.email) + '</td>' +
              '<td style="font-size:11px; color:var(--la-text-dim);">' + esc(w.drawn_at) + '</td>' +
              '<td style="font-size:11px; color:var(--la-text-dim);">' + fmtDeadline(w.claim_deadline) + '</td>' +
              '<td><span class="la-badge la-badge--' + w.claim_status + '">' + (statusText[w.claim_status] || w.claim_status) + '</span></td>' +
              '<td>' +
                '<button class="la-btn la-btn--sm" data-action="edit-claim" data-draw-id="' + w.draw_id + '" data-ticket="' + esc(w.ticket_no) + '" data-prize="' + esc(w.prize_name) + '" data-status="' + w.claim_status + '" data-note="' + esc(w.claim_note || '') + '" type="button">✏️ 改狀態</button>' +
              '</td>' +
            '</tr>';
          }).join('') +
        '</tbody>' +
      '</table>';

    // 綁定「改狀態」按鈕
    winnersTableEl.querySelectorAll('[data-action="edit-claim"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openClaimModal({
          draw_id: btn.getAttribute('data-draw-id'),
          ticket_no: btn.getAttribute('data-ticket'),
          prize_name: btn.getAttribute('data-prize'),
          current_status: btn.getAttribute('data-status'),
          current_note: btn.getAttribute('data-note'),
        });
      });
    });
  }

  function fmtDeadline(iso) {
    if (!iso) return '-';
    try {
      var d = new Date(iso);
      d = new Date(d.getTime() + 8 * 3600 * 1000);
      return d.getUTCFullYear() + '/' +
        String(d.getUTCMonth() + 1).padStart(2, '0') + '/' +
        String(d.getUTCDate()).padStart(2, '0');
    } catch (e) { return iso; }
  }

  // === Claim modal ===
  function openClaimModal(ctx) {
    claimEditContext = ctx;
    claimTitle.textContent = '更新領獎狀態 · ' + ctx.ticket_no;
    claimDesc.textContent = '獎品：' + ctx.prize_name;
    claimStatusSelect.value = ctx.current_status;
    claimNote.value = ctx.current_note || '';
    claimModal.classList.add('is-open');
  }

  function closeClaimModal() {
    claimModal.classList.remove('is-open');
    claimEditContext = null;
  }

  function saveClaimChange() {
    if (!claimEditContext) return;
    var body = {
      token: token,
      draw_id: parseInt(claimEditContext.draw_id, 10),
      new_status: claimStatusSelect.value,
      note: claimNote.value.trim(),
    };
    claimSave.disabled = true;
    claimSave.textContent = '儲存中...';

    fetch('/api/lottery/admin-claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.ok) {
          showToast('✅ 已更新狀態', 'ok');
          closeClaimModal();
          loadWinners();
          loadSummary();
        } else {
          showToast('❌ ' + (data.error || '更新失敗'), 'err');
        }
      })
      .catch(function () { showToast('❌ 網路錯誤', 'err'); })
      .finally(function () {
        claimSave.disabled = false;
        claimSave.textContent = '儲存';
      });
  }

  // === Participants ===
  function loadParticipants() {
    partsTableEl.innerHTML = '<div class="la-loading-wrap"><span class="la-spinner"></span></div>';
    var q = searchInput.value.trim();

    apiFetch('/api/lottery/admin-participants', { month: currentMonth, q: q, limit: 200 })
      .then(function (data) {
        if (!data.ok) throw new Error(data.error);
        renderParticipants(data.participants);
      })
      .catch(function (err) {
        console.error('loadParticipants', err);
        partsTableEl.innerHTML = '<div class="la-empty">載入失敗</div>';
      });
  }

  function renderParticipants(parts) {
    if (!parts.length) {
      partsTableEl.innerHTML = '<div class="la-empty">本月尚無參與者</div>';
      return;
    }

    partsTableEl.innerHTML =
      '<div style="font-size:12px; color:var(--la-text-dim); margin-bottom:8px;">共 ' + parts.length + ' 筆（最多顯示 200 筆，超過請用 CSV 匯出）</div>' +
      '<table class="la-table">' +
        '<thead><tr>' +
          '<th>抽獎編號</th>' +
          '<th>登記時間</th>' +
          '<th>姓名</th>' +
          '<th>電話</th>' +
          '<th>Email</th>' +
          '<th>模擬器</th>' +
          '<th>推薦碼</th>' +
          '<th>邀請</th>' +
          '<th>機會</th>' +
          '<th>中獎</th>' +
        '</tr></thead>' +
        '<tbody>' +
          parts.map(function (p) {
            var invited = p.invite_count > 0 ? '<strong style="color:var(--la-gold);">' + p.invite_count + '</strong>' : '0';
            var chances = p.chances_used + ' / ' + p.chances_total;
            var winBadge = p.win_count > 0 ? '<span class="la-badge la-badge--claimed">🏆 ' + p.win_count + '</span>' : '<span style="color:var(--la-text-dim);">0</span>';
            return '<tr>' +
              '<td class="is-mono">' + esc(p.ticket_no) + '</td>' +
              '<td style="font-size:11px; color:var(--la-text-dim);">' + esc(p.created_at) + '</td>' +
              '<td>' + esc(p.name) + '</td>' +
              '<td class="is-mono">' + esc(p.phone) + '</td>' +
              '<td>' + esc(p.email) + '</td>' +
              '<td>' + (p.quiz_result_type ? esc(p.quiz_result_type) + ' (' + p.quiz_score + ')' : '-') + '</td>' +
              '<td class="is-mono"><strong>' + esc(p.referral_code) + '</strong>' + (p.referred_by ? '<br/><small style="color:var(--la-text-dim);">來自: ' + esc(p.referred_by) + '</small>' : '') + '</td>' +
              '<td>' + invited + '</td>' +
              '<td class="is-mono">' + chances + '</td>' +
              '<td>' + winBadge + '</td>' +
            '</tr>';
          }).join('') +
        '</tbody>' +
      '</table>';
  }

})();
