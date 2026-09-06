/**
 * ============================================================
 * POST /api/ops/admin-purge-test
 * ============================================================
 * ⚠️ 一鍵清空 ops_contracts 所有資料（包含附件、稽核、Email log）
 * 用途：清測試合約
 *
 * 保護：
 *   1. Cloudflare Access + admin 白名單
 *   2. 需在 body 傳 { confirm: "PURGE-ALL-OPS" } 才會真的刪
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

    const body = await request.json().catch(() => ({}));
    if (body.confirm !== 'PURGE-ALL-OPS') {
      return json({
        ok: false,
        error: '需傳 { "confirm": "PURGE-ALL-OPS" } 才會真的刪',
      }, 400);
    }

    // 撈刪除前 snapshot
    const before = await env.DB.prepare(
      `SELECT contract_no, entity_name FROM ops_contracts ORDER BY id`
    ).all();
    const list = before.results || [];

    // 依序清（沒有 FK cascade，手動刪）
    const logs = await env.DB.prepare(`DELETE FROM ops_audit_logs`).run();
    const attas = await env.DB.prepare(`DELETE FROM ops_attachments`).run();
    const emails = await env.DB.prepare(`DELETE FROM ops_email_logs`).run();
    const contracts = await env.DB.prepare(`DELETE FROM ops_contracts`).run();

    // 重置 AUTOINCREMENT 計數器（讓下一筆 id 從 1 開始）
    try {
      await env.DB.prepare(`DELETE FROM sqlite_sequence WHERE name IN ('ops_contracts','ops_attachments','ops_audit_logs','ops_email_logs')`).run();
    } catch (e) { /* sqlite_sequence 可能不存在 */ }

    return json({
      ok: true,
      message: `✓ 已清空所有運營合約`,
      deleted: {
        contracts: contracts.meta?.changes || 0,
        attachments: attas.meta?.changes || 0,
        audit_logs: logs.meta?.changes || 0,
        email_logs: emails.meta?.changes || 0,
      },
      purged_contracts: list,
      purged_by: userEmail,
      purged_at: new Date().toISOString(),
    });
  } catch (err) {
    return json({ ok: false, error: err.message }, 500);
  }
}
