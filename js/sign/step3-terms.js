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
  const endDatePreview = document.getElementById('endDatePreview');
  const endDateText = document.getElementById('endDateText');
  const yearsRadios = form.querySelectorAll('input[name="contract_years"]');

  // Prefill previous
  const savedData = JSON.parse(sessionStorage.getItem('signContractTerms') || 'null');
  if (savedData?.contract_years) {
    const radio = form.querySelector(`input[name="contract_years"][value="${savedData.contract_years}"]`);
    if (radio) radio.checked = true;
  } else {
    // Default: 3 年
    form.querySelector('input[name="contract_years"][value="3"]').checked = true;
  }

  // ============ 自動計算：生效日 = 明天，到期日 = 明天 + N 年 - 1 天 ============
  function updateEndDate() {
    const yearsRadio = form.querySelector('input[name="contract_years"]:checked');
    if (!yearsRadio) {
      endDatePreview.style.display = 'none';
      return;
    }
    const years = parseInt(yearsRadio.value);

    // 生效日 = 明天（隔日）
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 到期日 = 生效日 + N 年 - 1 天
    const end = new Date(tomorrow);
    end.setFullYear(end.getFullYear() + years);
    end.setDate(end.getDate() - 1);

    const fmtROC = d => {
      const y = d.getFullYear() - 1911;
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `民國 ${y} 年 ${m} 月 ${dd} 日`;
    };

    endDateText.innerHTML = `
      ${fmtROC(tomorrow)} 起<br />
      至 ${fmtROC(end)} 止<br />
      （共計 <strong>${years} 年</strong>）
    `;
    endDatePreview.style.display = 'block';
  }

  yearsRadios.forEach(r => r.addEventListener('change', updateEndDate));
  updateEndDate();

  // ============ Submit ============
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    const yearsRadio = form.querySelector('input[name="contract_years"]:checked');

    if (!yearsRadio) {
      document.getElementById('err-contract_years').textContent = '請選擇合約年限';
      document.getElementById('err-contract_years').classList.add('show');
      return;
    }

    const years = parseInt(yearsRadio.value);

    // 前端只存年限（生效日在後端送出時才計算，用主播真實簽署時間點）
    sessionStorage.setItem('signContractTerms', JSON.stringify({
      contract_years: years,
      // 生效日/到期日在後端 submit.js 統一計算，避免客戶端時間欺騙
    }));

    window.location.href = '/sign/step-4.html';
  });
})();
