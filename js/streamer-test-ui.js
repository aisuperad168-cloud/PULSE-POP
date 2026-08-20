/* =====================================================================
 * streamer-test-ui.js
 * 主播適配度測驗（5 分鐘深度版）作答頁 UI 邏輯
 *
 * 依賴（依此順序載入）：
 *   1. /js/streamer-test-data.js   (window.STMT_DATA, STMT_MODULES, STMT_QUESTIONS, STMT_LIE_QUESTIONS)
 *   2. /js/streamer-test-core.js   (window.STMT_CORE, window.stmtBuildResult)
 *
 * 流程：
 *   分頁作答 (6 頁 · 每頁 1 模組 = 10 題) → 誠實檢核（第 7 頁）→ 完成 → 顯示留資 Modal
 *   → POST /api/streamer-test-submit → 存 sessionStorage → 導向 /streamer-test/result/
 * ===================================================================== */
(function () {
  'use strict';

  // ────────────────────────────────────────────────────────────
  // 0. 前置檢查
  // ────────────────────────────────────────────────────────────
  if (!window.STMT_DATA || !window.STMT_CORE) {
    console.error('[stmt-ui] Missing STMT_DATA or STMT_CORE. Check script order.');
    return;
  }

  const DATA = window.STMT_DATA;
  const MODULES = DATA.modules;              // 6 個模組（固定順序）
  const QUESTIONS = DATA.questions;          // 60 題
  const LIE_QUESTIONS = DATA.lieQuestions;   // 3 題誠實檢核
  const CORE = window.STMT_CORE;

  const LIKERT_LABELS = [
    '非常不同意',
    '不同意',
    '普通',
    '同意',
    '非常同意',
  ];

  // ────────────────────────────────────────────────────────────
  // 1. 狀態
  // ────────────────────────────────────────────────────────────
  const state = {
    /** { [qid]: 1-5 } */
    answers: {},
    /** { L1: 1-5, L2: 1-5, L3: 1-5 } */
    lieAnswers: {},
    /** 目前頁碼（0 = 第 1 模組 / 6 = 誠實檢核） */
    pageIndex: 0,
    submitted: false,
  };

  // 6 個模組頁 + 1 個誠實檢核頁 = 7 頁
  const PAGES = [
    ...MODULES.map((m) => ({ kind: 'module', module: m })),
    { kind: 'lie' },
  ];
  const TOTAL_MAIN_QUESTIONS = QUESTIONS.length; // 60

  // ────────────────────────────────────────────────────────────
  // 2. DOM refs
  // ────────────────────────────────────────────────────────────
  const $ = (id) => document.getElementById(id);
  const els = {
    container:      $('stmtQuizContainer'),
    progressWrap:   $('stmtProgressWrap'),
    progressModule: $('stmtProgressModule'),
    progressCurrent:$('stmtProgressCurrent'),
    progressTotal:  $('stmtProgressTotal'),
    progressFill:   $('stmtProgressFill'),
    bottomNav:      $('stmtBottomNav'),
    btnPrev:        $('stmtBtnPrev'),
    btnNext:        $('stmtBtnNext'),
    // 留資 Modal
    modal:          $('stmtLeadModal'),
    form:           $('stmtLeadForm'),
    formError:      $('stmtFormError'),
    btnSubmit:      $('stmtBtnSubmit'),
    submitIdle:     null,
    submitLoading:  null,
  };
  if (els.btnSubmit) {
    els.submitIdle = els.btnSubmit.querySelector('.stmt-btn-submit-idle');
    els.submitLoading = els.btnSubmit.querySelector('.stmt-btn-submit-loading');
  }
  els.progressTotal && (els.progressTotal.textContent = String(TOTAL_MAIN_QUESTIONS));

  // ────────────────────────────────────────────────────────────
  // 3. Render: 題目卡（單題）
  // ────────────────────────────────────────────────────────────
  function renderLikertQuestion(q, seqNum, chosenValue, opts) {
    opts = opts || {};
    const groupName = opts.name || `q_${q.id}`;
    const isChecked = (v) => Number(chosenValue) === v;

    const options = [1, 2, 3, 4, 5].map((v) => `
      <label class="stmt-likert-option">
        <input type="radio" name="${groupName}" value="${v}" data-qid="${q.id}" data-qtype="${opts.type || 'main'}" ${isChecked(v) ? 'checked' : ''} />
        <span class="stmt-likert-box">
          <span class="stmt-likert-num">${v}</span>
          <span class="stmt-likert-label">${LIKERT_LABELS[v - 1]}</span>
        </span>
      </label>
    `).join('');

    const seqLabel = opts.seqLabel || `Q${seqNum}`;

    return `
      <article class="stmt-question-card${chosenValue ? ' stmt-answered' : ''}" data-qid="${q.id}">
        <span class="stmt-question-num">${seqLabel}</span>
        <p class="stmt-question-text">${escapeHTML(q.text)}</p>
        <div class="stmt-likert" role="radiogroup" aria-label="${escapeHTML(q.text)}">
          ${options}
        </div>
      </article>
    `;
  }

  // ────────────────────────────────────────────────────────────
  // 4. Render: 目前頁
  // ────────────────────────────────────────────────────────────
  function renderCurrentPage() {
    const page = PAGES[state.pageIndex];
    if (!page) return;
    let html = '';

    if (page.kind === 'module') {
      const mod = page.module;
      const moduleQuestions = QUESTIONS.filter((q) => q.module === mod.key);
      const moduleIndex = MODULES.findIndex((m) => m.key === mod.key);

      // 模組分隔標題
      html += `
        <div class="stmt-module-divider">
          <div class="stmt-module-divider-label">模組 ${String.fromCharCode(65 + moduleIndex)} · ${moduleIndex + 1} / 6</div>
          <h2>${escapeHTML(mod.name)}</h2>
        </div>
      `;

      // 該模組的 10 題（用全域題號 1-60）
      moduleQuestions.forEach((q) => {
        const chosen = state.answers[q.id];
        html += renderLikertQuestion(q, q.id, chosen, { name: `q_${q.id}`, type: 'main' });
      });
    } else if (page.kind === 'lie') {
      // 誠實檢核
      html += `
        <div class="stmt-module-divider">
          <div class="stmt-module-divider-label">最後一步 · 誠實檢核</div>
          <h2>3 題平衡校準</h2>
          <p style="color:#B5B5C0; font-size:14px; margin-top:8px;">這 3 題不會影響你的能力分數，但幫助我們判斷結果是否過度理想化。請照真實情況回答。</p>
        </div>
      `;
      LIE_QUESTIONS.forEach((lq, i) => {
        const chosen = state.lieAnswers[lq.id];
        html += renderLikertQuestion(lq, i + 1, chosen, {
          name: `lie_${lq.id}`,
          type: 'lie',
          seqLabel: `L${i + 1}`,
        });
      });
    }

    els.container.innerHTML = html;
    els.bottomNav.hidden = false;

    // 綁定 radio 事件
    els.container.querySelectorAll('input[type="radio"]').forEach((input) => {
      input.addEventListener('change', onAnswerChange);
    });

    // Progress bar 更新
    updateProgress();
    updateNavButtons();

    // Focus 管理：滑到頁首
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ────────────────────────────────────────────────────────────
  // 5. 答題更新
  // ────────────────────────────────────────────────────────────
  function onAnswerChange(ev) {
    const input = ev.currentTarget;
    const qid = input.dataset.qid;
    const qtype = input.dataset.qtype;
    const val = Number(input.value);
    if (qtype === 'lie') {
      state.lieAnswers[qid] = val;
    } else {
      state.answers[Number(qid)] = val;
    }
    // 標記卡片
    const card = input.closest('.stmt-question-card');
    if (card) card.classList.add('stmt-answered');

    updateProgress();
    updateNavButtons();
  }

  // ────────────────────────────────────────────────────────────
  // 6. Progress + Nav
  // ────────────────────────────────────────────────────────────
  function countAnswered() {
    return Object.keys(state.answers).length;
  }
  function isCurrentPageComplete() {
    const page = PAGES[state.pageIndex];
    if (page.kind === 'module') {
      return QUESTIONS
        .filter((q) => q.module === page.module.key)
        .every((q) => Number(state.answers[q.id]) >= 1);
    }
    // lie: 3 題都答完（3 題都必答）
    return LIE_QUESTIONS.every((lq) => Number(state.lieAnswers[lq.id]) >= 1);
  }

  function updateProgress() {
    const answered = countAnswered();
    const page = PAGES[state.pageIndex];

    // 已作答題數／60（不含誠實檢核）
    els.progressCurrent.textContent = String(answered);

    // Fill：以總進度為基準（作答數 / 60）；到誠實檢核頁時鎖 100%
    const pct = page.kind === 'lie'
      ? 100
      : Math.max(1, Math.round((answered / TOTAL_MAIN_QUESTIONS) * 100));
    els.progressFill.style.width = pct + '%';

    // 標題
    if (page.kind === 'module') {
      els.progressModule.textContent = page.module.name;
    } else {
      els.progressModule.textContent = '誠實檢核';
    }
  }

  function updateNavButtons() {
    // Prev
    els.btnPrev.disabled = state.pageIndex === 0;
    // Next
    const isLast = state.pageIndex === PAGES.length - 1;
    els.btnNext.disabled = !isCurrentPageComplete();
    els.btnNext.innerHTML = isLast
      ? `完成測驗 <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>`
      : `下一頁 <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>`;
  }

  function goPrev() {
    if (state.pageIndex > 0) {
      state.pageIndex -= 1;
      renderCurrentPage();
    }
  }
  function goNext() {
    if (!isCurrentPageComplete()) return;
    if (state.pageIndex < PAGES.length - 1) {
      state.pageIndex += 1;
      renderCurrentPage();
    } else {
      // 最後一頁完成 → 顯示留資 Modal
      openLeadModal();
    }
  }

  // ────────────────────────────────────────────────────────────
  // 7. 留資 Modal 開關
  // ────────────────────────────────────────────────────────────
  function openLeadModal() {
    if (!els.modal) return;
    els.modal.hidden = false;
    els.modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('stmt-modal-open');

    // 綁定關閉
    els.modal.querySelectorAll('[data-close-modal]').forEach((btn) => {
      btn.addEventListener('click', closeLeadModal, { once: true });
    });
    // Esc 關閉
    document.addEventListener('keydown', onEscKeyClose);

    // Focus
    setTimeout(() => {
      const nameInput = $('stmtName');
      if (nameInput) nameInput.focus();
    }, 100);
  }
  function closeLeadModal() {
    if (!els.modal) return;
    els.modal.hidden = true;
    els.modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('stmt-modal-open');
    document.removeEventListener('keydown', onEscKeyClose);
  }
  function onEscKeyClose(ev) {
    if (ev.key === 'Escape') closeLeadModal();
  }

  // ────────────────────────────────────────────────────────────
  // 8. 送出表單
  // ────────────────────────────────────────────────────────────
  async function onSubmitForm(ev) {
    ev.preventDefault();
    if (state.submitted) return;

    // 清錯誤
    els.formError.hidden = true;
    els.formError.textContent = '';

    const formData = new FormData(els.form);
    const payload = {
      name:       (formData.get('name') || '').toString().trim(),
      lineId:     (formData.get('lineId') || '').toString().trim(),
      email:      (formData.get('email') || '').toString().trim(),
      gender:     (formData.get('gender') || '').toString(),
      age:        (formData.get('age') || '').toString(),
      region:     (formData.get('region') || '').toString(),
      experience: (formData.get('experience') || '').toString(),
      consent:    formData.get('consent') === 'on',
      answers:    state.answers,
      lieAnswers: state.lieAnswers,
      source:     'streamer-test-quiz',
    };

    // Client-side 基本驗證
    const err = validateForm(payload);
    if (err) {
      showFormError(err);
      return;
    }

    // 進入 loading
    setSubmitting(true);
    state.submitted = true;

    try {
      const resp = await fetch('/api/streamer-test-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();

      if (!resp.ok || !data.ok) {
        const msg = (data && data.error) || `送出失敗（狀態 ${resp.status}），請稍後再試。`;
        throw new Error(msg);
      }

      // 存到 sessionStorage 給結果頁使用
      const packet = {
        result: data.result,
        cta: data.cta,
        leadId: data.leadId,
        userEmailSent: data.userEmailSent,
        email: payload.email,
        name: payload.name,
        submittedAt: new Date().toISOString(),
      };
      try {
        sessionStorage.setItem('stmt_result', JSON.stringify(packet));
      } catch (e) {
        console.warn('[stmt-ui] sessionStorage write failed, will pass via URL', e);
      }

      // 導向結果頁
      window.location.href = '/streamer-test/result/';
    } catch (e) {
      console.error('[stmt-ui] submit error', e);
      showFormError(e.message || '網路連線異常，請稍後再試。');
      setSubmitting(false);
      state.submitted = false;
    }
  }

  function validateForm(p) {
    if (!p.name)   return '請填寫姓名。';
    if (p.name.length > 30) return '姓名長度不能超過 30 個字。';
    if (!p.lineId) return '請填寫 LINE ID。';
    if (!p.email)  return '請填寫 Email。';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) return '請填寫有效的 Email 地址。';
    if (!p.experience) return '請選擇你目前的主播狀態。';
    if (!['new', 'experienced', 'current'].includes(p.experience)) return '主播狀態選項無效。';
    if (!p.consent) return '請勾選同意條款才能提交。';
    // 檢查答題完整
    const missing = QUESTIONS.filter((q) => !p.answers[q.id]);
    if (missing.length) return `還有 ${missing.length} 題沒答完，請回上一頁補完。`;
    return null;
  }

  function showFormError(msg) {
    els.formError.textContent = msg;
    els.formError.hidden = false;
    els.formError.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function setSubmitting(isSubmitting) {
    if (!els.btnSubmit) return;
    els.btnSubmit.disabled = isSubmitting;
    if (els.submitIdle)    els.submitIdle.hidden = isSubmitting;
    if (els.submitLoading) els.submitLoading.hidden = !isSubmitting;
  }

  // ────────────────────────────────────────────────────────────
  // 9. Utils
  // ────────────────────────────────────────────────────────────
  function escapeHTML(str) {
    return String(str || '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  // ────────────────────────────────────────────────────────────
  // 10. 初始化
  // ────────────────────────────────────────────────────────────
  function init() {
    if (!els.container) return;

    // 綁定 nav
    els.btnPrev.addEventListener('click', goPrev);
    els.btnNext.addEventListener('click', goNext);

    // 綁定 form
    if (els.form) {
      els.form.addEventListener('submit', onSubmitForm);
    }

    // 首次渲染
    renderCurrentPage();

    // 提示：離開頁面前提醒（僅在有答題但未送出時）
    window.addEventListener('beforeunload', (ev) => {
      if (countAnswered() > 0 && !state.submitted) {
        ev.preventDefault();
        ev.returnValue = '你的作答還沒送出，離開後會遺失，確定嗎？';
        return ev.returnValue;
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
