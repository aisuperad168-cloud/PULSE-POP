/**
 * ============================================================
 * POST /api/ops/admin-delete
 * ============================================================
 * 後台：刪除運營合約（測試資料清理用）
 * Input: { contract_no, confirm }
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
    const { contract_no, confirm } = body;

    if (!contract_no) return json({ ok: false, error: '缺少 contract_no' }, 400);
    if (contract_no !== confirm) {
      return json({ ok: false, error: '刪除確認：請將 confirm 欄位填入相同的合約編號' }, 400);
    }

    const contract = await env.DB.prepare(
      `SELECT id, entity_name, status FROM ops_contracts WHERE contract_no = ?`
    ).bind(contract_no).first();

    if (!contract) return json({ ok: false, error: '找不到該合約' }, 404);

    const contractId = contract.id;
    const ip = request.headers.get('CF-Connecting-IP') || '';

    await env.DB.prepare(`DELETE FROM ops_audit_logs WHERE contract_id = ?`).bind(contractId).run();
    await env.DB.prepare(`DELETE FROM ops_attachments WHERE contract_id = ?`).bind(contractId).run();
    await env.DB.prepare(`DELETE FROM ops_email_logs WHERE contract_id = ?`).bind(contractId).run();
    const result = await env.DB.prepare(`DELETE FROM ops_contracts WHERE id = ?`).bind(contractId).run();

    return json({
      ok: true,
      message: `已刪除合約 ${contract_no}（${contract.entity_name}）及所有關聯資料`,
      deleted_rows: result.meta?.changes || 0,
      deleted_by: userEmail,
      ip,
    });
  } catch (err) {
    return json({ ok: false, error: err.message }, 500);
  }
}
