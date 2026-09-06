/**
 * ============================================================
 * GET /api/ops/admin-list
 * ============================================================
 * 後台：列出所有運營合約
 * 保護：Cloudflare Access + admin 白名單
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

async function ensureTable(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS ops_contracts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contract_no TEXT NOT NULL UNIQUE,
      contract_type TEXT NOT NULL DEFAULT 'ops',
      party_type TEXT NOT NULL,
      entity_name TEXT NOT NULL, tax_id TEXT NOT NULL, tax_id_last4 TEXT NOT NULL,
      representative TEXT, job_title TEXT, address TEXT NOT NULL,
      phone TEXT NOT NULL, phone_last4 TEXT NOT NULL, email TEXT NOT NULL,
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
}

export async function onRequestGet({ request, env }) {
  try {
    await ensureTable(env);

    const auth = await requireAdmin(request, env);
    if (!auth.ok) return authFailedResponse(auth);
    const userEmail = auth.email;

    const url = new URL(request.url);
    const status = url.searchParams.get('status') || 'all';
    const search = url.searchParams.get('q') || '';

    let query = `
      SELECT id, contract_no, party_type, entity_name, representative,
             phone, email, contract_years, contract_start_date, contract_end_date,
             service_fee_rate, status, created_at, approved_at
      FROM ops_contracts
      WHERE 1=1
    `;
    const params = [];

    if (status !== 'all') {
      query += ` AND status = ?`;
      params.push(status);
    }

    if (search) {
      query += ` AND (contract_no LIKE ? OR entity_name LIKE ? OR representative LIKE ? OR phone LIKE ?)`;
      const q = `%${search}%`;
      params.push(q, q, q, q);
    }

    query += ` ORDER BY created_at DESC LIMIT 200`;

    const rows = await env.DB.prepare(query).bind(...params).all();

    const stats = await env.DB.prepare(`
      SELECT status, COUNT(*) as c FROM ops_contracts GROUP BY status
    `).all();
    const statsMap = {};
    for (const s of (stats.results || [])) statsMap[s.status] = s.c;

    return json({
      ok: true,
      contracts: rows.results || [],
      stats: statsMap,
      admin_email: userEmail,
    });
  } catch (err) {
    return json({ ok: false, error: err.message }, 500);
  }
}
