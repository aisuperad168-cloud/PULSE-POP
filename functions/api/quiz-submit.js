/**
 * ============================================================
 * JDI 脈動傳媒 · Quiz Submission Endpoint
 * POST /api/quiz-submit
 *
 * Environment Variables (set via wrangler / Cloudflare Dashboard):
 *   RESEND_API_KEY   — Resend API key (re_xxx)
 *   MAIL_FROM        — 寄件人 email (e.g. onboarding@resend.dev)
 *   MAIL_FROM_NAME   — 寄件人顯示名稱 (e.g. JDI 脈動傳媒)
 *   MAIL_NOTIFY      — 內部通知信箱 (e.g. pulsepop9@gmail.com)
 *
 * Bindings:
 *   DB               — D1 database (quiz_leads table)
 * ============================================================
 */

import { renderReportEmail, renderNotifyEmail } from './_email-templates.js';

// ============ TYPES DATA (rendered on server) ============
const QUIZ_TYPES = {
  singer: {
    id: 'singer', name: '歌唱型主播', emoji: '🎤',
    tagline: '用歌聲收粉的實力派', color: '#FE2C55',
    gradient: 'linear-gradient(135deg, #FE2C55, #FF6B9D)',
    description: '你是那種只要一開口，就能讓整個直播間安靜下來的人。歌聲是你最強的武器，粉絲會因為你的音色、你的情感詮釋而留下來。你適合走「音樂人設 + 深度互動」的路線。',
    strengths: [
      '高留人率（一首歌就能留住 5 分鐘以上）',
      '粉絲黏著度極高、送禮意願強',
      '容易累積死忠鐵粉、打賞轉化率高'
    ],
    incomeStars: 4, bestTime: '晚間 20:00–24:00',
    tips: '建議準備 30 首以上曲目、加強即興演唱能力。與其他歌唱型主播 PK 是快速累粉的關鍵。',
    similarStreamer: '元承烈 37 · 芊芊 coco'
  },
  dancer: {
    id: 'dancer', name: '舞蹈唱跳型主播', emoji: '💃',
    tagline: '律動與才藝的完美結合', color: '#25F4EE',
    gradient: 'linear-gradient(135deg, #25F4EE, #00E5D9)',
    description: '你是那種天生就有「畫面感」的人，肢體表達自然流暢，鏡頭前充滿感染力。你的直播間永遠不無聊，音樂一下就能帶動氣氛，短影音爆紅潛力極高。',
    strengths: [
      '短影音病毒式擴散能力強',
      '視覺吸引力最高、開播即引流',
      '容易接業配、跨平台曝光多'
    ],
    incomeStars: 5, bestTime: '晚間 19:00–23:00',
    tips: '建議每週固定產出 3–5 支短影音導流，直播中融入 challenge 挑戰與粉絲互動舞。',
    similarStreamer: '馬妹 · 芊芊 coco'
  },
  chat: {
    id: 'chat', name: '聊天陪伴型主播', emoji: '💬',
    tagline: '溫暖如家的情感連結', color: '#00F0FF',
    gradient: 'linear-gradient(135deg, #00F0FF, #7B68EE)',
    description: '你是那種「聊天就是本體」的人，不需要才藝、不需要炫技，你的溫度、你的傾聽、你的日常分享，就是最強的競爭力。粉絲會把你當朋友、當家人。',
    strengths: [
      '長期經營型（3 個月後爆發力最強）',
      '粉絲團穩定、月流水穩健',
      '心理陪伴需求極大、被喜愛度高'
    ],
    incomeStars: 4, bestTime: '晚間 21:00–凌晨 01:00',
    tips: '準備 20 個以上聊天話題模組（星座、感情、職場、生活哲學），加強故事講述能力。',
    similarStreamer: '米姥思 MI · 多多綠 157'
  },
  battle: {
    id: 'battle', name: 'PK 競技型主播', emoji: '⚔️',
    tagline: '擂台上的爆發力王者', color: '#FF3A69',
    gradient: 'linear-gradient(135deg, #FF3A69, #FE2C55)',
    description: '你是熱血、好勝、享受戰鬥的類型。PK 對你來說不是壓力，是舞台。你能在擂台上把粉絲情緒推到最高點，讓「拱火」變成一種藝術。收入天花板超高。',
    strengths: [
      '單場爆發力強（單日破 10 萬營收不是夢）',
      '公會爭霸賽主力、平台流量重點扶持',
      '短時間快速衝榜、話題性高'
    ],
    incomeStars: 5, bestTime: '晚間 20:00–凌晨 02:00',
    tips: '建議加強反應速度、話題張力、鐵粉維護。PK 策略比才藝本身更重要。',
    similarStreamer: '芮娜 RN0503'
  },
  talent: {
    id: 'talent', name: '才藝生活型主播', emoji: '🎨',
    tagline: '獨特專業的內容創作者', color: '#FFB84D',
    gradient: 'linear-gradient(135deg, #FFB84D, #FF6B9D)',
    description: '你是有「一技之長」的人 —— 可能是烹飪、手作、美妝、穿搭、命理、寵物飼養…你的專業就是你的護城河，粉絲來這裡不只是消費、更是學東西。',
    strengths: [
      '內容差異化極大、被複製難度高',
      '品牌合作、業配機會多',
      '跨平台變現路徑清晰（IG / YT / 蝦皮）'
    ],
    incomeStars: 4, bestTime: '白天 14:00–17:00 或晚間 20:00–22:00',
    tips: '把專業內容拆成「教學 + 娛樂 + 互動」三段，觀眾學到東西就會回訪。',
    similarStreamer: '多元類型（可跨界發展）'
  },
  variety: {
    id: 'variety', name: '綜藝互動型主播', emoji: '🎪',
    tagline: '幽默感就是最強超能力', color: '#7B68EE',
    gradient: 'linear-gradient(135deg, #7B68EE, #FE2C55)',
    description: '你是天生「開心果」型的人，玩梗、整活、帶氣氛是本能。你的直播間永遠都在笑，粉絲上線就像看綜藝節目一樣放鬆。適合玩遊戲、辦活動、跨界連麥。',
    strengths: [
      '爆點多、話題性強、容易被剪輯出圈',
      '連麥合作機會多、粉絲擴散快',
      '任務型直播（遊戲 / 挑戰）表現亮眼'
    ],
    incomeStars: 4, bestTime: '晚間 19:00–23:00',
    tips: '每場直播準備 3–5 個「梗點」與 1–2 個「爆點活動」，帶起氛圍後粉絲自然湧入。',
    similarStreamer: '多元類型（可跨界發展）'
  }
};

