/**
 * ============================================================
 * Admin API 認證檢查
 * ============================================================
 * 檢查 Cloudflare Access header + 白名單
 * 沒帶 header 或不在白名單 → 401/403
 * ============================================================
 */

// 硬 code 的初始白名單（可與 sign_admins 表並存）
// 如果 D1 表裡有 email 也算，兩邊 OR
const HARDCODED_ADMIN_EMAILS = [
  'jack09201112@gmail.com',
  // 加更多超級管理員 email...
];

/**
 * 檢查請求是否為授權管理員
 * @param {Request} request
 * @param {Env} env
 * @returns {Promise<{ok: boolean, email?: string, error?: string, status?: number}>}
 */
export async function requireAdmin(request, env) {
  const email = request.headers.get('Cf-Access-Authenticated-User-Email');

  // 沒帶 Access header = 未經 Cloudflare Access 認證
  if (!email) {
    return {
      ok: false,
      error: '未經授權：請透過 Cloudflare Access 登入後台',
      status: 401,
    };
  }

  // 檢查硬 code 白名單
  const emailLower = email.toLowerCase();
  if (HARDCODED_ADMIN_EMAILS.map(e => e.toLowerCase()).includes(emailLower)) {
    return { ok: true, email };
  }

  // 檢查 D1 sign_admins 表
  try {
    const admin = await env.DB.prepare(
      `SELECT id, name, role FROM sign_admins WHERE LOWER(email) = ? AND active = 1`
    ).bind(emailLower).first();

    if (admin) {
      return { ok: true, email, admin };
    }
  } catch (err) {
    // Table 可能還沒建
    console.error('[requireAdmin] D1 check failed:', err.message);
  }

  // 有 Access header 但不在白名單
  return {
    ok: false,
    error: `未授權：${email} 不在管理員白名單`,
    status: 403,
  };
}

/**
 * Helper：直接回 JSON 拒絕回應
 */
export function authFailedResponse(auth) {
  return new Response(
    JSON.stringify({ ok: false, error: auth.error }),
    {
      status: auth.status || 401,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}
