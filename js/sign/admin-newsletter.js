/**
 * ============================================================
 * JDI Admin · Newsletter Panel
 * ============================================================
 * 提供訂閱者管理、待推送排程、批量匯入 email
 * ============================================================
 */
(function () {
  'use strict';

  const API_BASE = '/api/newsletter';

  const stats = {
    total: document.getElementById('nlStatTotal'),
    confirmed: document.getElementById('nlStatConfirmed'),
    pending: document.getElementById('nlStatPending'),
    unsub: document.getElementById('nlStatUnsub'),
  };
  const tabBadge = document.getElementById('tabBadgeNewsletter');
  const broadcastList = document.getElementById('nlBroadcastList');
  const subscriberList = document.getElementById('nlSubscriberList');
  const refreshBtn = document.getElementById('nlRefreshBtn');
  const importBtn = document.getElementById('nlImportBtn');
  const filterStatus = document.getElementById('nlFilterStatus');
  const searchInput = document.getElementById('nlSearchInput');

  // ---------- Import Modal ----------
  const importModal = document.getElementById('nlImportModal');
  const importClose = document.getElementById('nlImportClose');
  const importCancel = document.getElementById('nlImportCancel');
  const importSubmit = document.getElementById('nlImportSubmit');
  const importSource = document.getElementById('nlImportSource');
  const importSourceDetail = document.getElementById('nlImportSourceDetail');
  const importEmails = document.getElementById('nlImportEmails');
  const importSendReeng = document.getElementById('nlImportSendReeng');
  const importResult = document.getElementById('nlImportResult');

  function openModal() { importModal.classList.add('show'); importResult.style.display = 'none'; }
  function closeModal() { importModal.classList.remove('show'); }
  if (importClose) importClose.addEventListener('click', closeModal);
  if (importCancel) importCancel.addEventListener('click', closeModal);
  if (importBtn) importBtn.addEventListener('click', openModal);
  if (importModal) importModal.addEventListener('click', (e) => {
    if (e.target === importModal) closeModal();
  });

  // ---------- Import submit ----------
  if (importSubmit) {
    importSubmit.addEventListener('click', async () => {
      const raw = (importEmails.value || '').trim();
      if (!raw) { alert('請貼上要匯入的 email'); return; }
      const emails = raw.split(/[\s,;]+/).map(s => s.trim()).filter(Boolean);
      if (!emails.length) { alert('沒有偵測到有效 email'); return; }
      if (emails.length > 5000) { alert('單次最多 5000 筆'); return; }

      // 依 checkbox 決定匯入模式（勾＝直接訂閱、不勾＝需二次確認）
      const isDirect = importSendReeng.checked;
      const mode = isDirect ? 'direct' : 'reengagement';
      const modeLabel = isDirect
        ? '✅ 直接訂閱（Meta 廣告等已 opt-in 來源，寄歡迎信）'
        : '📬 再度徵求同意（來源不明或舊名單，寄確認信讓對方點連結）';

      if (!confirm(`即將匯入 ${emails.length} 筆 email\n\n模式: ${modeLabel}\n來源: ${importSource.value}\n\n確定執行？`)) return;

      importSubmit.disabled = true;
      importSubmit.textContent = '處理中…';
      importResult.style.display = 'none';

      try {
        const resp = await fetch(`${API_BASE}/admin-import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            emails,
            source: importSource.value,
            source_detail: importSourceDetail.value || null,
            import_mode: mode,
          }),
        });
        const data = await resp.json();
        if (data.ok) {
          importResult.style.background = 'rgba(16,185,129,0.1)';
          importResult.style.color = '#065f46';
          importResult.style.border = '1px solid rgba(16,185,129,0.3)';
          const isBackground = data.email_dispatch === 'background';
          const sentLine = isBackground
            ? (mode === 'direct'
                ? '· 歡迎信：📮 已排入背景寄送佇列（1-2 分鐘內寄達）'
                : '· 再度徵求同意信：📮 已排入背景寄送佇列（1-2 分鐘內寄達）')
            : (mode === 'direct'
                ? `· 歡迎信寄送: ✅ ${data.welcome_sent || 0} · ❌ ${data.welcome_failed || 0}`
                : `· 再度徵求同意信寄送: ✅ ${data.reengagement_sent || 0} · ❌ ${data.reengagement_failed || 0}`);
          const statusHint = mode === 'direct'
            ? '<em style="color:#065f46;">→ 訂閱者已標記為「已確認」，週報寄送時會直接收到 📮</em>'
            : '<em style="color:#065f46;">→ 訂閱者為「待確認」，收件人點確認連結後才會加入名單</em>';
          importResult.innerHTML = `
            <strong>✅ 匯入完成</strong><br/>
            · 輸入: ${data.total_input} 筆<br/>
            · 有效 email: ${data.valid_count} 筆<br/>
            · 新增入庫: ${data.inserted} 筆<br/>
            · 已存在跳過: ${data.skipped_existing} 筆<br/>
            ${sentLine}<br/>
            <br/>${statusHint}
          `;
          importResult.style.display = 'block';
          importEmails.value = '';
          loadSubscribers();
        } else {
          importResult.style.background = 'rgba(239,68,68,0.08)';
          importResult.style.color = '#991b1b';
          importResult.style.border = '1px solid rgba(239,68,68,0.25)';
          importResult.textContent = '❌ ' + extractError(data, resp);
          importResult.style.display = 'block';
        }
      } catch (e) {
        importResult.style.background = 'rgba(239,68,68,0.08)';
        importResult.style.color = '#991b1b';
        importResult.textContent = '❌ 網路錯誤：' + e.message;
        importResult.style.display = 'block';
      } finally {
        importSubmit.disabled = false;
        importSubmit.textContent = '開始匯入';
      }
    });
  }

  // 統一取出錯誤訊息（相容 error 是字串 or 物件兩種格式）
  function extractError(data, resp) {
    if (!data) return `HTTP ${resp?.status || '?'} (無回應內容)`;
    if (typeof data.error === 'string') return data.error;
    if (data.error?.message) return data.error.message;
    return `HTTP ${resp?.status || '?'}`;
  }

  // ---------- Load broadcasts ----------
  async function loadBroadcasts() {
    if (!broadcastList) return;
    broadcastList.innerHTML = '<div style="text-align:center; padding:20px; color:var(--sign-text-mute);">載入中...</div>';
    try {
      const resp = await fetch(`${API_BASE}/admin-broadcasts?limit=20`);
      const data = await resp.json().catch(() => null);
      if (!data || !data.ok) throw new Error(extractError(data, resp));
      const items = data.items || [];
      if (!items.length) {
        broadcastList.innerHTML = '<div style="text-align:center; padding:32px 20px; color:var(--sign-text-mute);">目前沒有排程 / 歷史推送記錄</div>';
        return;
      }
      broadcastList.innerHTML = items.map(renderBroadcastRow).join('');
      // Bind actions
      broadcastList.querySelectorAll('[data-action="cancel"]').forEach(btn => {
        btn.addEventListener('click', () => cancelBroadcast(parseInt(btn.dataset.id, 10)));
      });
      broadcastList.querySelectorAll('[data-action="run"]').forEach(btn => {
        btn.addEventListener('click', () => runBroadcast(parseInt(btn.dataset.id, 10)));
      });
    } catch (e) {
      broadcastList.innerHTML = `<div style="text-align:center; padding:32px 20px; color:var(--sign-danger);">載入失敗：${e.message}</div>`;
    }
  }

  function renderBroadcastRow(b) {
    const statusMap = {
      pending: { label: '⏰ 待執行', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
      sending: { label: '🚀 執行中', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
      sent:    { label: '✅ 已寄送', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
      failed:  { label: '❌ 失敗',   color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
      cancelled:{ label: '⛔ 已取消', color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
    };
    const s = statusMap[b.status] || { label: b.status, color: '#6b7280', bg: '#f3f4f6' };
    const articles = b.articles || [];
    const articlesPreview = articles.slice(0, 3).map(a => `<li>${escapeHtml(a.title || a.slug)}</li>`).join('')
      + (articles.length > 3 ? `<li style="color:var(--sign-text-mute);">…還有 ${articles.length - 3} 篇</li>` : '');

    const actions = b.status === 'pending' ? `
      <div style="display:flex; gap:8px; margin-top:8px;">
        <button class="sign-btn sign-btn-primary" data-action="run" data-id="${b.id}" style="padding:6px 14px; font-size:12px;">立即寄送</button>
        <button class="sign-btn sign-btn-secondary" data-action="cancel" data-id="${b.id}" style="padding:6px 14px; font-size:12px;">取消</button>
      </div>
    ` : '';

    const meta = b.status === 'sent' ? `
      <div style="font-size:12px; color:var(--sign-text-mute); margin-top:4px;">
        收件 ${b.recipient_count} · 成功 ${b.success_count} · 失敗 ${b.fail_count}
      </div>` : '';

    return `
      <div class="admin-list-item" style="padding:14px 16px; border:1px solid rgba(0,0,0,0.06); border-radius:10px; margin-bottom:10px;">
        <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
          <span style="background:${s.bg}; color:${s.color}; padding:4px 10px; border-radius:999px; font-size:12px; font-weight:700;">${s.label}</span>
          <span style="font-size:13px; color:var(--sign-text-mute);">#${b.id}</span>
          <span style="font-size:13px; color:var(--sign-text-mute);">by ${escapeHtml(b.triggered_by || '-')}</span>
          <span style="font-size:13px; color:var(--sign-text-mute); margin-left:auto;">
            ${b.status === 'pending' ? '排程於 ' : '建立於 '}${formatDate(b.scheduled_at || b.created_at)}
          </span>
        </div>
        <div style="margin-top:8px;">
          <strong style="font-size:14px;">📄 包含 ${b.articles_count} 篇文章</strong>
          <ul style="margin:6px 0 0 20px; font-size:13px; line-height:1.7; color:var(--sign-text-dim, #4b5563);">
            ${articlesPreview}
          </ul>
        </div>
        ${meta}
        ${actions}
      </div>
    `;
  }

  async function cancelBroadcast(id) {
    if (!confirm(`確定取消排程 #${id}？`)) return;
    try {
      const resp = await fetch(`${API_BASE}/admin-broadcast-cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ broadcast_id: id }),
      });
      const data = await resp.json().catch(() => null);
      if (data && data.ok) {
        alert('✅ 已取消');
        loadBroadcasts();
      } else {
        alert('❌ ' + extractError(data, resp));
      }
    } catch (e) { alert('網路錯誤：' + e.message); }
  }

  async function runBroadcast(id) {
    if (!confirm(`⚠️ 確定立即寄送排程 #${id}？這會馬上寄給所有已確認訂閱者，無法撤回。`)) return;
    try {
      const resp = await fetch(`${API_BASE}/admin-broadcast-run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ broadcast_id: id, force_run: true }),
      });
      const data = await resp.json().catch(() => null);
      if (data && data.ok) {
        alert(`✅ 已寄送\n收件人 ${data.recipient_count} · 成功 ${data.success_count} · 失敗 ${data.fail_count}`);
        loadBroadcasts();
        loadSubscribers();
      } else {
        alert('❌ ' + extractError(data, resp));
      }
    } catch (e) { alert('網路錯誤：' + e.message); }
  }

  // ---------- Load subscribers ----------
  async function loadSubscribers() {
    if (!subscriberList) return;
    subscriberList.innerHTML = '<div style="text-align:center; padding:20px; color:var(--sign-text-mute);">載入中...</div>';
    try {
      const status = filterStatus ? filterStatus.value : 'confirmed';
      const search = searchInput ? searchInput.value.trim() : '';
      const params = new URLSearchParams({ status, limit: '100' });
      if (search) params.set('search', search);

      const resp = await fetch(`${API_BASE}/admin-list?${params}`);
      const data = await resp.json().catch(() => null);
      if (!data || !data.ok) throw new Error(extractError(data, resp));

      if (data.stats) {
        if (stats.total) stats.total.textContent = data.stats.total || 0;
        if (stats.confirmed) stats.confirmed.textContent = data.stats.confirmed || 0;
        if (stats.pending) stats.pending.textContent = data.stats.pending || 0;
        if (stats.unsub) stats.unsub.textContent = data.stats.unsubscribed || 0;
        if (tabBadge) tabBadge.textContent = data.stats.confirmed || 0;
      }

      const items = data.items || [];
      if (!items.length) {
        subscriberList.innerHTML = '<div style="text-align:center; padding:32px 20px; color:var(--sign-text-mute);">目前沒有符合條件的訂閱者</div>';
        return;
      }
      subscriberList.innerHTML = items.map(renderSubscriberRow).join('');
    } catch (e) {
      subscriberList.innerHTML = `<div style="text-align:center; padding:32px 20px; color:var(--sign-danger);">載入失敗：${e.message}</div>`;
    }
  }

  function renderSubscriberRow(s) {
    const statusMap = {
      confirmed: { label: '✅ 已確認', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
      pending:   { label: '⏰ 待確認', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
      unsubscribed:{ label:'⛔ 已退訂', color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
      bounced:   { label: '❌ 退信',   color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
    };
    const st = statusMap[s.status] || { label: s.status, color: '#6b7280', bg: '#f3f4f6' };
    return `
      <div class="admin-list-item" style="display:flex; align-items:center; gap:12px; padding:10px 14px; border:1px solid rgba(0,0,0,0.05); border-radius:8px; margin-bottom:6px; flex-wrap:wrap;">
        <span style="background:${st.bg}; color:${st.color}; padding:3px 8px; border-radius:999px; font-size:11px; font-weight:700; white-space:nowrap;">${st.label}</span>
        <strong style="font-family:monospace; font-size:13px;">${escapeHtml(s.email)}</strong>
        ${s.nickname ? `<span style="font-size:12px; color:var(--sign-text-mute);">(${escapeHtml(s.nickname)})</span>` : ''}
        <span style="font-size:11px; color:var(--sign-text-mute);">📍${escapeHtml(s.source || '?')}</span>
        <span style="font-size:11px; color:var(--sign-text-mute); margin-left:auto;">${formatDate(s.confirmed_at || s.created_at)}</span>
        <span style="font-size:11px; color:var(--sign-text-mute);">📧 已寄 ${s.emails_sent || 0} 封</span>
      </div>
    `;
  }

  // ---------- Helpers ----------
  function escapeHtml(s) {
    return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function formatDate(iso) {
    if (!iso) return '-';
    return String(iso).replace('T', ' ').slice(0, 16);
  }

  // ---------- Events ----------
  if (refreshBtn) refreshBtn.addEventListener('click', () => {
    loadBroadcasts();
    loadSubscribers();
  });
  let searchTimer;
  if (searchInput) searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(loadSubscribers, 350);
  });
  if (filterStatus) filterStatus.addEventListener('change', loadSubscribers);

  // ---------- Expose ----------
  window.jdiNewsletterAdmin = {
    load() {
      loadBroadcasts();
      loadSubscribers();
    },
  };
})();
