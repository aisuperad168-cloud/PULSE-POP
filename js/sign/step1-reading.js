/**
 * ============================================================
 * JDI Sign System · Step 1: Contract Reading
 * ============================================================
 * 功能：
 *   1. 追蹤合約內容的滾動進度
 *   2. 滾到底時解鎖「我已閱讀」checkbox
 *   3. 勾選後啟用「繼續下一步」按鈕
 *   4. 記錄滾到底時間戳（法律證據）
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

  // ============ Scroll Progress Tracking ============
  function updateProgress() {
    if (!scrollEl) return;
    const scrollTop = scrollEl.scrollTop;
    const scrollHeight = scrollEl.scrollHeight;
    const clientHeight = scrollEl.clientHeight;
    const maxScroll = scrollHeight - clientHeight;

    if (maxScroll <= 0) {
      // 內容比容器還短，直接視為讀完
      finishReading();
      return;
    }

    const progress = Math.min(100, Math.round((scrollTop / maxScroll) * 100));
    progressBar.style.setProperty('--progress', progress + '%');
    progressLabel.textContent = `閱讀進度 ${progress}%`;

    // 滾到底部 (>= 98% 算讀完，避免精確度問題)
    if (progress >= 98 && !hasReachedEnd) {
      finishReading();
    }
  }

  function finishReading() {
    hasReachedEnd = true;
    scrolledAt = new Date().toISOString();
    progressLabel.textContent = '閱讀進度 100% ✓';
    progressLabel.style.color = 'var(--sign-success)';

    // 啟用 checkbox
    consentCheckbox.disabled = false;
    consentLabel.classList.remove('sign-checkbox-disabled');
    consentHint.textContent = '請勾選確認閱讀';
  }

  // Consent checkbox change
  consentCheckbox.addEventListener('change', function() {
    if (this.checked) {
      const agreedAt = new Date().toISOString();
      // 儲存所有時間戳
      const sessionData = {
        step: 1,
        scrolledAt: scrolledAt,
        agreedAt: agreedAt,
        userAgent: navigator.userAgent,
      };
      sessionStorage.setItem('signSession', JSON.stringify(sessionData));

      // 啟用下一步按鈕
      nextBtn.disabled = false;
      consentHint.textContent = '✓ 已確認閱讀，可繼續下一步';
      consentHint.style.color = 'var(--sign-success)';
    } else {
      nextBtn.disabled = true;
      consentHint.textContent = '請勾選確認閱讀';
      consentHint.style.color = '';
    }
  });

  // Next button
  nextBtn.addEventListener('click', function() {
    if (!consentCheckbox.checked) return;
    window.location.href = '/sign/step-2.html';
  });

  // Scroll listener (throttled)
  let scrollTimer = null;
  scrollEl.addEventListener('scroll', function() {
    if (scrollTimer) return;
    scrollTimer = setTimeout(() => {
      updateProgress();
      scrollTimer = null;
    }, 50);
  }, { passive: true });

  // Init check (若容器內容已能全部顯示)
  window.addEventListener('load', updateProgress);
  updateProgress();

  // ============ 阻止複製身分證等敏感資訊到瀏覽器 sessionStorage ============
  // 若使用者關閉頁面前有輸入過資料，清理殘留 (下一步會重新儲存)
  window.addEventListener('beforeunload', function() {
    // 不清 signSession，讓下一步可以讀
  });
})();
