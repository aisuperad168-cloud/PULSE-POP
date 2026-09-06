/**
 * ============================================================
 * POST /api/sign/query
 * ============================================================
 * 主播查詢合約進度
 * Input: { phone_last4, id_last4 }
 * Output: 該手機末4+身分證末4 對應的合約列表
 * ============================================================
 */

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
    const body = await request.json();
    const phoneLast4 = String(body.phone_last4 || '').trim();
    const idLast4 = String(body.id_last4 || '').trim().toUpperCase();

    if (!/^\d{4}$/.test(phoneLast4)) {
      return json({ ok: false, error: '手機末 4 碼格式錯誤' }, 400);
    }
    if (!/^\d{4}$/.test(idLast4)) {
      return json({ ok: false, error: '身分證末 4 碼格式錯誤' }, 400);
    }

    const rows = await env.DB.prepare(`
      SELECT contract_no, real_name, stage_name, contract_years,
             contract_start_date, contract_end_date, status,
             approved_at, operator_name, created_at
      FROM sign_contracts
      WHERE phone_last4 = ? AND id_number_last4 = ?
      ORDER BY created_at DESC
    `).bind(phoneLast4, idLast4).all();

    return json({ ok: true, contracts: rows.results || [] });
  } catch (err) {
    return json({ ok: false, error: err.message }, 500);
  }
}
