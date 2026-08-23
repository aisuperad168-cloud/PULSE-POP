/* =====================================================================
 * rookie-test-ui.js
 * 全新素人測驗（3 分鐘快速版 · 24 題）作答頁 UI 邏輯
 *
 * 依賴（依此順序載入）：
 *   1. /js/rookie-test-data.js   (window.ROOK_DATA, ROOK_MODULES, ROOK_QUESTIONS)
 *   2. /js/rookie-test-core.js   (window.ROOK_CORE, window.rookBuildResult)
 *
 * 流程：
 *   分頁作答（6 頁 · 每頁 1 模組 = 4 題）→ 完成 → 顯示留資 Modal
 *   → POST /api/rookie-test-submit → 存 sessionStorage/localStorage
 *   → 導向 /streamer-test/thanks/（與 5 分鐘版共用感謝頁，per Q1 A）
 *
 * DOM 慣例：
 *   - 進度/容器/導覽/Modal 沿用 stmt* 前綴（複用 streamer-test.css 樣式）
 *   - 表單欄位使用 rook* 前綴（新表單欄位）
 * ===================================================================== */
(function () {
  'use strict';

  // ────────────────────────────────────────────────────────────
  // 0. 前置檢查
  // ────────────────────────────────────────────────────────────
  if (!window.ROOK_DATA || !window.ROOK_CORE) {
    console.error('[rook-ui] Missing ROOK_DATA or ROOK_CORE. Check script order.');
    return;
  }

  const DATA = window.ROOK_DATA;
  const MODULES = DATA.modules;        // 6 個模組
  const QUESTIONS = DATA.questions;    // 24 題
  const CORE = window.ROOK_CORE;

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
    /** 目前頁碼（0 ~ 5，共 6 個模組頁，無誠實檢核頁） */
    pageIndex: 0,
    submitted: false,
  };

  // 6 個模組頁（無誠實檢核，24 題已內建 reverse scoring）
  const PAGES = MODULES.map((m) => ({ kind: 'module', module: m }));
  const TOTAL_MAIN_QUESTIONS = QUESTIONS.length; // 24

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
    // 留資 Modal（DOM id 沿用 stmt 前綴，表單 id 用 rook 前綴）
    modal:          $('stmtLeadModal'),
    form:           $('rookLeadForm'),
    formError:      $('rookFormError'),
    btnSubmit:      $('rookBtnSubmit'),
    submitIdle:     null,
    submitLoading:  null,
  };
  if (els.btnSubmit) {
    els.submitIdle = els.btnSubmit.querySelector('.stmt-btn-submit-idle');
    els.submitLoading = els.btnSubmit.querySelector('.stmt-btn-submit-loading');
  }
  els.progressTotal && (els.progressTotal.textContent = String(TOTAL_MAIN_QUESTIONS));

  // ────────────────────────────────────────────────────────────
  // 3. Render: 題目卡（單題 Likert）
  // ────────────────────────────────────────────────────────────
  function renderLikertQuestion(q, seqNum, chosenValue) {
    const groupName = `q_${q.id}`;
    const isChecked = (v) => Number(chosenValue) === v;

    const options = [1, 2, 3, 4, 5].map((v) => `
      <label class="stmt-likert-option">
        <input type="radio" name="${groupName}" value="${v}" data-qid="${q.id}" ${isChecked(v) ? 'checked' : ''} />
        <span class="stmt-likert-box">
          <span class="stmt-likert-num">${v}</span>
          <span class="stmt-likert-label">${LIKERT_LABELS[v - 1]}</span>
        </span>
      </label>
    `).join('');

    return `
      <article class="stmt-question-card${chosenValue ? ' stmt-answered' : ''}" data-qid="${q.id}">
        <span class="stmt-question-num">Q${seqNum}</span>
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

    const mod = page.module;
    const moduleQuestions = QUESTIONS.filter((q) => q.module === mod.key);
    const moduleIndex = MODULES.findIndex((m) => m.key === mod.key);

    // 模組分隔標題
    html += `
      <div class="stmt-module-divider">
        <div class="stmt-module-divider-label">模組 ${String.fromCharCode(65 + moduleIndex)} · ${moduleIndex + 1} / ${MODULES.length}</div>
        <h2>${escapeHTML(mod.name)}</h2>
      </div>
    `;

    // 該模組的 4 題（題號用全域題號 1-24）
    moduleQuestions.forEach((q) => {
      const chosen = state.answers[q.id];
      html += renderLikertQuestion(q, q.id, chosen);
    });

    els.container.innerHTML = html;
    els.bottomNav.hidden = false;

    // 綁定 radio 事件
    els.container.querySelectorAll('input[type="radio"]').forEach((input) => {
      input.addEventListener('change', onAnswerChange);
    });

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
    const qid = Number(input.dataset.qid);
    const val = Number(input.value);
    state.answers[qid] = val;

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
    return QUESTIONS
      .filter((q) => q.module === page.module.key)
      .every((q) => Number(state.answers[q.id]) >= 1);
  }

  function updateProgress() {
    const answered = countAnswered();
    const page = PAGES[state.pageIndex];

    // 已作答題數／24
    els.progressCurrent.textContent = String(answered);

    // Fill：以總進度為基準
    const pct = Math.max(1, Math.round((answered / TOTAL_MAIN_QUESTIONS) * 100));
    els.progressFill.style.width = pct + '%';

    // 標題
    els.progressModule.textContent = page.module.name;
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
      const nicknameInput = $('rookNickname');
      if (nicknameInput) nicknameInput.focus();
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
  const ALLOWED_AGE_RANGES = ['under_18', '18-24', '25-29', '30-34', '35+'];
  const ALLOWED_IDENTITIES = ['student', 'office_worker', 'freelancer', 'stay_home', 'between_jobs', 'other'];
  const ALLOWED_EXPERIENCES = ['none', 'tried', 'short_active'];
  const ALLOWED_INTENT = ['curious', 'considering', 'ready_now'];
  const ALLOWED_INTERESTS = ['entertainment', 'companion', 'content_knowledge', 'commerce', 'gaming', 'lifestyle', 'not_sure'];

  async function onSubmitForm(ev) {
    ev.preventDefault();
    if (state.submitted) return;

    // 清錯誤
    els.formError.hidden = true;
    els.formError.textContent = '';

    const formData = new FormData(els.form);
    // 多選 interestDirections
    const interestDirections = formData.getAll('interestDirections')
      .map((v) => String(v))
      .filter((v) => ALLOWED_INTERESTS.includes(v));

    const payload = {
      nickname:           (formData.get('nickname') || '').toString().trim(),
      lineId:             (formData.get('lineId') || '').toString().trim(),
      email:              (formData.get('email') || '').toString().trim(),
      ageRange:           (formData.get('ageRange') || '').toString(),
      identity:           (formData.get('identity') || '').toString(),
      liveExperience:     (formData.get('liveExperience') || '').toString(),
      interestDirections: interestDirections,
      intentLevel:        (formData.get('intentLevel') || '').toString(),
      consent:            formData.get('consent') === 'on',
      answers:            state.answers,
      source:             'rookie-test-quiz',
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
      let resp;
      try {
        resp = await fetch('/api/rookie-test-submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch (netErr) {
        throw new Error('網路連線失敗，請確認網路後再試一次。');
      }

      // 檢查回應內容類型
      const contentType = resp.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        try {
          const bodyText = await resp.text();
          console.error('[rook-ui] Non-JSON response from API:', resp.status, bodyText.slice(0, 200));
        } catch (_) {}
        if (resp.status === 404 || resp.status === 501) {
          throw new Error('測驗系統正在部署中，請稍後再試（或聯絡管理員）。');
        }
        throw new Error(`伺服器回應異常（${resp.status}），請稍後再試。`);
      }

      let data;
      try {
        data = await resp.json();
      } catch (jsonErr) {
        throw new Error('伺服器回應格式錯誤，請稍後再試。');
      }

      if (!resp.ok || !data.ok) {
        const msg = (data && (data.message || data.error)) || `送出失敗（狀態 ${resp.status}），請稍後再試。`;
        throw new Error(msg);
      }

      // 存到 sessionStorage + localStorage 雙保險（iOS Safari fallback）
      const packet = {
        result: data.result,
        cta: data.cta,
        leadId: data.leadId,
        userEmailSent: data.userEmailSent,
        email: payload.email,
        nickname: payload.nickname,
        submittedAt: new Date().toISOString(),
      };
      const packetJSON = JSON.stringify(packet);
      let sessionOK = false;
      let localOK = false;
      try {
        sessionStorage.setItem('rook_result', packetJSON);
        sessionOK = true;
      } catch (e) {
        console.warn('[rook-ui] sessionStorage write failed', e);
      }
      try {
        localStorage.setItem('rook_result', packetJSON);
        localStorage.setItem('rook_result_ts', String(Date.now()));
        localOK = true;
      } catch (e) {
        console.warn('[rook-ui] localStorage write failed', e);
      }
      console.log('[rook-ui] storage saved:', { sessionOK, localOK, leadId: data.leadId });

      // 給 storage flush 一點時間
      await new Promise((r) => setTimeout(r, 60));

      // 導向共用感謝頁（附上 leadId 作為第三層備援）
      const leadParam = data.leadId ? ('?lead=' + encodeURIComponent(data.leadId)) : '';
      window.location.href = '/streamer-test/thanks/' + leadParam;
    } catch (e) {
      console.error('[rook-ui] submit error', e);
      showFormError(e.message || '網路連線異常，請稍後再試。');
      setSubmitting(false);
      state.submitted = false;
    }
  }

  function validateForm(p) {
    if (!p.nickname) return '請填寫暱稱。';
    if (p.nickname.length > 20) return '暱稱長度不能超過 20 個字。';
    if (!p.lineId)   return '請填寫 LINE ID。';
    if (p.lineId.length > 40) return 'LINE ID 長度不能超過 40 個字。';
    if (!p.email)    return '請填寫 Email。';
    if (p.email.length > 80) return 'Email 長度不能超過 80 個字。';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) return '請填寫有效的 Email 地址。';

    // 選填欄位若有填則需在允許清單中
    if (p.ageRange && !ALLOWED_AGE_RANGES.includes(p.ageRange)) return '年齡區間選項無效。';
    if (p.identity && !ALLOWED_IDENTITIES.includes(p.identity)) return '身份選項無效。';

    if (!p.liveExperience) return '請選擇你的直播經驗。';
    if (!ALLOWED_EXPERIENCES.includes(p.liveExperience)) return '直播經驗選項無效。';

    if (!p.intentLevel) return '請選擇開始直播的意願強度。';
    if (!ALLOWED_INTENT.includes(p.intentLevel)) return '意願強度選項無效。';

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
    // 同時設 hidden 屬性 + inline display 樣式，避免 iOS Safari
    // 在 flex 容器內對 [hidden] 的忽略導致兩個狀態同時顯示。
    if (els.submitIdle) {
      els.submitIdle.hidden = isSubmitting;
      els.submitIdle.style.display = isSubmitting ? 'none' : '';
    }
    if (els.submitLoading) {
      els.submitLoading.hidden = !isSubmitting;
      els.submitLoading.style.display = !isSubmitting ? 'none' : '';
    }
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

    // 進入 quiz 頁 → 清除舊的結果快取
    try { sessionStorage.removeItem('rook_result'); } catch (_) {}
    try {
      localStorage.removeItem('rook_result');
      localStorage.removeItem('rook_result_ts');
    } catch (_) {}

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
