/* =====================================================================
 * streamer-test-result.js
 * 主播適配度測驗（5 分鐘深度版）結果頁 UI 邏輯
 *
 * 依賴：
 *   - Chart.js 4.x（CDN 引入，會提供 window.Chart）
 *   - sessionStorage 中的 stmt_result（由 quiz 頁寫入）
 *
 * 顯示邏輯：
 *   1. 讀 sessionStorage.stmt_result
 *   2. 沒有資料 → 顯示 empty state
 *   3. 有資料 → 依序填入 hero / 雷達 / 模組長條 / 優勢短板 / 風險 / 路徑 / 行動 / CTA
 * ===================================================================== */
(function () {
  'use strict';

  // 6 模組固定顯示順序（與 streamer-test-data.js 一致）
  const MODULE_META = [
    { key: 'camera_expression',    shortName: '鏡頭表達', icon: '🎥', color: '#FE2C55' },
    { key: 'audience_interaction', shortName: '互動經營', icon: '💬', color: '#25F4EE' },
    { key: 'emotional_regulation', shortName: '情緒穩定', icon: '🧠', color: '#FFB37A' },
    { key: 'self_discipline',      shortName: '自律執行', icon: '📅', color: '#7B68EE' },
    { key: 'content_creativity',   shortName: '內容延展', icon: '💡', color: '#00F0FF' },
    { key: 'boundary_control',     shortName: '邊界控管', icon: '🛡️', color: '#4ADE80' },
  ];
  const MODULE_BY_KEY = MODULE_META.reduce((acc, m) => (acc[m.key] = m, acc), {});

  const $ = (id) => document.getElementById(id);

  // ────────────────────────────────────────────────────────────
  // 1. 讀取結果 packet
  //    優先順序：sessionStorage → localStorage(<30 分鐘) → null
  //    iOS Safari 在頁面導向間有時會遺失 sessionStorage，
  //    因此 quiz 頁同時寫入 localStorage 作為 fallback。
  // ────────────────────────────────────────────────────────────
  function loadPacket() {
    // 1) 先試 sessionStorage
    let rawSession = null;
    try {
      rawSession = sessionStorage.getItem('stmt_result');
    } catch (e) {
      console.warn('[stmt-result] sessionStorage read failed', e);
    }
    if (rawSession) {
      try {
        const packet = JSON.parse(rawSession);
        if (packet && packet.result) {
          console.log('[stmt-result] loaded from sessionStorage');
          return packet;
        }
      } catch (e) {
        console.warn('[stmt-result] sessionStorage parse failed', e);
      }
    }

    // 2) 再試 localStorage（TTL 30 分鐘）
    let rawLocal = null;
    let tsLocal = null;
    try {
      rawLocal = localStorage.getItem('stmt_result');
      tsLocal = localStorage.getItem('stmt_result_ts');
    } catch (e) {
      console.warn('[stmt-result] localStorage read failed', e);
    }
    if (rawLocal) {
      try {
        const packet = JSON.parse(rawLocal);
        const ts = Number(tsLocal) || 0;
        const ageMs = Date.now() - ts;
        const THIRTY_MIN = 30 * 60 * 1000;
        if (packet && packet.result && ts > 0 && ageMs < THIRTY_MIN) {
          console.log('[stmt-result] loaded from localStorage (age ' + Math.round(ageMs / 1000) + 's)');
          // 補回 sessionStorage，方便同分頁重新整理時仍可讀取
          try { sessionStorage.setItem('stmt_result', rawLocal); } catch (_) {}
          return packet;
        } else if (packet && !ts) {
          // 沒時間戳但有資料 → 也允許（舊資料兼容）
          console.log('[stmt-result] loaded from localStorage (no ts)');
          return packet;
        } else if (ageMs >= THIRTY_MIN) {
          console.log('[stmt-result] localStorage data expired (age ' + Math.round(ageMs / 60000) + ' min)');
        }
      } catch (e) {
        console.warn('[stmt-result] localStorage parse failed', e);
      }
    }

    // 3) URL ?lead=X 標記：僅用於 debug log，不阻止顯示 empty state
    try {
      const params = new URLSearchParams(window.location.search);
      const leadId = params.get('lead');
      if (leadId) {
        console.log('[stmt-result] URL has lead=' + leadId + ' but no storage packet; showing empty state');
      }
    } catch (_) {}

    return null;
  }

  // ────────────────────────────────────────────────────────────
  // 2. Escape HTML
  // ────────────────────────────────────────────────────────────
  function esc(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  // ────────────────────────────────────────────────────────────
  // 3. 渲染 Hero (score / tier / profile / summary)
  // ────────────────────────────────────────────────────────────
  function renderHero(packet) {
    const { result, name, email } = packet;

    // 使用者稱謂
    const nameEl = $('stmtResultUserName');
    if (nameEl) nameEl.textContent = name || '你';

    // Score
    const scoreNum = document.querySelector('.stmt-result-score-num');
    if (scoreNum) animateNumber(scoreNum, 0, Math.round(result.totalScore), 900);

    // Tier
    const tierEl = $('stmtResultTier');
    if (tierEl && result.tier) {
      tierEl.textContent = result.tier.label;
      tierEl.setAttribute('data-tier', result.tier.key);
    }

    // Profile
    if (result.profile) {
      const profileNameEl = $('stmtResultProfileName');
      const profileTaglineEl = $('stmtResultProfileTagline');
      if (profileNameEl)    profileNameEl.textContent = result.profile.name || '- - -';
      if (profileTaglineEl) profileTaglineEl.textContent = result.profile.tagline || '';
    }

    // Summary
    const summaryEl = $('stmtResultSummary');
    if (summaryEl && result.summary) {
      summaryEl.textContent = result.summary;
    }

    // Lie warning
    const lieBox = $('stmtResultLieWarning');
    if (lieBox && result.lieCheck && result.lieCheck.triggered) {
      lieBox.hidden = false;
      const txtEl = lieBox.querySelector('.stmt-result-lie-text');
      if (txtEl) {
        txtEl.textContent = `你的誠實檢核平均為 ${result.lieCheck.avg}（門檻 ${result.lieCheck.threshold || 4.5}）— 部分回答可能過度理想化。若想更準確地評估自己，建議 2 週後回來再測一次。`;
      }
    }

    // Email notice
    const emailEl = $('stmtResultEmail');
    if (emailEl && email) emailEl.textContent = email;
  }

  // Animate integer counter 0→target
  function animateNumber(el, from, to, duration) {
    const start = performance.now();
    function step(now) {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      // ease-out
      const eased = 1 - Math.pow(1 - t, 3);
      const v = Math.round(from + (to - from) * eased);
      el.textContent = v;
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // ────────────────────────────────────────────────────────────
  // 4. 渲染雷達圖 (Chart.js)
  // ────────────────────────────────────────────────────────────
  function renderRadar(result) {
    if (!window.Chart) {
      console.warn('[stmt-result] Chart.js not loaded; skipping radar');
      return;
    }
    const canvas = document.getElementById('stmtRadarChart');
    if (!canvas) return;

    // moduleScores 每模組 0-100（percent）
    const labels = MODULE_META.map((m) => m.shortName);
    const dataPoints = MODULE_META.map((m) => {
      const raw = result.moduleScores && result.moduleScores[m.key];
      // 支援兩種格式：既可能是純 number，也可能是 { percent, raw, ... } 物件
      if (raw != null && typeof raw === 'object') {
        return Number(raw.percent != null ? raw.percent : (raw.score != null ? raw.score : 0));
      }
      return Number(raw || 0);
    });

    // 使用 Chart.js
    // eslint-disable-next-line no-undef
    new Chart(canvas, {
      type: 'radar',
      data: {
        labels,
        datasets: [{
          label: '你的能力',
          data: dataPoints,
          backgroundColor: 'rgba(254, 44, 85, 0.20)',
          borderColor: 'rgba(254, 44, 85, 1)',
          borderWidth: 2.5,
          pointBackgroundColor: MODULE_META.map((m) => m.color),
          pointBorderColor: '#fff',
          pointBorderWidth: 1.5,
          pointRadius: 5,
          pointHoverRadius: 7,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.label}: ${Math.round(ctx.parsed.r)} / 100`,
            },
          },
        },
        scales: {
          r: {
            min: 0,
            max: 100,
            beginAtZero: true,
            angleLines: { color: 'rgba(255,255,255,0.10)' },
            grid: { color: 'rgba(255,255,255,0.08)' },
            pointLabels: {
              color: '#F5F5F7',
              font: { size: 13, family: 'Noto Sans TC, sans-serif', weight: '600' },
            },
            ticks: {
              stepSize: 20,
              color: 'rgba(255,255,255,0.35)',
              backdropColor: 'transparent',
              font: { size: 10 },
            },
          },
        },
      },
    });
  }

  // ────────────────────────────────────────────────────────────
  // 5. 渲染模組長條
  // ────────────────────────────────────────────────────────────
  function renderModuleBars(result) {
    const wrap = $('stmtModuleBars');
    if (!wrap) return;

    const html = MODULE_META.map((m) => {
      const raw = result.moduleScores && result.moduleScores[m.key];
      const percent = raw != null && typeof raw === 'object'
        ? Number(raw.percent != null ? raw.percent : (raw.score != null ? raw.score : 0))
        : Number(raw || 0);
      const rounded = Math.round(percent);
      return `
        <div class="stmt-module-bar-item" style="--module-color:${m.color}">
          <div class="stmt-module-bar-header">
            <div class="stmt-module-bar-name">
              <span class="stmt-module-bar-icon">${m.icon}</span>${esc(m.shortName)}
            </div>
            <div class="stmt-module-bar-score">${rounded} / 100</div>
          </div>
          <div class="stmt-module-bar-track">
            <div class="stmt-module-bar-fill" style="width: 0%" data-target="${rounded}"></div>
          </div>
        </div>
      `;
    }).join('');
    wrap.innerHTML = html;

    // Animate fills
    requestAnimationFrame(() => {
      wrap.querySelectorAll('.stmt-module-bar-fill').forEach((el) => {
        const target = Number(el.dataset.target) || 0;
        el.style.width = target + '%';
      });
    });
  }

  // ────────────────────────────────────────────────────────────
  // 6. 優勢 / 短板
  // ────────────────────────────────────────────────────────────
  function renderStrengthsWeaknesses(result) {
    const strengthsEl = $('stmtStrengthsList');
    const weaknessEl = $('stmtWeaknessList');

    if (strengthsEl && Array.isArray(result.strengths)) {
      strengthsEl.innerHTML = result.strengths.map((s) => {
        const m = MODULE_BY_KEY[s.key] || {};
        const advice = s.advice || s.strengthAdvice || `這是你目前最亮眼的能力，建議把它當成主打賣點。`;
        return `
          <div class="stmt-sw-item">
            <div class="stmt-sw-item-head">
              <div class="stmt-sw-name">${esc(m.icon || '')} ${esc(s.shortName || s.name || s.key)}</div>
              <div class="stmt-sw-score">${Math.round(s.percent || 0)}</div>
            </div>
            <div class="stmt-sw-advice">${esc(advice)}</div>
          </div>
        `;
      }).join('');
    }

    if (weaknessEl && Array.isArray(result.weaknesses)) {
      weaknessEl.innerHTML = result.weaknesses.map((w) => {
        const m = MODULE_BY_KEY[w.key] || {};
        const advice = w.advice || w.weakAdvice || `這塊比較弱，會直接限制你能走多遠，請優先補強。`;
        return `
          <div class="stmt-sw-item">
            <div class="stmt-sw-item-head">
              <div class="stmt-sw-name">${esc(m.icon || '')} ${esc(w.shortName || w.name || w.key)}</div>
              <div class="stmt-sw-score">${Math.round(w.percent || 0)}</div>
            </div>
            <div class="stmt-sw-advice">${esc(advice)}</div>
          </div>
        `;
      }).join('');
    }
  }

  // ────────────────────────────────────────────────────────────
  // 7. 風險
  // ────────────────────────────────────────────────────────────
  function renderRisks(result) {
    const section = $('stmtRiskSection');
    const title = $('stmtRiskTitle');
    const list = $('stmtRiskList');
    if (!list) return;

    const risks = Array.isArray(result.riskFlags) ? result.riskFlags : [];

    if (risks.length === 0) {
      if (title) title.textContent = '🎉 沒有觸發任何風險 flag';
      list.innerHTML = `
        <div class="stmt-risk-item stmt-risk-none">
          <div class="stmt-risk-item-head">
            <span class="stmt-risk-icon">✅</span>
            <span class="stmt-risk-title">整體風險可控</span>
          </div>
          <p class="stmt-risk-desc">你的 6 大模組都在安全區間，沒有預期會出現的紅色警告。這對長線經營來說是很棒的基礎。</p>
        </div>
      `;
      return;
    }

    if (title) title.textContent = `⚠️ 觸發 ${risks.length} 個風險 flag`;
    list.innerHTML = risks.map((r) => `
      <div class="stmt-risk-item">
        <div class="stmt-risk-item-head">
          <span class="stmt-risk-icon">⚠️</span>
          <span class="stmt-risk-title">${esc(r.name || r.key)}</span>
        </div>
        <p class="stmt-risk-desc">${esc(r.advice || r.description || '請留意此項風險。')}</p>
      </div>
    `).join('');
  }

  // ────────────────────────────────────────────────────────────
  // 8. 推薦 / 避開路徑
  // ────────────────────────────────────────────────────────────
  function renderPaths(result) {
    const recEl = $('stmtRecommendPaths');
    const avoidEl = $('stmtAvoidPaths');

    if (recEl) {
      const recs = Array.isArray(result.recommendedPaths) ? result.recommendedPaths : [];
      recEl.innerHTML = recs.length
        ? recs.map((p) => `<li>${esc(p)}</li>`).join('')
        : '<li>依你的分型還在整理，我們的顧問會在報告信件中補上完整建議。</li>';
    }
    if (avoidEl) {
      const avoids = Array.isArray(result.avoidPaths) ? result.avoidPaths : [];
      avoidEl.innerHTML = avoids.length
        ? avoids.map((p) => `<li>${esc(p)}</li>`).join('')
        : '<li>暫無明確要避開的方向，代表你可以嘗試較廣的內容路線。</li>';
    }
  }

  // ────────────────────────────────────────────────────────────
  // 9. 4 週行動清單
  // ────────────────────────────────────────────────────────────
  function renderActions(result) {
    const wrap = $('stmtActionList');
    if (!wrap) return;
    const items = Array.isArray(result.actionItems) ? result.actionItems : [];

    if (items.length === 0) {
      wrap.innerHTML = `<div class="stmt-action-item"><div class="stmt-action-num">✓</div><div class="stmt-action-body"><h4>你目前的能力已相當均衡</h4><p>建議直接與經紀人討論客製化的行動方案。</p></div></div>`;
      return;
    }

    wrap.innerHTML = items.map((a, i) => {
      const m = MODULE_BY_KEY[a.module] || {};
      return `
        <div class="stmt-action-item" style="--module-color:${m.color || '#FE2C55'}">
          <div class="stmt-action-num">${i + 1}</div>
          <div class="stmt-action-body">
            <h4>
              ${esc(a.action ? a.action.split('。')[0] || '本週行動' : '本週行動')}
              <span class="stmt-action-module">${esc(m.icon || '')} ${esc(a.moduleName || m.shortName || a.module)}</span>
            </h4>
            <p>${esc(a.action || '')}</p>
          </div>
        </div>
      `;
    }).join('');
  }

  // ────────────────────────────────────────────────────────────
  // 10. CTA (依分型分流)
  // ────────────────────────────────────────────────────────────
  function renderCTA(packet) {
    const cta = packet.cta || {
      label: '和經紀人聊聊',
      url: 'https://line.me/R/ti/p/@354ykfbp',
      sub: '掃 LINE，我們用 15 分鐘替你排出下一步',
    };
    const btn = $('stmtResultCtaBtn');
    const labelEl = $('stmtResultCtaLabel');
    const subEl = $('stmtResultCtaSub');

    if (btn) btn.href = cta.url;
    if (labelEl) labelEl.textContent = cta.label || '和經紀人聊聊';
    if (subEl) subEl.textContent = cta.sub || '';
  }

  // ────────────────────────────────────────────────────────────
  // 11. 分享按鈕
  // ────────────────────────────────────────────────────────────
  function setupShare() {
    const btn = $('stmtBtnShare');
    if (!btn) return;
    btn.addEventListener('click', async () => {
      const shareData = {
        title: '主播適配度測驗｜JDI 脈動傳媒',
        text: '我剛做完主播適配度測驗，5 分鐘看看你適合當主播嗎！',
        url: 'https://jdi-pulse.com/streamer-test/',
      };
      if (navigator.share) {
        try {
          await navigator.share(shareData);
        } catch (e) {
          // 使用者取消，安靜處理
        }
      } else {
        // Fallback: copy URL
        try {
          await navigator.clipboard.writeText(shareData.url);
          const origHTML = btn.innerHTML;
          btn.innerHTML = '✓ 連結已複製';
          setTimeout(() => { btn.innerHTML = origHTML; }, 2000);
        } catch (e) {
          window.prompt('複製這個連結分享給朋友：', shareData.url);
        }
      }
    });
  }

  // ────────────────────────────────────────────────────────────
  // 12. 初始化
  // ────────────────────────────────────────────────────────────
  function init() {
    const emptyEl = $('stmtResultEmpty');
    const wrapEl = $('stmtResultWrap');

    const packet = loadPacket();

    if (!packet) {
      if (emptyEl) emptyEl.hidden = false;
      if (wrapEl) wrapEl.hidden = true;
      return;
    }

    // 顯示主內容
    if (emptyEl) emptyEl.hidden = true;
    if (wrapEl) wrapEl.hidden = false;

    const result = packet.result;

    renderHero(packet);
    renderRadar(result);
    renderModuleBars(result);
    renderStrengthsWeaknesses(result);
    renderRisks(result);
    renderPaths(result);
    renderActions(result);
    renderCTA(packet);
    setupShare();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
