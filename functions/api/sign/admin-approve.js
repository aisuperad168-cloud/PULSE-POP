/**
 * ============================================================
 * POST /api/sign/admin-approve
 * ============================================================
 * Jack 核准合約，同時填入運營資訊
 * Input: { contract_id, operator_name, operator_email, action, reject_reason }
 * action: approve | reject
 * ============================================================
 */

import { requireAdmin, authFailedResponse } from './_auth.js';

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

export async function onRequestPost({ request, env }) {
  try {
    // ============ 強制認證 ============
    const auth = await requireAdmin(request, env);
    if (!auth.ok) return authFailedResponse(auth);
    const userEmail = auth.email;

    const body = await request.json();
    const { contract_id, action, operator_name, operator_email, reject_reason } = body;

    if (!contract_id) return json({ ok: false, error: '缺少 contract_id' }, 400);
    if (!['approve', 'reject'].includes(action)) return json({ ok: false, error: 'action 必須為 approve 或 reject' }, 400);

    const contract = await env.DB.prepare(`SELECT * FROM sign_contracts WHERE id = ?`).bind(contract_id).first();
    if (!contract) return json({ ok: false, error: '找不到合約' }, 404);
    if (contract.status !== 'pending') return json({ ok: false, error: `合約狀態為 ${contract.status}，無法審核` }, 400);

    const now = new Date().toISOString();

    if (action === 'approve') {
      if (!operator_name || !operator_email) {
        return json({ ok: false, error: '核准時必須填入運營經紀姓名與 Email' }, 400);
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(operator_email)) {
        return json({ ok: false, error: '運營 Email 格式錯誤' }, 400);
      }

      // Update
      await env.DB.prepare(`
        UPDATE sign_contracts
        SET status = 'approved',
            approved_at = ?,
            approved_by = ?,
            operator_name = ?,
            operator_email = ?,
            jack_signature_applied_at = ?,
            updated_at = ?
        WHERE id = ?
      `).bind(now, userEmail, operator_name, operator_email, now, now, contract_id).run();

      // Audit log
      await env.DB.prepare(`
        INSERT INTO sign_audit_logs (contract_id, action, actor, actor_ip, details)
        VALUES (?, ?, ?, ?, ?)
      `).bind(
        contract_id, 'approved', userEmail,
        request.headers.get('CF-Connecting-IP') || '',
        JSON.stringify({ operator_name, operator_email })
      ).run();

      // 寄完成通知信給主播（含合約檢視連結）
      const viewLink = `https://jdi-pulse.com/sign/contract-view/?no=${encodeURIComponent(contract.contract_no)}&phone_last4=${contract.phone_last4}&id_last4=${contract.id_number_last4}`;
      const emailR = await sendEmail(env, {
        to: contract.email,
        subject: `【JDI 脈動傳媒】✓ 合約已核准 · ${contract.contract_no}`,
        html: buildApprovedEmail({
          contractNo: contract.contract_no,
          realName: contract.real_name,
          stageName: contract.stage_name,
          operatorName: operator_name,
          approvedAt: now,
          startDate: contract.contract_start_date,
          endDate: contract.contract_end_date,
          contractYears: contract.contract_years,
          viewLink,
        }),
      });

      // 也通知運營
      if (operator_email) {
        await sendEmail(env, {
          to: operator_email,
          subject: `【JDI 通知】您已被指派為 ${contract.stage_name} 的運營經紀`,
          html: buildOperatorNotifyEmail({
            contractNo: contract.contract_no,
            realName: contract.real_name,
            stageName: contract.stage_name,
            phone: contract.phone,
            email: contract.email,
          }),
        });
      }

      await env.DB.prepare(`
        INSERT INTO sign_email_logs (contract_id, to_email, template, subject, status, provider_id, sent_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        contract_id, contract.email, 'approved',
        `【JDI 脈動傳媒】✓ 合約已核准`,
        emailR.ok ? 'sent' : 'failed',
        emailR.id || null,
        emailR.ok ? now : null
      ).run();

      return json({ ok: true, message: '合約已核准並通知主播', contract_no: contract.contract_no });

    } else {
      // Reject
      if (!reject_reason) return json({ ok: false, error: '退回時必須填入原因' }, 400);

      await env.DB.prepare(`
        UPDATE sign_contracts
        SET status = 'rejected',
            rejection_reason = ?,
            updated_at = ?
        WHERE id = ?
      `).bind(reject_reason, now, contract_id).run();

      await env.DB.prepare(`
        INSERT INTO sign_audit_logs (contract_id, action, actor, details)
        VALUES (?, ?, ?, ?)
      `).bind(contract_id, 'rejected', userEmail, JSON.stringify({ reason: reject_reason })).run();

      // 寄退回信給主播
      await sendEmail(env, {
        to: contract.email,
        subject: `【JDI 脈動傳媒】合約需補件 · ${contract.contract_no}`,
        html: buildRejectedEmail({
          contractNo: contract.contract_no,
          realName: contract.real_name,
          reason: reject_reason,
        }),
      });

      return json({ ok: true, message: '合約已退回，並通知主播' });
    }

  } catch (err) {
    console.error('[admin-approve] error:', err);
    return json({ ok: false, error: err.message }, 500);
  }
}

// ============ Email Helpers ============
async function sendEmail(env, { to, subject, html }) {
  if (!env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set');
    return { ok: false };
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
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

function buildApprovedEmail({ contractNo, realName, stageName, operatorName, approvedAt, startDate, endDate, contractYears, viewLink }) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8" /></head>
<body style="font-family: 'Noto Sans TC', sans-serif; background: #f5f5f5; padding: 32px 16px; margin: 0;">
  <div style="max-width: 560px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
    <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 32px 24px; text-align: center;">
      <div style="color: #fff; font-size: 12px; letter-spacing: 3px; margin-bottom: 8px;">JDI PULSE MEDIA</div>
      <div style="color: #fff; font-size: 24px; font-weight: 900;">🎉 合約已核准</div>
    </div>
    <div style="padding: 32px 24px;">
      <p style="color: #333; font-size: 15px;"><strong>${realName}</strong>（藝名：${stageName}）您好，</p>
      <p style="color: #555; font-size: 14px; line-height: 1.7;">
        恭喜！您與 JDI 脈動傳媒的直播經紀合約已由甲方負責人 Jack 完成審核與用印。
      </p>
      <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 3px solid #22c55e;">
        <p style="margin: 0; font-size: 13px; color: #555;">合約編號</p>
        <p style="margin: 6px 0 14px; font-size: 20px; font-weight: 900; color: #22c55e; font-family: monospace;">${contractNo}</p>

        <table style="width: 100%; font-size: 13px; color: #555; border-collapse: collapse;">
          <tr><td style="padding: 3px 0; color: #999; width: 90px;">生效日期</td><td style="padding: 3px 0; font-weight: 700; color: #16a34a;">${startDate}（隔日 00:00 起）</td></tr>
          <tr><td style="padding: 3px 0; color: #999;">到期日期</td><td style="padding: 3px 0; font-weight: 700;">${endDate}</td></tr>
          <tr><td style="padding: 3px 0; color: #999;">合約年限</td><td style="padding: 3px 0; font-weight: 700;">${contractYears} 年</td></tr>
          <tr><td style="padding: 3px 0; color: #999;">運營經紀</td><td style="padding: 3px 0; font-weight: 700;">${operatorName}</td></tr>
          <tr><td style="padding: 3px 0; color: #999;">核准時間</td><td style="padding: 3px 0;">${new Date(approvedAt).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}</td></tr>
        </table>
      </div>
      <p style="color: #555; font-size: 14px; line-height: 1.7;">
        接下來運營團隊會主動聯繫您，開始直播培訓與規劃。有任何問題請透過 LINE 或 Email 聯絡運營。
      </p>
      <div style="text-align: center; margin: 28px 0 12px;">
        <a href="${viewLink}" style="display: inline-block; background: #FE2C55; color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 700; font-size: 15px;">
          📄 檢視 / 下載合約 PDF →
        </a>
      </div>
      <p style="text-align: center; color: #999; font-size: 12px; line-height: 1.6; margin-top: 16px;">
        提示：開啟後可點右上角「列印 / 存 PDF」，<br />
        iPhone Safari 用戶請點「分享 → 儲存到檔案」
      </p>
    </div>
    <div style="background: #f9f9f9; padding: 20px 24px; text-align: center; color: #999; font-size: 11px; line-height: 1.6; border-top: 1px solid #eee;">
      本信件由 JDI 脈動傳媒簽約系統自動寄發。<br /><a href="mailto:contract@jdi-pulse.com" style="color: #FE2C55;">contract@jdi-pulse.com</a>
    </div>
  </div>
</body></html>`;
}

function buildOperatorNotifyEmail({ contractNo, realName, stageName, phone, email }) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8" /></head>
<body style="font-family: sans-serif; padding: 24px 16px; background: #f5f5f5;">
  <div style="max-width: 500px; margin: 0 auto; background: #fff; padding: 28px; border-radius: 12px;">
    <h2 style="color: #FE2C55; margin: 0 0 16px;">👋 新的簽約主播</h2>
    <p style="color: #555; font-size: 14px; line-height: 1.7;">
      Jack 已將 <strong>${realName}</strong>（藝名 ${stageName}）指派給您，請盡快聯繫並協助後續培訓。
    </p>
    <table style="width: 100%; font-size: 14px; line-height: 1.8; margin: 16px 0;">
      <tr><td style="color: #999; width: 80px;">合約編號</td><td style="font-family: monospace;">${contractNo}</td></tr>
      <tr><td style="color: #999;">姓名</td><td>${realName}</td></tr>
      <tr><td style="color: #999;">藝名</td><td>${stageName}</td></tr>
      <tr><td style="color: #999;">電話</td><td><a href="tel:${phone}">${phone}</a></td></tr>
      <tr><td style="color: #999;">Email</td><td><a href="mailto:${email}">${email}</a></td></tr>
    </table>
  </div>
</body></html>`;
}

function buildRejectedEmail({ contractNo, realName, reason }) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8" /></head>
<body style="font-family: 'Noto Sans TC', sans-serif; background: #f5f5f5; padding: 32px 16px;">
  <div style="max-width: 560px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden;">
    <div style="background: #f59e0b; padding: 24px; text-align: center; color: #fff;">
      <div style="font-size: 20px; font-weight: 900;">⚠️ 合約需補件</div>
    </div>
    <div style="padding: 28px 24px;">
      <p><strong>${realName}</strong> 您好，</p>
      <p>您的合約 <strong style="font-family: monospace;">${contractNo}</strong> 在審核時發現需要補正資料。</p>
      <div style="background: #fef3c7; padding: 14px 18px; border-radius: 8px; margin: 16px 0; color: #92400e;">
        <strong>需補正事項：</strong><br />${reason}
      </div>
      <p style="color: #555; font-size: 14px;">請重新填寫並提交合約，或聯絡 <a href="mailto:contract@jdi-pulse.com">contract@jdi-pulse.com</a> 詢問。</p>
      <div style="text-align: center; margin-top: 20px;">
        <a href="https://jdi-pulse.com/sign/" style="display: inline-block; background: #FE2C55; color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 700;">重新簽約 →</a>
      </div>
    </div>
  </div>
</body></html>`;
}