// ============ CORS ============
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400'
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS }
  });
}

// ============ MAIN HANDLER ============
export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestPost({ request, env }) {
  // 1. Parse & Validate
  let payload;
  try {
    payload = await request.json();
  } catch (e) {
    return json({ error: 'INVALID_JSON', message: '無效的請求內容' }, 400);
  }

  const { name, email, lineId, type, typeName, scores, answers, source } = payload || {};

  if (!name || !email || !lineId || !type) {
    return json({ error: 'MISSING_FIELDS', message: '缺少必要欄位' }, 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'INVALID_EMAIL', message: 'Email 格式錯誤' }, 400);
  }
  if (!QUIZ_TYPES[type]) {
    return json({ error: 'INVALID_TYPE', message: '無效的主播類型' }, 400);
  }

  // Sanitize (簡易)
  const safeName   = String(name).trim().slice(0, 30);
  const safeEmail  = String(email).trim().toLowerCase().slice(0, 80);
  const safeLineId = String(lineId).trim().slice(0, 40);
  const typeData   = QUIZ_TYPES[type];

  const ip = request.headers.get('CF-Connecting-IP') || '';
  const country = request.headers.get('CF-IPCountry') || '';
  const ua = request.headers.get('User-Agent') || '';

  // 2. Store to D1 (if available)
  let leadId = null;
  if (env.DB) {
    try {
      const result = await env.DB.prepare(`
        INSERT INTO quiz_leads
          (name, email, line_id, streamer_type, type_name, scores, answers, source, ip, user_agent, country)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        safeName, safeEmail, safeLineId,
        type, typeData.name,
        JSON.stringify(scores || {}),
        JSON.stringify(answers || []),
        String(source || 'unknown').slice(0, 30),
        ip.slice(0, 45),
        ua.slice(0, 200),
        country.slice(0, 2)
      ).run();
      leadId = result.meta?.last_row_id || null;
    } catch (dbErr) {
      console.error('[quiz] D1 insert failed:', dbErr);
      // 不阻斷，繼續送信
    }
  }

  // 3. Send emails via Resend
  const RESEND_API_KEY = env.RESEND_API_KEY;
  const MAIL_FROM      = env.MAIL_FROM || 'onboarding@resend.dev';
  const MAIL_FROM_NAME = env.MAIL_FROM_NAME || 'JDI 脈動傳媒';
  const MAIL_NOTIFY    = env.MAIL_NOTIFY || 'pulsepop9@gmail.com';

  if (!RESEND_API_KEY) {
    console.error('[quiz] Missing RESEND_API_KEY');
    return json({
      ok: true,
      leadId,
      warn: 'Email service not configured yet (missing API key)'
    }, 200);
  }

  // ==== 3a. Report email to user ====
  const reportHtml = renderReportEmail({ name: safeName, email: safeEmail, lineId: safeLineId, typeData });
  const reportText = `你好 ${safeName}！\n\n你的主播類型分析結果是：${typeData.name} ${typeData.emoji}\n\n${typeData.description}\n\n個人優勢：\n${typeData.strengths.map(s => '✅ ' + s).join('\n')}\n\n建議開播時段：${typeData.bestTime}\n收入潛力：${'★'.repeat(typeData.incomeStars)}${'☆'.repeat(5-typeData.incomeStars)}\n\n專屬成長建議：\n${typeData.tips}\n\n類似頂級主播：${typeData.similarStreamer}\n\n━━━━━━━━━━━━━━━━\n\n📱 想更了解如何加入 JDI 脈動傳媒？\n\n• LINE 諮詢：https://line.me/R/ti/p/@354ykfbp\n• 完整合作方案：https://jdi-pulse.com/partnership\n• 新人 FAQ：https://jdi-pulse.com/faq\n\n📞 電話：04-3603-3191\n\nJDI 脈動傳媒 JDI Pulse MEDIA\nTikTok LIVE 官方合作經紀公會\nhttps://jdi-pulse.com/`;

  // ==== 3b. Notify email to admin ====
  const notifyHtml = renderNotifyEmail({ name: safeName, email: safeEmail, lineId: safeLineId, typeData, source, country, leadId });
  const notifySubject = `🔔 [JDI 官網] 新測驗名單 · ${safeName} · ${typeData.name}`;

  // Send both in parallel
  const [userResp, adminResp] = await Promise.allSettled([
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `${MAIL_FROM_NAME} <${MAIL_FROM}>`,
        to: [safeEmail],
        subject: `${typeData.emoji} ${safeName}，你的主播類型分析報告：${typeData.name} | JDI 脈動傳媒`,
        html: reportHtml,
        text: reportText,
        reply_to: MAIL_NOTIFY
      })
    }),
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `JDI 官網通知 <${MAIL_FROM}>`,
        to: [MAIL_NOTIFY],
        subject: notifySubject,
        html: notifyHtml
      })
    })
  ]);

  const userOk  = userResp.status === 'fulfilled'  && userResp.value.ok;
  const adminOk = adminResp.status === 'fulfilled' && adminResp.value.ok;

  if (!userOk) {
    let errDetail = 'unknown';
    try {
      errDetail = userResp.status === 'fulfilled'
        ? await userResp.value.text()
        : String(userResp.reason);
    } catch(_) {}
    console.error('[quiz] user email failed:', errDetail);
  }
  if (!adminOk) {
    let errDetail = 'unknown';
    try {
      errDetail = adminResp.status === 'fulfilled'
        ? await adminResp.value.text()
        : String(adminResp.reason);
    } catch(_) {}
    console.error('[quiz] admin email failed:', errDetail);
  }

  // Mark notified in D1
  if (env.DB && leadId && userOk) {
    try {
      await env.DB.prepare('UPDATE quiz_leads SET notified = 1 WHERE id = ?').bind(leadId).run();
    } catch(_) {}
  }

  return json({
    ok: true,
    leadId,
    userEmailSent: userOk,
    adminEmailSent: adminOk,
    type: type,
    typeName: typeData.name
  });
}
