/**
 * ============================================================
 * Email Templates for Streamer Suitability Test
 * Called from /api/streamer-test-submit
 * ============================================================
 */

// ============ Utils ============
function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function bar(percent, color = '#25F4EE') {
  const pct = Math.max(0, Math.min(100, percent));
  return `
    <div style="background:#eee;border-radius:6px;height:10px;overflow:hidden;">
      <div style="background:${color};width:${pct}%;height:100%;"></div>
    </div>
  `;
}

// ============ CTA 分型分流 ============
/**
 * 依 profile key 決定結果頁 CTA。
 * 對應使用者要求：
 *   高分型 (stage/companion/knowledge/high_potential) → LINE 面談
 *   穩定經營 (stable) → 新人培訓
 *   不建議 (not_recommended) → 與運營聊聊合作方向
 */
export function getCTAByProfile(profileKey) {
  const CTAS = {
    stage:            { label: '立即加入 LINE，安排面談',   url: 'https://line.me/R/ti/p/@354ykfbp', sub: '我們會依你的舞台型特質，幫你規劃出道路線' },
    companion:        { label: '立即加入 LINE，安排面談',   url: 'https://line.me/R/ti/p/@354ykfbp', sub: '陪伴型主播是我們的核心產線，長線收入穩健' },
    knowledge:        { label: '立即加入 LINE，安排面談',   url: 'https://line.me/R/ti/p/@354ykfbp', sub: '知識型主播容易接業配，我們有品牌合作資源' },
    high_potential:   { label: '立即加入 LINE，安排面談',   url: 'https://line.me/R/ti/p/@354ykfbp', sub: '你有天分但需要培訓，我們有一整套加速方案' },
    stable:           { label: '立即參加新人培訓',           url: 'https://line.me/R/ti/p/@354ykfbp', sub: '穩定經營型適合先培訓再上線，減少試錯成本' },
    not_recommended:  { label: '與運營聊聊合作方向',         url: 'https://line.me/R/ti/p/@354ykfbp', sub: '不一定要當主播，我們也有短影音 / 幕後合作機會' },
  };
  return CTAS[profileKey] || CTAS.stable;
}

// ============ 1. USER: FULL REPORT EMAIL ============
/**
 * 使用者的完整測驗報告信
 * @param {Object} p
 * @param {string} p.name  姓名
 * @param {string} p.email  Email
 * @param {string} p.lineId  LINE ID
 * @param {Object} p.result  buildResult() 完整回傳
 * @param {Object} p.demographics  { gender, age, region, experience }
 */
