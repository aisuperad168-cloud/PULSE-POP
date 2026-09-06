/**
 * ============================================================
 * GET /api/sign/admin-debug
 * ============================================================
 * 診斷用：不加任何過濾，直接看 sign_contracts 表所有資料
 * 保護：Cloudflare Access + admin 白名單
 * ============================================================
 */

import { requireAdmin, authFailedResponse } from './_auth.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS_HEADERS },
  });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestGet({ request, env }) {
  try {
    // 強制認證
    const auth = await requireAdmin(request, env);
    if (!auth.ok) return authFailedResponse(auth);

    // 1. 撈所有合約（不加過濾）
    const all = await env.DB.prepare(`
      SELECT id, contract_no, real_name, stage_name,
             status, created_at, approved_at, approved_by,
             operator_name, operator_email,
             contract_start_date, contract_end_date
      FROM sign_contracts
      ORDER BY created_at DESC
      LIMIT 100
    `).all();

    // 2. 按 status 分組統計
    const stats = await env.DB.prepare(`
      SELECT status, COUNT(*) as c FROM sign_contracts GROUP BY status
    `).all();

    // 3. 總數
    const totalCount = await env.DB.prepare(`
      SELECT COUNT(*) as c FROM sign_contracts
    `).first();

    // 4. approved 的（單獨列出來）
    const approved = await env.DB.prepare(`
      SELECT id, contract_no, real_name, status, approved_at, approved_by
      FROM sign_contracts WHERE status = 'approved' ORDER BY approved_at DESC
    `).all();

    // 5. 稽核 log 的 approve 動作
    let approveLogs = { results: [] };
    try {
      approveLogs = await env.DB.prepare(`
        SELECT id, contract_id, action, actor, actor_ip, created_at, metadata
        FROM sign_audit_logs
        WHERE action IN ('approve', 'delete', 'reject')
        ORDER BY created_at DESC
        LIMIT 30
      `).all();
    } catch (e) { /* ignore */ }

    // 6. 表結構
    let columns = { results: [] };
    try {
      columns = await env.DB.prepare(`PRAGMA table_info(sign_contracts)`).all();
    } catch (e) { /* ignore */ }

    return json({
      ok: true,
      admin_email: auth.email,
      total_count: totalCount?.c || 0,
      stats_by_status: stats.results || [],
      approved_contracts: approved.results || [],
      all_contracts: all.results || [],
      recent_approve_delete_logs: approveLogs.results || [],
      table_columns: columns.results?.map(c => c.name) || [],
    });
  } catch (err) {
    return json({ ok: false, error: err.message, stack: err.stack }, 500);
  }
}
