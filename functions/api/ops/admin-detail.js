/**
 * ============================================================
 * GET /api/ops/admin-detail?id=xxx
 * ============================================================
 * 後台：抓單一運營合約詳情（含附件 + 稽核 log）
 * ============================================================
 */

import { requireAdmin, authFailedResponse } from '../sign/_auth.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

export async function onRequestGet({ request, env }) {
  try {
    const auth = await requireAdmin(request, env);
    if (!auth.ok) return authFailedResponse(auth);

    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) return json({ ok: false, error: '缺少 id' }, 400);

    const contract = await env.DB.prepare(
      `SELECT * FROM ops_contracts WHERE id = ?`
    ).bind(id).first();
    if (!contract) return json({ ok: false, error: '找不到合約' }, 404);

    const attachments = await env.DB.prepare(
      `SELECT file_type, file_name, file_size, content_type, storage_url FROM ops_attachments WHERE contract_id = ?`
    ).bind(id).all();

    const logs = await env.DB.prepare(
      `SELECT action, actor, actor_ip, details, created_at
       FROM ops_audit_logs WHERE contract_id = ? ORDER BY created_at DESC LIMIT 30`
    ).bind(id).all();

    return json({
      ok: true,
      contract,
      attachments: attachments.results || [],
      logs: logs.results || [],
    });
  } catch (err) {
    return json({ ok: false, error: err.message }, 500);
  }
}