export function renderStreamerReportEmail({ name, result, demographics }) {
  const total = result.totalScore;
  const tierColor = pickTierColor(result.tier.key);
  const cta = getCTAByProfile(result.profile.key);

  // 模組分數列
  const moduleRows = result.moduleScores.map(ms => {
    const moduleColor = pickModuleColor(ms.key);
    return `
      <tr>
        <td style="padding:10px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="width:110px;font-size:13px;font-weight:700;color:#111;padding-right:12px;">
                ${esc(ms.shortName)}
              </td>
              <td>${bar(ms.percent, moduleColor)}</td>
              <td style="width:50px;padding-left:12px;font-size:13px;font-weight:700;color:${moduleColor};text-align:right;">
                ${ms.percent}%
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `;
  }).join('');

  // 3 大優勢
  const strengthsHtml = result.strengths.map(s => `
    <tr><td style="padding:6px 0;font-size:14px;color:#333;line-height:1.6;">
      <span style="color:#25F4EE;font-weight:700;margin-right:8px;">✓</span>${esc(s.name)}
      <span style="color:#888;font-size:12px;margin-left:6px;">${s.percent}%</span>
    </td></tr>
  `).join('');

  // 2 個短板
  const weakHtml = result.weaknesses.map(w => `
    <tr><td style="padding:6px 0;font-size:14px;color:#333;line-height:1.6;">
      <span style="color:#FFA500;font-weight:700;margin-right:8px;">△</span>${esc(w.name)}
      <span style="color:#888;font-size:12px;margin-left:6px;">${w.percent}%</span>
    </td></tr>
  `).join('');

  // 風險 flag
  const riskHtml = result.riskFlags.length > 0
    ? result.riskFlags.map(f => `
        <tr><td style="padding:12px 14px;background:#FFF3E0;border-left:3px solid #FF6B35;border-radius:6px;margin-bottom:8px;">
          <div style="font-size:13px;font-weight:800;color:#FF6B35;margin-bottom:4px;">
            ⚠️ ${esc(f.name)}
          </div>
          <div style="font-size:13px;color:#555;line-height:1.65;">${esc(f.advice)}</div>
        </td></tr>
        <tr><td style="height:8px;"></td></tr>
      `).join('')
    : `<tr><td style="padding:14px;background:#E8F5E9;border-left:3px solid #4ADE80;border-radius:6px;font-size:13px;color:#2E7D32;">
        ✓ 目前沒有觸發任何風險預警，代表你的準備度相對均衡。
      </td></tr>`;

  // 推薦路徑
  const recPathHtml = result.recommendedPaths.slice(0, 3).map((p, i) => `
    <tr><td style="padding:8px 0;font-size:14px;color:#333;line-height:1.65;">
      <span style="color:#25F4EE;font-weight:700;margin-right:8px;">${i + 1}.</span>${esc(p)}
    </td></tr>
  `).join('');

  // 避開路徑
  const avoidPathHtml = result.avoidPaths.slice(0, 3).map((p, i) => `
    <tr><td style="padding:8px 0;font-size:14px;color:#333;line-height:1.65;">
      <span style="color:#FE2C55;font-weight:700;margin-right:8px;">✕</span>${esc(p)}
    </td></tr>
  `).join('');

  // 3 條行動建議
  const actionHtml = result.actionItems.map((item, i) => `
    <tr><td style="padding:14px 16px;background:#f9f9fb;border-radius:8px;margin-bottom:10px;">
      <div style="font-size:12px;color:#7B68EE;font-weight:700;letter-spacing:1px;margin-bottom:6px;">
        行動 ${i + 1} · ${esc(item.moduleName)}（目前 ${item.percent}%）
      </div>
      <div style="font-size:14px;color:#333;line-height:1.7;">${esc(item.action)}</div>
    </td></tr>
    <tr><td style="height:8px;"></td></tr>
  `).join('');

  // 誠實檢核（有觸發才顯示）
  const lieHtml = result.lieCheck && result.lieCheck.triggered
    ? `<tr><td style="padding:0 32px 20px;">
        <div style="padding:14px 16px;background:#FFF8E1;border-left:3px solid #F59E0B;border-radius:6px;font-size:12.5px;color:#7C5300;line-height:1.65;">
          🕵️ <strong>作答一致性提醒</strong>：本測驗設有 3 題誠實檢核題，你的平均值為 ${result.lieCheck.avg}（門檻 ${result.lieCheck.threshold}）。這代表你可能對自己過度理想化，建議與經紀人面談時更誠實一些，才能拿到最精準的培訓路線。
        </div>
      </td></tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>主播適配度測驗結果</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,'Segoe UI','PingFang TC','Noto Sans TC',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f7;padding:20px 0;">
    <tr><td align="center">

      <table width="640" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- HEADER -->
        <tr><td style="background:linear-gradient(135deg,#05050A,#16162A);padding:32px 32px 24px;text-align:center;">
          <div style="color:#25F4EE;font-size:11px;font-weight:700;letter-spacing:2px;margin-bottom:8px;">JDI 脈動傳媒 · 主播適配度測驗</div>
          <div style="color:#ffffff;font-size:20px;font-weight:800;">🎤 ${esc(name)} 的專屬適配度報告</div>
        </td></tr>

        <!-- HERO: 總分 + Tier + 分型 -->
        <tr><td style="padding:36px 32px 28px;background:linear-gradient(180deg,#ffffff,#fafafa);text-align:center;">
          <div style="font-size:13px;color:#666;margin-bottom:4px;letter-spacing:1px;">你的主播適配度總分</div>
          <div style="font-size:64px;line-height:1;margin:8px 0;font-weight:900;color:${tierColor};">${total}<span style="font-size:24px;color:#999;font-weight:400;"> / 100</span></div>
          <div style="display:inline-block;padding:6px 16px;background:${tierColor};color:#fff;font-size:13px;font-weight:700;border-radius:20px;margin-top:6px;">
            ${esc(result.tier.label)}
          </div>
          <div style="margin-top:20px;padding-top:20px;border-top:1px dashed #ddd;">
            <div style="font-size:12px;color:#888;letter-spacing:1px;">你的主播分型</div>
            <h1 style="margin:6px 0 4px;font-size:28px;font-weight:900;background:linear-gradient(135deg,#FE2C55,#25F4EE);-webkit-background-clip:text;background-clip:text;color:#FE2C55;-webkit-text-fill-color:transparent;">
              ${esc(result.profile.name)}
            </h1>
            ${result.profile.tagline ? `<div style="font-size:14px;color:#555;font-style:italic;margin-top:4px;">「${esc(result.profile.tagline)}」</div>` : ''}
          </div>
        </td></tr>

        <!-- 總結 -->
        <tr><td style="padding:0 32px 24px;">
          <div style="padding:18px 20px;background:#f9f9fb;border-left:3px solid #25F4EE;border-radius:8px;font-size:14.5px;color:#333;line-height:1.85;">
            ${esc(result.summary)}
          </div>
        </td></tr>

        <!-- 六大模組分數 -->
        <tr><td style="padding:0 32px 28px;">
          <div style="font-size:16px;font-weight:800;color:#111;margin-bottom:12px;">
            📊 六大能力模組分析
          </div>
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border:1px solid #eee;border-radius:12px;padding:12px 20px;">
            ${moduleRows}
          </table>
        </td></tr>

        <!-- 優勢 + 短板 -->
        <tr><td style="padding:0 32px 28px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td width="50%" valign="top" style="padding-right:8px;">
                <div style="font-size:14px;font-weight:800;color:#111;margin-bottom:10px;">💎 前 3 大優勢</div>
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border:1px solid #E8F5E9;border-radius:10px;padding:12px 16px;">
                  ${strengthsHtml}
                </table>
              </td>
              <td width="50%" valign="top" style="padding-left:8px;">
                <div style="font-size:14px;font-weight:800;color:#111;margin-bottom:10px;">🔧 待加強</div>
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border:1px solid #FFF3E0;border-radius:10px;padding:12px 16px;">
                  ${weakHtml}
                </table>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- 風險預警 -->
        <tr><td style="padding:0 32px 24px;">
          <div style="font-size:16px;font-weight:800;color:#111;margin-bottom:12px;">🚨 風險預警</div>
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            ${riskHtml}
          </table>
        </td></tr>

        <!-- 誠實檢核（觸發才顯示） -->
        ${lieHtml}

        <!-- 推薦 vs 避開 -->
        <tr><td style="padding:0 32px 24px;">
          <div style="font-size:16px;font-weight:800;color:#111;margin-bottom:12px;">🗺️ 適合你的發展路徑</div>
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F0FDFA;border:1px solid #99F6E4;border-radius:10px;padding:16px 20px;margin-bottom:12px;">
            <tr><td style="font-size:13px;font-weight:800;color:#0D9488;margin-bottom:6px;padding-bottom:6px;">✓ 推薦方向</td></tr>
            ${recPathHtml}
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;padding:16px 20px;">
            <tr><td style="font-size:13px;font-weight:800;color:#DC2626;margin-bottom:6px;padding-bottom:6px;">✕ 建議避開</td></tr>
            ${avoidPathHtml}
          </table>
        </td></tr>

        <!-- 3 條行動建議 -->
        <tr><td style="padding:0 32px 24px;">
          <div style="font-size:16px;font-weight:800;color:#111;margin-bottom:12px;">🎯 4 週行動清單</div>
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            ${actionHtml}
          </table>
        </td></tr>

        <!-- CTA -->
        <tr><td style="padding:12px 32px 32px;text-align:center;">
          <div style="padding:24px 20px;background:linear-gradient(135deg,#05050A,#1A1A2E);border-radius:12px;">
            <div style="color:#25F4EE;font-size:11px;letter-spacing:2px;font-weight:700;margin-bottom:8px;">建議下一步</div>
            <div style="color:#fff;font-size:16px;font-weight:700;margin-bottom:6px;">${esc(cta.sub)}</div>
            <a href="${esc(cta.url)}" style="display:inline-block;margin-top:14px;padding:14px 32px;background:linear-gradient(135deg,#FE2C55,#FF6B9D);color:#fff;text-decoration:none;font-size:15px;font-weight:800;border-radius:30px;box-shadow:0 4px 16px rgba(254,44,85,0.4);">
              ${esc(cta.label)} →
            </a>
            <div style="color:#888;font-size:12px;margin-top:14px;">
              或撥打 <a href="tel:04-3603-3191" style="color:#25F4EE;text-decoration:none;">04-3603-3191</a>
            </div>
          </div>
        </td></tr>

        <!-- FOOTER -->
        <tr><td style="padding:20px 32px 28px;background:#fafafa;text-align:center;border-top:1px solid #eee;">
          <div style="font-size:12px;color:#888;line-height:1.7;">
            此份報告由 JDI 脈動傳媒依你本次作答自動產生，僅供參考。<br>
            <a href="https://jdi-pulse.com/" style="color:#25F4EE;text-decoration:none;">jdi-pulse.com</a> · TikTok LIVE 官方合作經紀公會
          </div>
        </td></tr>

      </table>

    </td></tr>
  </table>
</body>
</html>`;
}

