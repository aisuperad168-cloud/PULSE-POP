/**
 * ============================================================
 * POST /api/ops/query
 * ============================================================
 * 乙方查詢合約進度
 * Input: { phone_last4, tax_id_last4 }
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
    const taxIdLast4 = String(body.tax_id_last4 || '').trim().toUpperCase();

    if (!/^\d{4}$/.test(phoneLast4)) {
      return json({ ok: false, error: '電話末 4 碼格式錯誤' }, 400);
    }
    if (!/^[A-Z0-9]{4}$/.test(taxIdLast4)) {
      return json({ ok: false, error: '統編／身分證末 4 碼格式錯誤' }, 400);
    }

    const rows = await env.DB.prepare(`
      SELECT contract_no, party_type, entity_name, representative,
             contract_years, contract_start_date, contract_end_date,
             service_fee_rate, status, approved_at, created_at
      FROM ops_contracts
      WHERE phone_last4 = ? AND tax_id_last4 = ?
      ORDER BY created_at DESC
    `).bind(phoneLast4, taxIdLast4).all();

    return json({ ok: true, contracts: rows.results || [] });
  } catch (err) {
    return json({ ok: false, error: err.message }, 500);
  }
}
