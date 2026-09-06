/**
 * ============================================================
 * JDI OPS · Step 3: Terms (合作期間)
 * ============================================================
 */
(function() {
  'use strict';

  const raw = sessionStorage.getItem('opsSession');
  if (!raw) { window.location.href = '/ops/'; return; }
  const sess = JSON.parse(raw);
  if (!sess.form) { window.location.href = '/ops/step-2.html'; return; }

  const yearRadios = document.querySelectorAll('input[name="contract_years"]');
  const preview = document.getElementById('datePreview');
  const previewStart = document.getElementById('previewStart');
  const previewEnd = document.getElementById('previewEnd');
  const previewFee = document.getElementById('previewFee');

  function updatePreview() {
    const y = document.querySelector('input[name="contract_years"]:checked')?.value;
    if (!y) { preview.style.display = 'none'; return; }

    // 生效日 = 簽署當日（Asia/Taipei）
    const nowTW = new Date().toLocaleString('en-CA', { timeZone: 'Asia/Taipei' });
    const [datePart] = nowTW.split(',');
    const [ty, tm, td] = datePart.split('-').map(Number);
    const start = new Date(Date.UTC(ty, tm - 1, td));
    const end = new Date(Date.UTC(ty + Number(y), tm - 1, td - 1));

    previewStart.textContent = `${start.toISOString().split('T')[0]}（簽署當日起）`;
    previewEnd.textContent = end.toISOString().split('T')[0];

    // 服務費依身份
    const fee = sess.form.party_type === 'company' ? 10 : 15;
    previewFee.textContent = `${fee}%（${sess.form.party_type === 'company' ? '公司合作' : '個人運營'}）`;

    preview.style.display = 'block';
    document.querySelectorAll('.ops-party-option').forEach(el => {
      const r = el.querySelector('input[type="radio"]');
      el.classList.toggle('checked', r && r.checked);
    });
  }

  yearRadios.forEach(r => r.addEventListener('change', updatePreview));

  // 還原
  if (sess.form.contract_years) {
    const r = document.querySelector(`input[name="contract_years"][value="${sess.form.contract_years}"]`);
    if (r) { r.checked = true; updatePreview(); }
  }

  document.getElementById('opsTermsForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const y = document.querySelector('input[name="contract_years"]:checked')?.value;
    if (!y) {
      document.getElementById('err-contract_years').textContent = '請選擇合作期間';
      return;
    }
    sess.form.contract_years = Number(y);
    sess.step = 3;
    sessionStorage.setItem('opsSession', JSON.stringify(sess));
    window.location.href = '/ops/step-4.html';
  });
})();
