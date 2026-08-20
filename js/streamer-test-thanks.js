/* =====================================================================
 * streamer-test-thanks.js
 * 主播適配度測驗 — 感謝頁邏輯（提交成功後導向）
 *
 * 顯示邏輯：
 *   1. 主要文字（大字感謝 + 「請至 Email 查看」）→ 一律顯示，即使沒有 storage
 *   2. 送出資訊摘要卡（打碼 email + Lead ID）→ 有讀到 storage 才顯示
 *   3. 讀取順序：sessionStorage → localStorage → URL ?lead=X → 不顯示卡片
 *
 * 讀到 storage / URL 資訊後，會把使用者姓名帶入副標，讓體驗更個人化。
 * ===================================================================== */
(function () {
  'use strict';

  // ────────────────────────────────────────────────────────────
  // 1. 讀取 packet（同 result 頁的多層 fallback 邏輯）
  // ────────────────────────────────────────────────────────────
  function loadPacket() {
    // (a) sessionStorage
    try {
      const raw = sessionStorage.getItem('stmt_result');
      if (raw) {
        const packet = JSON.parse(raw);
        if (packet && packet.leadId) {
          console.log('[stmt-thanks] loaded from sessionStorage');
          return packet;
        }
      }
    } catch (e) {
      console.warn('[stmt-thanks] sessionStorage read failed', e);
    }

    // (b) localStorage (TTL 30 分鐘)
    try {
      const raw = localStorage.getItem('stmt_result');
      const ts = Number(localStorage.getItem('stmt_result_ts') || 0);
      if (raw) {
        const packet = JSON.parse(raw);
        const ageMs = Date.now() - ts;
        const THIRTY_MIN = 30 * 60 * 1000;
        if (packet && packet.leadId && (ts === 0 || ageMs < THIRTY_MIN)) {
          console.log('[stmt-thanks] loaded from localStorage');
          return packet;
        }
      }
    } catch (e) {
      console.warn('[stmt-thanks] localStorage read failed', e);
    }

    // (c) URL ?lead=X（最後 fallback，僅有 leadId）
    try {
      const params = new URLSearchParams(window.location.search);
      const leadId = params.get('lead');
      if (leadId) {
        console.log('[stmt-thanks] loaded from URL param, leadId=' + leadId);
        return { leadId: leadId };
      }
    } catch (_) {}

    return null;
  }

  // ────────────────────────────────────────────────────────────
  // 2. 打碼 Email：a****z@gmail.com
  //    保留首字 + 末字 + @後全部；中間統一換成 4 個 *
  // ────────────────────────────────────────────────────────────
  function maskEmail(email) {
    if (!email || typeof email !== 'string') return '';
    const at = email.indexOf('@');
    if (at < 1) return email;
    const local = email.slice(0, at);
    const domain = email.slice(at);
    if (local.length <= 2) {
      return local[0] + '***' + domain;
    }
    return local[0] + '****' + local[local.length - 1] + domain;
  }

  // ────────────────────────────────────────────────────────────
  // 3. 更新畫面
  // ────────────────────────────────────────────────────────────
  function updateUI(packet) {
    if (!packet) return;

    // 副標：如果有姓名，加上稱謂
    if (packet.name) {
      const subtitle = document.getElementById('stmtThanksSubtitle');
      if (subtitle) {
        // 只在 name 不為空且不是預設值時個人化
        const cleanName = String(packet.name).trim();
        if (cleanName) {
          subtitle.innerHTML = `<strong style="color:#25F4EE;">${escapeHTML(cleanName)}</strong>，你的完整分析報告已寄到信箱，請至 Email 查看。`;
        }
      }
    }

    // 送出資訊卡：至少要有 leadId 才顯示（有時只有 URL leadId）
    const hasEmail = !!packet.email;
    const hasLead = !!packet.leadId;
    if (!hasEmail && !hasLead) return;

    const infoCard = document.getElementById('stmtThanksInfo');
    if (!infoCard) return;

    // 填 email（打碼）
    const emailEl = document.getElementById('stmtThanksEmail');
    if (emailEl) {
      if (hasEmail) {
        emailEl.textContent = maskEmail(packet.email);
      } else {
        // 沒 email 就顯示提示
        emailEl.textContent = '請至你剛才填寫的 Email 收信';
      }
    }

    // 填 Lead ID
    const leadEl = document.getElementById('stmtThanksLeadId');
    if (leadEl) {
      leadEl.textContent = hasLead ? ('#' + packet.leadId) : '—';
    }

    // 顯示卡片
    infoCard.hidden = false;
  }

  // ────────────────────────────────────────────────────────────
  // 4. Utils
  // ────────────────────────────────────────────────────────────
  function escapeHTML(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  // ────────────────────────────────────────────────────────────
  // 5. 初始化
  // ────────────────────────────────────────────────────────────
  function init() {
    const packet = loadPacket();
    updateUI(packet);

    // 使用者已經看到感謝頁 = 流程真的完成，把 storage 清掉避免同瀏覽器
    // 之後又進 quiz 頁時被舊資料污染（quiz 頁 init 也有清但雙重保險）
    // 延遲 5 秒清，讓感謝頁上的 email/leadId 資訊維持顯示
    setTimeout(() => {
      try {
        sessionStorage.removeItem('stmt_result');
        localStorage.removeItem('stmt_result');
        localStorage.removeItem('stmt_result_ts');
        console.log('[stmt-thanks] cleared storage packet');
      } catch (_) {}
    }, 5000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
