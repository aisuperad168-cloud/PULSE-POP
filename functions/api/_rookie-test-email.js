/**
 * ============================================================
 * Email Templates for Rookie Test (全新素人測驗 · 24 題)
 * Called from /api/rookie-test-submit
 *
 * 架構完全鏡像 _streamer-test-email.js：
 *   - 相同的共用 helper 抽取模式，保證 user email 與 admin email
 *     的完整報告內容 100% 一致（避免 5min 版本曾發生過的圖表缺失 bug）
 *   - Rookie 特有調整：4 個新分型 CTA、次要分型顯示、
 *     素人版基本資料欄位（暱稱 / 年齡區間 / 身份 / 直播經驗 /
 *     興趣方向 / 意願強度）
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

// ============ CTA 分型分流（rookie 4 分型） ============
/**
 * 依 profile key 決定結果頁 CTA。
 *   natural_camera        → LINE 面談（有天分的鏡頭型）
 *   content_sharer        → LINE 面談（分享型內容主）
 *   companion_interactive → LINE 面談（陪伴 / 互動型）
 *   potential_rookie      → 新人培訓（潛力素人，需要培訓）
 */
export function getCTAByProfile(profileKey) {
  const CTAS = {
    natural_camera:        { label: '立即加入 LINE，安排面談',   url: 'https://line.me/R/ti/p/@354ykfbp', sub: '你有鏡頭優勢，我們幫你規劃直播出道路線' },
    content_sharer:        { label: '立即加入 LINE，安排面談',   url: 'https://line.me/R/ti/p/@354ykfbp', sub: '分享型內容主播是穩定經營路線，我們有品牌合作資源' },
    companion_interactive: { label: '立即加入 LINE，安排面談',   url: 'https://line.me/R/ti/p/@354ykfbp', sub: '陪伴型主播長線收入穩健，加入即可開始培訓' },
    potential_rookie:      { label: '立即參加新人培訓',           url: 'https://line.me/R/ti/p/@354ykfbp', sub: '素人潛力型建議先接受培訓再上線，減少試錯成本' },
  };
  return CTAS[profileKey] || CTAS.potential_rookie;
}

// ============ Section builders (shared between USER report & ADMIN notify) ============
/**
 * 建構「六大能力模組」區塊（含長條圖）。使用者信 + 內部通知信共用，
 * 確保兩邊看到的圖表完全一致。
 */
