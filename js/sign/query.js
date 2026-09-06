/**
 * ============================================================
 * JDI Sign · Query Page
 * ============================================================
 */
(function() {
  'use strict';

  const form = document.getElementById('queryForm');
  const btn = document.getElementById('queryBtn');
  const btnText = document.getElementById('queryBtnText');
  const resultCard = document.getElementById('resultCard');
  const resultContent = document.getElementById('resultContent');

  // 純數字
  document.getElementById('phone_last4').addEventListener('input', function() {
    this.value = this.value.replace(/\D/g, '').slice(0, 4);
  });
  document.getElementById('id_last4').addEventListener('input', function() {
    this.value = this.value.replace(/\D/g, '').slice(0, 4);
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const phone = form.phone_last4.value.trim();
    const id = form.id_last4.value.trim();
    let hasErr = false;
    if (!/^\d{4}$/.test(phone)) {
      document.getElementById('err-phone_last4').textContent = '請填 4 位數字';
      document.getElementById('err-phone_last4').classList.add('show');
      hasErr = true;
    }
    if (!/^\d{4}$/.test(id)) {
      document.getElementById('err-id_last4').textContent = '請填 4 位數字';
      document.getElementById('err-id_last4').classList.add('show');
      hasErr = true;
    }
    if (hasErr) return;

    btn.disabled = true;
    btnText.textContent = '查詢中...';

    try {
      const res = await fetch('/api/sign/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_last4: phone, id_last4: id }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);

      renderResults(data.contracts || []);
    } catch (err) {
      resultContent.innerHTML = `<div class="sign-alert sign-alert-danger">⚠️ ${err.message}</div>`;
      resultCard.style.display = 'block';
    } finally {
      btn.disabled = false;
      btnText.textContent = '查詢合約 →';
    }
  });

  const STATUS_INFO = {
    pending:    { label: '⏳ 待審核', color: 'var(--sign-warning)', bg: 'rgba(245,158,11,0.1)', desc: 'JDI 甲方負責人審核中，通常 3 個工作天內完成' },
    approved:   { label: '✓ 已核准', color: 'var(--sign-success)', bg: 'rgba(34,197,94,0.1)', desc: '合約已核准生效，運營經紀會主動聯繫' },
    rejected:   { label: '↩️ 已退回', color: 'var(--sign-danger)', bg: 'rgba(239,68,68,0.1)', desc: '合約需補件，請重新簽約' },
    expired:    { label: '⌛ 已到期', color: 'var(--sign-text-mute)', bg: 'rgba(113,113,122,0.1)', desc: '合約已自然到期' },
    terminated: { label: '⛔ 已終止', color: 'var(--sign-danger)', bg: 'rgba(239,68,68,0.1)', desc: '合約已提前終止' },
  };

  function fmtDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('zh-TW', {
      year: 'numeric', month: '2-digit', day: '2-digit',
    });
  }

  function renderResults(contracts) {
    if (contracts.length === 0) {
      resultContent.innerHTML = `
        <div class="sign-card" style="text-align: center;">
          <div style="font-size: 40px; margin-bottom: 12px;">🔍</div>
          <h3 style="color: #fff; margin: 0 0 8px;">沒有找到相符的合約</h3>
          <p style="color: var(--sign-text-dim); font-size: 14px; line-height: 1.7;">
            請確認手機末 4 碼與身分證末 4 碼是否正確。<br />
            若您尚未簽過約，可 <a href="/sign/" style="color: var(--sign-accent);">開始線上簽約</a>。
          </p>
        </div>`;
      resultCard.style.display = 'block';
      return;
    }

    let html = `<h2 style="color: #fff; font-size: 20px; margin: 8px 0 16px;">📋 您的合約（${contracts.length} 筆）</h2>`;

    const phoneLast4 = document.getElementById('phone_last4').value.trim();
    const idLast4 = document.getElementById('id_last4').value.trim();

    for (const c of contracts) {
      const s = STATUS_INFO[c.status] || STATUS_INFO.pending;
      const viewUrl = `/sign/contract-view/?no=${encodeURIComponent(c.contract_no)}&phone_last4=${phoneLast4}&id_last4=${idLast4}`;
      html += `
        <div class="sign-card" style="border-left: 3px solid ${s.color};">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; gap: 12px; flex-wrap: wrap;">
            <div>
              <div style="font-size: 11px; color: var(--sign-text-mute); letter-spacing: 1.5px; margin-bottom: 4px;">合約編號</div>
              <div style="font-size: 18px; font-weight: 900; color: #fff; font-family: monospace;">${c.contract_no}</div>
            </div>
            <div style="padding: 6px 14px; border-radius: 999px; background: ${s.bg}; color: ${s.color}; font-size: 13px; font-weight: 700; white-space: nowrap;">
              ${s.label}
            </div>
          </div>

          <div style="background: ${s.bg}; padding: 10px 14px; border-radius: 8px; font-size: 13px; color: ${s.color}; margin-bottom: 16px; line-height: 1.6;">
            ${s.desc}
          </div>

          <table style="width: 100%; font-size: 13px; color: var(--sign-text-dim); line-height: 1.8;">
            <tr><td style="color: var(--sign-text-mute); width: 100px;">直播主</td><td style="color: var(--sign-text); font-weight: 600;">${c.real_name} · ${c.stage_name}</td></tr>
            <tr><td style="color: var(--sign-text-mute);">合約年限</td><td>${c.contract_years} 年</td></tr>
            <tr><td style="color: var(--sign-text-mute);">生效日</td><td>${fmtDate(c.contract_start_date)}</td></tr>
            <tr><td style="color: var(--sign-text-mute);">到期日</td><td>${fmtDate(c.contract_end_date)}</td></tr>
            ${c.operator_name ? `<tr><td style="color: var(--sign-text-mute);">運營經紀</td><td style="color: var(--sign-accent); font-weight: 700;">${c.operator_name}</td></tr>` : ''}
            <tr><td style="color: var(--sign-text-mute);">送出時間</td><td style="color: var(--sign-text-mute); font-size: 12px;">${c.created_at}</td></tr>
            ${c.approved_at ? `<tr><td style="color: var(--sign-text-mute);">核准時間</td><td style="color: var(--sign-success); font-size: 12px;">${c.approved_at}</td></tr>` : ''}
          </table>

          <div style="margin-top: 16px; padding-top: 14px; border-top: 1px dashed var(--sign-border);">
            <a href="${viewUrl}" target="_blank" rel="noopener" class="sign-btn sign-btn-primary" style="width: 100%; text-align: center; padding: 10px 16px; font-size: 14px;">
              📄 查看 / 列印合約 PDF →
            </a>
          </div>
        </div>
      `;
    }

    resultContent.innerHTML = html;
    resultCard.style.display = 'block';
    resultCard.scrollIntoView({ behavior: 'smooth' });
  }
})();
