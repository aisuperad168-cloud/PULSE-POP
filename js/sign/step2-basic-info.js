/**
 * ============================================================
 * JDI Sign System · Step 2: Basic Info
 * ============================================================
 * 驗證：
 *   - 身分證字號 (台灣 ID 檢核碼)
 *   - 手機格式 (09xxxxxxxx)
 *   - Email 格式
 *   - 生日不能是未來
 *   - 各欄位必填 & 長度
 */

(function() {
  'use strict';

  // 檢查是否有 Step 1 的 session（沒讀過合約直接跳來的擋掉）
  const session = JSON.parse(sessionStorage.getItem('signSession') || 'null');
  if (!session || !session.agreedAt) {
    alert('請先閱讀合約');
    window.location.href = '/sign/';
    return;
  }

  const form = document.getElementById('basicInfoForm');
  const sameAsContact = document.getElementById('sameAsContact');
  const contactAddr = document.getElementById('contact_address');
  const registeredAddr = document.getElementById('registered_address');

  // Prefill 之前填過的（返回上一步時保留）
  const savedData = JSON.parse(sessionStorage.getItem('signBasicInfo') || 'null');
  if (savedData) {
    for (const key in savedData) {
      const el = form.querySelector(`[name="${key}"]`);
      if (el) el.value = savedData[key];
    }
  }

  // Birthday max = today (民國成年)
  const bd = document.getElementById('birthday');
  const today = new Date();
  bd.max = today.toISOString().split('T')[0];
  // 建議民國成年（18 歲），min 100 年前
  const minBirth = new Date(today.getFullYear() - 100, 0, 1);
  bd.min = minBirth.toISOString().split('T')[0];

  // 「同聯絡地址」勾選
  sameAsContact.addEventListener('change', function() {
    if (this.checked) {
      registeredAddr.value = contactAddr.value;
      registeredAddr.setAttribute('readonly', 'readonly');
      registeredAddr.style.opacity = '0.7';
    } else {
      registeredAddr.removeAttribute('readonly');
      registeredAddr.style.opacity = '';
    }
  });
  contactAddr.addEventListener('input', function() {
    if (sameAsContact.checked) registeredAddr.value = this.value;
  });

  // ============ 驗證函式 ============
  function validateTaiwanID(id) {
    // 台灣身分證字號檢核
    if (!/^[A-Z][1-2]\d{8}$/.test(id)) return false;
    const codeMap = 'ABCDEFGHJKLMNPQRSTUVXYWZIO';
    const letterMap = {
      A:10,B:11,C:12,D:13,E:14,F:15,G:16,H:17,I:34,J:18,K:19,L:20,M:21,N:22,O:35,
      P:23,Q:24,R:25,S:26,T:27,U:28,V:29,W:32,X:30,Y:31,Z:33
    };
    const first = letterMap[id[0]];
    const n1 = Math.floor(first / 10);
    const n2 = first % 10;
    let sum = n1 + n2 * 9;
    for (let i = 1; i <= 8; i++) sum += parseInt(id[i]) * (9 - i);
    sum += parseInt(id[9]);
    return sum % 10 === 0;
  }

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function validatePhone(phone) {
    return /^09\d{8}$/.test(phone);
  }

  function showError(field, msg) {
    const errEl = document.getElementById(`err-${field}`);
    if (errEl) {
      errEl.textContent = msg;
      errEl.classList.add('show');
    }
    const inputEl = form.querySelector(`[name="${field}"]`);
    if (inputEl) inputEl.classList.add('error');
  }

  function clearError(field) {
    const errEl = document.getElementById(`err-${field}`);
    if (errEl) errEl.classList.remove('show');
    const inputEl = form.querySelector(`[name="${field}"]`);
    if (inputEl) inputEl.classList.remove('error');
  }

  // Realtime clear errors on typing
  form.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', () => clearError(input.name));
  });

  // 身分證字號自動大寫
  const idInput = document.getElementById('id_number');
  idInput.addEventListener('input', function() {
    this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  });

  // 手機自動去除非數字
  const phoneInput = document.getElementById('phone');
  phoneInput.addEventListener('input', function() {
    this.value = this.value.replace(/\D/g, '').slice(0, 10);
  });

  // ============ Submit ============
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    let hasError = false;

    const data = {
      real_name: form.real_name.value.trim(),
      stage_name: form.stage_name.value.trim(),
      id_number: form.id_number.value.trim().toUpperCase(),
      birthday: form.birthday.value,
      phone: form.phone.value.trim(),
      email: form.email.value.trim().toLowerCase(),
      contact_address: form.contact_address.value.trim(),
      registered_address: form.registered_address.value.trim(),
    };

    // 個別欄位驗證
    if (!data.real_name || data.real_name.length < 2) {
      showError('real_name', '請填寫真實姓名（至少 2 字）');
      hasError = true;
    }
    if (!data.stage_name || data.stage_name.length < 1) {
      showError('stage_name', '請填寫藝名或直播暱稱');
      hasError = true;
    }
    if (!validateTaiwanID(data.id_number)) {
      showError('id_number', '身分證字號格式錯誤或檢核碼不符');
      hasError = true;
    }
    if (!data.birthday) {
      showError('birthday', '請選擇出生年月日');
      hasError = true;
    } else {
      const bdDate = new Date(data.birthday);
      const age = (today - bdDate) / (365.25 * 24 * 60 * 60 * 1000);
      if (age < 18) {
        showError('birthday', '需年滿 18 歲才可簽署合約');
        hasError = true;
      } else if (age > 100) {
        showError('birthday', '出生日期無效');
        hasError = true;
      }
    }
    if (!validatePhone(data.phone)) {
      showError('phone', '請填寫正確的台灣手機號碼（09 開頭 10 位數）');
      hasError = true;
    }
    if (!validateEmail(data.email)) {
      showError('email', 'Email 格式錯誤');
      hasError = true;
    }
    if (!data.contact_address || data.contact_address.length < 8) {
      showError('contact_address', '請填寫完整聯絡地址');
      hasError = true;
    }
    if (!data.registered_address || data.registered_address.length < 8) {
      showError('registered_address', '請填寫完整戶籍地址');
      hasError = true;
    }

    if (hasError) {
      // Scroll to first error
      const firstErr = form.querySelector('.error');
      if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // 儲存到 sessionStorage 給後續 step 使用
    sessionStorage.setItem('signBasicInfo', JSON.stringify(data));

    // 進 Step 3
    window.location.href = '/sign/step-3.html';
  });
})();