// ============ 2. USER: PLAIN TEXT FALLBACK ============
export function renderStreamerReportText({ name, result }) {
  const cta = getCTAByProfile(result.profile.key);
  const modules = result.moduleScores
    .map(m => `  ${m.shortName}：${m.percent}%`)
    .join('\n');
  const strengths = result.strengths.map(s => `  ✓ ${s.name} (${s.percent}%)`).join('\n');
  const weaknesses = result.weaknesses.map(w => `  △ ${w.name} (${w.percent}%)`).join('\n');
  const risks = result.riskFlags.length === 0
    ? '  ✓ 沒有觸發任何風險預警。'
    : result.riskFlags.map(f => `  ⚠️ ${f.name}\n     ${f.advice}`).join('\n\n');
  const paths = result.recommendedPaths.slice(0, 3).map((p, i) => `  ${i + 1}. ${p}`).join('\n');
  const avoids = result.avoidPaths.slice(0, 3).map(p => `  ✕ ${p}`).join('\n');
  const actions = result.actionItems.map((a, i) => `  行動 ${i + 1} · ${a.moduleName} (${a.percent}%)\n     ${a.action}`).join('\n\n');

  return `${name} 你好，這是你的主播適配度測驗結果：

===============================================
🎤 總分：${result.totalScore} / 100
🎯 分級：${result.tier.label}
🎭 分型：${result.profile.name}
===============================================

${result.summary}

📊 六大能力模組
${modules}

💎 前 3 大優勢
${strengths}

🔧 待加強
${weaknesses}

🚨 風險預警
${risks}

🗺️ 推薦發展方向
${paths}

🚫 建議避開
${avoids}

🎯 4 週行動清單
${actions}

===============================================
建議下一步：${cta.label}
${cta.sub}
➜ ${cta.url}

或撥打 04-3603-3191

JDI 脈動傳媒 JDI PULSE MEDIA
TikTok LIVE 官方合作經紀公會
https://jdi-pulse.com/
`;
}

