/**
 * ============================================================
 * JDI Sign System · Step 5: Contract Preview
 * ============================================================
 */
(function() {
  'use strict';

  const basicInfo = JSON.parse(sessionStorage.getItem('signBasicInfo') || 'null');
  const terms = JSON.parse(sessionStorage.getItem('signContractTerms') || 'null');
  const idFront = sessionStorage.getItem('signIdFront');
  const idBack = sessionStorage.getItem('signIdBack');

  if (!basicInfo || !terms || !idFront || !idBack) {
    alert('請先完成前面步驟');
    window.location.href = '/sign/';
    return;
  }

  // ============ 填入預覽欄位 ============
  function fmt(v) { return v || '—'; }
  function rocDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return `${d.getFullYear() - 1911} 年 ${String(d.getMonth() + 1).padStart(2, '0')} 月 ${String(d.getDate()).padStart(2, '0')} 日`;
  }
  function maskId(id) {
    if (!id || id.length < 10) return '—';
    return id.slice(0, 3) + '****' + id.slice(-3);
  }

  // 主要文字欄位
  document.getElementById('pv-real_name').textContent = fmt(basicInfo.real_name);
  document.getElementById('pv-real_name-2').textContent = fmt(basicInfo.real_name);
  document.getElementById('pv-stage_name').textContent = fmt(basicInfo.stage_name);
  document.getElementById('pv-id_number').textContent = fmt(basicInfo.id_number); // 預覽完整版
  document.getElementById('pv-phone').textContent = fmt(basicInfo.phone);
  document.getElementById('pv-email').textContent = fmt(basicInfo.email);
  document.getElementById('pv-contact_address').textContent = fmt(basicInfo.contact_address);
  document.getElementById('pv-registered_address').textContent = fmt(basicInfo.registered_address);

  document.getElementById('pv-start_date').textContent = `民國 ${rocDate(terms.contract_start_date)}`;
  document.getElementById('pv-end_date').textContent = `民國 ${rocDate(terms.contract_end_date)}`;
  document.getElementById('pv-years').textContent = terms.contract_years;

  document.getElementById('pv-roc-date').textContent = rocDate(new Date().toISOString().split('T')[0]);

  document.getElementById('proceedBtn').addEventListener('click', () => {
    window.location.href = '/sign/step-6.html';
  });
})();
