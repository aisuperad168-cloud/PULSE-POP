/**
 * ============================================================
 * GET /api/sign/admin-list
 * ============================================================
 * 後台：列出所有合約（供 Jack 審核）
 * 保護：Cloudflare Access header (Cf-Access-Authenticated-User-Email)
 *      + 硬 code / D1 白名單雙重檢查
 * ============================================================
 */

import { requireAdmin, authFailedResponse } from './_auth.js';

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

async function ensureTable(env) {
  await env.DB.prepare(`
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
    )`).run();
}

export async function onRequestGet({ request, env }) {
  try {
    await ensureTable(env);

    // ============ 強制認證：僅允許授權管理員 ============
    const auth = await requireAdmin(request, env);
    if (!auth.ok) return authFailedResponse(auth);
    const userEmail = auth.email;

    // Query params
    const url = new URL(request.url);
    const status = url.searchParams.get('status') || 'all';
    const search = url.searchParams.get('q') || '';

    let query = `
      SELECT id, contract_no, real_name, stage_name, phone, email,
             contract_years, contract_start_date, contract_end_date,
             status, operator_name, operator_email,
             created_at, approved_at
      FROM sign_contracts
      WHERE 1=1
    `;
    const params = [];

    if (status !== 'all') {
      query += ` AND status = ?`;
      params.push(status);
    }

    if (search) {
      query += ` AND (contract_no LIKE ? OR real_name LIKE ? OR stage_name LIKE ? OR phone LIKE ?)`;
      const q = `%${search}%`;
      params.push(q, q, q, q);
    }

    query += ` ORDER BY created_at DESC LIMIT 200`;

    const rows = await env.DB.prepare(query).bind(...params).all();

    // 統計數
    const stats = await env.DB.prepare(`
      SELECT status, COUNT(*) as c FROM sign_contracts GROUP BY status
    `).all();
    const statsMap = {};
    for (const s of (stats.results || [])) statsMap[s.status] = s.c;

    return json({
      ok: true,
      contracts: rows.results || [],
      stats: statsMap,
      admin_email: userEmail || 'dev-mode',
    });
  } catch (err) {
    return json({ ok: false, error: err.message }, 500);
  }
}
