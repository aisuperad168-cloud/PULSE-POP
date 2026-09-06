/**
 * ============================================================
 * POST /api/ops/submit
 * ============================================================
 * 運營端合約提交（乙方 = 經紀公司 / 個人運營）
 * 1. 驗證資料（依 party_type 分流）
 * 2. 產生合約編號 JDI-OPS-YYMMDD-XXXXXX
 * 3. 存 D1
 * 4. 附件：公司大小章 PNG（若為公司）
 * 5. Email 通知乙方 + admin
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

// ============ 首次呼叫自動建表 ============
async function ensureTables(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS ops_contracts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contract_no TEXT NOT NULL UNIQUE,
      contract_type TEXT NOT NULL DEFAULT 'ops',
      party_type TEXT NOT NULL,
      entity_name TEXT NOT NULL,
      tax_id TEXT NOT NULL,
      tax_id_last4 TEXT NOT NULL,
      representative TEXT,
      job_title TEXT,
      address TEXT NOT NULL,
      phone TEXT NOT NULL, phone_last4 TEXT NOT NULL,
      email TEXT NOT NULL,
      bank_name TEXT NOT NULL, bank_branch TEXT NOT NULL,
      bank_account TEXT NOT NULL, bank_account_name TEXT NOT NULL,
      contract_years INTEGER NOT NULL,
      contract_start_date TEXT NOT NULL, contract_end_date TEXT NOT NULL,
      service_fee_rate INTEGER NOT NULL,
      signature_data TEXT NOT NULL,
      signed_at TEXT NOT NULL, signed_ip TEXT NOT NULL, signed_ua TEXT,
      read_scrolled_at TEXT, agreed_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      approved_at TEXT, approved_by TEXT,
      jack_signature_applied_at TEXT, rejection_reason TEXT, admin_note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours'))
    )`).run();

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS ops_attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contract_id INTEGER NOT NULL,
      file_type TEXT NOT NULL, file_name TEXT NOT NULL,
      file_size INTEGER NOT NULL, content_type TEXT NOT NULL,
      storage_provider TEXT NOT NULL DEFAULT 'inline_base64',
      storage_key TEXT NOT NULL, storage_url TEXT,
      uploaded_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours'))
    )`).run();

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS ops_audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contract_id INTEGER NOT NULL,
      action TEXT NOT NULL, actor TEXT,
      actor_ip TEXT, actor_ua TEXT, details TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours'))
    )`).run();

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS ops_email_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contract_id INTEGER, to_email TEXT NOT NULL,
      template TEXT NOT NULL, subject TEXT NOT NULL,
      provider TEXT NOT NULL DEFAULT 'resend', provider_id TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      error_message TEXT, sent_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours'))
    )`).run();

  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_ops_contracts_no ON ops_contracts(contract_no)',
    'CREATE INDEX IF NOT EXISTS idx_ops_contracts_status ON ops_contracts(status)',
    'CREATE INDEX IF NOT EXISTS idx_ops_contracts_query ON ops_contracts(phone_last4, tax_id_last4)',
    'CREATE INDEX IF NOT EXISTS idx_ops_attachments_contract ON ops_attachments(contract_id)',
    'CREATE INDEX IF NOT EXISTS idx_ops_audit_contract ON ops_audit_logs(contract_id)',
  ];
  for (const idx of indexes) await env.DB.prepare(idx).run();
}

export async function onRequestPost({ request, env }) {
  try {
    await ensureTables(env);
    const body = await request.json();

    // ============ 1. 基本驗證 ============
    const partyType = body.party_type;
    if (!['company', 'individual'].includes(partyType)) {
      return json({ ok: false, error: 'party_type 必須為 company 或 individual' }, 400);
    }

    const required = [
      'entity_name', 'tax_id', 'address', 'phone', 'email',
      'bank_name', 'bank_branch', 'bank_account', 'bank_account_name',
      'contract_years',
      'signature_data', 'signed_at', 'agreed_at',
    ];
    for (const k of required) {
      if (!body[k]) return json({ ok: false, error: `缺少必要欄位：${k}` }, 400);
    }

    // 公司必填代表人 + 公司大小章
    if (partyType === 'company') {
      if (!body.representative) return json({ ok: false, error: '公司必須填代表人／負責人' }, 400);
      if (!body.company_stamp) return json({ ok: false, error: '公司必須上傳大小章' }, 400);
    }

    // 格式驗證
    if (!/^09\d{8}$/.test(body.phone)) return json({ ok: false, error: '手機格式錯誤' }, 400);
    if (partyType === 'company') {
      if (!/^\d{8}$/.test(body.tax_id)) return json({ ok: false, error: '統一編號必須為 8 碼數字' }, 400);
    } else {
      if (!/^[A-Z][1-2]\d{8}$/.test(body.tax_id)) return json({ ok: false, error: '身分證字號格式錯誤' }, 400);
    }
    if (![2, 3].includes(Number(body.contract_years))) return json({ ok: false, error: '合作期間必須為 2 或 3 年' }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) return json({ ok: false, error: 'Email 格式錯誤' }, 400);
    if (!/^\d{6,20}$/.test(body.bank_account.replace(/[\s-]/g, ''))) {
      return json({ ok: false, error: '銀行帳號格式錯誤（純數字 6-20 碼）' }, 400);
    }

    // ============ 2. 生效日 = 簽署當日（第 17 條：本契約自雙方完成簽署之日起生效）============
    // 用 Asia/Taipei 時區
    const nowTW_str = new Date().toLocaleString('en-CA', { timeZone: 'Asia/Taipei' });
    const [datePart_TW] = nowTW_str.split(',');
    const [ty, tm, td] = datePart_TW.split('-').map(Number);

    // 生效日 = 簽署當日
    const startDate = new Date(Date.UTC(ty, tm - 1, td));
    const startDateStr = startDate.toISOString().split('T')[0];

    // 到期日 = 生效日 + N 年 - 1 天
    const endDate = new Date(Date.UTC(ty + Number(body.contract_years), tm - 1, td - 1));
    const endDateStr = endDate.toISOString().split('T')[0];

    // ============ 3. 服務手續費（第十一條）============
    // 公司 10%, 個人 15%
    const serviceFeeRate = partyType === 'company' ? 10 : 15;

    // ============ 4. 產生合約編號 JDI-OPS-YYMMDD-XXXXXX ============
    const yy = String(ty).slice(-2);
    const mm = String(tm).padStart(2, '0');
    const dd = String(td).padStart(2, '0');
    const datePart = `${yy}${mm}${dd}`;

    const CHARSET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
    const CHARSET_LEN = CHARSET.length;
    let contractNo = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const bytes = new Uint8Array(6);
      crypto.getRandomValues(bytes);
      const random6 = Array.from(bytes).map(b => CHARSET[b % CHARSET_LEN]).join('');
      const candidate = `JDI-OPS-${datePart}-${random6}`;
      const existing = await env.DB.prepare(`SELECT 1 FROM ops_contracts WHERE contract_no = ?`).bind(candidate).first();
      if (!existing) { contractNo = candidate; break; }
    }
    if (!contractNo) return json({ ok: false, error: '系統繁忙，請稍後再試' }, 503);

    // ============ 5. IP ============
    const ip = request.headers.get('CF-Connecting-IP') ||
               request.headers.get('X-Forwarded-For') || 'unknown';

    // ============ 6. 存 D1 ============
    const taxIdClean = String(body.tax_id).replace(/[\s-]/g, '').toUpperCase();
    const bankAccountClean = String(body.bank_account).replace(/[\s-]/g, '');

    const insertResult = await env.DB.prepare(`
      INSERT INTO ops_contracts (
        contract_no, contract_type, party_type,
        entity_name, tax_id, tax_id_last4,
        representative, job_title, address,
        phone, phone_last4, email,
        bank_name, bank_branch, bank_account, bank_account_name,
        contract_years, contract_start_date, contract_end_date, service_fee_rate,
        signature_data, signed_at, signed_ip, signed_ua,
        read_scrolled_at, agreed_at, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      contractNo, 'ops', partyType,
      body.entity_name, taxIdClean, taxIdClean.slice(-4),
      body.representative || null, body.job_title || null, body.address,
      body.phone, body.phone.slice(-4), body.email,
      body.bank_name, body.bank_branch, bankAccountClean, body.bank_account_name,
      Number(body.contract_years), startDateStr, endDateStr, serviceFeeRate,
      body.signature_data, body.signed_at, ip, body.user_agent || null,
      body.read_scrolled_at || null, body.agreed_at, 'pending'
    ).run();

    const contractId = insertResult.meta.last_row_id;

    // ============ 7. 存附件（公司大小章）============
    if (partyType === 'company' && body.company_stamp) {
      const key = `${contractNo}/company-stamp-${Date.now()}.png`;
      await env.DB.prepare(`
        INSERT INTO ops_attachments (
          contract_id, file_type, file_name, file_size, content_type,
          storage_provider, storage_key, storage_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        contractId, 'company_stamp', 'company-stamp.png',
        body.company_stamp.length, 'image/png',
        'inline_base64', key, body.company_stamp
      ).run();
    }

    // ============ 8. Audit Log ============
    await env.DB.prepare(`
      INSERT INTO ops_audit_logs (contract_id, action, actor, actor_ip, actor_ua, details)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      contractId, 'submitted', 'ops_party', ip, body.user_agent || null,
      JSON.stringify({ party_type: partyType, contract_no: contractNo })
    ).run();

    // ============ 9. Email 通知 ============
    const now2 = new Date().toISOString();
    const emailR = await sendEmail(env, {
      to: body.email,
      subject: `【JDI 脈動傳媒】公會合作合約已送出 · ${contractNo}`,
      html: buildSubmittedEmail({
        contractNo, entityName: body.entity_name, partyType,
        years: body.contract_years, startDate: startDateStr, endDate: endDateStr,
        serviceFeeRate,
      }),
    });

    await env.DB.prepare(`
      INSERT INTO ops_email_logs (contract_id, to_email, template, subject, status, provider_id, sent_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      contractId, body.email, 'submitted',
      `【JDI 脈動傳媒】公會合作合約已送出 · ${contractNo}`,
      emailR.ok ? 'sent' : 'failed', emailR.id || null,
      emailR.ok ? now2 : null
    ).run();

    // 通知 admin
    if (env.MAIL_NOTIFY) {
      await sendEmail(env, {
        to: env.MAIL_NOTIFY,
        subject: `【運營簽約通知】新公會合作合約待審核 · ${contractNo} · ${body.entity_name}`,
        html: buildAdminNotifyEmail({
          contractNo, entityName: body.entity_name, partyType,
          representative: body.representative, phone: body.phone, email: body.email,
          years: body.contract_years, serviceFeeRate,
        }),
      });
    }

    return json({
      ok: true,
      contract_no: contractNo,
      message: '合約已送出，等待審核',
    });

  } catch (err) {
    console.error('[/api/ops/submit] error:', err);
    return json({ ok: false, error: '伺服器錯誤，請稍後再試', detail: err.message }, 500);
  }
}

// ============ Email Helpers ============
async function sendEmail(env, { to, subject, html }) {
  if (!env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set');
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
        to: [to], subject, html,
      }),
    });
    const data = await res.json();
    return res.ok ? { ok: true, id: data.id } : { ok: false, error: data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

function buildSubmittedEmail({ contractNo, entityName, partyType, years, startDate, endDate, serviceFeeRate }) {
  const partyLabel = partyType === 'company' ? '經紀公司' : '個人運營';
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8" /></head>
<body style="font-family: 'Noto Sans TC', -apple-system, sans-serif; background: #f5f5f5; padding: 32px 16px; margin: 0;">
  <div style="max-width: 560px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
    <div style="background: linear-gradient(135deg, #6366f1 0%, #4338ca 100%); padding: 32px 24px; text-align: center;">
      <div style="color: #fff; font-size: 12px; letter-spacing: 3px; margin-bottom: 8px;">JDI PULSE MEDIA</div>
      <div style="color: #fff; font-size: 22px; font-weight: 900;">✓ 公會合作合約已送出</div>
    </div>
    <div style="padding: 32px 24px;">
      <p style="color: #333; font-size: 15px; line-height: 1.7;">
        <strong>${entityName}</strong>（${partyLabel}）您好，
      </p>
      <p style="color: #555; font-size: 14px; line-height: 1.7;">
        您與 JDI 脈動傳媒的公會合作合約簽署申請已成功送出。
      </p>

      <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 3px solid #6366f1;">
        <div style="font-size: 12px; color: #999; margin-bottom: 6px;">合約編號</div>
        <div style="font-size: 22px; font-weight: 900; color: #6366f1; font-family: monospace;">${contractNo}</div>
      </div>

      <table style="width: 100%; font-size: 14px; color: #555; border-collapse: collapse;">
        <tr><td style="padding: 6px 0; color: #999;">身份類別</td><td style="padding: 6px 0; font-weight: 700;">${partyLabel}</td></tr>
        <tr><td style="padding: 6px 0; color: #999;">合作期間</td><td style="padding: 6px 0; font-weight: 700;">${years} 年</td></tr>
        <tr><td style="padding: 6px 0; color: #999;">生效日期</td><td style="padding: 6px 0; font-weight: 700;">${startDate}</td></tr>
        <tr><td style="padding: 6px 0; color: #999;">到期日期</td><td style="padding: 6px 0; font-weight: 700;">${endDate}</td></tr>
        <tr><td style="padding: 6px 0; color: #999;">服務手續費</td><td style="padding: 6px 0; font-weight: 700;">${serviceFeeRate}%</td></tr>
        <tr><td style="padding: 6px 0; color: #999;">狀態</td><td style="padding: 6px 0; font-weight: 700; color: #f59e0b;">⏳ 待甲方審核</td></tr>
      </table>

      <div style="background: #fff3cd; padding: 14px 16px; border-radius: 6px; margin: 20px 0; font-size: 13px; color: #856404; line-height: 1.6;">
        <strong>📋 下一步：</strong> JDI 執行長 Jack 會在 3 個工作天內完成審核，審核完成後將自動蓋上甲方簽名章，並將完整合約 PDF 寄送給您。TikTok 平台任務、獎勵、扶持等附約將另行提供。
      </div>

      <div style="text-align: center; margin: 28px 0 12px;">
        <a href="https://jdi-pulse.com/ops/query/" style="display: inline-block; background: #6366f1; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 14px;">
          查詢合約進度 →
        </a>
      </div>

      <p style="font-size: 12px; color: #999; text-align: center; line-height: 1.6; margin-top: 24px;">
        查詢時請使用「聯絡電話後 4 碼」+「${partyType === 'company' ? '統編' : '身分證'}後 4 碼」
      </p>
    </div>

    <div style="background: #f9f9f9; padding: 20px 24px; text-align: center; color: #999; font-size: 11px; line-height: 1.6; border-top: 1px solid #eee;">
      本信件由 JDI 脈動傳媒簽約系統自動寄發，請勿直接回覆。<br />
      如有問題請聯絡 <a href="mailto:contract@jdi-pulse.com" style="color: #6366f1;">contract@jdi-pulse.com</a>
    </div>
  </div>
</body></html>`;
}

function buildAdminNotifyEmail({ contractNo, entityName, partyType, representative, phone, email, years, serviceFeeRate }) {
  const partyLabel = partyType === 'company' ? '🏢 經紀公司' : '👤 個人運營';
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8" /></head>
<body style="font-family: sans-serif; padding: 32px 16px; background: #f5f5f5;">
  <div style="max-width: 560px; margin: 0 auto; background: #fff; padding: 32px 24px; border-radius: 12px;">
    <h2 style="color: #6366f1; margin: 0 0 16px;">🔔 新公會合作合約待審核</h2>
    <table style="width: 100%; font-size: 14px; line-height: 1.8;">
      <tr><td style="color: #999; width: 100px;">合約編號</td><td style="font-family: monospace; font-weight: 700;">${contractNo}</td></tr>
      <tr><td style="color: #999;">身份類別</td><td>${partyLabel}</td></tr>
      <tr><td style="color: #999;">名稱／姓名</td><td>${entityName}</td></tr>
      ${representative ? `<tr><td style="color: #999;">代表人</td><td>${representative}</td></tr>` : ''}
      <tr><td style="color: #999;">電話</td><td>${phone}</td></tr>
      <tr><td style="color: #999;">Email</td><td>${email}</td></tr>
      <tr><td style="color: #999;">合作期間</td><td>${years} 年</td></tr>
      <tr><td style="color: #999;">服務手續費</td><td>${serviceFeeRate}%</td></tr>
    </table>
    <div style="text-align: center; margin-top: 24px;">
      <a href="https://jdi-pulse.com/sign/admin/?type=ops" style="display: inline-block; background: #6366f1; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700;">
        進入後台審核 →
      </a>
    </div>
  </div>
</body></html>`;
}
