/**
 * ============================================================
 * lottery-register.js - 抽獎登記表單
 * ============================================================
 * 職責：
 *  - 表單驗證（前端）
 *  - 讀取 URL 參數 (?ref=XXXX / ?type=... / ?score=...)
 *  - POST /api/lottery/register
 *  - 成功後導向 /lottery/draw/?t=<ticket_no>&s=<sig>
 * ============================================================
 */
(function () {
  'use strict';

  // === URL 參數擷取 ===
  var urlParams = new URLSearchParams(window.location.search);
  var referrer = urlParams.get('ref') || '';
  var quizType = urlParams.get('type') || '';
  var quizScore = parseInt(urlParams.get('score'), 10);

  // 保存 referrer 到 sessionStorage（避免用戶跳頁後遺失）
  if (referrer) {
    try { sessionStorage.setItem('jdi_lottery_ref', referrer); } catch (e) {}
  } else {
    try { referrer = sessionStorage.getItem('jdi_lottery_ref') || ''; } catch (e) {}
  }

  // === 即時檢查推薦人 ===
  var referrerBanner = document.getElementById('lfReferrerBanner');
  var referrerText = document.getElementById('lfReferrerText');
  var referrerSubtext = document.getElementById('lfReferrerSubtext');
  if (referrer && referrerBanner) {
    fetch('/api/lottery/check-referrer?code=' + encodeURIComponent(referrer))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.ok) return;
        if (data.valid) {
          referrerText.textContent = '💌 ' + data.referrer_name + ' 邀請你來抽獎！';
          referrerSubtext.textContent = '登記成功後，' + data.referrer_name + ' 會多 1 次抽獎機會 · 你也能拿到抽獎機會 🎁';
          referrerBanner.style.display = 'flex';
        } else if (data.reason === 'capped') {
          referrerBanner.classList.add('is-invalid');
          referrerText.textContent = '⚠️ 推薦人已達邀請上限';
          referrerSubtext.textContent = (data.referrer_name || '推薦人') + ' 這個月已邀請 5 位朋友，你仍可登記但不再幫他加機會';
          referrerBanner.style.display = 'flex';
          try { sessionStorage.removeItem('jdi_lottery_ref'); } catch (e) {}
        } else {
          // 推薦碼無效 → 靜默清除
          try { sessionStorage.removeItem('jdi_lottery_ref'); } catch (e) {}
          referrer = '';
        }
      })
      .catch(function () {
        // 錯誤時不擋登記，靜默失敗
      });
  }

  var form = document.getElementById('lfRegisterForm');
  var submitBtn = document.getElementById('lfSubmitBtn');
  var submitText = document.getElementById('lfSubmitText');
  var globalError = document.getElementById('lfGlobalError');

  var nameInput = document.getElementById('lfName');
  var phoneInput = document.getElementById('lfPhone');
  var emailInput = document.getElementById('lfEmail');
  var privacyInput = document.getElementById('lfPrivacy');

  if (!form) return;

  // === 前端驗證 ===
  function validateName(v) {
    if (!v || v.trim().length < 2) return '姓名至少 2 個字';
    if (v.trim().length > 20) return '姓名不能超過 20 個字';
    return null;
  }
  function validatePhone(v) {
    var cleaned = (v || '').replace(/[\s\-]/g, '');
    if (!/^09\d{8}$/.test(cleaned)) return '請填寫正確手機（09xx-xxx-xxx）';
    return null;
  }
  function validateEmail(v) {
    var trimmed = (v || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return 'Email 格式不正確';
    return null;
  }

  function setFieldError(fieldId, errMsg) {
    var wrap = document.getElementById(fieldId);
    if (!wrap) return;
    var errEl = wrap.querySelector('.lf-form-error');
    if (errMsg) {
      wrap.classList.add('has-error');
      if (errEl) errEl.textContent = errMsg;
    } else {
      wrap.classList.remove('has-error');
    }
  }

  function clearAllErrors() {
    setFieldError('lfFieldName', null);
    setFieldError('lfFieldPhone', null);
    setFieldError('lfFieldEmail', null);
    globalError.classList.remove('is-visible');
    globalError.textContent = '';
  }

  function showGlobalError(msg) {
    globalError.textContent = msg;
    globalError.classList.add('is-visible');
    globalError.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // === 即時驗證（blur 時） ===
  nameInput.addEventListener('blur', function () {
    var err = validateName(nameInput.value);
    setFieldError('lfFieldName', err);
  });
  phoneInput.addEventListener('blur', function () {
    var err = validatePhone(phoneInput.value);
    setFieldError('lfFieldPhone', err);
  });
  emailInput.addEventListener('blur', function () {
    var err = validateEmail(emailInput.value);
    setFieldError('lfFieldEmail', err);
  });

  // === 提交 ===
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    clearAllErrors();

    var nameErr = validateName(nameInput.value);
    var phoneErr = validatePhone(phoneInput.value);
    var emailErr = validateEmail(emailInput.value);

    setFieldError('lfFieldName', nameErr);
    setFieldError('lfFieldPhone', phoneErr);
    setFieldError('lfFieldEmail', emailErr);

    if (nameErr || phoneErr || emailErr) {
      showGlobalError('⚠️ 請檢查填寫內容');
      return;
    }
    if (!privacyInput.checked) {
      showGlobalError('⚠️ 請勾選同意隱私權政策');
      privacyInput.focus();
      return;
    }

    // 送出
    submitBtn.disabled = true;
    submitText.innerHTML = '<span class="lf-loading"></span> 登記中...';

    var payload = {
      name: nameInput.value.trim(),
      phone: phoneInput.value.replace(/[\s\-]/g, ''),
      email: emailInput.value.trim().toLowerCase(),
      referrer_code: referrer,
      quiz_result_type: quizType,
      quiz_score: isNaN(quizScore) ? null : quizScore,
      privacy_agreed: true,
    };

    fetch('/api/lottery/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.ok) {
          // 成功 → 導向抽獎頁
          var url = '/lottery/draw/?t=' + encodeURIComponent(data.ticket_no) + '&s=' + encodeURIComponent(data.sig);
          try {
            sessionStorage.setItem('jdi_lottery_ticket', data.ticket_no);
            sessionStorage.setItem('jdi_lottery_sig', data.sig);
          } catch (e) {}
          window.location.href = url;
        } else {
          submitBtn.disabled = false;
          submitText.textContent = '🎲 送出並開始抽獎';
          showGlobalError((data && data.error) || '登記失敗，請稍後再試');
        }
      })
      .catch(function (err) {
        submitBtn.disabled = false;
        submitText.textContent = '🎲 送出並開始抽獎';
        showGlobalError('網路錯誤，請檢查連線後重試');
        console.error('[lottery-register] error:', err);
      });
  });

  console.log('[lottery-register] initialized, referrer =', referrer || '(none)');
})();
