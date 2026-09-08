/**
 * ============================================================
 * JDI OPS · Step 4: Preview + Signature + Submit
 * ============================================================
 */
(function() {
  'use strict';

  const raw = sessionStorage.getItem('opsSession');
  if (!raw) { window.location.href = '/ops/'; return; }
  const sess = JSON.parse(raw);
  if (!sess.form || !sess.form.contract_years) {
    alert('請先完成前面步驟');
    window.location.href = '/ops/step-2.html';
    return;
  }

  const f = sess.form;
  const partyLabel = f.party_type === 'company' ? '🏢 經紀公司' : '👤 個人運營';
  const feeRate = f.party_type === 'company' ? 10 : 15;

  // 計算日期預覽（Asia/Taipei）
  const nowTW = new Date().toLocaleString('en-CA', { timeZone: 'Asia/Taipei' });
  const [datePart] = nowTW.split(',');
  const [ty, tm, td] = datePart.split('-').map(Number);
  const start = new Date(Date.UTC(ty, tm - 1, td));
  const end = new Date(Date.UTC(ty + Number(f.contract_years), tm - 1, td - 1));
  const startStr = start.toISOString().split('T')[0];
  const endStr = end.toISOString().split('T')[0];

  const esc = s => String(s || '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  // ============ 資料預覽 ============
  const preview = document.getElementById('dataPreview');
  preview.innerHTML = `
    <div style="background: var(--sign-bg-elev); border-radius: 8px; padding: 16px 20px; margin-bottom: 12px;">
      <div style="font-size: 12px; color: var(--sign-text-mute); margin-bottom: 6px;">身份類別</div>
      <div style="font-size: 15px; font-weight: 700; color: var(--sign-text);">${partyLabel}</div>
    </div>

    <div style="background: var(--sign-bg-elev); border-radius: 8px; padding: 16px 20px; margin-bottom: 12px;">
      <div style="font-size: 12px; color: var(--sign-text-mute); margin-bottom: 8px; font-weight: 700; letter-spacing: 1px;">乙方資料</div>
      <table style="width: 100%; font-size: 13px; line-height: 1.9;">
        <tr><td style="color: var(--sign-text-mute); width: 110px;">${f.party_type === 'company' ? '公司名稱' : '姓名'}</td><td style="color: var(--sign-text); font-weight: 600;">${esc(f.entity_name)}</td></tr>
        <tr><td style="color: var(--sign-text-mute);">${f.party_type === 'company' ? '統一編號' : '身分證字號'}</td><td style="color: var(--sign-text); font-family: monospace;">${esc(f.tax_id)}</td></tr>
        ${f.representative ? `<tr><td style="color: var(--sign-text-mute);">代表人</td><td style="color: var(--sign-text);">${esc(f.representative)}</td></tr>` : ''}
        ${f.job_title ? `<tr><td style="color: var(--sign-text-mute);">職稱</td><td style="color: var(--sign-text);">${esc(f.job_title)}</td></tr>` : ''}
        <tr><td style="color: var(--sign-text-mute);">${f.party_type === 'company' ? '公司地址' : '聯絡地址'}</td><td style="color: var(--sign-text);">${esc(f.address)}</td></tr>
        <tr><td style="color: var(--sign-text-mute);">聯絡電話</td><td style="color: var(--sign-text);">${esc(f.phone)}</td></tr>
        <tr><td style="color: var(--sign-text-mute);">Email</td><td style="color: var(--sign-text);">${esc(f.email)}</td></tr>
      </table>
    </div>

    <div style="background: var(--sign-bg-elev); border-radius: 8px; padding: 16px 20px; margin-bottom: 12px;">
      <div style="font-size: 12px; color: var(--sign-text-mute); margin-bottom: 8px; font-weight: 700; letter-spacing: 1px;">💰 撥款帳戶</div>
      <table style="width: 100%; font-size: 13px; line-height: 1.9;">
        <tr><td style="color: var(--sign-text-mute); width: 110px;">銀行</td><td style="color: var(--sign-text);">${esc(f.bank_name)} · ${esc(f.bank_branch)}</td></tr>
        <tr><td style="color: var(--sign-text-mute);">帳號</td><td style="color: var(--sign-text); font-family: monospace;">${esc(f.bank_account)}</td></tr>
        <tr><td style="color: var(--sign-text-mute);">戶名</td><td style="color: var(--sign-text);">${esc(f.bank_account_name)}</td></tr>
      </table>
    </div>

    ${f.company_stamp ? `
    <div style="background: var(--sign-bg-elev); border-radius: 8px; padding: 16px 20px; margin-bottom: 12px;">
      <div style="font-size: 12px; color: var(--sign-text-mute); margin-bottom: 8px; font-weight: 700; letter-spacing: 1px;">🖋 公司大小章</div>
      <img src="${f.company_stamp}" style="max-width: 160px; max-height: 160px; background: #fff; padding: 8px; border-radius: 4px;" alt="公司大小章" />
    </div>` : ''}

    <div style="background: linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(67,56,202,0.1) 100%); border-radius: 8px; padding: 16px 20px; border-left: 3px solid var(--ops-primary);">
      <div style="font-size: 12px; color: var(--sign-text-mute); margin-bottom: 8px; font-weight: 700; letter-spacing: 1px;">📅 合作條件</div>
      <table style="width: 100%; font-size: 13px; line-height: 1.9;">
        <tr><td style="color: var(--sign-text-mute); width: 110px;">合作期間</td><td style="color: var(--sign-text); font-weight: 700;">${f.contract_years} 年</td></tr>
        <tr><td style="color: var(--sign-text-mute);">生效日期</td><td style="color: var(--sign-accent); font-weight: 700;">${startStr}（簽署當日）</td></tr>
        <tr><td style="color: var(--sign-text-mute);">到期日期</td><td style="color: var(--sign-text); font-weight: 700;">${endStr}</td></tr>
        <tr><td style="color: var(--sign-text-mute);">服務手續費</td><td><span class="ops-fee-display">${feeRate}%</span></td></tr>
        <tr><td style="color: var(--sign-text-mute);">結算週期</td><td style="color: var(--sign-text);">T+2 月，每月 25 日</td></tr>
      </table>
    </div>
  `;

  // Sig label：
  //   個人 → 顯示姓名（entity_name）
  //   公司 → 顯示代表人姓名（representative）；公司名已透過大小章表達
  const signerName = f.party_type === 'company' ? f.representative : f.entity_name;
  document.getElementById('sigLabel').innerHTML =
    `乙方簽名（${esc(signerName)}）<span class="sign-required">*</span>`;

  // ============ Canvas 簽名 ============
  const canvas = document.getElementById('sigCanvas');
  const ctx = canvas.getContext('2d');
  const hint = document.getElementById('sigHint');
  const statusEl = document.getElementById('sigStatus');
  const clearBtn = document.getElementById('sigClear');
  const finalConsent = document.getElementById('finalConsent');
  const submitBtn = document.getElementById('finalSubmit');
  const submitBtnText = document.getElementById('submitBtnText');
  const submitError = document.getElementById('submitError');

  let isDrawing = false;
  let hasSignature = false;
  let lastX = 0, lastY = 0;

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = 200 * dpr;
    canvas.style.height = '200px';
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#000';
  }
  resizeCanvas();
  window.addEventListener('resize', () => {
    const currentData = canvas.toDataURL();
    const img = new Image();
    img.onload = () => {
      resizeCanvas();
      ctx.drawImage(img, 0, 0, canvas.width / (window.devicePixelRatio || 1), canvas.height / (window.devicePixelRatio || 1));
    };
    img.src = currentData;
  });

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches && e.touches[0];
    return {
      x: (touch ? touch.clientX : e.clientX) - rect.left,
      y: (touch ? touch.clientY : e.clientY) - rect.top,
    };
  }

  function startDraw(e) {
    e.preventDefault();
    isDrawing = true;
    const pos = getPos(e);
    lastX = pos.x; lastY = pos.y;
    hint.classList.add('hide');
  }
  function draw(e) {
    if (!isDrawing) return;
    e.preventDefault();
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastX = pos.x; lastY = pos.y;
    if (!hasSignature) {
      hasSignature = true;
      statusEl.textContent = '✓ 已簽名';
      statusEl.classList.add('signed');
      updateSubmitState();
    }
  }
  function endDraw() { isDrawing = false; }

  canvas.addEventListener('mousedown', startDraw);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', endDraw);
  canvas.addEventListener('mouseleave', endDraw);
  canvas.addEventListener('touchstart', startDraw, { passive: false });
  canvas.addEventListener('touchmove', draw, { passive: false });
  canvas.addEventListener('touchend', endDraw);

  clearBtn.addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasSignature = false;
    hint.classList.remove('hide');
    statusEl.textContent = '尚未簽名';
    statusEl.classList.remove('signed');
    updateSubmitState();
  });

  function updateSubmitState() {
    submitBtn.disabled = !(hasSignature && finalConsent.checked);
  }
  finalConsent.addEventListener('change', updateSubmitState);

  // ============ Submit ============
  submitBtn.addEventListener('click', async () => {
    if (!hasSignature || !finalConsent.checked) return;

    submitBtn.disabled = true;
    submitBtnText.textContent = '送出中...請稍候';
    submitError.style.display = 'none';

    const signaturePng = canvas.toDataURL('image/png');
    const now = new Date().toISOString();

    const payload = {
      party_type: f.party_type,
      entity_name: f.entity_name,
      tax_id: f.tax_id,
      representative: f.representative || null,
      job_title: f.job_title || null,
      address: f.address,
      phone: f.phone,
      email: f.email,
      bank_name: f.bank_name,
      bank_branch: f.bank_branch,
      bank_account: f.bank_account,
      bank_account_name: f.bank_account_name,
      contract_years: f.contract_years,
      company_stamp: f.company_stamp || null,
      signature_data: signaturePng,
      signed_at: now,
      read_scrolled_at: sess.scrolledAt,
      agreed_at: sess.agreedAt,
      user_agent: navigator.userAgent,
      screen_size: `${screen.width}x${screen.height}`,
    };

    try {
      const res = await fetch('/api/ops/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();

      if (!res.ok || !result.ok) {
        throw new Error(result.error || '送出失敗');
      }

      const contractNo = result.contract_no;
      sessionStorage.removeItem('opsSession');
      sessionStorage.setItem('opsCompletedNo', contractNo);

      // 追蹤合約送出成功
      if (window.jdiTrack) {
        window.jdiTrack('contract_submitted', {
          contract_type: 'ops',
          party_type: f.party_type,
          contract_years: f.contract_years,
          service_fee_rate: feeRate,
        });
      }

      window.location.href = `/ops/done.html?no=${encodeURIComponent(contractNo)}`;
    } catch (err) {
      submitError.textContent = '⚠️ ' + (err.message || '送出失敗，請稍後再試');
      submitError.style.display = 'block';
      submitBtnText.textContent = '送出合約簽署 →';
      submitBtn.disabled = false;
    }
  });
})();
