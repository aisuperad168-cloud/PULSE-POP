/**
 * ============================================================
 * POST /api/sign/submit
 * ============================================================
 * 接收 Step 6 送出的完整合約資料
 * 1. 驗證資料
 * 2. 產生合約編號
 * 3. 存 D1
 * 4. 存 R2 (身分證正反面 + 簽名圖)
 * 5. 寄 Email 給主播 + 通知 admin
 * ============================================================
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS_HEADERS },
  });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

// ============ 首次呼叫自動建表（fallback）============
async function ensureTables(env) {
  const schema = `
    CREATE TABLE IF NOT EXISTS sign_contracts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contract_no TEXT NOT NULL UNIQUE,
      contract_type TEXT NOT NULL DEFAULT 'streamer',
      real_name TEXT NOT NULL, stage_name TEXT NOT NULL,
      id_number TEXT NOT NULL, id_number_last4 TEXT NOT NULL,
      phone TEXT NOT NULL, phone_last4 TEXT NOT NULL,
      email TEXT NOT NULL, birthday TEXT,
      contact_address TEXT NOT NULL, registered_address TEXT NOT NULL,
      contract_years INTEGER NOT NULL,
      contract_start_date TEXT NOT NULL, contract_end_date TEXT NOT NULL,
      signature_data TEXT NOT NULL,
      signed_at TEXT NOT NULL, signed_ip TEXT NOT NULL, signed_ua TEXT,
      read_scrolled_at TEXT, agreed_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      approved_at TEXT, approved_by TEXT,
      operator_name TEXT, operator_email TEXT,
      jack_signature_applied_at TEXT, rejection_reason TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours'))
    )`;
  const attachments = `
    CREATE TABLE IF NOT EXISTS sign_attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contract_id INTEGER NOT NULL,
      file_type TEXT NOT NULL, file_name TEXT NOT NULL,
      file_size INTEGER NOT NULL, content_type TEXT NOT NULL,
      storage_provider TEXT NOT NULL DEFAULT 'r2',
      storage_key TEXT NOT NULL, storage_url TEXT,
      uploaded_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours'))
    )`;
  const auditLogs = `
    CREATE TABLE IF NOT EXISTS sign_audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contract_id INTEGER NOT NULL,
      action TEXT NOT NULL, actor TEXT,
      actor_ip TEXT, actor_ua TEXT, details TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours'))
    )`;
  const emailLogs = `
    CREATE TABLE IF NOT EXISTS sign_email_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contract_id INTEGER, to_email TEXT NOT NULL,
      template TEXT NOT NULL, subject TEXT NOT NULL,
      provider TEXT NOT NULL DEFAULT 'resend', provider_id TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      error_message TEXT, sent_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours'))
    )`;

  await env.DB.prepare(schema).run();
  await env.DB.prepare(attachments).run();
  await env.DB.prepare(auditLogs).run();
  await env.DB.prepare(emailLogs).run();

  // Indexes (safe to re-run)
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_sign_contracts_no ON sign_contracts(contract_no)',
    'CREATE INDEX IF NOT EXISTS idx_sign_contracts_status ON sign_contracts(status)',
    'CREATE INDEX IF NOT EXISTS idx_sign_contracts_query ON sign_contracts(phone_last4, id_number_last4)',
    'CREATE INDEX IF NOT EXISTS idx_sign_attachments_contract ON sign_attachments(contract_id)',
    'CREATE INDEX IF NOT EXISTS idx_sign_audit_contract ON sign_audit_logs(contract_id)',
  ];
  for (const idx of indexes) await env.DB.prepare(idx).run();
}

export async function onRequestPost({ request, env }) {
  try {
    // 保險：自動建表
    await ensureTables(env);

    const body = await request.json();

    // ============ 1. 基本驗證 ============
    const required = [
      'real_name', 'stage_name', 'id_number', 'phone', 'email',
      'contact_address', 'registered_address',
      'contract_years',
      'id_front', 'id_back', 'signature_data',
      'signed_at', 'agreed_at',
    ];
    for (const key of required) {
      if (!body[key]) return json({ ok: false, error: `缺少必要欄位：${key}` }, 400);
    }

    // Sanity checks
    if (!/^09\d{8}$/.test(body.phone)) return json({ ok: false, error: '手機格式錯誤' }, 400);
    if (!/^[A-Z][1-2]\d{8}$/.test(body.id_number)) return json({ ok: false, error: '身分證字號格式錯誤' }, 400);
    if (![1, 2, 3].includes(Number(body.contract_years))) return json({ ok: false, error: '合約年限錯誤' }, 400);

    // ============ 生效日 = 簽署當日隔日 00:00（伺服器計算，防欺騙）============
    // 用 Asia/Taipei 時區的「今天」+1 天
    const nowTW = new Date(new Date().getTime() + 8 * 60 * 60 * 1000);  // UTC+8
    const tomorrowTW = new Date(nowTW);
    tomorrowTW.setUTCDate(tomorrowTW.getUTCDate() + 1);
    const startDateStr = tomorrowTW.toISOString().split('T')[0];  // YYYY-MM-DD

    const endTW = new Date(tomorrowTW);
    endTW.setUTCFullYear(endTW.getUTCFullYear() + Number(body.contract_years));
    endTW.setUTCDate(endTW.getUTCDate() - 1);  // 到期日 = 生效日 + N 年 - 1 天
    const endDateStr = endTW.toISOString().split('T')[0];

    // 覆寫 body 中的日期（永遠以伺服器為準）
    body.contract_start_date = startDateStr;
    body.contract_end_date = endDateStr;

    // ============ 2. 產生合約編號（隨機碼版）============
    // 格式：JDI-SIGN-{YYMMDD}-{6位隨機碼}
    // 隨機碼字元集：排除易混淆字 0/O/1/I/L (共 30 種字元, 30^6 = 7.29 億組合)
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);   // 26
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const datePart = `${yy}${mm}${dd}`;               // 260926

    const CHARSET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';  // 30 chars
    const CHARSET_LEN = CHARSET.length;
    let contractNo = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      // Web Crypto API：真隨機
      const bytes = new Uint8Array(6);
      crypto.getRandomValues(bytes);
      const random6 = Array.from(bytes)
        .map(b => CHARSET[b % CHARSET_LEN])
        .join('');
      const candidate = `JDI-SIGN-${datePart}-${random6}`;

      // 檢查是否碰撞
      const existing = await env.DB.prepare(
        `SELECT 1 FROM sign_contracts WHERE contract_no = ?`
      ).bind(candidate).first();

      if (!existing) {
        contractNo = candidate;
        break;
      }
    }
    if (!contractNo) {
      return json({ ok: false, error: '系統繁忙，請稍後再試' }, 503);
    }

    // ============ 3. 抓客戶端 IP ============
    const ip = request.headers.get('CF-Connecting-IP') ||
               request.headers.get('X-Forwarded-For') ||
               'unknown';

    // ============ 4. 存 D1 主表 ============
    const insertResult = await env.DB.prepare(`
      INSERT INTO sign_contracts (
        contract_no, contract_type,
        real_name, stage_name, id_number, id_number_last4,
        phone, phone_last4, email, birthday,
        contact_address, registered_address,
        contract_years, contract_start_date, contract_end_date,
        signature_data, signed_at, signed_ip, signed_ua,
        read_scrolled_at, agreed_at,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      contractNo, 'streamer',
      body.real_name, body.stage_name,
      body.id_number,                       // TODO: 未來加密
      body.id_number.slice(-4),             // 後 4 碼查詢用
      body.phone,
      body.phone.slice(-4),                 // 後 4 碼查詢用
      body.email, body.birthday || null,
      body.contact_address, body.registered_address,
      Number(body.contract_years),
      body.contract_start_date, body.contract_end_date,
      body.signature_data, body.signed_at, ip, body.user_agent || null,
      body.read_scrolled_at || null, body.agreed_at,
      'pending'
    ).run();

    const contractId = insertResult.meta.last_row_id;

    // ============ 5. 存附件（身分證正反面 base64 → sign_attachments）============
    // MVP 階段：直接把 base64 存 D1（暫時方案，之後切 R2）
    // 為避免 D1 太肥，只存 metadata + 短 URL placeholder
    // 這裡為簡化，暫時只記錄
    const now2 = new Date().toISOString();

    // 記錄附件（暫時 storage_key 用 base64 大小 hash 作為佔位）
    async function saveAttachment(fileType, base64Data) {
      const size = base64Data.length;
      const key = `${contractNo}/${fileType}-${Date.now()}.jpg`;
      await env.DB.prepare(`
        INSERT INTO sign_attachments (
          contract_id, file_type, file_name, file_size, content_type,
          storage_provider, storage_key, storage_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        contractId, fileType, `${fileType}.jpg`, size, 'image/jpeg',
        'inline_base64', key, base64Data  // MVP: 暫時直接存 base64 到 storage_url
      ).run();
    }

    await saveAttachment('id_front', body.id_front);
    await saveAttachment('id_back', body.id_back);

    // ============ 6. Audit Log ============
    await env.DB.prepare(`
      INSERT INTO sign_audit_logs (contract_id, action, actor, actor_ip, actor_ua, details)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      contractId, 'submitted', 'streamer', ip, body.user_agent || null,
      JSON.stringify({ screen_size: body.screen_size, contract_no: contractNo })
    ).run();

    // ============ 7. 寄 Email（送出確認信 + 通知 admin）============
    const emailResult = await sendEmail(env, {
      to: body.email,
      subject: `【JDI 脈動傳媒】合約已送出 · 編號 ${contractNo}`,
      html: buildSubmittedEmail({
        contractNo,
        realName: body.real_name,
        stageName: body.stage_name,
        years: body.contract_years,
        startDate: body.contract_start_date,
        endDate: body.contract_end_date,
      }),
    });

    // Log email
    await env.DB.prepare(`
      INSERT INTO sign_email_logs (contract_id, to_email, template, subject, status, provider_id, sent_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      contractId, body.email, 'submitted',
      `【JDI 脈動傳媒】合約已送出 · 編號 ${contractNo}`,
      emailResult.ok ? 'sent' : 'failed',
      emailResult.id || null,
      emailResult.ok ? now2 : null
    ).run();

    // Notify admin
    if (env.MAIL_NOTIFY) {
      await sendEmail(env, {
        to: env.MAIL_NOTIFY,
        subject: `【簽約通知】新合約待審核 · ${contractNo} · ${body.real_name}`,
        html: buildAdminNotifyEmail({
          contractNo,
          realName: body.real_name,
          stageName: body.stage_name,
          phone: body.phone,
          email: body.email,
          years: body.contract_years,
        }),
      });
    }

    return json({
      ok: true,
      contract_no: contractNo,
      message: '合約已送出，等待審核',
    });

  } catch (err) {
    console.error('[/api/sign/submit] error:', err);
    return json({ ok: false, error: '伺服器錯誤，請稍後再試', detail: err.message }, 500);
  }
}

// ============ Email Helper ============
async function sendEmail(env, { to, subject, html }) {
  if (!env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set, skipping email:', to);
    return { ok: false, error: 'no_api_key' };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${env.MAIL_FROM_NAME || 'JDI 脈動傳媒'} <${env.MAIL_FROM || 'noreply@jdi-pulse.com'}>`,
        to: [to],
        subject,
        html,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error('Resend error:', data);
      return { ok: false, error: data };
    }
    return { ok: true, id: data.id };
  } catch (err) {
    console.error('Email send error:', err);
    return { ok: false, error: err.message };
  }
}

function buildSubmittedEmail({ contractNo, realName, stageName, years, startDate, endDate }) {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8" /></head>
<body style="font-family: 'Noto Sans TC', -apple-system, sans-serif; background: #f5f5f5; padding: 32px 16px; margin: 0;">
  <div style="max-width: 560px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
    <div style="background: linear-gradient(135deg, #FE2C55 0%, #b81e3f 100%); padding: 32px 24px; text-align: center;">
      <div style="color: #fff; font-size: 12px; letter-spacing: 3px; margin-bottom: 8px;">JDI PULSE MEDIA</div>
      <div style="color: #fff; font-size: 22px; font-weight: 900;">✓ 合約已送出</div>
    </div>
    <div style="padding: 32px 24px;">
      <p style="color: #333; font-size: 15px; line-height: 1.7;">
        <strong>${realName}</strong>（藝名：${stageName}）您好，
      </p>
      <p style="color: #555; font-size: 14px; line-height: 1.7;">
        您的直播經紀合約簽署申請已成功送出至 JDI 脈動傳媒審核。
      </p>

      <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 3px solid #FE2C55;">
        <div style="font-size: 12px; color: #999; margin-bottom: 6px;">合約編號</div>
        <div style="font-size: 22px; font-weight: 900; color: #FE2C55; font-family: monospace;">${contractNo}</div>
      </div>

      <table style="width: 100%; font-size: 14px; color: #555; border-collapse: collapse;">
        <tr><td style="padding: 6px 0; color: #999;">合約年限</td><td style="padding: 6px 0; font-weight: 700;">${years} 年</td></tr>
        <tr><td style="padding: 6px 0; color: #999;">生效日期</td><td style="padding: 6px 0; font-weight: 700;">${startDate} <span style="font-size: 12px; color: #999;">（簽署隔日 00:00 起）</span></td></tr>
        <tr><td style="padding: 6px 0; color: #999;">到期日期</td><td style="padding: 6px 0; font-weight: 700;">${endDate}</td></tr>
        <tr><td style="padding: 6px 0; color: #999;">狀態</td><td style="padding: 6px 0; font-weight: 700; color: #f59e0b;">⏳ 待甲方審核</td></tr>
      </table>

      <div style="background: #fff3cd; padding: 14px 16px; border-radius: 6px; margin: 20px 0; font-size: 13px; color: #856404; line-height: 1.6;">
        <strong>📋 下一步：</strong> JDI 執行長 Jack 會在 3 個工作天內完成審核，審核完成後將自動蓋上甲方簽名章，並將完整合約 PDF 寄送給您。
      </div>

      <div style="text-align: center; margin: 28px 0 12px;">
        <a href="https://jdi-pulse.com/sign/query/" style="display: inline-block; background: #25F4EE; color: #000; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 14px;">
          查詢合約進度 →
        </a>
      </div>

      <p style="font-size: 12px; color: #999; text-align: center; line-height: 1.6; margin-top: 24px;">
        查詢時請使用「聯絡電話後 4 碼」+「身分證後 4 碼」
      </p>
    </div>

    <div style="background: #f9f9f9; padding: 20px 24px; text-align: center; color: #999; font-size: 11px; line-height: 1.6; border-top: 1px solid #eee;">
      本信件由 JDI 脈動傳媒簽約系統自動寄發，請勿直接回覆。<br />
      如有問題請聯絡 <a href="mailto:contract@jdi-pulse.com" style="color: #FE2C55;">contract@jdi-pulse.com</a>
    </div>
  </div>
</body></html>`;
}

function buildAdminNotifyEmail({ contractNo, realName, stageName, phone, email, years }) {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8" /></head>
<body style="font-family: sans-serif; padding: 32px 16px; background: #f5f5f5;">
  <div style="max-width: 560px; margin: 0 auto; background: #fff; padding: 32px 24px; border-radius: 12px;">
    <h2 style="color: #FE2C55; margin: 0 0 16px;">🔔 新合約待審核</h2>
    <table style="width: 100%; font-size: 14px; line-height: 1.8;">
      <tr><td style="color: #999; width: 100px;">合約編號</td><td style="font-family: monospace; font-weight: 700;">${contractNo}</td></tr>
      <tr><td style="color: #999;">姓名</td><td>${realName}</td></tr>
      <tr><td style="color: #999;">藝名</td><td>${stageName}</td></tr>
      <tr><td style="color: #999;">電話</td><td>${phone}</td></tr>
      <tr><td style="color: #999;">Email</td><td>${email}</td></tr>
      <tr><td style="color: #999;">年限</td><td>${years} 年</td></tr>
    </table>
    <div style="text-align: center; margin-top: 24px;">
      <a href="https://jdi-pulse.com/sign/admin/" style="display: inline-block; background: #FE2C55; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700;">
        進入後台審核 →
      </a>
    </div>
  </div>
</body></html>`;
}
