/**
 * ============================================================
 * 抽獎系統共用工具
 * ============================================================
 */

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });
}

export async function sha256Hex(str) {
  const buf = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function sha256Short(str) {
  return (await sha256Hex(str)).slice(0, 16);
}

/**
 * 產生 4 碼推薦碼（英數大寫）
 * 例：A3F7、B9K2
 */
export function generateReferralCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 去除易混淆的 I/O/0/1
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * 產生抽獎編號 JDI-{YYMM}-{4 碼流水號}
 * 例：JDI-2609-0128
 */
export function generateTicketNo(month, sequence) {
  // month = "2026-09" → "2609"
  const parts = month.split('-');
  const yymm = parts[0].slice(2) + parts[1];
  const seq = String(sequence).padStart(4, '0');
  return `JDI-${yymm}-${seq}`;
}

/**
 * 驗證手機號碼（台灣格式）
 * 允許：09xxxxxxxx / 09xx-xxx-xxx / 09xx xxx xxx
 */
export function validatePhone(phone) {
  if (!phone || typeof phone !== 'string') return { valid: false, error: '請填寫手機號碼' };
  const cleaned = phone.replace(/[\s\-]/g, '');
  if (!/^09\d{8}$/.test(cleaned)) {
    return { valid: false, error: '請填寫正確的手機格式（09xx-xxx-xxx）' };
  }
  return { valid: true, normalized: cleaned };
}

/**
 * 驗證 Email
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') return { valid: false, error: '請填寫 Email' };
  const trimmed = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { valid: false, error: 'Email 格式不正確' };
  }
  if (trimmed.length > 100) {
    return { valid: false, error: 'Email 太長' };
  }
  return { valid: true, normalized: trimmed };
}

/**
 * 驗證姓名
 */
export function validateName(name) {
  if (!name || typeof name !== 'string') return { valid: false, error: '請填寫姓名' };
  const trimmed = name.trim();
  if (trimmed.length < 2) return { valid: false, error: '姓名至少 2 個字' };
  if (trimmed.length > 20) return { valid: false, error: '姓名不能超過 20 個字' };
  return { valid: true, normalized: trimmed };
}

/**
 * 部分遮罩（保護個資顯示）
 * 姓名：王小明 → 王X明
 * 電話：0912345678 → 0912-XXX-678
 * Email：test@gmail.com → t***@gmail.com
 */
export function maskName(name) {
  if (!name) return '';
  if (name.length <= 2) return name[0] + '*';
  return name[0] + 'X' + name.slice(-1);
}

export function maskPhone(phone) {
  if (!phone || phone.length < 8) return phone;
  return phone.slice(0, 4) + '-XXX-' + phone.slice(-3);
}

export function maskEmail(email) {
  if (!email || !email.includes('@')) return email;
  const [local, domain] = email.split('@');
  const masked = local[0] + '***';
  return `${masked}@${domain}`;
}

/**
 * 建立所有抽獎相關 D1 表（idempotent）
 */
export async function ensureLotteryTables(env) {
  // 主表：抽獎參與者
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS lottery_participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_no TEXT UNIQUE NOT NULL,
      month TEXT NOT NULL,

      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,

      quiz_result_type TEXT,
      quiz_score INTEGER,

      referral_code TEXT UNIQUE NOT NULL,
      referred_by TEXT,
      invite_count INTEGER DEFAULT 0,
      chances_total INTEGER DEFAULT 1,
      chances_used INTEGER DEFAULT 0,

      privacy_agreed INTEGER DEFAULT 0,
      agreed_at TEXT,

      visitor_hash TEXT NOT NULL,
      ip_hash TEXT NOT NULL,
      user_agent TEXT,

      created_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours'))
    )
  `).run();

  await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_lp_ticket ON lottery_participants(ticket_no)`).run();
  await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_lp_month ON lottery_participants(month, created_at)`).run();
  await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_lp_phone ON lottery_participants(month, phone)`).run();
  await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_lp_email ON lottery_participants(month, email)`).run();
  await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_lp_ref ON lottery_participants(referral_code)`).run();
  await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_lp_refby ON lottery_participants(referred_by, month)`).run();

  // 抽獎紀錄（每次翻牌一筆）
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS lottery_draws (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      participant_id INTEGER NOT NULL,
      ticket_no TEXT NOT NULL,
      month TEXT NOT NULL,
      draw_no INTEGER NOT NULL,

      is_winner INTEGER DEFAULT 0,
      prize_id TEXT,
      prize_name TEXT,
      prize_tier TEXT,

      claim_status TEXT DEFAULT 'pending',
      claim_deadline TEXT,
      claimed_at TEXT,
      claim_note TEXT,

      drawn_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours'))
    )
  `).run();

  await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_draws_participant ON lottery_draws(participant_id)`).run();
  await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_draws_month_winner ON lottery_draws(month, is_winner)`).run();
  await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_draws_ticket ON lottery_draws(ticket_no)`).run();

  // 獎品庫存（每月一份）
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS lottery_prize_inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      month TEXT NOT NULL,
      prize_id TEXT NOT NULL,
      prize_name TEXT NOT NULL,
      prize_emoji TEXT,
      prize_tier TEXT,
      stock_total INTEGER NOT NULL,
      stock_remaining INTEGER NOT NULL,
      win_rate REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours')),
      UNIQUE(month, prize_id)
    )
  `).run();

  await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_inv_month ON lottery_prize_inventory(month)`).run();

  // 推薦紀錄
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS lottery_referrals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      referrer_id INTEGER NOT NULL,
      referred_id INTEGER NOT NULL,
      month TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours'))
    )
  `).run();

  await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_refer_referrer ON lottery_referrals(referrer_id, month)`).run();
}

/**
 * 初始化該月獎品庫存（idempotent，只在第一次呼叫時建立）
 */
export async function initMonthInventory(env, month, prizes) {
  for (const p of prizes) {
    // 檢查是否已存在
    const existing = await env.DB.prepare(
      `SELECT id FROM lottery_prize_inventory WHERE month = ? AND prize_id = ? LIMIT 1`
    ).bind(month, p.id).first();

    if (!existing) {
      await env.DB.prepare(`
        INSERT INTO lottery_prize_inventory
          (month, prize_id, prize_name, prize_emoji, prize_tier, stock_total, stock_remaining, win_rate)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(month, p.id, p.name, p.emoji, p.tier, p.stock, p.stock, p.rate).run();
    }
  }
}

/**
 * 判斷是否為抽獎相關開頭的 handler（給前端 fetch 用）
 */
