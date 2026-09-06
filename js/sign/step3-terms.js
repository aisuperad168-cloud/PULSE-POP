/**
 * ============================================================
 * JDI Sign System · Step 3: Contract Terms
 * ============================================================
 */

(function() {
  'use strict';

  // 檢查前置 step 是否完成
  const basicInfo = JSON.parse(sessionStorage.getItem('signBasicInfo') || 'null');
  if (!basicInfo || !basicInfo.id_number) {
    alert('請先完成上一步');
    window.location.href = '/sign/step-2.html';
    return;
  }

  const form = document.getElementById('contractTermsForm');
  const startDateInput = document.getElementById('contract_start_date');
  const endDatePreview = document.getElementById('endDatePreview');
  const endDateText = document.getElementById('endDateText');
  const yearsRadios = form.querySelectorAll('input[name="contract_years"]');

  // Set min = today, max = 6 months later
  const today = new Date();
  startDateInput.min = today.toISOString().split('T')[0];
  const maxDate = new Date(today);
  maxDate.setMonth(maxDate.getMonth() + 6);
  startDateInput.max = maxDate.toISOString().split('T')[0];

  // Prefill previous
  const savedData = JSON.parse(sessionStorage.getItem('signContractTerms') || 'null');
  if (savedData) {
    if (savedData.contract_years) {
      const radio = form.querySelector(`input[name="contract_years"][value="${savedData.contract_years}"]`);
      if (radio) radio.checked = true;
    }
    if (savedData.contract_start_date) startDateInput.value = savedData.contract_start_date;
  } else {
    // Default: 3 年
    form.querySelector('input[name="contract_years"][value="3"]').checked = true;
    // Default start: today
    startDateInput.value = today.toISOString().split('T')[0];
  }

  // ============ Auto-calculate end date ============
  function updateEndDate() {
    const startVal = startDateInput.value;
    const yearsRadio = form.querySelector('input[name="contract_years"]:checked');
    if (!startVal || !yearsRadio) {
      endDatePreview.style.display = 'none';
      return;
    }
    const years = parseInt(yearsRadio.value);
    const start = new Date(startVal);
    const end = new Date(start);
    end.setFullYear(end.getFullYear() + years);
    end.setDate(end.getDate() - 1); // 到期日為前一天

    const rocYear = end.getFullYear() - 1911;
    const mm = String(end.getMonth() + 1).padStart(2, '0');
    const dd = String(end.getDate()).padStart(2, '0');
    const rocStartYear = start.getFullYear() - 1911;
    const startMm = String(start.getMonth() + 1).padStart(2, '0');
    const startDd = String(start.getDate()).padStart(2, '0');

    endDateText.innerHTML = `
      民國 ${rocStartYear} 年 ${startMm} 月 ${startDd} 日
      起至
      民國 ${rocYear} 年 ${mm} 月 ${dd} 日 止
      （共 ${years} 年）
    `;
    endDatePreview.style.display = 'block';
  }

  yearsRadios.forEach(r => r.addEventListener('change', updateEndDate));
  startDateInput.addEventListener('change', updateEndDate);
  updateEndDate();

  // ============ Submit ============
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    let hasError = false;

    const yearsRadio = form.querySelector('input[name="contract_years"]:checked');
    const startVal = startDateInput.value;

    if (!yearsRadio) {
      document.getElementById('err-contract_years').textContent = '請選擇合約年限';
      document.getElementById('err-contract_years').classList.add('show');
      hasError = true;
    }
    if (!startVal) {
      document.getElementById('err-contract_start_date').textContent = '請選擇生效日期';
      document.getElementById('err-contract_start_date').classList.add('show');
      hasError = true;
    } else {
      const start = new Date(startVal);
      if (start < new Date(today.toDateString())) {
        document.getElementById('err-contract_start_date').textContent = '生效日不能是過去日期';
        document.getElementById('err-contract_start_date').classList.add('show');
        hasError = true;
      }
    }

    if (hasError) return;

    // Calculate end date
    const years = parseInt(yearsRadio.value);
    const start = new Date(startVal);
    const end = new Date(start);
    end.setFullYear(end.getFullYear() + years);
    end.setDate(end.getDate() - 1);

    sessionStorage.setItem('signContractTerms', JSON.stringify({
      contract_years: years,
      contract_start_date: startVal,
      contract_end_date: end.toISOString().split('T')[0],
    }));

    window.location.href = '/sign/step-4.html';
  });
})();
