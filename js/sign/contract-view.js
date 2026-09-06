/**
 * ============================================================
 * JDI Sign · Contract View Page
 * ============================================================
 * URL 參數：
 *   ?no=JDI-SIGN-xxx&phone_last4=1234&id_last4=5678  (主播檢視)
 *   ?no=JDI-SIGN-xxx&admin=1                          (Jack 後台檢視，無需三因子)
 *
 * 若參數不足，顯示認證表單
 * ============================================================
 */
(function() {
  'use strict';

  const params = new URLSearchParams(location.search);
  const no = params.get('no');
  const phoneLast4 = params.get('phone_last4');
  const idLast4 = params.get('id_last4');
  const isAdmin = params.get('admin') === '1';

  const loadingBox = document.getElementById('loadingBox');
  const errorBox = document.getElementById('errorBox');
  const authPrompt = document.getElementById('authPrompt');
  const contractPage = document.getElementById('contractPage');

  // 沒帶 no 或缺認證 → 顯示認證表單
  if (!no || (!isAdmin && (!phoneLast4 || !idLast4))) {
    loadingBox.style.display = 'none';
    authPrompt.style.display = 'block';
    if (no) document.getElementById('authContractNo').value = no;
    setupAuthForm();
    return;
  }

  // 有齊參數 → 直接載入
  loadContract(no, phoneLast4, idLast4, isAdmin);

  function setupAuthForm() {
    const submitBtn = document.getElementById('authSubmit');
    submitBtn.addEventListener('click', () => {
      const n = document.getElementById('authContractNo').value.trim();
      const p = document.getElementById('authPhone').value.trim();
      const i = document.getElementById('authId').value.trim();
      const errBox = document.getElementById('authError');
      errBox.classList.remove('show');
      if (!n) { errBox.textContent = '請輸入合約編號'; errBox.classList.add('show'); return; }
      if (!/^\d{4}$/.test(p)) { errBox.textContent = '手機末 4 碼格式錯誤'; errBox.classList.add('show'); return; }
      if (!/^\d{4}$/.test(i)) { errBox.textContent = '身分證末 4 碼格式錯誤'; errBox.classList.add('show'); return; }

      submitBtn.disabled = true;
      submitBtn.textContent = '驗證中...';

      // Redirect 帶完整參數
      location.href = `/sign/contract-view/?no=${encodeURIComponent(n)}&phone_last4=${p}&id_last4=${i}`;
    });

    document.getElementById('authPhone').addEventListener('input', function() {
      this.value = this.value.replace(/\D/g, '').slice(0, 4);
    });
    document.getElementById('authId').addEventListener('input', function() {
      this.value = this.value.replace(/\D/g, '').slice(0, 4);
    });
  }

  async function loadContract(no, phone, id, admin) {
    try {
      const qs = new URLSearchParams();
      qs.set('no', no);
      if (admin) qs.set('admin', '1');
      else { qs.set('phone_last4', phone); qs.set('id_last4', id); }

      const res = await fetch(`/api/sign/get-contract?${qs}`);
      const data = await res.json();

      if (!data.ok) {
        loadingBox.style.display = 'none';
        errorBox.style.display = 'block';
        document.getElementById('errorMessage').textContent =
          data.error === '驗證失敗' ? '手機或身分證末 4 碼不正確' :
          data.error === '找不到合約' ? `合約編號 ${no} 不存在` :
          data.error;
        return;
      }

      renderContract(data.contract);
    } catch (err) {
      loadingBox.style.display = 'none';
      errorBox.style.display = 'block';
      document.getElementById('errorMessage').textContent = '⚠️ ' + err.message;
    }
  }

  function renderContract(c) {
    // Toolbar
    document.getElementById('tbContractNo').textContent = c.contract_no;

    // Header
    document.getElementById('displayContractNo').textContent = c.contract_no;

    // 主要欄位
    document.getElementById('pv-real_name').textContent = c.real_name || '—';
    document.getElementById('pv-real_name-2').textContent = c.real_name || '—';
    document.getElementById('pv-stage_name').textContent = c.stage_name || '—';
    document.getElementById('pv-stage_name-2').textContent = c.stage_name || '—';
    document.getElementById('pv-id_number').textContent = c.id_number || '—';
    document.getElementById('pv-phone').textContent = c.phone || '—';
    document.getElementById('pv-email').textContent = c.email || '—';
    document.getElementById('pv-contact_address').textContent = c.contact_address || '—';
    document.getElementById('pv-registered_address').textContent = c.registered_address || '—';

    // 合約條件
    document.getElementById('pv-start_date').textContent = '民國 ' + rocDate(c.contract_start_date);
    document.getElementById('pv-end_date').textContent = '民國 ' + rocDate(c.contract_end_date);
    document.getElementById('pv-years').textContent = c.contract_years;

    // 簽名
    if (c.signature_data) {
      document.getElementById('signatureImg').src = c.signature_data;
    }
    document.getElementById('signedAt').textContent = fmtDateTime(c.signed_at);

    // 運營經紀（若已核准）
    if (c.operator_name) {
      document.getElementById('operatorRow').style.display = '';
      document.getElementById('pv-operator').textContent = c.operator_name;
    }

    // 甲方章（若已核准）
    if (c.status === 'approved' && c.jack_signature_applied_at) {
      document.getElementById('stampContainer').style.display = '';
      document.getElementById('stampedAt').textContent = fmtDateTime(c.jack_signature_applied_at);
    }

    // 中華民國日期
    document.getElementById('rocDate').textContent = rocDate(c.signed_at ? c.signed_at.split('T')[0] : new Date().toISOString().split('T')[0]);

    // 證據鏈
    document.getElementById('ev-no').textContent = c.contract_no;
    document.getElementById('ev-read').textContent = fmtDateTime(c.read_scrolled_at) || '(未記錄)';
    document.getElementById('ev-agree').textContent = fmtDateTime(c.agreed_at);
    document.getElementById('ev-signed').textContent = fmtDateTime(c.signed_at);
    document.getElementById('ev-ip').textContent = c.signed_ip || '—';
    document.getElementById('ev-stamped').textContent = c.jack_signature_applied_at ? fmtDateTime(c.jack_signature_applied_at) : '未用印';

    // Status watermark
    const watermarkMap = {
      pending: '審核中',
      approved: '',   // 已核准不顯示浮水印（正式版本）
      rejected: '已退回',
      expired: '已到期',
      terminated: '已終止',
    };
    const wm = watermarkMap[c.status];
    if (wm) {
      document.getElementById('statusWatermark').textContent = wm;
    }

    // Show contract
    loadingBox.style.display = 'none';
    contractPage.style.display = 'block';

    // Set page title
    document.title = `${c.contract_no} · ${c.real_name}｜合約檢視`;
  }

  function rocDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return `${d.getFullYear() - 1911} 年 ${String(d.getMonth() + 1).padStart(2, '0')} 月 ${String(d.getDate()).padStart(2, '0')} 日`;
  }

  function fmtDateTime(iso) {
    if (!iso) return '';
    // ISO 或 "2026-09-06 20:52:47" 兼容
    const s = String(iso).replace(' ', 'T');
    const d = new Date(s + (s.length === 19 ? '+08:00' : ''));
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false });
  }
})();
