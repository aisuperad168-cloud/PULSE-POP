/**
 * ============================================================
 * GET /api/sign/admin-list
 * ============================================================
 * 後台：列出所有合約（供 Jack 審核）
 * 保護：Cloudflare Access header (Cf-Access-Authenticated-User-Email)
 * ============================================================
 */

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
    // ============ 檢查 Cloudflare Access header ============
    const userEmail = request.headers.get('Cf-Access-Authenticated-User-Email');
    // MVP 階段：暫時允許未受 Access 保護（開發用）
    // 生產環境務必啟用 Cloudflare Access
    const isDev = !userEmail;

    if (!isDev) {
      // 檢查是否在 sign_admins 白名單
      const admin = await env.DB.prepare(
        `SELECT id, name, role FROM sign_admins WHERE email = ? AND active = 1`
      ).bind(userEmail).first();
      if (!admin) {
        return json({ ok: false, error: '無權限存取後台' }, 403);
      }
    }

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
