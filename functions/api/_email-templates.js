/**
 * ============================================================
 * Email Templates for Quiz Report + Admin Notification
 * Called from /api/quiz-submit
 * ============================================================
 */

// HTML escape helper (prevents accidental HTML injection in name/email)
function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ============ USER: FULL REPORT EMAIL ============
export function renderReportEmail({ name, email, lineId, typeData }) {
  const stars = '★'.repeat(typeData.incomeStars) + '☆'.repeat(5 - typeData.incomeStars);
  const strengthsHtml = typeData.strengths.map(s => `
    <tr><td style="padding:6px 0;font-size:14px;color:#333;line-height:1.6;">
      <span style="color:#25F4EE;font-weight:700;margin-right:8px;">✓</span>${esc(s)}
    </td></tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>你的主播類型分析報告</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,'Segoe UI','PingFang TC','Noto Sans TC',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f7;padding:20px 0;">
    <tr><td align="center">

      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- HEADER: Brand -->
        <tr><td style="background:linear-gradient(135deg,#05050A,#16162A);padding:32px 32px 24px;text-align:center;">
          <div style="color:#25F4EE;font-size:11px;font-weight:700;letter-spacing:2px;margin-bottom:8px;">JDI 脈動傳媒 · JDI PULSE MEDIA</div>
          <div style="color:#ffffff;font-size:20px;font-weight:800;">🎉 你的主播類型分析報告 🎉</div>
        </td></tr>

        <!-- HERO: Type -->
        <tr><td style="padding:32px 32px 24px;background:linear-gradient(180deg,#ffffff,#fafafa);text-align:center;">
          <div style="font-size:14px;color:#666;margin-bottom:12px;">${esc(name)}，你的主播類型是</div>
          <div style="font-size:72px;line-height:1;margin:8px 0 12px;">${typeData.emoji}</div>
          <h1 style="margin:0 0 6px;font-size:32px;font-weight:900;background:${typeData.gradient};-webkit-background-clip:text;background-clip:text;color:${typeData.color};-webkit-text-fill-color:transparent;">
            ${esc(typeData.name)}
          </h1>
          <div style="font-size:15px;color:#555;font-style:italic;margin-top:8px;">
            「${esc(typeData.tagline)}」
          </div>
        </td></tr>

        <!-- Description -->
        <tr><td style="padding:0 32px 24px;">
          <div style="padding:20px;background:#f9f9fb;border-left:3px solid #25F4EE;border-radius:8px;font-size:14.5px;color:#333;line-height:1.85;">
            ${esc(typeData.description)}
          </div>
        </td></tr>

        <!-- Strengths -->
        <tr><td style="padding:0 32px 24px;">
          <div style="font-size:16px;font-weight:800;color:#111;margin-bottom:12px;">
            💎 你的個人優勢
          </div>
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border:1px solid #eee;border-radius:12px;padding:16px 20px;">
            ${strengthsHtml}
          </table>
        </td></tr>

        <!-- Grid: Income + Time -->
        <tr><td style="padding:0 32px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td width="50%" style="padding:16px;background:#f9f9fb;border-radius:10px;text-align:center;">
                <div style="font-size:11px;color:#888;letter-spacing:1px;margin-bottom:6px;">收入潛力</div>
                <div style="font-size:22px;color:#FFA500;letter-spacing:3px;">${stars}</div>
              </td>
              <td width="4"></td>
              <td width="50%" style="padding:16px;background:#f9f9fb;border-radius:10px;text-align:center;">
                <div style="font-size:11px;color:#888;letter-spacing:1px;margin-bottom:6px;">建議開播時段</div>
                <div style="font-size:14px;font-weight:700;color:#111;">${esc(typeData.bestTime)}</div>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Tip -->
        <tr><td style="padding:0 32px 24px;">
          <div style="padding:18px 20px;background:linear-gradient(135deg,rgba(37,244,238,0.08),rgba(254,44,85,0.05));border-left:3px solid #25F4EE;border-radius:10px;">
            <div style="font-size:13px;font-weight:800;color:#0EA5E9;margin-bottom:6px;">🎯 專屬成長建議</div>
            <div style="font-size:14px;color:#333;line-height:1.75;">${esc(typeData.tips)}</div>
          </div>
        </td></tr>

        <!-- Similar streamer -->
        <tr><td style="padding:0 32px 28px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f9f9fb;border-radius:10px;padding:14px 20px;">
            <tr>
              <td style="font-size:13px;color:#666;">⭐ 類似頂級主播</td>
              <td align="right" style="font-size:13.5px;font-weight:700;color:#111;">${esc(typeData.similarStreamer)}</td>
            </tr>
          </table>
        </td></tr>

        <!-- CTA -->
        <tr><td style="padding:0 32px 28px;">
          <div style="padding:24px;background:linear-gradient(135deg,#05050A,#16162A);border-radius:16px;text-align:center;">
            <div style="color:#ffffff;font-size:18px;font-weight:800;margin-bottom:6px;">
              🚀 準備成為專業主播了嗎？
            </div>
            <div style="color:rgba(255,255,255,0.7);font-size:13px;margin-bottom:20px;line-height:1.6;">
              JDI 脈動傳媒是 TikTok LIVE 官方合作經紀公會<br />
              旗下 300+ 位主播 · 0 抽成 · 完整培訓 · 現金保底
            </div>
            <a href="https://line.me/R/ti/p/@354ykfbp"
               style="display:inline-block;padding:14px 32px;background:#06C755;color:#ffffff;text-decoration:none;border-radius:999px;font-size:15px;font-weight:700;margin-bottom:12px;">
              💬 LINE 立即諮詢
            </a>
            <br />
            <a href="https://jdi-pulse.com/partnership"
               style="display:inline-block;padding:12px 28px;background:transparent;color:#25F4EE;text-decoration:none;border:1px solid #25F4EE;border-radius:999px;font-size:14px;font-weight:600;margin-top:8px;">
              查看完整合作方案 →
            </a>
          </div>
        </td></tr>

        <!-- 3-column links -->
        <tr><td style="padding:0 32px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td width="33%" align="center" style="padding:12px;">
                <a href="https://jdi-pulse.com/faq" style="color:#25F4EE;font-size:12.5px;text-decoration:none;font-weight:600;">📖 新人 FAQ</a>
              </td>
              <td width="33%" align="center" style="padding:12px;border-left:1px solid #eee;border-right:1px solid #eee;">
                <a href="https://jdi-pulse.com/#streamers" style="color:#25F4EE;font-size:12.5px;text-decoration:none;font-weight:600;">👥 旗下主播</a>
              </td>
              <td width="33%" align="center" style="padding:12px;">
                <a href="https://jdi-pulse.com/quiz" style="color:#25F4EE;font-size:12.5px;text-decoration:none;font-weight:600;">🔄 重新測驗</a>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 32px 32px;background:#fafafa;border-top:1px solid #eee;">
          <div style="text-align:center;font-size:12px;color:#888;line-height:1.7;">
            <div style="margin-bottom:8px;">📞 04-3603-3191 · 📧 pulsepop9@gmail.com</div>
            <div style="margin-bottom:8px;">📱 LINE：@354ykfbp · IG：@pulse.pop9</div>
            <div style="margin-top:12px;padding-top:12px;border-top:1px solid #eee;color:#aaa;font-size:11px;">
              © 2026 JDI 脈動傳媒 · JDI PULSE MEDIA<br />
              TikTok LIVE 官方合作經紀公會<br />
              <span style="color:#bbb;">本信件依你的自願測驗結果寄送 · 如不再接收請透過 LINE 告知我們</span>
            </div>
          </div>
        </td></tr>

      </table>

    </td></tr>
  </table>
</body>
</html>`;
}

// ============ ADMIN: NOTIFICATION EMAIL ============
export function renderNotifyEmail({ name, email, lineId, typeData, source, country, leadId }) {
  const now = new Date();
  const tw = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const tsStr = tw.toISOString().slice(0, 19).replace('T', ' ');

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,'Segoe UI','PingFang TC','Noto Sans TC',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f7;padding:20px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.06);">

        <tr><td style="background:linear-gradient(135deg,#25F4EE,#FE2C55);padding:20px 24px;">
          <div style="color:#ffffff;font-size:12px;letter-spacing:2px;margin-bottom:4px;font-weight:700;">🔔 NEW LEAD · JDI 脈動傳媒</div>
          <div style="color:#ffffff;font-size:20px;font-weight:800;">有新的主播類型測驗名單！</div>
        </td></tr>

        <tr><td style="padding:24px 28px;">

          <div style="padding:18px 20px;background:#f0fdff;border-left:4px solid #25F4EE;border-radius:8px;margin-bottom:20px;">
            <div style="font-size:12px;color:#0EA5E9;letter-spacing:1px;margin-bottom:4px;font-weight:700;">${typeData.emoji} 主播類型</div>
            <div style="font-size:20px;font-weight:800;color:#0EA5E9;">${esc(typeData.name)}</div>
          </div>

          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #eee;border-radius:8px;padding:8px 0;">
            <tr>
              <td width="90" style="padding:10px 16px;font-size:13px;color:#888;">👤 姓名</td>
              <td style="padding:10px 16px;font-size:14px;color:#111;font-weight:700;">${esc(name)}</td>
            </tr>
            <tr>
              <td width="90" style="padding:10px 16px;font-size:13px;color:#888;border-top:1px solid #f0f0f0;">📧 Email</td>
              <td style="padding:10px 16px;font-size:14px;color:#111;font-weight:700;border-top:1px solid #f0f0f0;">
                <a href="mailto:${esc(email)}" style="color:#0EA5E9;text-decoration:none;">${esc(email)}</a>
              </td>
            </tr>
            <tr>
              <td width="90" style="padding:10px 16px;font-size:13px;color:#888;border-top:1px solid #f0f0f0;">💚 LINE ID</td>
              <td style="padding:10px 16px;font-size:14px;color:#111;font-weight:700;border-top:1px solid #f0f0f0;">${esc(lineId)}</td>
            </tr>
            <tr>
              <td width="90" style="padding:10px 16px;font-size:13px;color:#888;border-top:1px solid #f0f0f0;">🌐 來源</td>
              <td style="padding:10px 16px;font-size:13px;color:#333;border-top:1px solid #f0f0f0;">${esc(source || 'unknown')}</td>
            </tr>
            <tr>
              <td width="90" style="padding:10px 16px;font-size:13px;color:#888;border-top:1px solid #f0f0f0;">🌍 國家</td>
              <td style="padding:10px 16px;font-size:13px;color:#333;border-top:1px solid #f0f0f0;">${esc(country || '-')}</td>
            </tr>
            <tr>
              <td width="90" style="padding:10px 16px;font-size:13px;color:#888;border-top:1px solid #f0f0f0;">⏰ 時間</td>
              <td style="padding:10px 16px;font-size:13px;color:#333;border-top:1px solid #f0f0f0;">${esc(tsStr)} (UTC+8)</td>
            </tr>
            ${leadId ? `
            <tr>
              <td width="90" style="padding:10px 16px;font-size:13px;color:#888;border-top:1px solid #f0f0f0;">#️⃣ DB ID</td>
              <td style="padding:10px 16px;font-size:13px;color:#333;border-top:1px solid #f0f0f0;">#${leadId}</td>
            </tr>` : ''}
          </table>

          <div style="margin-top:24px;padding:16px 20px;background:linear-gradient(135deg,#fff8e6,#fff2d9);border-radius:8px;font-size:13.5px;color:#7a5c00;line-height:1.7;">
            📌 <strong>建議行動</strong>：<br />
            1. 24 小時內透過 LINE 主動聯繫這位新朋友<br />
            2. 用他的主播類型作為破冰主題（${esc(typeData.name)}）<br />
            3. 邀約線上諮詢，介紹相對應的培育資源
          </div>

          <div style="margin-top:20px;text-align:center;">
            <a href="https://line.me/R/ti/p/@354ykfbp" style="display:inline-block;padding:12px 24px;background:#06C755;color:#ffffff;text-decoration:none;border-radius:999px;font-size:14px;font-weight:700;">
              💬 前往 LINE 官方帳號
            </a>
          </div>

        </td></tr>

        <tr><td style="padding:20px;background:#fafafa;text-align:center;font-size:11px;color:#999;border-top:1px solid #eee;">
          此為 JDI 脈動傳媒官網自動通知 · https://jdi-pulse.com/
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ============ CONTACT: CONFIRMATION EMAIL (to business visitor) ============
export function renderContactConfirmEmail({ company, name, email, phone, types, scale, message, startTime }) {
  const typesHtml = types.map(t => `<span style="display:inline-block;padding:4px 12px;margin:2px 4px 2px 0;background:#25F4EE22;color:#0a7570;border-radius:20px;font-size:13px;font-weight:600;">${esc(t)}</span>`).join('');

  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>已收到您的合作需求</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,'Segoe UI','PingFang TC','Noto Sans TC',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f7;padding:20px 0;">
    <tr><td align="center">

      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- HEADER -->
        <tr><td style="background:linear-gradient(135deg,#05050A,#16162A);padding:32px 32px 24px;text-align:center;">
          <div style="color:#25F4EE;font-size:11px;font-weight:700;letter-spacing:2px;margin-bottom:8px;">JDI 脈動傳媒 · JDI PULSE MEDIA</div>
          <div style="color:#ffffff;font-size:22px;font-weight:800;">✅ 已收到您的合作需求</div>
        </td></tr>

        <!-- Greeting -->
        <tr><td style="padding:32px 32px 16px;text-align:center;">
          <div style="font-size:16px;color:#333;line-height:1.7;">
            <strong>${esc(name)}</strong> 您好，感謝您聯繫 JDI 脈動傳媒！<br>
            我們已收到您代表 <strong style="color:#FE2C55;">${esc(company)}</strong> 提出的合作需求。
          </div>
        </td></tr>

        <!-- Response promise -->
        <tr><td style="padding:0 32px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,#25F4EE11,#FE2C5511);border-radius:12px;padding:20px;">
            <tr><td style="text-align:center;">
              <div style="font-size:36px;margin-bottom:8px;">📞</div>
              <div style="font-size:18px;font-weight:700;color:#111;margin-bottom:4px;">24 小時內主動聯繫</div>
              <div style="font-size:13px;color:#666;">我們的專案顧問將透過 Email 或電話聯繫，深度了解您的合作需求</div>
            </td></tr>
          </table>
        </td></tr>

        <!-- Summary -->
        <tr><td style="padding:8px 32px 24px;">
          <div style="font-size:13px;color:#999;font-weight:700;letter-spacing:1px;margin-bottom:12px;">📋 需求摘要</div>
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fafafa;border-radius:12px;padding:20px;">
            <tr><td style="padding:6px 0;font-size:13px;color:#666;width:110px;vertical-align:top;">公司/組織</td>
                <td style="padding:6px 0;font-size:14px;color:#111;font-weight:600;">${esc(company)}</td></tr>
            <tr><td style="padding:6px 0;font-size:13px;color:#666;vertical-align:top;">聯絡人</td>
                <td style="padding:6px 0;font-size:14px;color:#111;">${esc(name)}</td></tr>
            <tr><td style="padding:6px 0;font-size:13px;color:#666;vertical-align:top;">Email</td>
                <td style="padding:6px 0;font-size:14px;color:#111;">${esc(email)}</td></tr>
            ${phone ? `<tr><td style="padding:6px 0;font-size:13px;color:#666;vertical-align:top;">電話</td>
                <td style="padding:6px 0;font-size:14px;color:#111;">${esc(phone)}</td></tr>` : ''}
            <tr><td style="padding:10px 0 6px;font-size:13px;color:#666;vertical-align:top;">合作類型</td>
                <td style="padding:10px 0 6px;">${typesHtml}</td></tr>
            ${scale ? `<tr><td style="padding:6px 0;font-size:13px;color:#666;vertical-align:top;">合作規模</td>
                <td style="padding:6px 0;font-size:14px;color:#111;">${esc(scale)}</td></tr>` : ''}
            ${startTime ? `<tr><td style="padding:6px 0;font-size:13px;color:#666;vertical-align:top;">希望開始</td>
                <td style="padding:6px 0;font-size:14px;color:#111;">${esc(startTime)}</td></tr>` : ''}
            <tr><td colspan="2" style="padding:12px 0 0;">
              <div style="font-size:13px;color:#666;margin-bottom:6px;">需求說明：</div>
              <div style="font-size:14px;color:#333;line-height:1.7;background:#fff;border-radius:8px;padding:14px;border:1px solid #eee;white-space:pre-wrap;">${esc(message)}</div>
            </td></tr>
          </table>
        </td></tr>

        <!-- Urgent contact -->
        <tr><td style="padding:0 32px 24px;">
          <div style="font-size:13px;color:#999;font-weight:700;letter-spacing:1px;margin-bottom:12px;">📱 急件聯繫</div>
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td width="50%" style="padding:0 6px 0 0;">
                <a href="https://line.me/R/ti/p/@354ykfbp" style="display:block;padding:14px;background:#06C755;color:#fff;text-align:center;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px;">
                  💬 LINE 官方諮詢
                </a>
              </td>
              <td width="50%" style="padding:0 0 0 6px;">
                <a href="tel:04-3603-3191" style="display:block;padding:14px;background:#111;color:#fff;text-align:center;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px;">
                  📞 04-3603-3191
                </a>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Signature -->
        <tr><td style="padding:24px 32px;border-top:1px solid #eee;background:#fafafa;">
          <div style="font-size:13px;color:#666;line-height:1.7;text-align:center;">
            <strong style="color:#111;">JDI 脈動傳媒 JDI Pulse MEDIA</strong><br>
            TikTok LIVE 官方合作經紀公會<br>
            <a href="https://jdi-pulse.com/" style="color:#25F4EE;text-decoration:none;">jdi-pulse.com</a>
          </div>
        </td></tr>

        <tr><td style="padding:16px 32px 24px;text-align:center;">
          <div style="font-size:11px;color:#aaa;line-height:1.5;">
            此為系統自動確認信，請勿直接回覆此信箱。<br>
            若需回覆，請 email 至 pulsepop9@gmail.com 或加 LINE @354ykfbp。
          </div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ============ CONTACT: ADMIN NOTIFY EMAIL ============
export function renderContactNotifyEmail({ company, name, email, phone, types, scale, message, startTime, source, country, leadId }) {
  const typesHtml = types.map(t => `<span style="display:inline-block;padding:3px 10px;margin:2px 4px 2px 0;background:#FE2C55;color:#fff;border-radius:12px;font-size:12px;font-weight:600;">${esc(t)}</span>`).join('');
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8">
  <title>新商業合作需求</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,'Segoe UI','PingFang TC','Noto Sans TC',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f7;padding:20px 0;">
    <tr><td align="center">

      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">

        <tr><td style="background:linear-gradient(135deg,#FE2C55,#FF6B9D);padding:24px 28px;">
          <div style="color:#fff;font-size:12px;font-weight:600;letter-spacing:1px;opacity:0.9;">JDI 官網通知 · CONTACT LEAD</div>
          <div style="color:#fff;font-size:22px;font-weight:800;margin-top:6px;">🤝 新商業合作需求</div>
        </td></tr>

        <tr><td style="padding:24px 28px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td style="padding:6px 0;font-size:13px;color:#666;width:100px;vertical-align:top;">Lead ID</td>
                <td style="padding:6px 0;font-size:14px;color:#111;font-family:monospace;">#${esc(leadId || 'N/A')}</td></tr>
            <tr><td style="padding:6px 0;font-size:13px;color:#666;vertical-align:top;">時間</td>
                <td style="padding:6px 0;font-size:14px;color:#111;font-family:monospace;">${esc(now)}</td></tr>
            <tr><td style="padding:6px 0;font-size:13px;color:#666;vertical-align:top;">來源</td>
                <td style="padding:6px 0;font-size:14px;color:#111;">${esc(source || 'partnership-page')} ${country ? '· ' + esc(country) : ''}</td></tr>
          </table>

          <hr style="border:none;border-top:1px solid #eee;margin:16px 0;">

          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td style="padding:6px 0;font-size:13px;color:#666;width:100px;vertical-align:top;">公司</td>
                <td style="padding:6px 0;font-size:16px;color:#111;font-weight:700;">${esc(company)}</td></tr>
            <tr><td style="padding:6px 0;font-size:13px;color:#666;vertical-align:top;">聯絡人</td>
                <td style="padding:6px 0;font-size:15px;color:#111;font-weight:600;">${esc(name)}</td></tr>
            <tr><td style="padding:6px 0;font-size:13px;color:#666;vertical-align:top;">Email</td>
                <td style="padding:6px 0;font-size:14px;"><a href="mailto:${esc(email)}" style="color:#FE2C55;text-decoration:none;font-weight:600;">${esc(email)}</a></td></tr>
            ${phone ? `<tr><td style="padding:6px 0;font-size:13px;color:#666;vertical-align:top;">電話</td>
                <td style="padding:6px 0;font-size:14px;"><a href="tel:${esc(phone)}" style="color:#FE2C55;text-decoration:none;font-weight:600;">${esc(phone)}</a></td></tr>` : ''}
            <tr><td style="padding:10px 0 6px;font-size:13px;color:#666;vertical-align:top;">合作類型</td>
                <td style="padding:10px 0 6px;">${typesHtml}</td></tr>
            ${scale ? `<tr><td style="padding:6px 0;font-size:13px;color:#666;vertical-align:top;">合作規模</td>
                <td style="padding:6px 0;font-size:14px;color:#111;">${esc(scale)}</td></tr>` : ''}
            ${startTime ? `<tr><td style="padding:6px 0;font-size:13px;color:#666;vertical-align:top;">希望開始</td>
                <td style="padding:6px 0;font-size:14px;color:#111;">${esc(startTime)}</td></tr>` : ''}
          </table>

          <div style="margin-top:16px;padding:16px;background:#fafafa;border-left:3px solid #FE2C55;border-radius:6px;">
            <div style="font-size:12px;color:#999;font-weight:700;letter-spacing:1px;margin-bottom:8px;">需求說明</div>
            <div style="font-size:14px;color:#333;line-height:1.7;white-space:pre-wrap;">${esc(message)}</div>
          </div>

          <div style="margin-top:20px;padding:14px;background:linear-gradient(135deg,#25F4EE22,#FE2C5522);border-radius:8px;text-align:center;">
            <div style="font-size:13px;color:#111;line-height:1.6;">
              ⚡ <strong>建議在 24 小時內回覆</strong><br>
              直接回覆此信 → 客戶會收到（Reply-To 已設為客戶 Email）
            </div>
          </div>

          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:18px;">
            <tr>
              <td width="50%" style="padding:0 6px 0 0;">
                <a href="mailto:${esc(email)}" style="display:block;padding:12px;background:#111;color:#fff;text-align:center;text-decoration:none;border-radius:8px;font-weight:700;font-size:13px;">
                  📧 直接回信
                </a>
              </td>
              <td width="50%" style="padding:0 0 0 6px;">
                ${phone ? `<a href="tel:${esc(phone)}" style="display:block;padding:12px;background:#25F4EE;color:#000;text-align:center;text-decoration:none;border-radius:8px;font-weight:700;font-size:13px;">
                  📞 撥打電話
                </a>` : `<div style="display:block;padding:12px;background:#eee;color:#999;text-align:center;border-radius:8px;font-weight:600;font-size:13px;">(無提供電話)</div>`}
              </td>
            </tr>
          </table>

        </td></tr>

        <tr><td style="padding:16px 28px;background:#fafafa;text-align:center;">
          <div style="font-size:11px;color:#aaa;">
            JDI 脈動傳媒 · JDI PULSE MEDIA · 商業合作 Lead 通知系統
          </div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ============ CAREERS: APPLICANT CONFIRM EMAIL ============
export function renderCareersConfirmEmail({
  name, email, phone, positionName, department,
  startDate, slotLabels, experience, motivation,
  resumeUrl, portfolioUrl
}) {
  const deptLabel = {
    online:  '線上營運部',
    studio:  '線下直播間部',
    support: '支援部門'
  }[department] || department;

  const slotsHtml = (slotLabels && slotLabels.length)
    ? slotLabels.map(s => `<span style="display:inline-block;padding:3px 10px;margin:2px 4px 2px 0;background:#25F4EE22;color:#0a7570;border-radius:12px;font-size:12px;font-weight:600;">${esc(s)}</span>`).join('')
    : '<span style="color:#999;font-size:13px;">未指定</span>';

  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>已收到您的履歷</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,'Segoe UI','PingFang TC','Noto Sans TC',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f7;padding:20px 0;">
    <tr><td align="center">

      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <tr><td style="background:linear-gradient(135deg,#05050A,#16162A);padding:32px 32px 24px;text-align:center;">
          <div style="color:#25F4EE;font-size:11px;font-weight:700;letter-spacing:2px;margin-bottom:8px;">JDI 脈動傳媒 · JDI PULSE MEDIA</div>
          <div style="color:#ffffff;font-size:22px;font-weight:800;">✅ 已收到您的履歷</div>
        </td></tr>

        <tr><td style="padding:32px 32px 16px;text-align:center;">
          <div style="font-size:16px;color:#333;line-height:1.7;">
            <strong>${esc(name)}</strong> 您好，感謝您應徵 JDI 脈動傳媒！<br>
            我們已收到您應徵 <strong style="color:#FE2C55;">${esc(positionName)}</strong> 的履歷資料。
          </div>
        </td></tr>

        <tr><td style="padding:0 32px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,#25F4EE11,#FE2C5511);border-radius:12px;padding:20px;">
            <tr><td style="text-align:center;">
              <div style="font-size:36px;margin-bottom:8px;">📞</div>
              <div style="font-size:18px;font-weight:700;color:#111;margin-bottom:4px;">5 個工作天內回覆</div>
              <div style="font-size:13px;color:#666;">若通過履歷審核，我們的 HR 將透過 Email 或電話聯繫安排面試</div>
            </td></tr>
          </table>
        </td></tr>

        <tr><td style="padding:8px 32px 24px;">
          <div style="font-size:13px;color:#999;font-weight:700;letter-spacing:1px;margin-bottom:12px;">📋 應徵摘要</div>
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fafafa;border-radius:12px;padding:20px;">
            <tr><td style="padding:6px 0;font-size:13px;color:#666;width:110px;vertical-align:top;">應徵職缺</td>
                <td style="padding:6px 0;font-size:15px;color:#111;font-weight:700;">${esc(positionName)}</td></tr>
            <tr><td style="padding:6px 0;font-size:13px;color:#666;vertical-align:top;">所屬部門</td>
                <td style="padding:6px 0;font-size:14px;color:#111;">${esc(deptLabel)}</td></tr>
            <tr><td style="padding:6px 0;font-size:13px;color:#666;vertical-align:top;">姓名</td>
                <td style="padding:6px 0;font-size:14px;color:#111;">${esc(name)}</td></tr>
            <tr><td style="padding:6px 0;font-size:13px;color:#666;vertical-align:top;">Email</td>
                <td style="padding:6px 0;font-size:14px;color:#111;">${esc(email)}</td></tr>
            <tr><td style="padding:6px 0;font-size:13px;color:#666;vertical-align:top;">電話</td>
                <td style="padding:6px 0;font-size:14px;color:#111;">${esc(phone)}</td></tr>
            ${startDate ? `<tr><td style="padding:6px 0;font-size:13px;color:#666;vertical-align:top;">期望到職日</td>
                <td style="padding:6px 0;font-size:14px;color:#111;">${esc(startDate)}</td></tr>` : ''}
            <tr><td style="padding:10px 0 6px;font-size:13px;color:#666;vertical-align:top;">可面試時段</td>
                <td style="padding:10px 0 6px;">${slotsHtml}</td></tr>
            <tr><td style="padding:10px 0 6px;font-size:13px;color:#666;vertical-align:top;">履歷連結</td>
                <td style="padding:10px 0 6px;font-size:13px;"><a href="${esc(resumeUrl)}" style="color:#25F4EE;word-break:break-all;text-decoration:underline;">${esc(resumeUrl)}</a></td></tr>
            ${portfolioUrl ? `<tr><td style="padding:6px 0;font-size:13px;color:#666;vertical-align:top;">作品集</td>
                <td style="padding:6px 0;font-size:13px;"><a href="${esc(portfolioUrl)}" style="color:#25F4EE;word-break:break-all;text-decoration:underline;">${esc(portfolioUrl)}</a></td></tr>` : ''}
            ${experience ? `<tr><td colspan="2" style="padding:12px 0 0;">
              <div style="font-size:13px;color:#666;margin-bottom:6px;">相關經驗：</div>
              <div style="font-size:14px;color:#333;line-height:1.7;background:#fff;border-radius:8px;padding:14px;border:1px solid #eee;white-space:pre-wrap;">${esc(experience)}</div>
            </td></tr>` : ''}
            <tr><td colspan="2" style="padding:12px 0 0;">
              <div style="font-size:13px;color:#666;margin-bottom:6px;">加入動機：</div>
              <div style="font-size:14px;color:#333;line-height:1.7;background:#fff;border-radius:8px;padding:14px;border:1px solid #eee;white-space:pre-wrap;">${esc(motivation)}</div>
            </td></tr>
          </table>
        </td></tr>

        <tr><td style="padding:0 32px 24px;">
          <div style="font-size:13px;color:#999;font-weight:700;letter-spacing:1px;margin-bottom:12px;">🎯 接下來的流程</div>
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fafafa;border-radius:12px;padding:20px;">
            <tr><td style="padding:8px 0;font-size:14px;color:#333;line-height:1.7;">
              <strong style="color:#25F4EE;">① 履歷審核</strong>（3-5 個工作天）<br>
              <span style="color:#666;font-size:13px;padding-left:16px;">HR 團隊會仔細審閱您的資料</span>
            </td></tr>
            <tr><td style="padding:8px 0;font-size:14px;color:#333;line-height:1.7;">
              <strong style="color:#25F4EE;">② 電話 / 視訊初談</strong>（30 分鐘）<br>
              <span style="color:#666;font-size:13px;padding-left:16px;">聊聊您的背景與期待，我們也會介紹公會現況</span>
            </td></tr>
            <tr><td style="padding:8px 0;font-size:14px;color:#333;line-height:1.7;">
              <strong style="color:#25F4EE;">③ 現場面試</strong>（60 分鐘）<br>
              <span style="color:#666;font-size:13px;padding-left:16px;">到公司實地了解直播間環境，跟未來主管深聊</span>
            </td></tr>
            <tr><td style="padding:8px 0;font-size:14px;color:#333;line-height:1.7;">
              <strong style="color:#25F4EE;">④ Offer + 到職</strong><br>
              <span style="color:#666;font-size:13px;padding-left:16px;">錄取後 2 週內到職，帶你認識團隊</span>
            </td></tr>
          </table>
        </td></tr>

        <tr><td style="padding:0 32px 24px;">
          <div style="font-size:13px;color:#999;font-weight:700;letter-spacing:1px;margin-bottom:12px;">📱 若有疑問，隨時聯繫我們</div>
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td width="50%" style="padding:0 6px 0 0;">
                <a href="https://line.me/R/ti/p/@354ykfbp" style="display:block;padding:14px;background:#06C755;color:#fff;text-align:center;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px;">
                  💬 LINE 官方諮詢
                </a>
              </td>
              <td width="50%" style="padding:0 0 0 6px;">
                <a href="tel:04-3603-3191" style="display:block;padding:14px;background:#111;color:#fff;text-align:center;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px;">
                  📞 04-3603-3191
                </a>
              </td>
            </tr>
          </table>
        </td></tr>

        <tr><td style="padding:24px 32px;border-top:1px solid #eee;background:#fafafa;">
          <div style="font-size:13px;color:#666;line-height:1.7;text-align:center;">
            <strong style="color:#111;">JDI 脈動傳媒 JDI Pulse MEDIA</strong><br>
            TikTok LIVE 官方合作經紀公會<br>
            <a href="https://jdi-pulse.com/" style="color:#25F4EE;text-decoration:none;">jdi-pulse.com</a>
          </div>
        </td></tr>

        <tr><td style="padding:16px 32px 24px;text-align:center;">
          <div style="font-size:11px;color:#aaa;line-height:1.5;">
            此為系統自動確認信，請勿直接回覆此信箱。<br>
            若需回覆，請 email 至 pulsepop9@gmail.com 或加 LINE @354ykfbp。
          </div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ============ CAREERS: ADMIN NOTIFY EMAIL ============
export function renderCareersNotifyEmail({
  name, email, phone, positionName, department,
  startDate, slotLabels, experience, motivation,
  resumeUrl, portfolioUrl, source, country, appId
}) {
  const deptColor = {
    online:  '#25F4EE',
    studio:  '#FE2C55',
    support: '#FFA500'
  }[department] || '#666';
  const deptLabel = {
    online:  '線上營運部',
    studio:  '線下直播間部',
    support: '支援部門'
  }[department] || department;

  const slotsHtml = (slotLabels && slotLabels.length)
    ? slotLabels.map(s => `<span style="display:inline-block;padding:3px 10px;margin:2px 4px 2px 0;background:${deptColor};color:#fff;border-radius:12px;font-size:12px;font-weight:600;">${esc(s)}</span>`).join('')
    : '<span style="color:#999;font-size:13px;">未指定</span>';

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8">
  <title>新職缺應徵</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,'Segoe UI','PingFang TC','Noto Sans TC',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f7;padding:20px 0;">
    <tr><td align="center">

      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">

        <tr><td style="background:linear-gradient(135deg,${deptColor},#16162A);padding:24px 28px;">
          <div style="color:#fff;font-size:12px;font-weight:600;letter-spacing:1px;opacity:0.9;">JDI 官網通知 · CAREERS APPLICATION</div>
          <div style="color:#fff;font-size:22px;font-weight:800;margin-top:6px;">📮 新職缺應徵</div>
          <div style="color:#fff;font-size:14px;margin-top:8px;opacity:0.9;">
            <strong style="background:rgba(255,255,255,0.2);padding:3px 10px;border-radius:6px;">${esc(positionName)}</strong>
            <span style="margin-left:8px;">${esc(deptLabel)}</span>
          </div>
        </td></tr>

        <tr><td style="padding:24px 28px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td style="padding:6px 0;font-size:13px;color:#666;width:100px;vertical-align:top;">應徵編號</td>
                <td style="padding:6px 0;font-size:14px;color:#111;font-family:monospace;">#${esc(appId || 'N/A')}</td></tr>
            <tr><td style="padding:6px 0;font-size:13px;color:#666;vertical-align:top;">時間</td>
                <td style="padding:6px 0;font-size:14px;color:#111;font-family:monospace;">${esc(now)}</td></tr>
            <tr><td style="padding:6px 0;font-size:13px;color:#666;vertical-align:top;">來源</td>
                <td style="padding:6px 0;font-size:14px;color:#111;">${esc(source || 'careers-page')} ${country ? '· ' + esc(country) : ''}</td></tr>
          </table>

          <hr style="border:none;border-top:1px solid #eee;margin:16px 0;">

          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td style="padding:6px 0;font-size:13px;color:#666;width:100px;vertical-align:top;">姓名</td>
                <td style="padding:6px 0;font-size:16px;color:#111;font-weight:700;">${esc(name)}</td></tr>
            <tr><td style="padding:6px 0;font-size:13px;color:#666;vertical-align:top;">Email</td>
                <td style="padding:6px 0;font-size:14px;"><a href="mailto:${esc(email)}" style="color:${deptColor};text-decoration:none;font-weight:600;">${esc(email)}</a></td></tr>
            <tr><td style="padding:6px 0;font-size:13px;color:#666;vertical-align:top;">電話</td>
                <td style="padding:6px 0;font-size:14px;"><a href="tel:${esc(phone)}" style="color:${deptColor};text-decoration:none;font-weight:600;">${esc(phone)}</a></td></tr>
            ${startDate ? `<tr><td style="padding:6px 0;font-size:13px;color:#666;vertical-align:top;">期望到職</td>
                <td style="padding:6px 0;font-size:14px;color:#111;font-weight:600;">${esc(startDate)}</td></tr>` : ''}
            <tr><td style="padding:10px 0 6px;font-size:13px;color:#666;vertical-align:top;">面試時段</td>
                <td style="padding:10px 0 6px;">${slotsHtml}</td></tr>
          </table>

          <div style="margin-top:16px;padding:16px;background:linear-gradient(135deg,${deptColor}15,#fafafa);border-left:3px solid ${deptColor};border-radius:6px;">
            <div style="font-size:12px;color:#999;font-weight:700;letter-spacing:1px;margin-bottom:8px;">📎 履歷連結</div>
            <a href="${esc(resumeUrl)}" style="color:${deptColor};font-size:14px;font-weight:600;word-break:break-all;text-decoration:underline;">${esc(resumeUrl)}</a>
          </div>

          ${portfolioUrl ? `<div style="margin-top:12px;padding:16px;background:#fafafa;border-left:3px solid #25F4EE;border-radius:6px;">
            <div style="font-size:12px;color:#999;font-weight:700;letter-spacing:1px;margin-bottom:8px;">🎨 作品集</div>
            <a href="${esc(portfolioUrl)}" style="color:#25F4EE;font-size:14px;font-weight:600;word-break:break-all;text-decoration:underline;">${esc(portfolioUrl)}</a>
          </div>` : ''}

          ${experience ? `<div style="margin-top:16px;padding:16px;background:#fafafa;border-left:3px solid #FFA500;border-radius:6px;">
            <div style="font-size:12px;color:#999;font-weight:700;letter-spacing:1px;margin-bottom:8px;">💼 相關經驗</div>
            <div style="font-size:14px;color:#333;line-height:1.7;white-space:pre-wrap;">${esc(experience)}</div>
          </div>` : ''}

          <div style="margin-top:16px;padding:16px;background:#fafafa;border-left:3px solid #FE2C55;border-radius:6px;">
            <div style="font-size:12px;color:#999;font-weight:700;letter-spacing:1px;margin-bottom:8px;">🔥 加入動機</div>
            <div style="font-size:14px;color:#333;line-height:1.7;white-space:pre-wrap;">${esc(motivation)}</div>
          </div>

          <div style="margin-top:20px;padding:14px;background:linear-gradient(135deg,#25F4EE22,#FE2C5522);border-radius:8px;text-align:center;">
            <div style="font-size:13px;color:#111;line-height:1.6;">
              ⚡ <strong>建議在 5 個工作天內回覆</strong><br>
              直接回覆此信 → 應徵者會收到（Reply-To 已設為應徵者 Email）
            </div>
          </div>

          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:18px;">
            <tr>
              <td width="33%" style="padding:0 4px 0 0;">
                <a href="${esc(resumeUrl)}" style="display:block;padding:12px;background:${deptColor};color:#fff;text-align:center;text-decoration:none;border-radius:8px;font-weight:700;font-size:13px;">
                  📎 看履歷
                </a>
              </td>
              <td width="33%" style="padding:0 4px;">
                <a href="mailto:${esc(email)}" style="display:block;padding:12px;background:#111;color:#fff;text-align:center;text-decoration:none;border-radius:8px;font-weight:700;font-size:13px;">
                  📧 回信
                </a>
              </td>
              <td width="33%" style="padding:0 0 0 4px;">
                <a href="tel:${esc(phone)}" style="display:block;padding:12px;background:#25F4EE;color:#000;text-align:center;text-decoration:none;border-radius:8px;font-weight:700;font-size:13px;">
                  📞 撥打
                </a>
              </td>
            </tr>
          </table>

        </td></tr>

        <tr><td style="padding:16px 28px;background:#fafafa;text-align:center;">
          <div style="font-size:11px;color:#aaa;">
            JDI 脈動傳媒 · JDI PULSE MEDIA · Careers 應徵通知系統
          </div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ============================================================
// VENUES: OWNER CONFIRM EMAIL (寄給屋主 / 場地業主)
// ============================================================
export function renderVenuesConfirmEmail({
  name, cityLabel, district,
  spaceSizeLabel, spaceTypeLabel, wifiSpeedLabel, hasLighting,
  availableTimeLabels, cooperationModeLabel,
  photosUrl, spaceFeatures, message,
  lineId
}) {
  const slotsHtml = (availableTimeLabels && availableTimeLabels.length)
    ? availableTimeLabels.map(s => `<span style="display:inline-block;padding:3px 10px;margin:2px 4px 2px 0;background:#25F4EE22;color:#0a7570;border-radius:12px;font-size:12px;font-weight:600;">${esc(s)}</span>`).join('')
    : '<span style="color:#999;font-size:13px;">未指定 · 可協商</span>';

  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>已收到您的場地登記</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,'Segoe UI','PingFang TC','Noto Sans TC',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f7;padding:20px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <tr><td style="background:linear-gradient(135deg,#05050A,#16162A);padding:32px 32px 24px;text-align:center;">
          <div style="color:#25F4EE;font-size:11px;font-weight:700;letter-spacing:2px;margin-bottom:8px;">JDI 脈動傳媒 · 全台直播間夥伴計畫</div>
          <div style="color:#ffffff;font-size:22px;font-weight:800;">🏠 已收到您的場地登記</div>
        </td></tr>

        <tr><td style="padding:32px 32px 16px;text-align:center;">
          <div style="font-size:16px;color:#333;line-height:1.7;">
            <strong>${esc(name)}</strong> 您好，感謝您有意成為 JDI 直播間合作夥伴！<br>
            我們已收到您的 <strong style="color:#FE2C55;">${esc(cityLabel)}${district ? ' ' + esc(district) : ''}</strong> 場地資料。
          </div>
        </td></tr>

        <tr><td style="padding:0 32px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,#25F4EE11,#FE2C5511);border-radius:12px;padding:20px;">
            <tr><td style="text-align:center;">
              <div style="font-size:36px;margin-bottom:8px;">📞</div>
              <div style="font-size:18px;font-weight:700;color:#111;margin-bottom:4px;">3 個工作天內主動聯繫</div>
              <div style="font-size:13px;color:#666;">場地媒合團隊將透過 Email / 電話 / LINE 與您安排線上初談或現場場勘</div>
            </td></tr>
          </table>
        </td></tr>

        <tr><td style="padding:8px 32px 24px;">
          <div style="font-size:13px;color:#999;font-weight:700;letter-spacing:1px;margin-bottom:12px;">📋 場地摘要</div>
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fafafa;border-radius:12px;padding:20px;">
            <tr><td style="padding:6px 0;font-size:13px;color:#666;width:110px;vertical-align:top;">地區</td>
                <td style="padding:6px 0;font-size:15px;color:#111;font-weight:700;">${esc(cityLabel)}${district ? '　' + esc(district) : ''}</td></tr>
            <tr><td style="padding:6px 0;font-size:13px;color:#666;vertical-align:top;">空間大小</td>
                <td style="padding:6px 0;font-size:14px;color:#111;">${esc(spaceSizeLabel)}</td></tr>
            <tr><td style="padding:6px 0;font-size:13px;color:#666;vertical-align:top;">空間類型</td>
                <td style="padding:6px 0;font-size:14px;color:#111;">${esc(spaceTypeLabel)}</td></tr>
            <tr><td style="padding:6px 0;font-size:13px;color:#666;vertical-align:top;">Wi-Fi 速度</td>
                <td style="padding:6px 0;font-size:14px;color:#111;">${esc(wifiSpeedLabel)}</td></tr>
            <tr><td style="padding:6px 0;font-size:13px;color:#666;vertical-align:top;">基本補光</td>
                <td style="padding:6px 0;font-size:14px;color:#111;">${hasLighting ? '✅ 有' : '⚠️ 無（我們可協助補齊）'}</td></tr>
            <tr><td style="padding:10px 0 6px;font-size:13px;color:#666;vertical-align:top;">可用時段</td>
                <td style="padding:10px 0 6px;">${slotsHtml}</td></tr>
            <tr><td style="padding:6px 0;font-size:13px;color:#666;vertical-align:top;">合作模式</td>
                <td style="padding:6px 0;font-size:14px;color:#111;font-weight:600;">${esc(cooperationModeLabel)}</td></tr>
            ${lineId ? `<tr><td style="padding:6px 0;font-size:13px;color:#666;vertical-align:top;">LINE ID</td>
                <td style="padding:6px 0;font-size:14px;color:#111;">${esc(lineId)}</td></tr>` : ''}
            ${photosUrl ? `<tr><td style="padding:10px 0 6px;font-size:13px;color:#666;vertical-align:top;">場地照片</td>
                <td style="padding:10px 0 6px;font-size:13px;"><a href="${esc(photosUrl)}" style="color:#25F4EE;word-break:break-all;text-decoration:underline;">${esc(photosUrl)}</a></td></tr>` : ''}
            ${spaceFeatures ? `<tr><td colspan="2" style="padding:12px 0 0;">
              <div style="font-size:13px;color:#666;margin-bottom:6px;">場地特色：</div>
              <div style="font-size:14px;color:#333;line-height:1.7;background:#fff;border-radius:8px;padding:14px;border:1px solid #eee;white-space:pre-wrap;">${esc(spaceFeatures)}</div>
            </td></tr>` : ''}
            ${message ? `<tr><td colspan="2" style="padding:12px 0 0;">
              <div style="font-size:13px;color:#666;margin-bottom:6px;">其他備註：</div>
              <div style="font-size:14px;color:#333;line-height:1.7;background:#fff;border-radius:8px;padding:14px;border:1px solid #eee;white-space:pre-wrap;">${esc(message)}</div>
            </td></tr>` : ''}
          </table>
        </td></tr>

        <tr><td style="padding:0 32px 24px;">
          <div style="font-size:13px;color:#999;font-weight:700;letter-spacing:1px;margin-bottom:12px;">🎯 接下來的流程</div>
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fafafa;border-radius:12px;padding:20px;">
            <tr><td style="padding:8px 0;font-size:14px;color:#333;line-height:1.7;">
              <strong style="color:#25F4EE;">① 線上初談</strong>（3 個工作天內）<br>
              <span style="color:#666;font-size:13px;padding-left:16px;">場地媒合團隊透過電話 / LINE 了解場地細節與合作意向</span>
            </td></tr>
            <tr><td style="padding:8px 0;font-size:14px;color:#333;line-height:1.7;">
              <strong style="color:#25F4EE;">② 現場場勘</strong>（1–2 週內）<br>
              <span style="color:#666;font-size:13px;padding-left:16px;">實地檢查空間、光線、Wi-Fi、隔音；提供設備需求評估</span>
            </td></tr>
            <tr><td style="padding:8px 0;font-size:14px;color:#333;line-height:1.7;">
              <strong style="color:#25F4EE;">③ 合作簽約</strong><br>
              <span style="color:#666;font-size:13px;padding-left:16px;">依場地條件協商分潤 / 使用費、保險、SOP、責任範圍</span>
            </td></tr>
            <tr><td style="padding:8px 0;font-size:14px;color:#333;line-height:1.7;">
              <strong style="color:#25F4EE;">④ 主播進駐上線</strong>（簽約後 1–2 週）<br>
              <span style="color:#666;font-size:13px;padding-left:16px;">補齊設備 → 主播試播 → 正式使用場地開始創造收益</span>
            </td></tr>
          </table>
        </td></tr>

        <tr><td style="padding:0 32px 24px;">
          <div style="font-size:13px;color:#999;font-weight:700;letter-spacing:1px;margin-bottom:12px;">📱 若有疑問，隨時聯繫我們</div>
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td width="50%" style="padding:0 6px 0 0;">
                <a href="https://line.me/R/ti/p/@354ykfbp" style="display:block;padding:14px;background:#06C755;color:#fff;text-align:center;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px;">
                  💬 LINE 官方諮詢
                </a>
              </td>
              <td width="50%" style="padding:0 0 0 6px;">
                <a href="tel:04-3603-3191" style="display:block;padding:14px;background:#111;color:#fff;text-align:center;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px;">
                  📞 04-3603-3191
                </a>
              </td>
            </tr>
          </table>
        </td></tr>

        <tr><td style="padding:24px 32px;border-top:1px solid #eee;background:#fafafa;">
          <div style="font-size:13px;color:#666;line-height:1.7;text-align:center;">
            <strong style="color:#111;">JDI 脈動傳媒 JDI Pulse MEDIA</strong><br>
            TikTok LIVE 官方合作經紀公會 · 全台直播間夥伴計畫<br>
            <a href="https://jdi-pulse.com/venues" style="color:#25F4EE;text-decoration:none;">jdi-pulse.com/venues</a>
          </div>
        </td></tr>

        <tr><td style="padding:16px 32px 24px;text-align:center;">
          <div style="font-size:11px;color:#aaa;line-height:1.5;">
            此為系統自動確認信，請勿直接回覆此信箱。<br>
            若需回覆，請 email 至 pulsepop9@gmail.com 或加 LINE @354ykfbp。
          </div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ============================================================
// VENUES: ADMIN NOTIFY EMAIL (寄給 HR / 場地媒合團隊)
// ============================================================
export function renderVenuesNotifyEmail({
  name, email, phone, lineId,
  cityLabel, district,
  spaceSizeLabel, spaceTypeLabel, wifiSpeedLabel, hasLighting,
  availableTimeLabels, cooperationModeLabel, cooperationModeKey,
  photosUrl, spaceFeatures, message,
  source, country, appId
}) {
  const modeColor = {
    profit_share: '#FE2C55',
    hourly_rate:  '#25F4EE',
    both:         '#FFA500'
  }[cooperationModeKey] || '#666';

  const slotsHtml = (availableTimeLabels && availableTimeLabels.length)
    ? availableTimeLabels.map(s => `<span style="display:inline-block;padding:3px 10px;margin:2px 4px 2px 0;background:${modeColor};color:#fff;border-radius:12px;font-size:12px;font-weight:600;">${esc(s)}</span>`).join('')
    : '<span style="color:#999;font-size:13px;">未指定 · 可協商</span>';

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8">
  <title>新場地登記</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,'Segoe UI','PingFang TC','Noto Sans TC',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f7;padding:20px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">

        <tr><td style="background:linear-gradient(135deg,${modeColor},#16162A);padding:24px 28px;">
          <div style="color:#fff;font-size:12px;font-weight:600;letter-spacing:1px;opacity:0.9;">JDI 官網通知 · VENUE APPLICATION</div>
          <div style="color:#fff;font-size:22px;font-weight:800;margin-top:6px;">🏠 新場地登記</div>
          <div style="color:#fff;font-size:14px;margin-top:8px;opacity:0.95;">
            <strong style="background:rgba(255,255,255,0.2);padding:3px 10px;border-radius:6px;">${esc(cityLabel)}${district ? ' ' + esc(district) : ''}</strong>
            <span style="margin-left:8px;">${esc(spaceSizeLabel)}</span>
          </div>
        </td></tr>

        <tr><td style="padding:24px 28px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td style="padding:6px 0;font-size:13px;color:#666;width:100px;vertical-align:top;">登記編號</td>
                <td style="padding:6px 0;font-size:14px;color:#111;font-family:monospace;">#${esc(appId || 'N/A')}</td></tr>
            <tr><td style="padding:6px 0;font-size:13px;color:#666;vertical-align:top;">時間</td>
                <td style="padding:6px 0;font-size:14px;color:#111;font-family:monospace;">${esc(now)}</td></tr>
            <tr><td style="padding:6px 0;font-size:13px;color:#666;vertical-align:top;">來源</td>
                <td style="padding:6px 0;font-size:14px;color:#111;">${esc(source || 'venues-page')} ${country ? '· ' + esc(country) : ''}</td></tr>
          </table>

          <hr style="border:none;border-top:1px solid #eee;margin:16px 0;">

          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td style="padding:6px 0;font-size:13px;color:#666;width:100px;vertical-align:top;">屋主</td>
                <td style="padding:6px 0;font-size:16px;color:#111;font-weight:700;">${esc(name)}</td></tr>
            <tr><td style="padding:6px 0;font-size:13px;color:#666;vertical-align:top;">Email</td>
                <td style="padding:6px 0;font-size:14px;"><a href="mailto:${esc(email)}" style="color:${modeColor};text-decoration:none;font-weight:600;">${esc(email)}</a></td></tr>
            <tr><td style="padding:6px 0;font-size:13px;color:#666;vertical-align:top;">電話</td>
                <td style="padding:6px 0;font-size:14px;"><a href="tel:${esc(phone)}" style="color:${modeColor};text-decoration:none;font-weight:600;">${esc(phone)}</a></td></tr>
            ${lineId ? `<tr><td style="padding:6px 0;font-size:13px;color:#666;vertical-align:top;">LINE ID</td>
                <td style="padding:6px 0;font-size:14px;color:#111;font-weight:600;">${esc(lineId)}</td></tr>` : ''}
          </table>

          <hr style="border:none;border-top:1px solid #eee;margin:16px 0;">

          <div style="font-size:12px;color:#999;font-weight:700;letter-spacing:1px;margin-bottom:10px;">🏠 場地資訊</div>
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td style="padding:6px 0;font-size:13px;color:#666;width:100px;vertical-align:top;">地區</td>
                <td style="padding:6px 0;font-size:14px;color:#111;font-weight:600;">${esc(cityLabel)}${district ? '　' + esc(district) : ''}</td></tr>
            <tr><td style="padding:6px 0;font-size:13px;color:#666;vertical-align:top;">空間大小</td>
                <td style="padding:6px 0;font-size:14px;color:#111;">${esc(spaceSizeLabel)}</td></tr>
            <tr><td style="padding:6px 0;font-size:13px;color:#666;vertical-align:top;">空間類型</td>
                <td style="padding:6px 0;font-size:14px;color:#111;">${esc(spaceTypeLabel)}</td></tr>
            <tr><td style="padding:6px 0;font-size:13px;color:#666;vertical-align:top;">Wi-Fi 速度</td>
                <td style="padding:6px 0;font-size:14px;color:#111;">${esc(wifiSpeedLabel)}</td></tr>
            <tr><td style="padding:6px 0;font-size:13px;color:#666;vertical-align:top;">基本補光</td>
                <td style="padding:6px 0;font-size:14px;color:#111;">${hasLighting ? '✅ 有' : '⚠️ 無（需協助補齊）'}</td></tr>
            <tr><td style="padding:10px 0 6px;font-size:13px;color:#666;vertical-align:top;">可用時段</td>
                <td style="padding:10px 0 6px;">${slotsHtml}</td></tr>
          </table>

          <div style="margin-top:16px;padding:16px;background:linear-gradient(135deg,${modeColor}15,#fafafa);border-left:3px solid ${modeColor};border-radius:6px;">
            <div style="font-size:12px;color:#999;font-weight:700;letter-spacing:1px;margin-bottom:8px;">💰 合作模式偏好</div>
            <div style="font-size:15px;color:#111;font-weight:700;">${esc(cooperationModeLabel)}</div>
          </div>

          ${photosUrl ? `<div style="margin-top:12px;padding:16px;background:#fafafa;border-left:3px solid #25F4EE;border-radius:6px;">
            <div style="font-size:12px;color:#999;font-weight:700;letter-spacing:1px;margin-bottom:8px;">📸 場地照片</div>
            <a href="${esc(photosUrl)}" style="color:#25F4EE;font-size:14px;font-weight:600;word-break:break-all;text-decoration:underline;">${esc(photosUrl)}</a>
          </div>` : `<div style="margin-top:12px;padding:12px 16px;background:#fff8e1;border-left:3px solid #FFA500;border-radius:6px;">
            <div style="font-size:13px;color:#a06400;">⚠️ 屋主未提供場地照片 — 場勘前建議先請對方拍照傳送</div>
          </div>`}

          ${spaceFeatures ? `<div style="margin-top:16px;padding:16px;background:#fafafa;border-left:3px solid #FE2C55;border-radius:6px;">
            <div style="font-size:12px;color:#999;font-weight:700;letter-spacing:1px;margin-bottom:8px;">✨ 場地特色</div>
            <div style="font-size:14px;color:#333;line-height:1.7;white-space:pre-wrap;">${esc(spaceFeatures)}</div>
          </div>` : ''}

          ${message ? `<div style="margin-top:16px;padding:16px;background:#fafafa;border-left:3px solid #FFA500;border-radius:6px;">
            <div style="font-size:12px;color:#999;font-weight:700;letter-spacing:1px;margin-bottom:8px;">💬 其他備註</div>
            <div style="font-size:14px;color:#333;line-height:1.7;white-space:pre-wrap;">${esc(message)}</div>
          </div>` : ''}

          <div style="margin-top:20px;padding:14px;background:linear-gradient(135deg,#25F4EE22,#FE2C5522);border-radius:8px;text-align:center;">
            <div style="font-size:13px;color:#111;line-height:1.6;">
              ⚡ <strong>建議在 3 個工作天內回覆</strong><br>
              直接回覆此信 → 屋主會收到（Reply-To 已設為屋主 Email）
            </div>
          </div>

          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:18px;">
            <tr>
              <td width="33%" style="padding:0 4px 0 0;">
                <a href="mailto:${esc(email)}" style="display:block;padding:12px;background:${modeColor};color:#fff;text-align:center;text-decoration:none;border-radius:8px;font-weight:700;font-size:13px;">
                  📧 回信
                </a>
              </td>
              <td width="33%" style="padding:0 4px;">
                <a href="tel:${esc(phone)}" style="display:block;padding:12px;background:#111;color:#fff;text-align:center;text-decoration:none;border-radius:8px;font-weight:700;font-size:13px;">
                  📞 撥打
                </a>
              </td>
              <td width="33%" style="padding:0 0 0 4px;">
                ${photosUrl ? `<a href="${esc(photosUrl)}" style="display:block;padding:12px;background:#25F4EE;color:#000;text-align:center;text-decoration:none;border-radius:8px;font-weight:700;font-size:13px;">
                  📸 看照片
                </a>` : `<div style="padding:12px;background:#eee;color:#999;text-align:center;border-radius:8px;font-weight:700;font-size:13px;">📸 無照片</div>`}
              </td>
            </tr>
          </table>

        </td></tr>

        <tr><td style="padding:16px 28px;background:#fafafa;text-align:center;">
          <div style="font-size:11px;color:#aaa;">
            JDI 脈動傳媒 · JDI PULSE MEDIA · Venues 場地媒合系統
          </div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
