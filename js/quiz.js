/**
 * ============================================================
 * JDI 脈動傳媒 · 主播類型測驗 · UI 邏輯層
 * 支援：Modal 彈窗（首頁）+ 獨立分頁 /quiz
 * ============================================================
 */

(function(){
  'use strict';

  // ========== CONFIG ==========
  const STORAGE_KEY_SHOWN = 'jdi_quiz_modal_shown_v1';
  const STORAGE_KEY_STATE = 'jdi_quiz_state_v1';
  const AUTO_OPEN_DELAY = 3000;  // 3 秒後彈窗
  const API_ENDPOINT = '/api/quiz-submit';

  // ========== STATE ==========
  let currentStep = 'intro';  // intro | quiz | form | success
  let currentQuestion = 0;
  let answers = [];
  let result = null;
  let mode = 'modal';  // modal | page

  // ========== DOM ==========
  const $ = s => document.querySelector(s);
  const overlay = $('#quizOverlay');
  const container = $('#quizContainer');
  if (!overlay || !container) return;
  mode = container.dataset.mode || 'modal';

  // ========== AUTO OPEN LOGIC ==========
  if (mode === 'modal') {
    // 只在首次進站觸發
    const alreadyShown = sessionStorage.getItem(STORAGE_KEY_SHOWN);
    if (!alreadyShown) {
      setTimeout(() => {
        openQuiz();
        sessionStorage.setItem(STORAGE_KEY_SHOWN, '1');
      }, AUTO_OPEN_DELAY);
    }
    // 導覽列的觸發按鈕
    document.querySelectorAll('[data-open-quiz]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        openQuiz();
      });
    });
  } else {
    // 獨立分頁：直接開啟
    openQuiz(true);
  }

  // ========== OPEN / CLOSE ==========
  function openQuiz(isPageMode) {
    overlay.classList.add('is-open');
    if (!isPageMode) {
      document.body.style.overflow = 'hidden';
    }
    if (currentStep === 'intro') {
      renderIntro();
    }
  }

  function closeQuiz() {
    if (mode === 'page') return;  // 頁面模式不能關
    overlay.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  // 關閉按鈕
  overlay.addEventListener('click', e => {
    if (e.target === overlay || e.target.dataset.close === '1') {
      closeQuiz();
    }
  });

  // ESC 關閉
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlay.classList.contains('is-open') && mode === 'modal') {
      closeQuiz();
    }
  });

  // ========== RENDER: INTRO ==========
  function renderIntro() {
    currentStep = 'intro';
    container.innerHTML = `
      ${mode === 'modal' ? '<button class="quiz-close" data-close="1" aria-label="關閉">✕</button>' : ''}
      <div class="quiz-intro">
        <div class="quiz-intro-tag">
          <span class="quiz-tag-dot"></span>
          <span>NEWCOMER · QUIZ · 1 分鐘測驗</span>
        </div>
        <div class="quiz-intro-emojis">
          <span>🎤</span><span>💃</span><span>💬</span>
          <span>⚔️</span><span>🎨</span><span>🎪</span>
        </div>
        <h2 class="quiz-intro-title">
          你適合<br />
          <span class="grad">哪一種主播路線？</span>
        </h2>
        <p class="quiz-intro-sub">
          花 1 分鐘做 6 題選擇，我們的 AI 分析會告訴你：<br />
          <strong>你屬於哪一種主播類型、收入潛力、最適合的開播時段</strong>
        </p>
        <div class="quiz-intro-features">
          <div class="quiz-feature">
            <span class="quiz-feature-icon">✨</span>
            <span>6 大主播類型精準分析</span>
          </div>
          <div class="quiz-feature">
            <span class="quiz-feature-icon">📊</span>
            <span>完整報告寄到你的信箱</span>
          </div>
          <div class="quiz-feature">
            <span class="quiz-feature-icon">🎁</span>
            <span>100% 免費 · 立即取得</span>
          </div>
        </div>
        <button class="quiz-btn quiz-btn-primary" id="quizStartBtn">
          <span>開始測驗</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>
        ${mode === 'modal' ? '<button class="quiz-btn-ghost" data-close="1">下次再說</button>' : ''}
      </div>
    `;
    $('#quizStartBtn').addEventListener('click', () => {
      answers = [];
      currentQuestion = 0;
      renderQuestion();
    });
  }

  // ========== RENDER: QUESTION ==========
  function renderQuestion() {
    currentStep = 'quiz';
    const q = window.QUIZ_QUESTIONS[currentQuestion];
    const progress = ((currentQuestion + 1) / window.QUIZ_QUESTIONS.length) * 100;

    container.innerHTML = `
      ${mode === 'modal' ? '<button class="quiz-close" data-close="1" aria-label="關閉">✕</button>' : ''}
      <div class="quiz-question">
        <div class="quiz-progress-wrap">
          <div class="quiz-progress-meta">
            <span class="quiz-progress-num">${currentQuestion + 1} / ${window.QUIZ_QUESTIONS.length}</span>
            <span class="quiz-progress-pct">${Math.round(progress)}%</span>
          </div>
          <div class="quiz-progress-bar">
            <div class="quiz-progress-fill" style="width:${progress}%"></div>
          </div>
        </div>

        <div class="quiz-q-icon">${q.icon}</div>
        <h3 class="quiz-q-title">${q.q}</h3>

        <div class="quiz-options">
          ${q.options.map((opt, idx) => `
            <button class="quiz-option" data-idx="${idx}">
              <span class="quiz-option-emoji">${opt.emoji}</span>
              <span class="quiz-option-text">${opt.text}</span>
              <span class="quiz-option-arrow">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </span>
            </button>
          `).join('')}
        </div>

        ${currentQuestion > 0 ? `
          <button class="quiz-back-btn" id="quizBackBtn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            <span>回上一題</span>
          </button>
        ` : ''}
      </div>
    `;

    // 選項點擊
    container.querySelectorAll('.quiz-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx, 10);
        answers[currentQuestion] = { questionIdx: currentQuestion, optionIdx: idx };

        // 動畫效果
        btn.classList.add('is-selected');
        setTimeout(() => {
          if (currentQuestion < window.QUIZ_QUESTIONS.length - 1) {
            currentQuestion++;
            renderQuestion();
            // 滾到頂部（獨立分頁模式）
            if (mode === 'page') window.scrollTo({ top: 0, behavior: 'smooth' });
          } else {
            // 完成測驗 → 計算結果 → 進入表單
            result = window.calculateQuizResult(answers);
            renderForm();
          }
        }, 250);
      });
    });

    // 上一題
    const backBtn = $('#quizBackBtn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        currentQuestion--;
        renderQuestion();
      });
    }
  }

  // ========== RENDER: FORM (LEAD CAPTURE) ==========
  function renderForm() {
    currentStep = 'form';
    const t = result.typeData;

    container.innerHTML = `
      ${mode === 'modal' ? '<button class="quiz-close" data-close="1" aria-label="關閉">✕</button>' : ''}
      <div class="quiz-form-step">
        <div class="quiz-preview-card" style="--type-grad:${t.gradient}">
          <div class="quiz-preview-inner">
            <div class="quiz-preview-tag">✅ 你的測驗已完成</div>
            <div class="quiz-preview-emoji">${t.emoji}</div>
            <div class="quiz-preview-label">你的主播類型是</div>
            <h3 class="quiz-preview-type">${t.name}</h3>
            <p class="quiz-preview-tagline">「${t.tagline}」</p>
            <div class="quiz-preview-blur">
              <div class="quiz-preview-blur-inner">
                <div class="quiz-blur-item">💡 個人優勢分析（3 項）</div>
                <div class="quiz-blur-item">📊 收入潛力評分</div>
                <div class="quiz-blur-item">🕐 建議黃金開播時段</div>
                <div class="quiz-blur-item">🎯 專業成長建議</div>
                <div class="quiz-blur-item">⭐ 類似頂級主播對照</div>
              </div>
              <div class="quiz-preview-lock">
                <div class="quiz-lock-icon">🔒</div>
                <div class="quiz-lock-text">填寫下方資料即可解鎖完整報告</div>
              </div>
            </div>
          </div>
        </div>

        <form class="quiz-form" id="quizForm" novalidate>
          <div class="quiz-form-header">
            <h4>📩 領取完整分析報告</h4>
            <p>我們會將完整報告寄到你的信箱，並由專屬經紀顧問聯繫你</p>
          </div>

          <div class="quiz-field">
            <label>姓名 / 暱稱 <span class="req">*</span></label>
            <input type="text" name="name" id="qName" placeholder="請輸入你的姓名或暱稱" required maxlength="30" />
          </div>

          <div class="quiz-field">
            <label>Email <span class="req">*</span></label>
            <input type="email" name="email" id="qEmail" placeholder="用來接收完整分析報告" required maxlength="80" />
          </div>

          <div class="quiz-field">
            <label>LINE ID <span class="req">*</span></label>
            <input type="text" name="lineId" id="qLineId" placeholder="經紀顧問將透過 LINE 聯繫你" required maxlength="40" />
          </div>

          <label class="quiz-checkbox">
            <input type="checkbox" id="qConsent" required />
            <span class="quiz-checkbox-mark"></span>
            <span class="quiz-checkbox-text">
              我同意 JDI 脈動傳媒蒐集我的個人資料用於招募聯繫、寄送直播主資訊，並了解相關<a href="#" data-open-privacy>隱私條款</a>
            </span>
          </label>

          <div class="quiz-form-error" id="quizFormError"></div>

          <button type="submit" class="quiz-btn quiz-btn-primary" id="quizSubmitBtn">
            <span class="quiz-btn-label">解鎖完整報告 · 送出</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>

          <p class="quiz-form-note">
            🔒 你的資料僅用於招募聯繫，我們絕不外洩給第三方
          </p>
        </form>
      </div>
    `;

    // Primary path: form submit event (works with Enter key too)
    $('#quizForm').addEventListener('submit', handleSubmit);
    // Fallback: direct button click — iOS Safari occasionally fails to fire
    // 'submit' when the form has a hidden/absolutely-positioned checkbox.
    // Guard against double-fire by tracking in-flight state on the button.
    const submitBtn = $('#quizSubmitBtn');
    if (submitBtn) {
      submitBtn.addEventListener('click', function(e){
        // If the browser is going to fire 'submit' anyway (native form), let it.
        // We only run our handler when submit didn't fire within 50ms.
        if (submitBtn.dataset.submitting === '1') return;
        setTimeout(() => {
          if (submitBtn.dataset.submitting !== '1') {
            handleSubmit(e);
          }
        }, 50);
      });
    }
    document.querySelectorAll('[data-open-privacy]').forEach(a => {
      a.addEventListener('click', e => {
        e.preventDefault();
        alert('隱私條款：\n\n1. 蒐集目的：直播主招募聯繫、寄送 JDI 脈動傳媒相關資訊\n2. 蒐集項目：姓名、Email、LINE ID\n3. 保存期間：至你要求刪除為止\n4. 你的權利：可隨時要求查詢、修改、刪除你的資料\n5. 聯絡方式：pulsepop9@gmail.com\n\n(如需詳細條款請透過 LINE 洽詢)');
      });
    });
  }

  // ========== FORM SUBMIT ==========
  async function handleSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    const btn = $('#quizSubmitBtn');
    const err = $('#quizFormError');
    // Mark in-flight so the button-click fallback doesn't double-fire
    if (btn) {
      if (btn.dataset.submitting === '1') return;
      btn.dataset.submitting = '1';
    }
    err.textContent = '';

    const name    = $('#qName').value.trim();
    const email   = $('#qEmail').value.trim();
    const lineId  = $('#qLineId').value.trim();
    const consent = $('#qConsent').checked;

    if (!name)    { err.textContent = '⚠️ 請輸入姓名'; return; }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      err.textContent = '⚠️ 請輸入正確的 Email 格式'; return;
    }
    if (!lineId)  { err.textContent = '⚠️ 請輸入你的 LINE ID'; return; }
    if (!consent) { err.textContent = '⚠️ 請勾選同意條款'; return; }

    btn.disabled = true;
    btn.querySelector('.quiz-btn-label').textContent = '送出中…';

    try {
      const payload = {
        name, email, lineId,
        type: result.type,
        typeName: result.typeData.name,
        scores: result.scores,
        answers: answers.map(a => ({
          q: window.QUIZ_QUESTIONS[a.questionIdx].q,
          a: window.QUIZ_QUESTIONS[a.questionIdx].options[a.optionIdx].text
        })),
        source: mode === 'page' ? 'quiz-page' : 'homepage-modal',
        ua: navigator.userAgent.slice(0, 200),
        ts: new Date().toISOString()
      };

      const resp = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      let data = {};
      try { data = await resp.json(); } catch(_) {}

      if (!resp.ok) {
        throw new Error(data.error || `HTTP ${resp.status}`);
      }

      // 成功 → 顯示結果頁
      renderSuccess(email);
    } catch (ex) {
      console.error('[quiz] submit failed:', ex);
      // 即使 API 掛了，也讓使用者看到完整結果（fallback UX）
      err.innerHTML = '⚠️ 送出時遇到網路問題，我們已為你顯示完整結果。<br />請截圖並透過 LINE @354ykfbp 聯繫我們，感謝！';
      setTimeout(() => renderSuccess(email, true), 2000);
    } finally {
      btn.disabled = false;
      if (btn) delete btn.dataset.submitting;
    }
  }

  // ========== RENDER: SUCCESS + FULL REPORT ==========
  function renderSuccess(email, isFallback) {
    currentStep = 'success';
    const t = result.typeData;
    const stars = '★'.repeat(t.incomeStars) + '☆'.repeat(5 - t.incomeStars);

    container.innerHTML = `
      ${mode === 'modal' ? '<button class="quiz-close" data-close="1" aria-label="關閉">✕</button>' : ''}
      <div class="quiz-result">
        ${!isFallback ? `
          <div class="quiz-result-toast">
            ✅ <strong>報告已寄至 ${email}</strong> · 請查收信箱（可能在垃圾郵件夾）
          </div>
        ` : ''}

        <div class="quiz-result-hero" style="--type-grad:${t.gradient}">
          <div class="quiz-result-emoji">${t.emoji}</div>
          <div class="quiz-result-label">你的主播類型是</div>
          <h2 class="quiz-result-type">${t.name}</h2>
          <div class="quiz-result-tagline">「${t.tagline}」</div>
        </div>

        <div class="quiz-result-desc">${t.description}</div>

        <div class="quiz-result-section">
          <div class="quiz-result-section-title">
            <span class="quiz-section-icon">💎</span>
            <span>你的個人優勢</span>
          </div>
          <ul class="quiz-strengths">
            ${t.strengths.map(s => `<li><span class="quiz-strength-check">✅</span>${s}</li>`).join('')}
          </ul>
        </div>

        <div class="quiz-result-grid">
          <div class="quiz-result-stat">
            <div class="quiz-stat-label">收入潛力</div>
            <div class="quiz-stat-value quiz-stat-stars">${stars}</div>
          </div>
          <div class="quiz-result-stat">
            <div class="quiz-stat-label">建議開播時段</div>
            <div class="quiz-stat-value">${t.bestTime}</div>
          </div>
        </div>

        <div class="quiz-result-tip">
          <div class="quiz-tip-title">🎯 專屬成長建議</div>
          <div class="quiz-tip-content">${t.tips}</div>
        </div>

        <div class="quiz-result-similar">
          <div class="quiz-similar-label">⭐ 類似頂級主播</div>
          <div class="quiz-similar-value">${t.similarStreamer}</div>
        </div>

        <div class="quiz-cta">
          <a href="https://line.me/R/ti/p/@354ykfbp" target="_blank" rel="noopener" class="quiz-btn quiz-btn-line">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 5.94 2 10.8c0 3.14 1.94 5.91 4.87 7.53-.14.57-.63 2.46-.68 2.68-.07.29.11.28.23.21.09-.06 1.47-.99 2.11-1.42.8.12 1.62.18 2.47.18 5.52 0 10-3.94 10-8.8S17.52 2 12 2z"/></svg>
            <span>LINE 聯繫顧問</span>
          </a>
          <a href="/partnership" class="quiz-btn quiz-btn-primary">
            <span>看完整合作方案</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </a>
        </div>

        <button class="quiz-restart" id="quizRestartBtn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"/></svg>
          <span>重新測驗</span>
        </button>
      </div>
    `;

    $('#quizRestartBtn').addEventListener('click', () => {
      answers = [];
      currentQuestion = 0;
      result = null;
      renderIntro();
    });

    // 滾到頂部
    setTimeout(() => {
      if (mode === 'page') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        container.scrollTop = 0;
      }
    }, 100);
  }

})();
