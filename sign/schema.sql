-- ============================================================
-- JDI Pulse Media · 電子簽約系統資料庫 Schema
-- ============================================================
-- Database: jdi-pulse-leads (共用現有 D1)
-- Prefix: sign_* (避免與其他表衝突)
-- ============================================================

-- ============ 主表：電子合約 ============
CREATE TABLE IF NOT EXISTS sign_contracts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- 合約識別
  contract_no TEXT NOT NULL UNIQUE,           -- JDI-SIGN-20260906-0001
  contract_type TEXT NOT NULL DEFAULT 'streamer', -- streamer / ops (為未來 ops.jdi-pulse.com 預留)

  -- 主播基本資料
  real_name TEXT NOT NULL,                     -- 真實姓名
  stage_name TEXT NOT NULL,                    -- 藝名/暱稱
  id_number TEXT NOT NULL,                     -- 身分證字號（加密存）
  id_number_last4 TEXT NOT NULL,               -- 身分證後4碼（查詢用，明文）
  phone TEXT NOT NULL,                         -- 手機（完整）
  phone_last4 TEXT NOT NULL,                   -- 手機後4碼（查詢用，明文）
  email TEXT NOT NULL,                         -- 通知信箱
  birthday TEXT,                               -- 生日 YYYY-MM-DD
  contact_address TEXT NOT NULL,               -- 聯絡地址
  registered_address TEXT NOT NULL,            -- 戶籍地址

  -- 合約條件（主播選擇）
  contract_years INTEGER NOT NULL,             -- 合約年限：1, 2, 3
  contract_start_date TEXT NOT NULL,           -- 生效日 YYYY-MM-DD（主播選）
  contract_end_date TEXT NOT NULL,             -- 到期日 YYYY-MM-DD（系統計算）

  -- 簽署證據（法律強度）
  signature_data TEXT NOT NULL,                -- Canvas 簽名 base64 PNG（主播端）
  signed_at TEXT NOT NULL,                     -- 主播簽署時間 ISO8601
  signed_ip TEXT NOT NULL,                     -- 主播簽署 IP
  signed_ua TEXT,                              -- User-Agent
  read_scrolled_at TEXT,                       -- 滾到底時間戳（證明讀完）
  agreed_at TEXT NOT NULL,                     -- 勾選同意時間戳

  -- 狀態管理
  status TEXT NOT NULL DEFAULT 'pending',      -- pending / approved / rejected / expired / terminated
  -- pending    = 待審核 (主播剛送出)
  -- approved   = 已核准 (Jack 核准完成)
  -- rejected   = 已退回 (Jack 退回補件)
  -- expired    = 已過期 (自然到期)
  -- terminated = 已終止 (提前解約)

  -- Jack 審核資訊（核准時填入）
  approved_at TEXT,                            -- 核准時間
  approved_by TEXT,                            -- 核准人 email (Jack)
  operator_name TEXT,                          -- 運營經紀姓名（Jack 核准時填）
  operator_email TEXT,                         -- 運營經紀 Email（Jack 核准時填）
  jack_signature_applied_at TEXT,              -- 甲方章蓋上時間
  rejection_reason TEXT,                       -- 退回原因（若 rejected）

  -- 時間戳
  created_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours'))
);

CREATE INDEX IF NOT EXISTS idx_sign_contracts_no ON sign_contracts(contract_no);
CREATE INDEX IF NOT EXISTS idx_sign_contracts_status ON sign_contracts(status);
CREATE INDEX IF NOT EXISTS idx_sign_contracts_query ON sign_contracts(phone_last4, id_number_last4);
CREATE INDEX IF NOT EXISTS idx_sign_contracts_created ON sign_contracts(created_at DESC);

-- ============ 附件：身分證正反面等 ============
CREATE TABLE IF NOT EXISTS sign_attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contract_id INTEGER NOT NULL,                -- FK to sign_contracts.id
  file_type TEXT NOT NULL,                     -- id_front / id_back / other
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,                  -- bytes
  content_type TEXT NOT NULL,                  -- image/jpeg 等
  storage_provider TEXT NOT NULL DEFAULT 'r2', -- r2 / gdrive
  storage_key TEXT NOT NULL,                   -- R2 object key 或 GDrive file ID
  storage_url TEXT,                            -- 完整 URL（可能過期）
  uploaded_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours')),

  FOREIGN KEY (contract_id) REFERENCES sign_contracts(id)
);

CREATE INDEX IF NOT EXISTS idx_sign_attachments_contract ON sign_attachments(contract_id);

-- ============ 稽核紀錄 ============
CREATE TABLE IF NOT EXISTS sign_audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contract_id INTEGER NOT NULL,
  action TEXT NOT NULL,                        -- created / submitted / approved / rejected / viewed / downloaded / email_sent
  actor TEXT,                                  -- streamer / admin_email / system
  actor_ip TEXT,
  actor_ua TEXT,
  details TEXT,                                -- JSON: 額外資訊
  created_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours')),

  FOREIGN KEY (contract_id) REFERENCES sign_contracts(id)
);

CREATE INDEX IF NOT EXISTS idx_sign_audit_contract ON sign_audit_logs(contract_id);
CREATE INDEX IF NOT EXISTS idx_sign_audit_time ON sign_audit_logs(created_at DESC);

-- ============ 後台管理員白名單 ============
CREATE TABLE IF NOT EXISTS sign_admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'reviewer',       -- reviewer / super_admin
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours'))
);

-- 初始化 Jack 為第一位管理員（email 佔位，等你之後給我真正的）
INSERT OR IGNORE INTO sign_admins (email, name, role) VALUES
  ('jack@jdi-pulse.com', '曜宸 Jack', 'super_admin');

-- ============ Email 通知記錄 ============
CREATE TABLE IF NOT EXISTS sign_email_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contract_id INTEGER,
  to_email TEXT NOT NULL,
  template TEXT NOT NULL,                      -- submitted / under_review / approved / completed / rejected
  subject TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'resend',
  provider_id TEXT,                            -- Resend message ID
  status TEXT NOT NULL DEFAULT 'pending',      -- pending / sent / failed
  error_message TEXT,
  sent_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours')),

  FOREIGN KEY (contract_id) REFERENCES sign_contracts(id)
);

CREATE INDEX IF NOT EXISTS idx_sign_email_contract ON sign_email_logs(contract_id);