function buildModuleRowsHtml(result) {
  return result.moduleScores.map(ms => {
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
}

/**
 * 建構「優勢 / 短板」兩欄卡片。
 */
function buildStrengthsWeaknessesHtml(result) {
  const strengthsHtml = result.strengths.map(s => `
    <tr><td style="padding:6px 0;font-size:14px;color:#333;line-height:1.6;">
      <span style="color:#25F4EE;font-weight:700;margin-right:8px;">✓</span>${esc(s.name)}
      <span style="color:#888;font-size:12px;margin-left:6px;">${s.percent}%</span>
    </td></tr>
  `).join('');
  const weakHtml = result.weaknesses.map(w => `
    <tr><td style="padding:6px 0;font-size:14px;color:#333;line-height:1.6;">
      <span style="color:#FFA500;font-weight:700;margin-right:8px;">△</span>${esc(w.name)}
      <span style="color:#888;font-size:12px;margin-left:6px;">${w.percent}%</span>
    </td></tr>
  `).join('');
  return { strengthsHtml, weakHtml };
}

/**
 * 建構「風險預警」區塊（含 advice 詳解）。
 */
function buildRiskDetailHtml(result) {
  if (!result.riskFlags || result.riskFlags.length === 0) {
    return `<tr><td style="padding:14px;background:#E8F5E9;border-left:3px solid #4ADE80;border-radius:6px;font-size:13px;color:#2E7D32;">
        ✓ 目前沒有觸發任何風險預警，代表你的準備度相對均衡。
      </td></tr>`;
  }
  return result.riskFlags.map(f => `
    <tr><td style="padding:12px 14px;background:#FFF3E0;border-left:3px solid #FF6B35;border-radius:6px;margin-bottom:8px;">
      <div style="font-size:13px;font-weight:800;color:#FF6B35;margin-bottom:4px;">
        ⚠️ ${esc(f.name)}
      </div>
      <div style="font-size:13px;color:#555;line-height:1.65;">${esc(f.advice)}</div>
    </td></tr>
    <tr><td style="height:8px;"></td></tr>
  `).join('');
}

/**
 * 建構「推薦 vs 避開路徑」兩張卡。
 */
function buildPathsHtml(result) {
  const recPathHtml = (result.recommendedPaths || []).slice(0, 3).map((p, i) => `
    <tr><td style="padding:8px 0;font-size:14px;color:#333;line-height:1.65;">
      <span style="color:#25F4EE;font-weight:700;margin-right:8px;">${i + 1}.</span>${esc(p)}
    </td></tr>
  `).join('');
  const avoidPathHtml = (result.avoidPaths || []).slice(0, 3).map((p, i) => `
    <tr><td style="padding:8px 0;font-size:14px;color:#333;line-height:1.65;">
      <span style="color:#FE2C55;font-weight:700;margin-right:8px;">✕</span>${esc(p)}
    </td></tr>
  `).join('');
  return { recPathHtml, avoidPathHtml };
}

/**
 * 建構「4 週行動清單」區塊。
 */
function buildActionsHtml(result) {
  return (result.actionItems || []).map((item, i) => `
    <tr><td style="padding:14px 16px;background:#f9f9fb;border-radius:8px;margin-bottom:10px;">
      <div style="font-size:12px;color:#7B68EE;font-weight:700;letter-spacing:1px;margin-bottom:6px;">
        行動 ${i + 1} · ${esc(item.moduleName)}（目前 ${item.percent}%）
      </div>
      <div style="font-size:14px;color:#333;line-height:1.7;">${esc(item.action)}</div>
    </td></tr>
    <tr><td style="height:8px;"></td></tr>
  `).join('');
}

/**
 * 建構「次要分型」提示區塊（rookie 版特有）。
 * 有些高分作答者會同時符合多個分型規則，此區塊讓 admin 與 user 都看到補充資訊。
 */
function buildSecondaryProfileHtml(result) {
  if (!result.secondaryProfile) return '';
  const sp = result.secondaryProfile;
  return `<tr><td style="padding:0 32px 20px;">
    <div style="padding:14px 16px;background:#F5F3FF;border-left:3px solid #7B68EE;border-radius:8px;font-size:13px;color:#4C3D9E;line-height:1.7;">
      ✨ <strong>你也同時符合次要分型：${esc(sp.name)}</strong>
      ${sp.tagline ? `<br><span style="color:#666;font-size:12.5px;">「${esc(sp.tagline)}」</span>` : ''}
      <br><span style="color:#555;font-size:12.5px;">代表你的能力光譜較廣，發展路徑可以更彈性。</span>
    </div>
  </td></tr>`;
}

// 內部通知信版本（padding 較小）
function buildSecondaryProfileAdminHtml(result) {
  if (!result.secondaryProfile) return '';
  const sp = result.secondaryProfile;
  return `<tr><td style="padding:0 24px 16px;">
    <div style="padding:12px 14px;background:#F5F3FF;border-left:3px solid #7B68EE;border-radius:6px;font-size:12.5px;color:#4C3D9E;line-height:1.65;">
      ✨ <strong>次要分型：${esc(sp.name)}</strong>
      ${sp.tagline ? `<span style="color:#666;">（${esc(sp.tagline)}）</span>` : ''}
    </div>
  </td></tr>`;
}

// ============ Demographics label maps ============
const AGE_LABELS = {
  under_18: '未滿 18 歲',
  '18-24': '18-24 歲',
  '25-29': '25-29 歲',
  '30-34': '30-34 歲',
  '35+':   '35 歲以上',
};
const IDENTITY_LABELS = {
  student:       '學生',
  office_worker: '上班族',
  freelancer:    '自由工作 / 接案',
  stay_home:     '家庭主婦 / 主夫',
  between_jobs:  '待業 / 轉職中',
  other:         '其他',
};
const EXPERIENCE_LABELS = {
  none:         '完全沒有（從沒開播過）',
  tried:        '試過幾次（但沒持續）',
  short_active: '短期經驗（1-3 個月）',
};
const INTENT_LABELS = {
  curious:     '好奇看看（先了解）',
  considering: '認真考慮（還在評估）',
  ready_now:   '馬上就想（已決定）',
};
const INTEREST_LABELS = {
  entertainment:     '娛樂 / 才藝',
  companion:         '陪聊 / 陪伴',
  content_knowledge: '知識 / 內容型',
  commerce:          '電商 / 帶貨',
  gaming:            '遊戲',
  lifestyle:         '生活 / Vlog',
  not_sure:          '還不確定',
};

export function labelAge(v)         { return AGE_LABELS[v]        || v || '-'; }
export function labelIdentity(v)    { return IDENTITY_LABELS[v]   || v || '-'; }
export function labelExperience(v)  { return EXPERIENCE_LABELS[v] || v || '-'; }
export function labelIntent(v)      { return INTENT_LABELS[v]     || v || '-'; }
export function labelInterests(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return '-';
  return arr.map(x => INTEREST_LABELS[x] || x).join('、');
}

// ============ 1. USER: FULL REPORT EMAIL ============
/**
 * 使用者的完整測驗報告信
 * @param {Object} p
 * @param {string} p.nickname
 * @param {Object} p.result  buildResult() 完整回傳
 * @param {Object} p.demographics  { ageRange, identity, liveExperience, interestDirections, intentLevel }
 */
export function renderRookieReportEmail({ nickname, result, demographics }) {
  const total = result.totalScore;
  const tierColor = pickTierColor(result.tier.key);
  const cta = getCTAByProfile(result.profile.key);

  const moduleRows = buildModuleRowsHtml(result);
  const { strengthsHtml, weakHtml } = buildStrengthsWeaknessesHtml(result);
  const riskHtml = buildRiskDetailHtml(result);
  const { recPathHtml, avoidPathHtml } = buildPathsHtml(result);
  const actionHtml = buildActionsHtml(result);
  const secondaryHtml = buildSecondaryProfileHtml(result);

  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>素人主播適配度測驗結果</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,'Segoe UI','PingFang TC','Noto Sans TC',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f7;padding:20px 0;">
    <tr><td align="center">

      <table width="640" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- HEADER -->
        <tr><td style="background:linear-gradient(135deg,#05050A,#16162A);padding:32px 32px 24px;text-align:center;">
          <div style="color:#25F4EE;font-size:11px;font-weight:700;letter-spacing:2px;margin-bottom:8px;">JDI 脈動傳媒 · 全新素人主播測驗</div>
          <div style="color:#ffffff;font-size:20px;font-weight:800;">✨ ${esc(nickname)} 的專屬素人潛力報告</div>
        </td></tr>

        <!-- HERO: 總分 + Tier + 分型 -->
        <tr><td style="padding:36px 32px 28px;background:linear-gradient(180deg,#ffffff,#fafafa);text-align:center;">
          <div style="font-size:13px;color:#666;margin-bottom:4px;letter-spacing:1px;">你的素人主播適配度總分</div>
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

        <!-- 次要分型（若有觸發） -->
        ${secondaryHtml}

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

        <!-- 4 週行動清單 -->
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
export function renderRookieReportText({ nickname, result }) {
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
  const secondary = result.secondaryProfile
    ? `\n✨ 你也同時符合次要分型：${result.secondaryProfile.name}${result.secondaryProfile.tagline ? '（「' + result.secondaryProfile.tagline + '」）' : ''}\n`
    : '';

  return `${nickname} 你好，這是你的素人主播適配度測驗結果：

===============================================
✨ 總分：${result.totalScore} / 100
🎯 分級：${result.tier.label}
🎭 主分型：${result.profile.name}
===============================================
${secondary}
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
export function renderRookieNotifyEmail({ nickname, email, lineId, demographics, result, source, country, ip, leadId }) {
  const {
    ageRange,
    identity,
    liveExperience,
    interestDirections,
    intentLevel,
  } = demographics || {};
  const tierColor = pickTierColor(result.tier.key);
  const cta = getCTAByProfile(result.profile.key);

  // 完整報告區塊（與 user email 一致，透過共用 helper 保證圖表 & 細項不會漏）
  const moduleRows = buildModuleRowsHtml(result);
  const { strengthsHtml, weakHtml } = buildStrengthsWeaknessesHtml(result);
  const riskDetailHtml = buildRiskDetailHtml(result);
  const { recPathHtml, avoidPathHtml } = buildPathsHtml(result);
  const actionHtml = buildActionsHtml(result);
  const secondaryAdminHtml = buildSecondaryProfileAdminHtml(result);

  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:20px;background:#f4f4f7;font-family:-apple-system,'Segoe UI','PingFang TC','Noto Sans TC',sans-serif;">
  <table width="640" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;width:100%;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.06);">

    <!-- Admin Header -->
    <tr><td style="background:#05050A;padding:20px 24px;">
      <div style="color:#25F4EE;font-size:11px;letter-spacing:2px;font-weight:700;">JDI 脈動傳媒 · 內部名單通知</div>
      <div style="color:#fff;font-size:18px;font-weight:800;margin-top:6px;">🔔 新的素人主播測驗名單</div>
    </td></tr>

    <!-- 摘要卡（Admin 特有 - 快速總覽） -->
    <tr><td style="padding:20px 24px 12px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,#fafafa,#f0f0f4);border-radius:10px;padding:16px 20px;">
        <tr>
          <td width="50%">
            <div style="font-size:11px;color:#888;letter-spacing:1px;">總分</div>
            <div style="font-size:32px;font-weight:900;color:${tierColor};line-height:1.1;margin-top:4px;">${result.totalScore}</div>
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

    <!-- 次要分型（rookie 版特有，若有觸發） -->
    ${secondaryAdminHtml}

    <!-- 聯絡資訊（Admin 特有） -->
    <tr><td style="padding:0 24px 20px;">
      <div style="font-size:13px;font-weight:800;color:#111;margin-bottom:8px;">👤 聯絡資訊</div>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #eee;border-radius:8px;">
        <tr><td style="padding:8px 14px;font-size:13px;color:#666;width:80px;">暱稱</td><td style="padding:8px 14px;font-size:13px;font-weight:700;color:#111;">${esc(nickname)}</td></tr>
        <tr><td style="padding:8px 14px;font-size:13px;color:#666;border-top:1px solid #f4f4f4;">Email</td><td style="padding:8px 14px;font-size:13px;color:#111;border-top:1px solid #f4f4f4;"><a href="mailto:${esc(email)}" style="color:#25F4EE;text-decoration:none;">${esc(email)}</a></td></tr>
        <tr><td style="padding:8px 14px;font-size:13px;color:#666;border-top:1px solid #f4f4f4;">LINE ID</td><td style="padding:8px 14px;font-size:13px;color:#111;border-top:1px solid #f4f4f4;">${esc(lineId)}</td></tr>
        <tr><td style="padding:8px 14px;font-size:13px;color:#666;border-top:1px solid #f4f4f4;">年齡區間</td><td style="padding:8px 14px;font-size:13px;color:#111;border-top:1px solid #f4f4f4;">${esc(labelAge(ageRange))}</td></tr>
        <tr><td style="padding:8px 14px;font-size:13px;color:#666;border-top:1px solid #f4f4f4;">身份</td><td style="padding:8px 14px;font-size:13px;color:#111;border-top:1px solid #f4f4f4;">${esc(labelIdentity(identity))}</td></tr>
        <tr><td style="padding:8px 14px;font-size:13px;color:#666;border-top:1px solid #f4f4f4;">直播經驗</td><td style="padding:8px 14px;font-size:13px;font-weight:700;color:#FE2C55;border-top:1px solid #f4f4f4;">${esc(labelExperience(liveExperience))}</td></tr>
        <tr><td style="padding:8px 14px;font-size:13px;color:#666;border-top:1px solid #f4f4f4;">興趣方向</td><td style="padding:8px 14px;font-size:13px;color:#111;border-top:1px solid #f4f4f4;">${esc(labelInterests(interestDirections))}</td></tr>
        <tr><td style="padding:8px 14px;font-size:13px;color:#666;border-top:1px solid #f4f4f4;">意願強度</td><td style="padding:8px 14px;font-size:13px;font-weight:700;color:#FE2C55;border-top:1px solid #f4f4f4;">${esc(labelIntent(intentLevel))}</td></tr>
      </table>
    </td></tr>

    <!-- ========== 以下為與使用者收到的完整報告 100% 一致（透過共用 helper） ========== -->

    <!-- 分隔標題 -->
    <tr><td style="padding:8px 24px 4px;">
      <div style="padding:10px 14px;background:#FFF8E1;border-left:3px solid #F59E0B;border-radius:6px;font-size:12px;color:#7C5300;line-height:1.6;">
        📄 <strong>以下為主播本人收到的完整報告內容</strong>（含長條圖 / 優勢 / 短板 / 風險詳解 / 發展路徑 / 4 週行動清單）
      </div>
    </td></tr>

    <!-- 總結評語 -->
    <tr><td style="padding:16px 24px 8px;">
      <div style="padding:16px 18px;background:#f9f9fb;border-left:3px solid #25F4EE;border-radius:8px;font-size:14px;color:#333;line-height:1.85;">
        ${esc(result.summary)}
      </div>
    </td></tr>

    <!-- 六大模組（含長條圖） -->
    <tr><td style="padding:12px 24px 20px;">
      <div style="font-size:15px;font-weight:800;color:#111;margin-bottom:10px;">
        📊 六大能力模組分析
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border:1px solid #eee;border-radius:10px;padding:10px 18px;">
        ${moduleRows}
      </table>
    </td></tr>

    <!-- 前 3 大優勢 + 待加強 -->
    <tr><td style="padding:0 24px 20px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="50%" valign="top" style="padding-right:6px;">
            <div style="font-size:13px;font-weight:800;color:#111;margin-bottom:8px;">💎 前 3 大優勢</div>
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border:1px solid #E8F5E9;border-radius:10px;padding:10px 14px;">
              ${strengthsHtml}
            </table>
          </td>
          <td width="50%" valign="top" style="padding-left:6px;">
            <div style="font-size:13px;font-weight:800;color:#111;margin-bottom:8px;">🔧 待加強</div>
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border:1px solid #FFF3E0;border-radius:10px;padding:10px 14px;">
              ${weakHtml}
            </table>
          </td>
        </tr>
      </table>
    </td></tr>

    <!-- 風險預警（含 advice 詳解） -->
    <tr><td style="padding:0 24px 20px;">
      <div style="font-size:15px;font-weight:800;color:#111;margin-bottom:10px;">🚨 風險預警</div>
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        ${riskDetailHtml}
      </table>
    </td></tr>

    <!-- 推薦 vs 避開發展路徑 -->
    <tr><td style="padding:0 24px 20px;">
      <div style="font-size:15px;font-weight:800;color:#111;margin-bottom:10px;">🗺️ 適合的發展路徑</div>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F0FDFA;border:1px solid #99F6E4;border-radius:10px;padding:14px 18px;margin-bottom:10px;">
        <tr><td style="font-size:13px;font-weight:800;color:#0D9488;padding-bottom:6px;">✓ 推薦方向</td></tr>
        ${recPathHtml}
      </table>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;padding:14px 18px;">
        <tr><td style="font-size:13px;font-weight:800;color:#DC2626;padding-bottom:6px;">✕ 建議避開</td></tr>
        ${avoidPathHtml}
      </table>
    </td></tr>

    <!-- 4 週行動清單 -->
    <tr><td style="padding:0 24px 24px;">
      <div style="font-size:15px;font-weight:800;color:#111;margin-bottom:10px;">🎯 4 週行動清單</div>
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        ${actionHtml}
      </table>
    </td></tr>

    <!-- ========== 完整報告內容結束，以下為 Admin 特有的跟進 CTA ========== -->

    <!-- 建議跟進策略 + 聯絡 LINE 按鈕（Admin 特有） -->
    <tr><td style="padding:0 24px 20px;">
      <div style="padding:14px 16px;background:#E0F2FE;border-left:3px solid #0EA5E9;border-radius:6px;font-size:13px;color:#0C4A6E;line-height:1.65;">
        💡 <strong>建議跟進策略</strong>：${esc(cta.label)}<br>
        <span style="font-size:12px;color:#555;">${esc(cta.sub)}</span>
        <div style="margin-top:12px;">
          <a href="${esc(cta.url)}"
             style="display:inline-block;padding:10px 20px;background:#06C755;color:#ffffff;text-decoration:none;font-size:13px;font-weight:800;border-radius:22px;box-shadow:0 2px 8px rgba(6,199,85,0.35);"
             target="_blank" rel="noopener">
            💬 立即以 LINE 聯絡此名單
          </a>
          <a href="mailto:${esc(email)}"
             style="display:inline-block;margin-left:8px;padding:10px 18px;background:#ffffff;color:#0C4A6E;text-decoration:none;font-size:13px;font-weight:700;border-radius:22px;border:1px solid #0EA5E9;">
            ✉️ 回信給 ${esc(nickname)}
          </a>
        </div>
        <div style="margin-top:10px;font-size:11px;color:#777;line-height:1.5;">
          LINE 連結：<a href="${esc(cta.url)}" style="color:#06C755;text-decoration:none;" target="_blank" rel="noopener">${esc(cta.url)}</a>
        </div>
      </div>
    </td></tr>

    <!-- Meta（Admin 特有） -->
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
// Rookie 版 tier keys：excellent / developing / potential / needs_training
function pickTierColor(tierKey) {
  const COLORS = {
    excellent:       '#25F4EE',
    developing:      '#4ADE80',
    potential:       '#FFB37A',
    needs_training:  '#FF9500',
  };
  return COLORS[tierKey] || '#7B68EE';
}

// Rookie 版模組 keys：expression / interaction / stability / discipline / contentPotential / boundary
function pickModuleColor(moduleKey) {
  const COLORS = {
    expression:       '#FE2C55',
    interaction:      '#25F4EE',
    stability:        '#FFB37A',
    discipline:       '#7B68EE',
    contentPotential: '#00F0FF',
    boundary:         '#4ADE80',
  };
  return COLORS[moduleKey] || '#666';
}
