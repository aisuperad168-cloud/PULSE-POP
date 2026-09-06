/**
 * ============================================================
 * JDI OPS · Step 2: Basic Info + Bank + Company Stamp
 * ============================================================
 */
(function() {
  'use strict';

  // Guard: 必須先讀完合約
  const raw = sessionStorage.getItem('opsSession');
  if (!raw) {
    alert('請從第 1 步開始');
    window.location.href = '/ops/';
    return;
  }
  const sess = JSON.parse(raw);
  if (!sess.agreedAt) {
    alert('請先閱讀並勾選同意合約');
    window.location.href = '/ops/';
    return;
  }

  // ============ Party Type 動態切換 ============
  const partyRadios = document.querySelectorAll('input[name="party_type"]');
  const entityFields = document.getElementById('entityFields');
  const entityNameLabel = document.getElementById('entityNameLabel');
  const entityNameInput = document.getElementById('entity_name');
  const entityNameHint = document.getElementById('entityNameHint');
  const taxIdLabel = document.getElementById('taxIdLabel');
  const taxIdInput = document.getElementById('tax_id');
  const taxIdHint = document.getElementById('taxIdHint');
  const representativeGroup = document.getElementById('representativeGroup');
  const representativeInput = document.getElementById('representative');
  const addressLabel = document.getElementById('addressLabel');
  const addressInput = document.getElementById('address');
  const stampSection = document.getElementById('stampSection');
  const sameAsEntityLabel = document.getElementById('sameAsEntityLabel');
  const entitySectionTitle = document.getElementById('entitySectionTitle');

  function applyPartyType(type) {
    entityFields.style.display = 'block';
    // 觸發卡片視覺
    document.querySelectorAll('.ops-party-option').forEach(el => {
      const r = el.querySelector('input[type="radio"]');
      el.classList.toggle('checked', r && r.checked);
    });

    if (type === 'company') {
      entitySectionTitle.textContent = '🏢 公司資料';
      entityNameLabel.textContent = '公司名稱';
      entityNameInput.placeholder = '請填寫公司完整登記名稱';
      entityNameHint.textContent = '例：艾超數位傳媒有限公司';
      taxIdLabel.textContent = '統一編號';
      taxIdInput.placeholder = '12345678';
      taxIdInput.setAttribute('pattern', '\\d{8}');
      taxIdInput.setAttribute('maxlength', '8');
      taxIdInput.setAttribute('inputmode', 'numeric');
      taxIdHint.textContent = '8 位數字';
      representativeGroup.style.display = 'block';
      representativeInput.setAttribute('required', '');
      addressLabel.textContent = '公司地址';
      addressInput.placeholder = '例：台中市北屯區大連路三段 2 號';
      sameAsEntityLabel.textContent = '同公司名稱';
      stampSection.style.display = 'block';
    } else {
      entitySectionTitle.textContent = '👤 個人資料';
      entityNameLabel.textContent = '姓名';
      entityNameInput.placeholder = '請填寫身分證上的本名';
      entityNameHint.textContent = '';
      taxIdLabel.textContent = '身分證字號';
      taxIdInput.placeholder = 'A123456789';
      taxIdInput.setAttribute('pattern', '[A-Z][1-2]\\d{8}');
      taxIdInput.setAttribute('maxlength', '10');
      taxIdInput.removeAttribute('inputmode');
      taxIdHint.textContent = '1 位英文字母 + 9 位數字';
      representativeGroup.style.display = 'none';
      representativeInput.removeAttribute('required');
      representativeInput.value = '';
      addressLabel.textContent = '聯絡地址';
      addressInput.placeholder = '例：台北市中山區南京東路二段 XX 號 X 樓';
      sameAsEntityLabel.textContent = '同姓名';
      stampSection.style.display = 'none';
      // 個人不用大小章，清空
      companyStampBase64 = null;
      resetStampUI();
    }
  }

  partyRadios.forEach(r => {
    r.addEventListener('change', () => applyPartyType(r.value));
  });

  // 若 session 有記錄，還原
  if (sess.form) {
    if (sess.form.party_type) {
      const r = document.querySelector(`input[name="party_type"][value="${sess.form.party_type}"]`);
      if (r) { r.checked = true; applyPartyType(sess.form.party_type); }
    }
    ['entity_name', 'tax_id', 'representative', 'job_title', 'address', 'phone', 'email',
     'bank_name', 'bank_branch', 'bank_account', 'bank_account_name'].forEach(k => {
      if (sess.form[k]) {
        const el = document.getElementById(k);
        if (el) el.value = sess.form[k];
      }
    });
    if (sess.form.company_stamp) {
      companyStampBase64 = sess.form.company_stamp;
      showStampPreview(companyStampBase64, sess.form.company_stamp_name || 'stamp.png');
    }
  }

  // ============ 同帳戶戶名 checkbox ============
  const sameAsEntityCb = document.getElementById('sameAsEntity');
  const bankAccountName = document.getElementById('bank_account_name');
  sameAsEntityCb.addEventListener('change', () => {
    if (sameAsEntityCb.checked) {
      bankAccountName.value = entityNameInput.value.trim();
      bankAccountName.setAttribute('readonly', '');
    } else {
      bankAccountName.removeAttribute('readonly');
    }
  });
  entityNameInput.addEventListener('input', () => {
    if (sameAsEntityCb.checked) bankAccountName.value = entityNameInput.value.trim();
  });

  // ============ 公司大小章上傳 ============
  const stampInput = document.getElementById('companyStampInput');
  const stampPlaceholder = document.getElementById('stampPlaceholder');
  const stampPreviewWrap = document.getElementById('stampPreviewWrap');
  const stampPreview = document.getElementById('stampPreview');
  const stampFileName = document.getElementById('stampFileName');
  const stampRemove = document.getElementById('stampRemove');
  const stampUploader = document.getElementById('stampUploader');
  let companyStampBase64 = null;

  function resetStampUI() {
    stampInput.value = '';
    stampPlaceholder.style.display = 'block';
    stampPreviewWrap.style.display = 'none';
    stampUploader.classList.remove('has-file');
  }

  function showStampPreview(base64, name) {
    stampPreview.src = base64;
    stampFileName.textContent = name;
    stampPlaceholder.style.display = 'none';
    stampPreviewWrap.style.display = 'block';
    stampUploader.classList.add('has-file');
  }

  stampInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 檢查 size
    if (file.size > 5 * 1024 * 1024) {
      alert('圖片過大，最大 5MB');
      stampInput.value = '';
      return;
    }

    // 壓縮 + 轉 base64（保持透明底）
    try {
      const compressed = await compressImage(file, 800, 800, 0.9);
      companyStampBase64 = compressed;
      showStampPreview(compressed, file.name);
    } catch (err) {
      alert('圖片處理失敗：' + err.message);
    }
  });

  stampRemove.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    companyStampBase64 = null;
    resetStampUI();
  });

  // 圖片壓縮 helper
  function compressImage(file, maxW, maxH, quality) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let w = img.width, h = img.height;
          if (w > maxW || h > maxH) {
            const ratio = Math.min(maxW / w, maxH / h);
            w = Math.round(w * ratio);
            h = Math.round(h * ratio);
          }
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          // PNG 保持透明；若原檔是 JPG 用 JPEG
          const outType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
          resolve(canvas.toDataURL(outType, quality));
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // ============ 表單驗證 + 送出 ============
  const form = document.getElementById('opsInfoForm');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let hasError = false;

    // 清除舊錯誤
    document.querySelectorAll('.sign-form-error').forEach(el => el.textContent = '');

    const partyType = document.querySelector('input[name="party_type"]:checked')?.value;
    if (!partyType) {
      document.getElementById('err-party_type').textContent = '請選擇身份類別';
      hasError = true;
    }

    const fields = {
      entity_name: document.getElementById('entity_name').value.trim(),
      tax_id: document.getElementById('tax_id').value.trim().toUpperCase(),
      representative: document.getElementById('representative').value.trim(),
      job_title: document.getElementById('job_title').value.trim(),
      address: document.getElementById('address').value.trim(),
      phone: document.getElementById('phone').value.trim(),
      email: document.getElementById('email').value.trim(),
      bank_name: document.getElementById('bank_name').value.trim(),
      bank_branch: document.getElementById('bank_branch').value.trim(),
      bank_account: document.getElementById('bank_account').value.replace(/[\s-]/g, ''),
      bank_account_name: document.getElementById('bank_account_name').value.trim(),
    };

    if (!fields.entity_name) { document.getElementById('err-entity_name').textContent = '必填'; hasError = true; }

    // Tax ID 驗證
    if (partyType === 'company') {
      if (!/^\d{8}$/.test(fields.tax_id)) {
        document.getElementById('err-tax_id').textContent = '統一編號必須為 8 位數字';
        hasError = true;
      }
      if (!fields.representative) {
        document.getElementById('err-representative').textContent = '必填';
        hasError = true;
      }
      if (!companyStampBase64) {
        document.getElementById('err-company_stamp').textContent = '請上傳公司大小章';
        hasError = true;
      }
    } else if (partyType === 'individual') {
      if (!/^[A-Z][1-2]\d{8}$/.test(fields.tax_id)) {
        document.getElementById('err-tax_id').textContent = '身分證字號格式錯誤（例 A123456789）';
        hasError = true;
      }
    }

    if (!fields.address) { document.getElementById('err-address').textContent = '必填'; hasError = true; }
    if (!/^09\d{8}$/.test(fields.phone)) { document.getElementById('err-phone').textContent = '手機格式錯誤（09 開頭 10 碼）'; hasError = true; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) { document.getElementById('err-email').textContent = 'Email 格式錯誤'; hasError = true; }
    if (!fields.bank_name) { document.getElementById('err-bank_name').textContent = '必填'; hasError = true; }
    if (!fields.bank_branch) { document.getElementById('err-bank_branch').textContent = '必填'; hasError = true; }
    if (!/^\d{6,20}$/.test(fields.bank_account)) { document.getElementById('err-bank_account').textContent = '銀行帳號必須為 6-20 位數字'; hasError = true; }
    if (!fields.bank_account_name) { document.getElementById('err-bank_account_name').textContent = '必填'; hasError = true; }

    if (hasError) {
      const firstErr = document.querySelector('.sign-form-error:not(:empty)');
      if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // 儲存到 session
    sess.form = {
      party_type: partyType,
      ...fields,
      company_stamp: companyStampBase64,
      company_stamp_name: stampInput.files[0]?.name || null,
    };
    sess.step = 2;
    sessionStorage.setItem('opsSession', JSON.stringify(sess));

    window.location.href = '/ops/step-3.html';
  });
})();
