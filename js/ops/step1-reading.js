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
  const nextBtn = document.getElementById('nextBtn');

  let hasReachedEnd = false;
  let scrolledAt = null;

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

  consentCheckbox.addEventListener('change', function() {
    if (this.checked) {
      const agreedAt = new Date().toISOString();
      const sessionData = {
        step: 1,
        scrolledAt: scrolledAt,
        agreedAt: agreedAt,
        userAgent: navigator.userAgent,
      };
      sessionStorage.setItem('opsSession', JSON.stringify(sessionData));
      nextBtn.disabled = false;
      consentHint.textContent = '✓ 已確認閱讀，可繼續下一步';
      consentHint.style.color = 'var(--sign-success)';
    } else {
      nextBtn.disabled = true;
      consentHint.textContent = '請勾選確認閱讀';
      consentHint.style.color = '';
    }
  });

  nextBtn.addEventListener('click', function() {
    if (!consentCheckbox.checked) return;
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
