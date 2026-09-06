/**
 * ============================================================
 * POST /api/ops/admin-approve
 * ============================================================
 * Jack 核准/退回 運營合約
 * Input: { contract_id, action, reject_reason, admin_note }
 * ============================================================
 */

import { requireAdmin, authFailedResponse } from '../sign/_auth.js';

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
    const auth = await requireAdmin(request, env);
    if (!auth.ok) return authFailedResponse(auth);
    const userEmail = auth.email;

    const body = await request.json();
    const { contract_id, action, reject_reason, admin_note } = body;

    if (!contract_id) return json({ ok: false, error: '缺少 contract_id' }, 400);
    if (!['approve', 'reject'].includes(action)) {
      return json({ ok: false, error: 'action 必須為 approve 或 reject' }, 400);
    }

    const contract = await env.DB.prepare(`SELECT * FROM ops_contracts WHERE id = ?`).bind(contract_id).first();
    if (!contract) return json({ ok: false, error: '找不到合約' }, 404);
    if (contract.status !== 'pending') {
      return json({ ok: false, error: `合約狀態為 ${contract.status}，無法審核` }, 400);
    }

    const now = new Date().toISOString();

    if (action === 'approve') {
      await env.DB.prepare(`
        UPDATE ops_contracts
        SET status = 'approved',
            approved_at = ?, approved_by = ?,
            jack_signature_applied_at = ?,
            admin_note = ?,
            updated_at = ?
        WHERE id = ?
      `).bind(now, userEmail, now, admin_note || null, now, contract_id).run();

      await env.DB.prepare(`
        INSERT INTO ops_audit_logs (contract_id, action, actor, actor_ip, details)
        VALUES (?, ?, ?, ?, ?)
      `).bind(
        contract_id, 'approved', userEmail,
        request.headers.get('CF-Connecting-IP') || '',
        JSON.stringify({ admin_note: admin_note || null })
      ).run();

      // 寄核准通知（含合約檢視連結）
      const viewLink = `https://jdi-pulse.com/ops/contract-view/?no=${encodeURIComponent(contract.contract_no)}&phone_last4=${contract.phone_last4}&tax_id_last4=${contract.tax_id_last4}`;
      const emailR = await sendEmail(env, {
        to: contract.email,
        subject: `【JDI 脈動傳媒】✓ 公會合作合約已核准 · ${contract.contract_no}`,
        html: buildApprovedEmail({
          contractNo: contract.contract_no,
          entityName: contract.entity_name,
          partyType: contract.party_type,
          approvedAt: now,
          startDate: contract.contract_start_date,
          endDate: contract.contract_end_date,
          years: contract.contract_years,
          serviceFeeRate: contract.service_fee_rate,
          viewLink,
        }),
      });

      await env.DB.prepare(`
        INSERT INTO ops_email_logs (contract_id, to_email, template, subject, status, provider_id, sent_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        contract_id, contract.email, 'approved',
        `【JDI 脈動傳媒】✓ 公會合作合約已核准`,
        emailR.ok ? 'sent' : 'failed', emailR.id || null,
        emailR.ok ? now : null
      ).run();

      return json({ ok: true, message: '合約已核准並通知乙方', contract_no: contract.contract_no });

    } else {
      // Reject
      if (!reject_reason) return json({ ok: false, error: '退回時必須填入原因' }, 400);

      await env.DB.prepare(`
        UPDATE ops_contracts
        SET status = 'rejected', rejection_reason = ?, updated_at = ?
        WHERE id = ?
      `).bind(reject_reason, now, contract_id).run();

      await env.DB.prepare(`
        INSERT INTO ops_audit_logs (contract_id, action, actor, details)
        VALUES (?, ?, ?, ?)
      `).bind(contract_id, 'rejected', userEmail, JSON.stringify({ reason: reject_reason })).run();

      await sendEmail(env, {
        to: contract.email,
        subject: `【JDI 脈動傳媒】公會合作合約需補件 · ${contract.contract_no}`,
        html: buildRejectedEmail({
          contractNo: contract.contract_no,
          entityName: contract.entity_name,
          reason: reject_reason,
        }),
      });

      return json({ ok: true, message: '合約已退回並通知乙方' });
    }

  } catch (err) {
    console.error('[ops admin-approve] error:', err);
    return json({ ok: false, error: err.message }, 500);
  }
}

async function sendEmail(env, { to, subject, html }) {
  if (!env.RESEND_API_KEY) return { ok: false };
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

function buildApprovedEmail({ contractNo, entityName, partyType, approvedAt, startDate, endDate, years, serviceFeeRate, viewLink }) {
  const partyLabel = partyType === 'company' ? '經紀公司' : '個人運營';
  return `<!DOCTYPE html><html><head><meta charset="UTF-8" /></head>
<body style="font-family: 'Noto Sans TC', sans-serif; background: #f5f5f5; padding: 32px 16px; margin: 0;">
  <div style="max-width: 560px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden;">
    <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 32px 24px; text-align: center;">
      <div style="color: #fff; font-size: 12px; letter-spacing: 3px; margin-bottom: 8px;">JDI PULSE MEDIA</div>
      <div style="color: #fff; font-size: 24px; font-weight: 900;">🎉 公會合作合約已核准</div>
    </div>
    <div style="padding: 32px 24px;">
      <p style="color: #333; font-size: 15px;"><strong>${entityName}</strong>（${partyLabel}）您好，</p>
      <p style="color: #555; font-size: 14px; line-height: 1.7;">
        您與 JDI 脈動傳媒的公會合作合約已由甲方負責人 Jack 完成審核與用印。
      </p>
      <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 3px solid #22c55e;">
        <p style="margin: 0; font-size: 13px; color: #555;">合約編號</p>
        <p style="margin: 6px 0 14px; font-size: 20px; font-weight: 900; color: #22c55e; font-family: monospace;">${contractNo}</p>
        <table style="width: 100%; font-size: 13px; color: #555; border-collapse: collapse;">
          <tr><td style="padding: 3px 0; color: #999; width: 100px;">生效日期</td><td style="padding: 3px 0; font-weight: 700; color: #16a34a;">${startDate}</td></tr>
          <tr><td style="padding: 3px 0; color: #999;">到期日期</td><td style="padding: 3px 0; font-weight: 700;">${endDate}</td></tr>
          <tr><td style="padding: 3px 0; color: #999;">合作期間</td><td style="padding: 3px 0; font-weight: 700;">${years} 年</td></tr>
          <tr><td style="padding: 3px 0; color: #999;">服務手續費</td><td style="padding: 3px 0; font-weight: 700;">${serviceFeeRate}%</td></tr>
          <tr><td style="padding: 3px 0; color: #999;">結算週期</td><td style="padding: 3px 0; font-weight: 700;">T+2 月，每月 25 日</td></tr>
          <tr><td style="padding: 3px 0; color: #999;">核准時間</td><td style="padding: 3px 0;">${new Date(approvedAt).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}</td></tr>
        </table>
      </div>
      <p style="color: #555; font-size: 14px; line-height: 1.7;">
        主約已生效。TikTok 平台任務、獎勵、扶持等相關附約，甲方將於後續另行以 Email 或通訊軟體提供。
      </p>
      <div style="text-align: center; margin: 28px 0 12px;">
        <a href="${viewLink}" style="display: inline-block; background: #6366f1; color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 700; font-size: 15px;">
          📄 檢視 / 下載合約 PDF →
        </a>
      </div>
      <p style="text-align: center; color: #999; font-size: 12px; line-height: 1.6; margin-top: 16px;">
        提示：開啟後可點右上角「列印 / 存 PDF」
      </p>
    </div>
    <div style="background: #f9f9f9; padding: 20px 24px; text-align: center; color: #999; font-size: 11px; line-height: 1.6; border-top: 1px solid #eee;">
      本信件由 JDI 脈動傳媒簽約系統自動寄發。<br /><a href="mailto:contract@jdi-pulse.com" style="color: #6366f1;">contract@jdi-pulse.com</a>
    </div>
  </div>
</body></html>`;
}

function buildRejectedEmail({ contractNo, entityName, reason }) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8" /></head>
<body style="font-family: 'Noto Sans TC', sans-serif; background: #f5f5f5; padding: 32px 16px;">
  <div style="max-width: 560px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden;">
    <div style="background: #f59e0b; padding: 24px; text-align: center; color: #fff;">
      <div style="font-size: 20px; font-weight: 900;">⚠️ 公會合作合約需補件</div>
    </div>
    <div style="padding: 28px 24px;">
      <p><strong>${entityName}</strong> 您好，</p>
      <p>您的合約 <strong style="font-family: monospace;">${contractNo}</strong> 在審核時發現需要補正資料。</p>
      <div style="background: #fef3c7; padding: 14px 18px; border-radius: 8px; margin: 16px 0; color: #92400e;">
        <strong>需補正事項：</strong><br />${reason}
      </div>
      <p style="color: #555; font-size: 14px;">請重新填寫並提交合約，或聯絡 <a href="mailto:contract@jdi-pulse.com">contract@jdi-pulse.com</a> 詢問。</p>
      <div style="text-align: center; margin-top: 20px;">
        <a href="https://jdi-pulse.com/ops/" style="display: inline-block; background: #6366f1; color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 700;">重新簽約 →</a>
      </div>
    </div>
  </div>
</body></html>`;
}
