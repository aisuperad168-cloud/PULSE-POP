/**
 * ============================================================
 * GET /api/sign/whoami
 * ============================================================
 * 診斷用：顯示目前經 Cloudflare Access 登入的 email 等資訊
 *
 * 使用方式：在瀏覽器（已登入 CF Access）打開
 *   https://jdi-pulse.com/api/sign/whoami
 * ============================================================
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestGet({ request }) {
  const email = request.headers.get('Cf-Access-Authenticated-User-Email');
  const userId = request.headers.get('Cf-Access-Authenticated-User-Id');
  const jwt = request.headers.get('Cf-Access-Jwt-Assertion');

  // 挑幾個關鍵 header
  const debugHeaders = {};
  const allHeaders = {};
  for (const [k, v] of request.headers.entries()) {
    allHeaders[k] = v;
    if (k.toLowerCase().startsWith('cf-')) {
      debugHeaders[k] = v;
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      logged_in_email: email || null,
      user_id: userId || null,
      has_jwt: !!jwt,
      note: email
        ? `✅ Cloudflare Access 已識別您為: ${email}`
        : '❌ 未經 Cloudflare Access 認證（沒帶 Cf-Access-Authenticated-User-Email header）',
      cf_headers: debugHeaders,
    }, null, 2),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS_HEADERS },
    }
  );
}
