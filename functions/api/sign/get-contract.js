/**
 * ============================================================
 * GET /api/sign/get-contract?no=xxx&phone_last4=xxx&id_last4=xxx
 * ============================================================
 * 給合約檢視頁 (contract-view) 拉完整合約資料
 * 認證方式：合約編號 + 手機末 4 + 身分證末 4（三因子）
 *
 * 若請求來自 admin (Cf-Access-Authenticated-User-Email header)，
 * 略過三因子驗證，直接回傳完整資料
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
    const url = new URL(request.url);
    const contractNo = url.searchParams.get('no');
    const phoneLast4 = url.searchParams.get('phone_last4');
    const idLast4 = url.searchParams.get('id_last4');
    const adminEmail = request.headers.get('Cf-Access-Authenticated-User-Email');
    const isAdmin = !!adminEmail || url.searchParams.get('admin') === '1';

    if (!contractNo) return json({ ok: false, error: '缺少合約編號' }, 400);

    // 抓合約
    const contract = await env.DB.prepare(
      `SELECT * FROM sign_contracts WHERE contract_no = ?`
    ).bind(contractNo).first();

    if (!contract) return json({ ok: false, error: '找不到合約' }, 404);

    // 若非 admin，需驗證三因子
    if (!isAdmin) {
      if (!phoneLast4 || !idLast4) {
        return json({ ok: false, error: '需提供手機末 4 碼 + 身分證末 4 碼驗證' }, 401);
      }
      if (contract.phone_last4 !== phoneLast4 || contract.id_number_last4 !== idLast4) {
        return json({ ok: false, error: '驗證失敗' }, 403);
      }
    }

    // 抓附件（僅 admin 才回傳身分證圖，避免主播端 base64 太大）
    let attachments = [];
    if (isAdmin) {
      const a = await env.DB.prepare(
        `SELECT file_type, storage_url FROM sign_attachments WHERE contract_id = ?`
      ).bind(contract.id).all();
      attachments = a.results || [];
    }

    // Audit：紀錄查看
    const ip = request.headers.get('CF-Connecting-IP') || '';
    await env.DB.prepare(`
      INSERT INTO sign_audit_logs (contract_id, action, actor, actor_ip, details)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      contract.id, 'viewed',
      isAdmin ? adminEmail || 'admin' : 'streamer',
      ip,
      JSON.stringify({ via: 'contract-view' })
    ).run();

    return json({
      ok: true,
      contract,
      attachments,
      is_admin: isAdmin,
    });
  } catch (err) {
    return json({ ok: false, error: err.message }, 500);
  }
}
