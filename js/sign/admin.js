/**
 * ============================================================
 * JDI Sign · Admin Backend
 * ============================================================
 */
(function() {
  'use strict';

  let currentStatus = 'all';
  let currentSearch = '';
  let allContracts = [];

  const contractList = document.getElementById('contractList');
  const searchInput = document.getElementById('searchInput');
  const refreshBtn = document.getElementById('refreshBtn');
  const modal = document.getElementById('detailModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');
  const modalFooter = document.getElementById('modalFooter');
  const modalClose = document.getElementById('modalClose');
  const adminEmail = document.getElementById('adminEmail');

  document.querySelectorAll('.admin-stat').forEach(el => {
    el.addEventListener('click', () => {
      document.querySelectorAll('.admin-stat').forEach(x => x.classList.remove('active'));
      el.classList.add('active');
      currentStatus = el.dataset.status;
      loadList();
    });
  });

  refreshBtn.addEventListener('click', loadList);

  let searchTimer = null;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      currentSearch = searchInput.value.trim();
      loadList();
    }, 300);
  });

  modalClose.addEventListener('click', () => modal.classList.remove('show'));
  modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('show'); });

  const STATUS_LABEL = {
    pending: '⏳ 待審核',
    approved: '✓ 已核准',
    rejected: '↩️ 已退回',
    expired: '⌛ 已到期',
    terminated: '⛔ 已終止',
  };
  const STATUS_CLASS = {
    pending: 'status-pending',
    approved: 'status-approved',
    rejected: 'status-rejected',
    expired: 'status-pending',
    terminated: 'status-rejected',
  };

  async function loadList() {
    contractList.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--sign-text-mute);">載入中...</div>`;
    try {
      const params = new URLSearchParams();
      if (currentStatus !== 'all') params.set('status', currentStatus);
      if (currentSearch) params.set('q', currentSearch);

      const res = await fetch(`/api/sign/admin-list?${params}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || '載入失敗');

      allContracts = data.contracts;
      adminEmail.textContent = data.admin_email || '';

      // 更新統計
      const stats = data.stats || {};
      document.getElementById('stat-all').textContent = Object.values(stats).reduce((a, b) => a + b, 0);
      document.getElementById('stat-pending').textContent = stats.pending || 0;
      document.getElementById('stat-approved').textContent = stats.approved || 0;
      document.getElementById('stat-rejected').textContent = stats.rejected || 0;
      document.getElementById('stat-expired').textContent = stats.expired || 0;

      renderList();
    } catch (err) {
      contractList.innerHTML = `<div class="sign-alert sign-alert-danger">⚠️ ${err.message}</div>`;
    }
  }

  function renderList() {
    if (allContracts.length === 0) {
      contractList.innerHTML = `<div style="text-align: center; padding: 60px 20px; color: var(--sign-text-mute);">
        <div style="font-size: 40px; margin-bottom: 12px;">📭</div>
        目前沒有符合條件的合約
      </div>`;
      return;
    }
    contractList.innerHTML = allContracts.map(c => `
      <div class="admin-list-item" data-id="${c.id}">
        <div class="admin-list-item-info">
          <div class="admin-list-item-name">${escapeHtml(c.real_name)} · ${escapeHtml(c.stage_name)}</div>
          <div class="admin-list-item-code">${c.contract_no}</div>
          <div class="admin-list-item-meta">
            ${c.contract_years}年 · ${c.phone} · ${c.email}
            ${c.operator_name ? `· 運營：${escapeHtml(c.operator_name)}` : ''}
          </div>
          <div class="admin-list-item-meta" style="opacity: 0.7;">送出：${c.created_at}</div>
        </div>
        <div class="admin-list-item-status ${STATUS_CLASS[c.status] || ''}">${STATUS_LABEL[c.status] || c.status}</div>
      </div>
    `).join('');

    contractList.querySelectorAll('.admin-list-item').forEach(el => {
      el.addEventListener('click', () => openDetail(el.dataset.id));
    });
  }

  async function openDetail(id) {
    modal.classList.add('show');
    modalBody.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--sign-text-mute);">載入中...</div>`;
    modalFooter.innerHTML = '';

    try {
      const res = await fetch(`/api/sign/admin-detail?id=${id}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);

      const c = data.contract;
      modalTitle.textContent = `${c.contract_no}`;

      // 附件 base64 map
      const attaMap = {};
      for (const a of data.attachments) attaMap[a.file_type] = a.storage_url;

      modalBody.innerHTML = `
        <div style="margin-bottom: 20px;">
          <span class="admin-list-item-status ${STATUS_CLASS[c.status]}">${STATUS_LABEL[c.status]}</span>
          ${c.status === 'rejected' && c.rejection_reason ? `
            <div class="sign-alert sign-alert-warning" style="margin-top: 12px;">
              <strong>退回原因：</strong>${escapeHtml(c.rejection_reason)}
            </div>` : ''}
        </div>

        <h3 style="color: #fff; font-size: 14px; margin: 20px 0 8px; letter-spacing: 1px;">👤 主播基本資料</h3>
        <div class="admin-detail-row"><span class="admin-detail-label">真實姓名</span><span class="admin-detail-value">${escapeHtml(c.real_name)}</span></div>
        <div class="admin-detail-row"><span class="admin-detail-label">藝名</span><span class="admin-detail-value">${escapeHtml(c.stage_name)}</span></div>
        <div class="admin-detail-row"><span class="admin-detail-label">身分證字號</span><span class="admin-detail-value" style="font-family: monospace;">${escapeHtml(c.id_number)}</span></div>
        <div class="admin-detail-row"><span class="admin-detail-label">生日</span><span class="admin-detail-value">${c.birthday || '—'}</span></div>
        <div class="admin-detail-row"><span class="admin-detail-label">電話</span><span class="admin-detail-value"><a href="tel:${c.phone}" style="color: var(--sign-accent);">${c.phone}</a></span></div>
        <div class="admin-detail-row"><span class="admin-detail-label">Email</span><span class="admin-detail-value"><a href="mailto:${c.email}" style="color: var(--sign-accent);">${c.email}</a></span></div>
        <div class="admin-detail-row"><span class="admin-detail-label">聯絡地址</span><span class="admin-detail-value">${escapeHtml(c.contact_address)}</span></div>
        <div class="admin-detail-row"><span class="admin-detail-label">戶籍地址</span><span class="admin-detail-value">${escapeHtml(c.registered_address)}</span></div>

        <h3 style="color: #fff; font-size: 14px; margin: 20px 0 8px; letter-spacing: 1px;">📅 合約條件</h3>
        <div class="admin-detail-row"><span class="admin-detail-label">合約年限</span><span class="admin-detail-value">${c.contract_years} 年</span></div>
        <div class="admin-detail-row"><span class="admin-detail-label">生效日</span><span class="admin-detail-value">${c.contract_start_date}</span></div>
        <div class="admin-detail-row"><span class="admin-detail-label">到期日</span><span class="admin-detail-value">${c.contract_end_date}</span></div>

        <h3 style="color: #fff; font-size: 14px; margin: 20px 0 8px; letter-spacing: 1px;">🖼️ 身分證上傳</h3>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          ${attaMap.id_front ? `<img class="admin-attachment-thumb" src="${attaMap.id_front}" alt="正面" onclick="window.open(this.src)" />` : '<span style="color: var(--sign-text-mute);">未上傳正面</span>'}
          ${attaMap.id_back ? `<img class="admin-attachment-thumb" src="${attaMap.id_back}" alt="反面" onclick="window.open(this.src)" />` : '<span style="color: var(--sign-text-mute);">未上傳反面</span>'}
        </div>

        <h3 style="color: #fff; font-size: 14px; margin: 20px 0 8px; letter-spacing: 1px;">✍️ 電子簽名</h3>
        ${c.signature_data ? `<img class="admin-signature-img" src="${c.signature_data}" alt="簽名" />` : '<span style="color: var(--sign-text-mute);">未簽名</span>'}

        <h3 style="color: #fff; font-size: 14px; margin: 20px 0 8px; letter-spacing: 1px;">📜 簽署證據鏈</h3>
        <div class="admin-detail-row"><span class="admin-detail-label">簽署時間</span><span class="admin-detail-value">${c.signed_at}</span></div>
        <div class="admin-detail-row"><span class="admin-detail-label">簽署 IP</span><span class="admin-detail-value" style="font-family: monospace;">${c.signed_ip}</span></div>
        <div class="admin-detail-row"><span class="admin-detail-label">滾到底時間</span><span class="admin-detail-value" style="font-size: 11px; color: var(--sign-text-mute);">${c.read_scrolled_at || '—'}</span></div>
        <div class="admin-detail-row"><span class="admin-detail-label">同意時間</span><span class="admin-detail-value" style="font-size: 11px; color: var(--sign-text-mute);">${c.agreed_at}</span></div>
        <div class="admin-detail-row"><span class="admin-detail-label">User-Agent</span><span class="admin-detail-value" style="font-size: 10px; color: var(--sign-text-mute); word-break: break-all;">${escapeHtml(c.signed_ua || '—')}</span></div>

        ${c.status === 'approved' ? `
        <h3 style="color: #fff; font-size: 14px; margin: 20px 0 8px; letter-spacing: 1px;">✅ 核准資訊</h3>
        <div class="admin-detail-row"><span class="admin-detail-label">核准人</span><span class="admin-detail-value">${escapeHtml(c.approved_by)}</span></div>
        <div class="admin-detail-row"><span class="admin-detail-label">核准時間</span><span class="admin-detail-value">${c.approved_at}</span></div>
        <div class="admin-detail-row"><span class="admin-detail-label">運營經紀</span><span class="admin-detail-value">${escapeHtml(c.operator_name)}</span></div>
        <div class="admin-detail-row"><span class="admin-detail-label">運營 Email</span><span class="admin-detail-value">${escapeHtml(c.operator_email)}</span></div>
        ` : ''}

        <h3 style="color: #fff; font-size: 14px; margin: 20px 0 8px; letter-spacing: 1px;">📋 稽核紀錄 (${data.logs.length})</h3>
        <div style="max-height: 200px; overflow-y: auto; background: var(--sign-bg-elev); padding: 12px; border-radius: 8px; font-size: 12px;">
          ${data.logs.map(l => `
            <div style="padding: 6px 0; border-bottom: 1px dashed var(--sign-border);">
              <strong style="color: var(--sign-accent);">${l.action}</strong>
              <span style="color: var(--sign-text-mute);">by ${l.actor} · ${l.actor_ip || ''}</span>
              <div style="font-size: 10px; color: var(--sign-text-mute); margin-top: 2px;">${l.created_at}</div>
            </div>
          `).join('') || '<div style="color: var(--sign-text-mute);">無</div>'}
        </div>
      `;

      // Footer buttons
      const viewUrl = `/sign/contract-view/?no=${encodeURIComponent(c.contract_no)}&admin=1`;
      const viewBtn = `<a href="${viewUrl}" target="_blank" rel="noopener" class="sign-btn sign-btn-secondary">📄 查看合約 PDF</a>`;

      if (c.status === 'pending') {
        modalFooter.innerHTML = `
          ${viewBtn}
          <button class="sign-btn sign-btn-ghost" id="rejectBtn">↩️ 退回補件</button>
          <button class="sign-btn sign-btn-primary" id="approveBtn">✅ 核准並蓋章</button>
        `;
        document.getElementById('approveBtn').addEventListener('click', () => showApproveForm(c));
        document.getElementById('rejectBtn').addEventListener('click', () => showRejectForm(c.id));
      } else {
        modalFooter.innerHTML = `
          ${viewBtn}
          <button class="sign-btn sign-btn-ghost" onclick="document.getElementById('detailModal').classList.remove('show')">關閉</button>
        `;
      }

    } catch (err) {
      modalBody.innerHTML = `<div class="sign-alert sign-alert-danger">⚠️ ${err.message}</div>`;
    }
  }

  function showApproveForm(c) {
    modalBody.innerHTML = `
      <div class="sign-alert sign-alert-success">
        <strong>核准 ${c.contract_no}</strong><br />
        請填入運營經紀資訊，核准後系統會自動：<br />
        1. 蓋上甲方（艾超數位）簽名章<br />
        2. 產生正式合約 PDF<br />
        3. Email 通知主播與運營
      </div>

      <div class="sign-form-group">
        <label class="sign-form-label">運營經紀姓名<span class="sign-required">*</span></label>
        <input type="text" id="opName" class="sign-form-input" placeholder="例：Amy" />
      </div>
      <div class="sign-form-group">
        <label class="sign-form-label">運營經紀 Email<span class="sign-required">*</span></label>
        <input type="email" id="opEmail" class="sign-form-input" placeholder="operator@jdi-pulse.com" />
      </div>

      <div id="approveError" class="sign-alert sign-alert-danger" style="display:none;"></div>
    `;
    modalFooter.innerHTML = `
      <button class="sign-btn sign-btn-ghost" id="cancelApprove">取消</button>
      <button class="sign-btn sign-btn-primary" id="confirmApprove">確認核准</button>
    `;
    document.getElementById('cancelApprove').addEventListener('click', () => openDetail(c.id));
    document.getElementById('confirmApprove').addEventListener('click', async () => {
      const name = document.getElementById('opName').value.trim();
      const email = document.getElementById('opEmail').value.trim();
      const errBox = document.getElementById('approveError');
      if (!name) { errBox.textContent = '請填運營姓名'; errBox.style.display = 'block'; return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { errBox.textContent = 'Email 格式錯誤'; errBox.style.display = 'block'; return; }

      const btn = document.getElementById('confirmApprove');
      btn.disabled = true; btn.textContent = '處理中...';
      try {
        const res = await fetch('/api/sign/admin-approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contract_id: c.id, action: 'approve', operator_name: name, operator_email: email }),
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error);
        alert(`✓ 已核准 ${data.contract_no}`);
        modal.classList.remove('show');
        loadList();
      } catch (err) {
        errBox.textContent = '⚠️ ' + err.message;
        errBox.style.display = 'block';
        btn.disabled = false; btn.textContent = '確認核准';
      }
    });
  }

  function showRejectForm(id) {
    const reason = prompt('請輸入退回原因（將 Email 通知主播）：');
    if (!reason || !reason.trim()) return;

    fetch('/api/sign/admin-approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contract_id: id, action: 'reject', reject_reason: reason.trim() }),
    }).then(r => r.json()).then(data => {
      if (data.ok) {
        alert('✓ 已退回並通知主播');
        modal.classList.remove('show');
        loadList();
      } else {
        alert('⚠️ ' + (data.error || '失敗'));
      }
    });
  }

  function escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, m => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[m]));
  }

  loadList();
})();
