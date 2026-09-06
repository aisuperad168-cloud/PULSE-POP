/**
 * ============================================================
 * JDI OPS · Contract View Page
 * ============================================================
 * URL 參數：
 *   ?no=JDI-OPS-xxx&phone_last4=1234&tax_id_last4=5678  (乙方檢視)
 *   ?no=JDI-OPS-xxx&admin=1                             (Jack 後台檢視)
 * ============================================================
 */
(function() {
  'use strict';

  const params = new URLSearchParams(location.search);
  const no = params.get('no');
  const phoneLast4 = params.get('phone_last4');
  const taxIdLast4 = params.get('tax_id_last4');
  const isAdmin = params.get('admin') === '1';

  const loadingBox = document.getElementById('loadingBox');
  const errorBox = document.getElementById('errorBox');
  const authPrompt = document.getElementById('authPrompt');
  const contractPage = document.getElementById('contractPage');

  if (!no || (!isAdmin && (!phoneLast4 || !taxIdLast4))) {
    loadingBox.style.display = 'none';
    authPrompt.style.display = 'block';
    if (no) document.getElementById('authContractNo').value = no;
    setupAuthForm();
    return;
  }

  loadContract(no, phoneLast4, taxIdLast4, isAdmin);

  function setupAuthForm() {
    const submitBtn = document.getElementById('authSubmit');
    submitBtn.addEventListener('click', () => {
      const n = document.getElementById('authContractNo').value.trim();
      const p = document.getElementById('authPhone').value.trim();
      const t = document.getElementById('authTaxId').value.trim().toUpperCase();
      const errBox = document.getElementById('authError');
      errBox.classList.remove('show');
      if (!n) { errBox.textContent = '請輸入合約編號'; errBox.classList.add('show'); return; }
      if (!/^\d{4}$/.test(p)) { errBox.textContent = '電話末 4 碼格式錯誤'; errBox.classList.add('show'); return; }
      if (!/^[A-Z0-9]{4}$/.test(t)) { errBox.textContent = '統編／身分證末 4 碼格式錯誤'; errBox.classList.add('show'); return; }

      submitBtn.disabled = true;
      submitBtn.textContent = '驗證中...';
      location.href = `/ops/contract-view/?no=${encodeURIComponent(n)}&phone_last4=${p}&tax_id_last4=${t}`;
    });

    document.getElementById('authPhone').addEventListener('input', function() {
      this.value = this.value.replace(/\D/g, '').slice(0, 4);
    });
    document.getElementById('authTaxId').addEventListener('input', function() {
      this.value = this.value.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 4);
    });
  }

  async function loadContract(no, phone, taxId, admin) {
    try {
      const qs = new URLSearchParams();
      qs.set('no', no);
      if (admin) qs.set('admin', '1');
      else { qs.set('phone_last4', phone); qs.set('tax_id_last4', taxId); }

      const res = await fetch(`/api/ops/get-contract?${qs}`);
      const data = await res.json();

      if (!data.ok) {
        loadingBox.style.display = 'none';
        errorBox.style.display = 'block';
        document.getElementById('errorMessage').textContent =
          data.error === '驗證失敗' ? '電話或統編／身分證末 4 碼不正確' :
          data.error === '找不到合約' ? `合約編號 ${no} 不存在` :
          data.error;
        return;
      }

      renderContract(data.contract, data.attachments || [], data.is_admin);
    } catch (err) {
      loadingBox.style.display = 'none';
      errorBox.style.display = 'block';
      document.getElementById('errorMessage').textContent = '⚠️ ' + err.message;
    }
  }

  function renderContract(c, attachments, isAdmin) {
    const partyLabel = c.party_type === 'company' ? '經紀公司' : '個人運營';

    // Toolbar
    document.getElementById('tbContractNo').textContent = c.contract_no;
    document.getElementById('displayContractNo').textContent = c.contract_no;

    // Parties 標題
    document.getElementById('pv-party-label').textContent = partyLabel;
    document.getElementById('pv-party-label-2').textContent = partyLabel;
    document.getElementById('pv-entity_name').textContent = c.entity_name || '—';
    document.getElementById('pv-entity_name-2').textContent = c.entity_name || '—';
    document.getElementById('pv-tax_id').textContent = c.tax_id || '—';

    // 動態欄位標籤
    if (c.party_type === 'company') {
      document.getElementById('pv-entity-label').textContent = '公司名稱：';
      document.getElementById('pv-tax-label').textContent = '統一編號：';
      document.getElementById('pv-addr-label').textContent = '公司地址：';
    } else {
      document.getElementById('pv-entity-label').textContent = '姓名：';
      document.getElementById('pv-tax-label').textContent = '身分證：';
      document.getElementById('pv-addr-label').textContent = '聯絡地址：';
    }

    // 代表人 / 職稱（僅公司或有填才顯示）
    if (c.representative) {
      document.getElementById('representativeRow').style.display = '';
      document.getElementById('pv-representative').textContent = c.representative;
    }
    if (c.job_title) {
      document.getElementById('jobTitleRow').style.display = '';
      document.getElementById('pv-job_title').textContent = c.job_title;
    }

    document.getElementById('pv-address').textContent = c.address || '—';
    document.getElementById('pv-phone').textContent = c.phone || '—';
    document.getElementById('pv-email').textContent = c.email || '—';

    // 銀行帳戶（顯示遮罩版）
    const bankStr = `${c.bank_name} · ${c.bank_branch} · ${c.bank_account}（戶名：${c.bank_account_name}）`;
    document.getElementById('pv-bank').textContent = bankStr;

    // 服務手續費
    const feeLabel = c.service_fee_rate === 10 ? '10%（公司合作）' : '15%（個人運營）';
    document.getElementById('pv-fee-rate').textContent = feeLabel;

    // 合約條件
    document.getElementById('pv-start_date').textContent = '民國 ' + rocDate(c.contract_start_date);
    document.getElementById('pv-end_date').textContent = '民國 ' + rocDate(c.contract_end_date);
    document.getElementById('pv-years').textContent = c.contract_years;

    // 乙方電子簽名
    if (c.signature_data) {
      document.getElementById('signatureImg').src = c.signature_data;
    }
    document.getElementById('signedAt').textContent = fmtDateTime(c.signed_at);

    // 乙方公司大小章（附件）
    const stampAtt = attachments.find(a => a.file_type === 'company_stamp');
    if (stampAtt && stampAtt.storage_url) {
      document.getElementById('partyStampContainer').style.display = '';
      document.getElementById('partyStamp').src = stampAtt.storage_url;
    }

    // 甲方章（若已核准）
    if (c.status === 'approved' && c.jack_signature_applied_at) {
      document.getElementById('stampContainer').style.display = '';
      document.getElementById('stampedAt').textContent = fmtDateTime(c.jack_signature_applied_at);
    }

    // 中華民國日期
    document.getElementById('rocDate').textContent = rocDate(
      c.signed_at ? c.signed_at.split('T')[0] : new Date().toISOString().split('T')[0]
    );

    // 證據鏈
    document.getElementById('ev-no').textContent = c.contract_no;
    document.getElementById('ev-read').textContent = fmtDateTime(c.read_scrolled_at) || '(未記錄)';
    document.getElementById('ev-agree').textContent = fmtDateTime(c.agreed_at);
    document.getElementById('ev-signed').textContent = fmtDateTime(c.signed_at);
    document.getElementById('ev-ip').textContent = c.signed_ip || '—';
    document.getElementById('ev-stamped').textContent = c.jack_signature_applied_at ? fmtDateTime(c.jack_signature_applied_at) : '未用印';

    // Watermark
    const watermarkMap = {
      pending: '審核中',
      approved: '',
      rejected: '已退回',
      expired: '已到期',
      terminated: '已終止',
    };
    const wm = watermarkMap[c.status];
    if (wm) document.getElementById('statusWatermark').textContent = wm;

    loadingBox.style.display = 'none';
    contractPage.style.display = 'block';
    document.title = `${c.contract_no} · ${c.entity_name}｜合約檢視`;
  }

  function rocDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return `${d.getFullYear() - 1911} 年 ${String(d.getMonth() + 1).padStart(2, '0')} 月 ${String(d.getDate()).padStart(2, '0')} 日`;
  }

  function fmtDateTime(iso) {
    if (!iso) return '';
    const s = String(iso).replace(' ', 'T');
    const d = new Date(s + (s.length === 19 ? '+08:00' : ''));
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false });
  }
})();
