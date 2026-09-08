/**
 * ============================================================
 * JDI OPS System · Step 1: Contract Reading
 * ============================================================
 * 追蹤滾動 → 到底解鎖 checkbox → 勾選啟用下一步
 */
(function() {
  'use strict';

  const scrollEl = document.getElementById('contractScroll');
  const progressBar = document.getElementById('readingProgressBar');
  const progressLabel = document.getElementById('readingProgressLabel');
  const consentCheckbox = document.getElementById('consentCheckbox');
  const consentLabel = document.getElementById('consentLabel');
  const consentHint = document.getElementById('consentHint');
  const policyCheckbox = document.getElementById('policyCheckbox');
  const nextBtn = document.getElementById('nextBtn');

  let hasReachedEnd = false;
  let scrolledAt = null;
  let policyAgreedAt = null;

  function bothAgreed() {
    return consentCheckbox && consentCheckbox.checked
        && policyCheckbox  && policyCheckbox.checked;
  }
  function refreshNextBtn() {
    if (nextBtn) nextBtn.disabled = !bothAgreed();
  }

  function updateProgress() {
    if (!scrollEl) return;
    const scrollTop = scrollEl.scrollTop;
    const scrollHeight = scrollEl.scrollHeight;
    const clientHeight = scrollEl.clientHeight;
    const maxScroll = scrollHeight - clientHeight;

    if (maxScroll <= 0) { finishReading(); return; }

    const progress = Math.min(100, Math.round((scrollTop / maxScroll) * 100));
    progressBar.style.setProperty('--progress', progress + '%');
    progressLabel.textContent = `閱讀進度 ${progress}%`;

    if (progress >= 98 && !hasReachedEnd) finishReading();
  }

  function finishReading() {
    hasReachedEnd = true;
    scrolledAt = new Date().toISOString();
    progressLabel.textContent = '閱讀進度 100% ✓';
    progressLabel.style.color = 'var(--sign-success)';
    consentCheckbox.disabled = false;
    consentLabel.classList.remove('sign-checkbox-disabled');
    consentHint.textContent = '請勾選確認閱讀';
  }

  function persistSession() {
    const raw = sessionStorage.getItem('opsSession');
    const prev = raw ? (function(){ try{ return JSON.parse(raw); }catch(e){ return {}; } })() : {};
    const sessionData = Object.assign({}, prev, {
      step: 1,
      scrolledAt: scrolledAt,
      agreedAt: consentCheckbox && consentCheckbox.checked
        ? (prev.agreedAt || new Date().toISOString())
        : null,
      policyAgreedAt: policyCheckbox && policyCheckbox.checked
        ? (policyAgreedAt || new Date().toISOString())
        : null,
      userAgent: navigator.userAgent,
    });
    sessionStorage.setItem('opsSession', JSON.stringify(sessionData));
  }

  consentCheckbox.addEventListener('change', function() {
    if (this.checked) {
      consentHint.textContent = '✓ 已確認閱讀合約';
      consentHint.style.color = 'var(--sign-success)';
    } else {
      consentHint.textContent = '請勾選確認閱讀';
      consentHint.style.color = '';
    }
    persistSession();
    refreshNextBtn();
  });

  if (policyCheckbox) {
    policyCheckbox.addEventListener('change', function() {
      if (this.checked && !policyAgreedAt) {
        policyAgreedAt = new Date().toISOString();
      } else if (!this.checked) {
        policyAgreedAt = null;
      }
      persistSession();
      refreshNextBtn();
    });
  }

  nextBtn.addEventListener('click', function() {
    if (!bothAgreed()) return;
    window.location.href = '/ops/step-2.html';
  });

  let scrollTimer = null;
  scrollEl.addEventListener('scroll', function() {
    if (scrollTimer) return;
    scrollTimer = setTimeout(() => { updateProgress(); scrollTimer = null; }, 50);
  }, { passive: true });

  window.addEventListener('load', updateProgress);
  updateProgress();
})();
