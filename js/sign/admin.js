/**
 * ============================================================
 * JDI Sign · Admin Backend (統一主播 + 運營)
 * ============================================================
 * Tab 切換：
 *   streamer → /api/sign/admin-* + sign_contracts
 *   ops      → /api/ops/admin-*  + ops_contracts
 */
(function() {
  'use strict';

  let currentTab = 'streamer';  // 'streamer' | 'ops'
  let currentStatus = 'all';
  let currentSearch = '';
  let allContracts = [];
  let tabCounts = { streamer: 0, ops: 0 };

  const contractList = document.getElementById('contractList');
  const searchInput = document.getElementById('searchInput');
  const refreshBtn = document.getElementById('refreshBtn');
  const modal = document.getElementById('detailModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');
  const modalFooter = document.getElementById('modalFooter');
  const modalClose = document.getElementById('modalClose');
  const adminEmail = document.getElementById('adminEmail');
  const adminUserMenu = document.getElementById('adminUserMenu');
  const adminUserBtn = document.getElementById('adminUserBtn');
  const adminUserAvatar = document.getElementById('adminUserAvatar');
  const adminUserAvatar2 = document.getElementById('adminUserAvatar2');
  const adminUserDropdownEmail = document.getElementById('adminUserDropdownEmail');

  // ============ 帳號選單開合 ============
  if (adminUserBtn && adminUserMenu) {
    adminUserBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      adminUserMenu.classList.toggle('open');
    });
    document.addEventListener('click', (e) => {
      if (!adminUserMenu.contains(e.target)) {
        adminUserMenu.classList.remove('open');
      }
    });
    // Esc 關閉
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') adminUserMenu.classList.remove('open');
    });
  }

  function updateAdminIdentity(email) {
    if (!email) return;
    const firstChar = email.trim().charAt(0).toUpperCase();
    if (adminEmail) adminEmail.textContent = email;
    if (adminUserAvatar) adminUserAvatar.textContent = firstChar;
    if (adminUserAvatar2) adminUserAvatar2.textContent = firstChar;
    if (adminUserDropdownEmail) adminUserDropdownEmail.textContent = email;
  }

  // ============ Tab 切換 ============
  const tabPanelContracts = document.getElementById('tabPanelContracts');
  const tabPanelNewsletter = document.getElementById('tabPanelNewsletter');

  document.querySelectorAll('.admin-tab').forEach(el => {
    el.addEventListener('click', () => {
      const t = el.dataset.tab;
      if (t === currentTab) return;
      currentTab = t;
      document.querySelectorAll('.admin-tab').forEach(x => x.classList.remove('active'));
      el.classList.add('active');

      // Switch panel visibility
      const isNewsletter = (currentTab === 'newsletter');
      if (tabPanelContracts) tabPanelContracts.style.display = isNewsletter ? 'none' : '';
      if (tabPanelNewsletter) tabPanelNewsletter.style.display = isNewsletter ? '' : 'none';

      document.body.classList.toggle('tab-ops', currentTab === 'ops');
      document.body.classList.toggle('tab-newsletter', isNewsletter);

      if (isNewsletter) {
        // 觸發 admin-newsletter.js 載入邏輯
        if (window.jdiNewsletterAdmin && window.jdiNewsletterAdmin.load) {
          window.jdiNewsletterAdmin.load();
        }
        return;
      }

      currentStatus = 'all';
      document.querySelectorAll('.admin-stat').forEach(x => x.classList.remove('active'));
      const allStat = document.querySelector('.admin-stat[data-status="all"]');
      if (allStat) allStat.classList.add('active');
      loadList();
    });
  });

  // Init from URL param ?type=ops or ?type=newsletter, or hash #newsletter
  const urlType = new URLSearchParams(location.search).get('type');
  if (urlType === 'ops') {
    document.querySelector('.admin-tab[data-tab="ops"]').click();
  } else if (urlType === 'newsletter' || location.hash === '#newsletter') {
    document.querySelector('.admin-tab[data-tab="newsletter"]').click();
  }

  document.querySelectorAll('.admin-stat').forEach(el => {
    el.addEventListener('click', () => {
      document.querySelectorAll('.admin-stat').forEach(x => x.classList.remove('active'));
      el.classList.add('active');
      currentStatus = el.dataset.status;
      loadList();
    });
  });

  refreshBtn.addEventListener('click', () => {
    loadList();
    loadTabCounts();
  });

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

  function apiBase() {
    return currentTab === 'ops' ? '/api/ops' : '/api/sign';
  }
  function contractViewPath() {
    return currentTab === 'ops' ? '/ops/contract-view/' : '/sign/contract-view/';
  }

  async function loadTabCounts() {
    // 分別打兩個 API 拿 stats
    try {
      const [s, o] = await Promise.all([
        fetch('/api/sign/admin-list').then(r => r.json()).catch(() => null),
        fetch('/api/ops/admin-list').then(r => r.json()).catch(() => null),
      ]);
      if (s && s.ok) {
        tabCounts.streamer = Object.values(s.stats || {}).reduce((a, b) => a + b, 0);
        document.getElementById('tabBadgeStreamer').textContent = tabCounts.streamer;
      }
      if (o && o.ok) {
        tabCounts.ops = Object.values(o.stats || {}).reduce((a, b) => a + b, 0);
        document.getElementById('tabBadgeOps').textContent = tabCounts.ops;
      }
    } catch (e) { /* ignore */ }
  }

  async function loadList() {
    contractList.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--sign-text-mute);">載入中...</div>`;
    try {
      const params = new URLSearchParams();
      if (currentStatus !== 'all') params.set('status', currentStatus);
      if (currentSearch) params.set('q', currentSearch);

      const res = await fetch(`${apiBase()}/admin-list?${params}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || '載入失敗');

      allContracts = data.contracts;
      updateAdminIdentity(data.admin_email || '');

      const stats = data.stats || {};
      const total = Object.values(stats).reduce((a, b) => a + b, 0);
      document.getElementById('stat-all').textContent = total;
      document.getElementById('stat-pending').textContent = stats.pending || 0;
      document.getElementById('stat-approved').textContent = stats.approved || 0;
      document.getElementById('stat-rejected').textContent = stats.rejected || 0;
      document.getElementById('stat-expired').textContent = stats.expired || 0;

      // 同步更新 tab badge
      if (currentTab === 'streamer') {
        tabCounts.streamer = total;
        document.getElementById('tabBadgeStreamer').textContent = total;
      } else {
        tabCounts.ops = total;
        document.getElementById('tabBadgeOps').textContent = total;
      }

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
    contractList.innerHTML = allContracts.map(c => {
      // 主播 vs 運營顯示不同欄位
      if (currentTab === 'streamer') {
        return `
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
        </div>`;
      } else {
        // ops
        const partyIcon = c.party_type === 'company' ? '🏢' : '👤';
        const partyLabel = c.party_type === 'company' ? '公司' : '個人';
        return `
        <div class="admin-list-item" data-id="${c.id}">
          <div class="admin-list-item-info">
            <div class="admin-list-item-name">${partyIcon} ${escapeHtml(c.entity_name)}${c.representative ? ` · ${escapeHtml(c.representative)}` : ''}</div>
            <div class="admin-list-item-code">${c.contract_no}</div>
            <div class="admin-list-item-meta">
              ${partyLabel} · ${c.contract_years}年 · 手續費 ${c.service_fee_rate}% · ${c.phone} · ${c.email}
            </div>
            <div class="admin-list-item-meta" style="opacity: 0.7;">送出：${c.created_at}</div>
          </div>
          <div class="admin-list-item-status ${STATUS_CLASS[c.status] || ''}">${STATUS_LABEL[c.status] || c.status}</div>
        </div>`;
      }
    }).join('');

    contractList.querySelectorAll('.admin-list-item').forEach(el => {
      el.addEventListener('click', () => openDetail(el.dataset.id));
    });
  }

  async function openDetail(id) {
    modal.classList.add('show');
    modalBody.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--sign-text-mute);">載入中...</div>`;
    modalFooter.innerHTML = '';

    try {
      const res = await fetch(`${apiBase()}/admin-detail?id=${id}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);

      const c = data.contract;
      modalTitle.textContent = `${c.contract_no}`;

      if (currentTab === 'streamer') {
        renderStreamerDetail(c, data.attachments || [], data.logs || []);
      } else {
        renderOpsDetail(c, data.attachments || [], data.logs || []);
      }

    } catch (err) {
      modalBody.innerHTML = `<div class="sign-alert sign-alert-danger">⚠️ ${err.message}</div>`;
    }
  }

  // ============ 主播 detail ============
  function renderStreamerDetail(c, attachments, logs) {
    const attaMap = {};
    for (const a of attachments) attaMap[a.file_type] = a.storage_url;

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

      ${renderEvidenceChain(c)}

      ${c.status === 'approved' ? `
      <h3 style="color: #fff; font-size: 14px; margin: 20px 0 8px; letter-spacing: 1px;">✅ 核准資訊</h3>
      <div class="admin-detail-row"><span class="admin-detail-label">核准人</span><span class="admin-detail-value">${escapeHtml(c.approved_by)}</span></div>
      <div class="admin-detail-row"><span class="admin-detail-label">核准時間</span><span class="admin-detail-value">${c.approved_at}</span></div>
      <div class="admin-detail-row"><span class="admin-detail-label">運營經紀</span><span class="admin-detail-value">${escapeHtml(c.operator_name)}</span></div>
      <div class="admin-detail-row"><span class="admin-detail-label">運營 Email</span><span class="admin-detail-value">${escapeHtml(c.operator_email)}</span></div>
      ` : ''}

      ${renderAuditLogs(logs)}
    `;

    // Footer buttons
    setupFooter(c, /*isOps*/ false);
  }

  // ============ 運營 detail ============
  function renderOpsDetail(c, attachments, logs) {
    const partyLabel = c.party_type === 'company' ? '🏢 經紀公司' : '👤 個人運營';
    const attaMap = {};
    for (const a of attachments) attaMap[a.file_type] = a.storage_url;

    modalBody.innerHTML = `
      <div style="margin-bottom: 20px;">
        <span class="admin-list-item-status ${STATUS_CLASS[c.status]}">${STATUS_LABEL[c.status]}</span>
        <span style="margin-left: 10px; padding: 4px 10px; border-radius: 999px; background: rgba(99,102,241,0.15); color: #a5b4fc; font-size: 12px; font-weight: 700;">${partyLabel}</span>
        ${c.status === 'rejected' && c.rejection_reason ? `
          <div class="sign-alert sign-alert-warning" style="margin-top: 12px;">
            <strong>退回原因：</strong>${escapeHtml(c.rejection_reason)}
          </div>` : ''}
      </div>

      <h3 style="color: #fff; font-size: 14px; margin: 20px 0 8px; letter-spacing: 1px;">📋 乙方基本資料</h3>
      <div class="admin-detail-row"><span class="admin-detail-label">${c.party_type === 'company' ? '公司名稱' : '姓名'}</span><span class="admin-detail-value">${escapeHtml(c.entity_name)}</span></div>
      <div class="admin-detail-row"><span class="admin-detail-label">${c.party_type === 'company' ? '統一編號' : '身分證字號'}</span><span class="admin-detail-value" style="font-family: monospace;">${escapeHtml(c.tax_id)}</span></div>
      ${c.representative ? `<div class="admin-detail-row"><span class="admin-detail-label">代表人</span><span class="admin-detail-value">${escapeHtml(c.representative)}</span></div>` : ''}
      ${c.job_title ? `<div class="admin-detail-row"><span class="admin-detail-label">職稱</span><span class="admin-detail-value">${escapeHtml(c.job_title)}</span></div>` : ''}
      <div class="admin-detail-row"><span class="admin-detail-label">${c.party_type === 'company' ? '公司地址' : '聯絡地址'}</span><span class="admin-detail-value">${escapeHtml(c.address)}</span></div>
      <div class="admin-detail-row"><span class="admin-detail-label">電話</span><span class="admin-detail-value"><a href="tel:${c.phone}" style="color: var(--sign-accent);">${c.phone}</a></span></div>
      <div class="admin-detail-row"><span class="admin-detail-label">Email</span><span class="admin-detail-value"><a href="mailto:${c.email}" style="color: var(--sign-accent);">${c.email}</a></span></div>

      <h3 style="color: #fff; font-size: 14px; margin: 20px 0 8px; letter-spacing: 1px;">💰 撥款帳戶</h3>
      <div class="admin-detail-row"><span class="admin-detail-label">銀行</span><span class="admin-detail-value">${escapeHtml(c.bank_name)} · ${escapeHtml(c.bank_branch)}</span></div>
      <div class="admin-detail-row"><span class="admin-detail-label">帳號</span><span class="admin-detail-value" style="font-family: monospace;" id="bankAccMasked">${maskBank(c.bank_account)} <button type="button" style="margin-left:8px;background:none;border:1px solid var(--sign-border);color:var(--sign-text-mute);padding:2px 8px;border-radius:4px;font-size:11px;cursor:pointer;" onclick="this.previousSibling.nodeValue='${escapeHtml(c.bank_account)} ';this.remove();">👁 顯示完整</button></span></div>
      <div class="admin-detail-row"><span class="admin-detail-label">戶名</span><span class="admin-detail-value">${escapeHtml(c.bank_account_name)}</span></div>

      <h3 style="color: #fff; font-size: 14px; margin: 20px 0 8px; letter-spacing: 1px;">📅 合作條件</h3>
      <div class="admin-detail-row"><span class="admin-detail-label">合作期間</span><span class="admin-detail-value">${c.contract_years} 年</span></div>
      <div class="admin-detail-row"><span class="admin-detail-label">生效日</span><span class="admin-detail-value">${c.contract_start_date}</span></div>
      <div class="admin-detail-row"><span class="admin-detail-label">到期日</span><span class="admin-detail-value">${c.contract_end_date}</span></div>
      <div class="admin-detail-row"><span class="admin-detail-label">服務手續費</span><span class="admin-detail-value" style="color: #a5b4fc; font-weight: 700;">${c.service_fee_rate}%</span></div>

      ${attaMap.company_stamp ? `
      <h3 style="color: #fff; font-size: 14px; margin: 20px 0 8px; letter-spacing: 1px;">🖋 公司大小章</h3>
      <img class="admin-attachment-thumb" style="background: #fff; padding: 8px;" src="${attaMap.company_stamp}" alt="公司大小章" onclick="window.open(this.src)" />
      ` : ''}

      <h3 style="color: #fff; font-size: 14px; margin: 20px 0 8px; letter-spacing: 1px;">✍️ 乙方電子簽名</h3>
      ${c.signature_data ? `<img class="admin-signature-img" src="${c.signature_data}" alt="簽名" />` : '<span style="color: var(--sign-text-mute);">未簽名</span>'}

      ${renderEvidenceChain(c, /*isOps*/ true)}

      ${c.status === 'approved' ? `
      <h3 style="color: #fff; font-size: 14px; margin: 20px 0 8px; letter-spacing: 1px;">✅ 核准資訊</h3>
      <div class="admin-detail-row"><span class="admin-detail-label">核准人</span><span class="admin-detail-value">${escapeHtml(c.approved_by)}</span></div>
      <div class="admin-detail-row"><span class="admin-detail-label">核准時間</span><span class="admin-detail-value">${c.approved_at}</span></div>
      ${c.admin_note ? `<div class="admin-detail-row"><span class="admin-detail-label">後台備註</span><span class="admin-detail-value">${escapeHtml(c.admin_note)}</span></div>` : ''}
      ` : ''}

      ${renderAuditLogs(logs)}
    `;

    setupFooter(c, /*isOps*/ true);
  }

  function renderEvidenceChain(c, isOps) {
    return `
      <h3 style="color: #fff; font-size: 14px; margin: 20px 0 8px; letter-spacing: 1px;">📜 簽署證據鏈</h3>
      <div class="admin-detail-row"><span class="admin-detail-label">簽署時間</span><span class="admin-detail-value">${c.signed_at}</span></div>
      <div class="admin-detail-row"><span class="admin-detail-label">簽署 IP</span><span class="admin-detail-value" style="font-family: monospace;">${c.signed_ip}</span></div>
      <div class="admin-detail-row"><span class="admin-detail-label">滾到底時間</span><span class="admin-detail-value" style="font-size: 11px; color: var(--sign-text-mute);">${c.read_scrolled_at || '—'}</span></div>
      <div class="admin-detail-row"><span class="admin-detail-label">同意時間</span><span class="admin-detail-value" style="font-size: 11px; color: var(--sign-text-mute);">${c.agreed_at}</span></div>
      <div class="admin-detail-row"><span class="admin-detail-label">User-Agent</span><span class="admin-detail-value" style="font-size: 10px; color: var(--sign-text-mute); word-break: break-all;">${escapeHtml(c.signed_ua || '—')}</span></div>
    `;
  }

  function renderAuditLogs(logs) {
    return `
      <h3 style="color: #fff; font-size: 14px; margin: 20px 0 8px; letter-spacing: 1px;">📋 稽核紀錄 (${logs.length})</h3>
      <div style="max-height: 200px; overflow-y: auto; background: var(--sign-bg-elev); padding: 12px; border-radius: 8px; font-size: 12px;">
        ${logs.map(l => `
          <div style="padding: 6px 0; border-bottom: 1px dashed var(--sign-border);">
            <strong style="color: var(--sign-accent);">${l.action}</strong>
            <span style="color: var(--sign-text-mute);">by ${l.actor} · ${l.actor_ip || ''}</span>
            <div style="font-size: 10px; color: var(--sign-text-mute); margin-top: 2px;">${l.created_at}</div>
          </div>
        `).join('') || '<div style="color: var(--sign-text-mute);">無</div>'}
      </div>
    `;
  }

  function setupFooter(c, isOps) {
    const viewUrl = `${contractViewPath()}?no=${encodeURIComponent(c.contract_no)}&admin=1`;
    const viewBtn = `<a href="${viewUrl}" target="_blank" rel="noopener" class="sign-btn sign-btn-secondary">📄 查看合約 PDF</a>`;
    const deleteBtn = `<button class="sign-btn sign-btn-ghost" id="deleteBtn" style="color: var(--sign-danger); border-color: var(--sign-danger);" title="刪除合約（不可恢復）">🗑️</button>`;

    if (c.status === 'pending') {
      modalFooter.innerHTML = `
        ${deleteBtn}
        ${viewBtn}
        <button class="sign-btn sign-btn-ghost" id="rejectBtn">↩️ 退回補件</button>
        <button class="sign-btn sign-btn-primary" id="approveBtn">✅ 核准並蓋章</button>
      `;
      document.getElementById('approveBtn').addEventListener('click', () => {
        if (isOps) showApproveFormOps(c);
        else showApproveFormStreamer(c);
      });
      document.getElementById('rejectBtn').addEventListener('click', () => showRejectForm(c.id, isOps));
    } else {
      modalFooter.innerHTML = `
        ${deleteBtn}
        ${viewBtn}
        <button class="sign-btn sign-btn-ghost" onclick="document.getElementById('detailModal').classList.remove('show')">關閉</button>
      `;
    }
    document.getElementById('deleteBtn').addEventListener('click', () => confirmDelete(c.contract_no, isOps ? c.entity_name : c.real_name, isOps));
  }

  // 主播端核准（需填運營）
  function showApproveFormStreamer(c) {
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

  // 運營端核准（無需填運營資料；僅可加後台備註）
  function showApproveFormOps(c) {
    modalBody.innerHTML = `
      <div class="sign-alert sign-alert-success">
        <strong>核准 ${c.contract_no}</strong><br />
        核准後系統會自動：<br />
        1. 蓋上甲方（艾超數位）簽名章<br />
        2. 產生正式合約 PDF<br />
        3. Email 通知乙方
      </div>

      <div class="sign-form-group">
        <label class="sign-form-label">後台備註（選填）</label>
        <textarea id="adminNote" class="sign-form-input" rows="3" placeholder="例：附約已於 3/15 另行寄出。"></textarea>
      </div>

      <div id="approveError" class="sign-alert sign-alert-danger" style="display:none;"></div>
    `;
    modalFooter.innerHTML = `
      <button class="sign-btn sign-btn-ghost" id="cancelApprove">取消</button>
      <button class="sign-btn sign-btn-primary" id="confirmApprove">確認核准</button>
    `;
    document.getElementById('cancelApprove').addEventListener('click', () => openDetail(c.id));
    document.getElementById('confirmApprove').addEventListener('click', async () => {
      const note = document.getElementById('adminNote').value.trim();
      const errBox = document.getElementById('approveError');
      const btn = document.getElementById('confirmApprove');
      btn.disabled = true; btn.textContent = '處理中...';
      try {
        const res = await fetch('/api/ops/admin-approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contract_id: c.id, action: 'approve', admin_note: note || null }),
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

  function showRejectForm(id, isOps) {
    const reason = prompt('請輸入退回原因（將 Email 通知乙方）：');
    if (!reason || !reason.trim()) return;

    fetch(`${apiBase()}/admin-approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contract_id: id, action: 'reject', reject_reason: reason.trim() }),
    }).then(r => r.json()).then(data => {
      if (data.ok) {
        alert('✓ 已退回並通知');
        modal.classList.remove('show');
        loadList();
      } else {
        alert('⚠️ ' + (data.error || '失敗'));
      }
    });
  }

  function confirmDelete(contractNo, name, isOps) {
    const answer = prompt(
      `⚠️ 確定要刪除合約嗎？\n\n合約編號：${contractNo}\n名稱：${name}\n\n此操作【不可恢復】，會刪除所有關聯資料。\n\n請將完整合約編號貼入下方確認：`
    );
    if (!answer) return;
    if (answer.trim() !== contractNo) {
      alert('❌ 合約編號不符，取消刪除');
      return;
    }
    fetch(`${apiBase()}/admin-delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contract_no: contractNo, confirm: contractNo }),
    }).then(r => r.json()).then(data => {
      if (data.ok) {
        alert('✓ ' + data.message);
        modal.classList.remove('show');
        loadList();
        loadTabCounts();
      } else {
        alert('⚠️ ' + (data.error || '刪除失敗'));
      }
    }).catch(err => alert('⚠️ ' + err.message));
  }

  function maskBank(acc) {
    if (!acc) return '—';
    return acc.length > 5 ? '****' + acc.slice(-5) : '****';
  }

  function escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, m => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[m]));
  }

  // Init
  loadList();
  loadTabCounts();
})();
