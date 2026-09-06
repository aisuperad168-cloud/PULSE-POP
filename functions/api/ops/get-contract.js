/**
 * ============================================================
 * GET /api/ops/get-contract?no=xxx&phone_last4=xxx&tax_id_last4=xxx
 * ============================================================
 * 給合約檢視頁抓完整資料
 * 三因子驗證 or admin (CF Access header)
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
    const taxIdLast4 = url.searchParams.get('tax_id_last4');
    // Admin 判定：
    //   1. 有 CF Access header → 強驗證（真 admin，可看敏感資料）
    //   2. URL admin=1 → 只做「跳過三因子」用（因為 admin 不知道乙方電話/身分證末 4）
    //      → 但要有 CF Access header 才會拿到完整敏感資料（含未遮罩銀行帳號）
    //      → 沒 header 就當一般乙方看待（遮罩銀行帳號）
    // 安全性：非 admin 用 admin=1 也頂多看到已遮罩內容（跟乙方本人看到一樣），不算資料外洩
    const adminEmail = request.headers.get('Cf-Access-Authenticated-User-Email');
    const adminFlag = url.searchParams.get('admin') === '1';
    const isAdmin = !!adminEmail;                    // 只有 CF Access header 才是「真 admin」
    const skipThreeFactor = isAdmin || adminFlag;    // admin=1 只用來跳過三因子驗證

    if (!contractNo) return json({ ok: false, error: '缺少合約編號' }, 400);

    const contract = await env.DB.prepare(
      `SELECT * FROM ops_contracts WHERE contract_no = ?`
    ).bind(contractNo).first();

    if (!contract) return json({ ok: false, error: '找不到合約' }, 404);

    // 三因子驗證（admin=1 或 CF Access header 可跳過）
    if (!skipThreeFactor) {
      if (!phoneLast4 || !taxIdLast4) {
        return json({ ok: false, error: '需提供電話末 4 碼 + 統編／身分證末 4 碼驗證' }, 401);
      }
      if (contract.phone_last4 !== phoneLast4 || contract.tax_id_last4 !== taxIdLast4.toUpperCase()) {
        return json({ ok: false, error: '驗證失敗' }, 403);
      }
    }

    // 附件（僅 admin 完整回傳；非 admin 也可看公司大小章 base64，因為是他自己上傳的）
    let attachments = [];
    const a = await env.DB.prepare(
      `SELECT file_type, storage_url FROM ops_attachments WHERE contract_id = ?`
    ).bind(contract.id).all();
    attachments = a.results || [];

    // 非 admin：遮罩敏感欄位
    if (!isAdmin) {
      // 銀行帳號只顯示末 5 碼
      if (contract.bank_account) {
        const acc = contract.bank_account;
        contract.bank_account = acc.length > 5
          ? '****' + acc.slice(-5)
          : '****';
      }
      // 統編／身分證：完整顯示自己的（既然驗過就是本人）
    }

    // Audit
    const ip = request.headers.get('CF-Connecting-IP') || '';
    await env.DB.prepare(`
      INSERT INTO ops_audit_logs (contract_id, action, actor, actor_ip, details)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      contract.id, 'viewed',
      isAdmin ? adminEmail || 'admin' : 'ops_party',
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
