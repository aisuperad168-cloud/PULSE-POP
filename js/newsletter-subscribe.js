/**
 * ============================================================
 * JDI Newsletter · 訂閱表單前端邏輯
 * ============================================================
 * 綁定所有 .jdi-nl-form → 攔截 submit → 呼叫 /api/newsletter/subscribe
 * 支援多個表單共存於同一頁（不同區塊）
 * ============================================================
 */
(function () {
  'use strict';

  function bindForm(form) {
    if (!form || form.dataset.jdiNlBound === '1') return;
    form.dataset.jdiNlBound = '1';

    const box = form.closest('.jdi-nl-box') || form.parentElement;
    const emailInput = form.querySelector('.jdi-nl-input');
    const submitBtn = form.querySelector('.jdi-nl-btn');
    const msgEl = box.querySelector('.jdi-nl-msg') || createMsgEl(box);
    const hpInput = form.querySelector('.jdi-nl-hp');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!emailInput) return;

      const email = (emailInput.value || '').trim().toLowerCase();
      if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(email)) {
        showMsg(msgEl, 'error', '請輸入正確的 email 格式');
        emailInput.focus();
        return;
      }

      // UI: disable
      submitBtn.disabled = true;
      emailInput.disabled = true;
      const origBtnText = submitBtn.textContent;
      submitBtn.textContent = '寄送中…';
      hideMsg(msgEl);

      try {
        const source = form.dataset.source || 'website';
        const sourceDetail = form.dataset.sourceDetail || location.pathname;

        const resp = await fetch('/api/newsletter/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            source,
            source_detail: sourceDetail,
            honeypot: hpInput ? hpInput.value : '',
          }),
        });
        const data = await resp.json();

        if (data.ok) {
          if (data.status === 'already_subscribed') {
            showMsg(msgEl, 'success', '✅ 這個信箱已訂閱過了，感謝支持！');
          } else if (data.status === 'resubscribed') {
            showMsg(msgEl, 'success', '🎉 歡迎回來！你已重新訂閱 JDI 直播中心電子報');
            emailInput.value = '';
          } else {
            // 'subscribed' 或其他成功狀態
            showMsg(msgEl, 'success', '🎉 訂閱成功！歡迎信已寄到你的信箱 📬');
            emailInput.value = '';
          }
          // 追蹤 GA4 event（若已載入）
          if (window.jdiTrack) {
            window.jdiTrack('newsletter_subscribe_submit', { source, status: data.status });
          } else if (window.gtag) {
            window.gtag('event', 'newsletter_subscribe_submit', { source });
          }
        } else {
          showMsg(msgEl, 'error', (data.error && data.error.message) || '訂閱失敗，請稍後再試');
        }
      } catch (err) {
        console.error('[newsletter subscribe] error:', err);
        showMsg(msgEl, 'error', '網路錯誤，請稍後再試');
      } finally {
        submitBtn.disabled = false;
        emailInput.disabled = false;
        submitBtn.textContent = origBtnText;
      }
    });
  }

  function createMsgEl(box) {
    const el = document.createElement('div');
    el.className = 'jdi-nl-msg';
    el.setAttribute('role', 'status');
    box.appendChild(el);
    return el;
  }
  function showMsg(el, type, text) {
    el.className = 'jdi-nl-msg show ' + type;
    el.textContent = text;
  }
  function hideMsg(el) {
    el.className = 'jdi-nl-msg';
    el.textContent = '';
  }

  function init() {
    document.querySelectorAll('.jdi-nl-form').forEach(bindForm);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
