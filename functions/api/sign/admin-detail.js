/**
 * ============================================================
 * GET /api/sign/admin-detail?id=xxx
 * ============================================================
 * 後台：取得單一合約詳細資料（含身分證圖 base64）
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
    const userEmail = request.headers.get('Cf-Access-Authenticated-User-Email');
    // MVP: 允許未受保護（後續啟用 Access 後可強制）

    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) return json({ ok: false, error: '缺少 id 參數' }, 400);

    const contract = await env.DB.prepare(
      `SELECT * FROM sign_contracts WHERE id = ?`
    ).bind(id).first();

    if (!contract) return json({ ok: false, error: '找不到合約' }, 404);

    // 抓附件
    const attachments = await env.DB.prepare(
      `SELECT file_type, file_name, file_size, content_type, storage_url FROM sign_attachments WHERE contract_id = ?`
    ).bind(id).all();

    // 抓 audit logs
    const logs = await env.DB.prepare(
      `SELECT action, actor, actor_ip, details, created_at FROM sign_audit_logs WHERE contract_id = ? ORDER BY created_at DESC LIMIT 30`
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