// ============ 3. ADMIN: NOTIFY EMAIL ============
export function renderStreamerNotifyEmail({ name, email, lineId, demographics, result, source, country, ip, leadId }) {
  const { gender, age, region, experience } = demographics || {};
  const modules = result.moduleScores
    .map(m => `<tr><td style="padding:4px 8px;font-size:13px;color:#666;">${esc(m.shortName)}</td><td style="padding:4px 8px;font-size:13px;font-weight:700;color:${pickModuleColor(m.key)};text-align:right;">${m.percent}%</td></tr>`)
    .join('');
  const risks = result.riskFlags.length === 0
    ? '<span style="color:#4ADE80;">✓ 無風險</span>'
    : result.riskFlags.map(f => `<span style="display:inline-block;padding:2px 8px;background:#FEF2F2;color:#DC2626;border-radius:4px;font-size:12px;margin:2px;">${esc(f.name)}</span>`).join(' ');
  const lieWarning = result.lieCheck && result.lieCheck.triggered
    ? `<div style="padding:10px 14px;background:#FFF8E1;border-left:3px solid #F59E0B;border-radius:6px;margin-top:12px;font-size:13px;color:#7C5300;">
        🕵️ <strong>誠實檢核觸發</strong>（平均 ${result.lieCheck.avg} / 門檻 ${result.lieCheck.threshold}）— 此名單可能對自身能力過度理想化，面談時需驗證。
      </div>`
    : '';

  const cta = getCTAByProfile(result.profile.key);

  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:20px;background:#f4f4f7;font-family:-apple-system,'Segoe UI','PingFang TC','Noto Sans TC',sans-serif;">
  <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.06);">

    <tr><td style="background:#05050A;padding:20px 24px;">
      <div style="color:#25F4EE;font-size:11px;letter-spacing:2px;font-weight:700;">JDI 脈動傳媒 · 名單通知</div>
      <div style="color:#fff;font-size:18px;font-weight:800;margin-top:6px;">🔔 新的主播適配度測驗名單</div>
    </td></tr>

    <!-- 摘要卡 -->
    <tr><td style="padding:24px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,#fafafa,#f0f0f4);border-radius:10px;padding:16px 20px;">
        <tr>
          <td width="50%">
            <div style="font-size:11px;color:#888;letter-spacing:1px;">總分</div>
            <div style="font-size:32px;font-weight:900;color:${pickTierColor(result.tier.key)};line-height:1.1;margin-top:4px;">${result.totalScore}</div>
            <div style="font-size:12px;color:#666;margin-top:2px;">${esc(result.tier.label)}</div>
          </td>
          <td width="50%">
            <div style="font-size:11px;color:#888;letter-spacing:1px;">分型</div>
            <div style="font-size:18px;font-weight:800;color:#FE2C55;line-height:1.2;margin-top:6px;">${esc(result.profile.name)}</div>
            <div style="font-size:12px;color:#666;margin-top:2px;">${esc(result.profile.tagline || '')}</div>
          </td>
        </tr>
      </table>
    </td></tr>

    <!-- 個資 -->
    <tr><td style="padding:0 24px 20px;">
      <div style="font-size:13px;font-weight:800;color:#111;margin-bottom:8px;">👤 聯絡資訊</div>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #eee;border-radius:8px;">
        <tr><td style="padding:8px 14px;font-size:13px;color:#666;width:80px;">姓名</td><td style="padding:8px 14px;font-size:13px;font-weight:700;color:#111;">${esc(name)}</td></tr>
        <tr><td style="padding:8px 14px;font-size:13px;color:#666;border-top:1px solid #f4f4f4;">Email</td><td style="padding:8px 14px;font-size:13px;color:#111;border-top:1px solid #f4f4f4;"><a href="mailto:${esc(email)}" style="color:#25F4EE;text-decoration:none;">${esc(email)}</a></td></tr>
        <tr><td style="padding:8px 14px;font-size:13px;color:#666;border-top:1px solid #f4f4f4;">LINE ID</td><td style="padding:8px 14px;font-size:13px;color:#111;border-top:1px solid #f4f4f4;">${esc(lineId)}</td></tr>
        <tr><td style="padding:8px 14px;font-size:13px;color:#666;border-top:1px solid #f4f4f4;">性別</td><td style="padding:8px 14px;font-size:13px;color:#111;border-top:1px solid #f4f4f4;">${esc(gender || '-')}</td></tr>
        <tr><td style="padding:8px 14px;font-size:13px;color:#666;border-top:1px solid #f4f4f4;">年齡</td><td style="padding:8px 14px;font-size:13px;color:#111;border-top:1px solid #f4f4f4;">${esc(age || '-')}</td></tr>
        <tr><td style="padding:8px 14px;font-size:13px;color:#666;border-top:1px solid #f4f4f4;">地區</td><td style="padding:8px 14px;font-size:13px;color:#111;border-top:1px solid #f4f4f4;">${esc(region || '-')}</td></tr>
        <tr><td style="padding:8px 14px;font-size:13px;color:#666;border-top:1px solid #f4f4f4;">主播經驗</td><td style="padding:8px 14px;font-size:13px;font-weight:700;color:#FE2C55;border-top:1px solid #f4f4f4;">${esc(experience || '-')}</td></tr>
      </table>
    </td></tr>

    <!-- 模組分數 -->
    <tr><td style="padding:0 24px 20px;">
      <div style="font-size:13px;font-weight:800;color:#111;margin-bottom:8px;">📊 六大模組</div>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #eee;border-radius:8px;overflow:hidden;">
        ${modules}
      </table>
    </td></tr>

    <!-- 風險 -->
    <tr><td style="padding:0 24px 20px;">
      <div style="font-size:13px;font-weight:800;color:#111;margin-bottom:8px;">🚨 風險 flag</div>
      <div>${risks}</div>
      ${lieWarning}
    </td></tr>

    <!-- 建議 CTA -->
    <tr><td style="padding:0 24px 20px;">
      <div style="padding:12px 14px;background:#E0F2FE;border-left:3px solid #0EA5E9;border-radius:6px;font-size:13px;color:#0C4A6E;line-height:1.6;">
        💡 <strong>建議跟進策略</strong>：${esc(cta.label)}<br>
        <span style="font-size:12px;color:#555;">${esc(cta.sub)}</span>
      </div>
    </td></tr>

    <!-- Meta -->
    <tr><td style="padding:16px 24px 24px;background:#fafafa;border-top:1px solid #eee;">
      <div style="font-size:11px;color:#888;line-height:1.7;">
        Lead ID: <code>#${leadId || 'N/A'}</code> · Source: ${esc(source || 'unknown')} · Country: ${esc(country || '-')} · IP: ${esc(ip || '-')}<br>
        提交時間：${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}
      </div>
    </td></tr>

  </table>
</body>
</html>`;
}

// ============ Color helpers ============
function pickTierColor(tierKey) {
  const COLORS = {
    excellent:  '#25F4EE',
    developing: '#4ADE80',
    potential:  '#FFB37A',
    training:   '#FF9500',
    unstable:   '#FE2C55',
  };
  return COLORS[tierKey] || '#7B68EE';
}

function pickModuleColor(moduleKey) {
  const COLORS = {
    camera_expression:    '#FE2C55',
    audience_interaction: '#25F4EE',
    emotional_regulation: '#FFB37A',
    self_discipline:      '#7B68EE',
    content_creativity:   '#00F0FF',
    boundary_control:     '#4ADE80',
  };
  return COLORS[moduleKey] || '#666';
}
