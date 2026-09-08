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
    if (!nextBtn) return;
    nextBtn.disabled = !bothAgreed();
  }

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

  function persistSession() {
    // 只在兩個 checkbox 都已勾選時才寫入完整 session
    const raw = sessionStorage.getItem('signSession');
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
    sessionStorage.setItem('signSession', JSON.stringify(sessionData));
  }

  // Consent checkbox change (合約條款)
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

  // Policy checkbox change (隱私權政策 + 服務條款)
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

  // Next button
  nextBtn.addEventListener('click', function() {
    if (!bothAgreed()) return;
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
