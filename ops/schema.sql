-- ============================================================
-- JDI Pulse Media · 運營合作合約系統 (ops.jdi-pulse.com)
-- ============================================================
-- Database: jdi-pulse-leads (共用現有 D1)
-- Prefix: ops_* (避免與 sign_* 主播端衝突)
-- ============================================================

-- ============ 主表：運營合作合約 ============
CREATE TABLE IF NOT EXISTS ops_contracts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- 合約識別
  contract_no TEXT NOT NULL UNIQUE,           -- JDI-OPS-260906-XXXXXX
  contract_type TEXT NOT NULL DEFAULT 'ops',

  -- 乙方身份類別
  party_type TEXT NOT NULL,                    -- 'company' | 'individual'

  -- 乙方基本資料（依 party_type 差異）
  -- 公司名稱 or 個人姓名
  entity_name TEXT NOT NULL,                   -- 公司：公司名稱 / 個人：姓名
  tax_id TEXT NOT NULL,                        -- 公司：統編 8 碼 / 個人：身分證字號
  tax_id_last4 TEXT NOT NULL,                  -- 統編或身分證後 4 碼（查詢用）
  representative TEXT,                         -- 代表人／負責人（公司必填，個人選填）
  job_title TEXT,                              -- 職稱（選填）
  address TEXT NOT NULL,                       -- 公司地址／聯絡地址
  phone TEXT NOT NULL,                         -- 聯絡電話
  phone_last4 TEXT NOT NULL,                   -- 電話後 4 碼（查詢用）
  email TEXT NOT NULL,                         -- 電子信箱

  -- 銀行帳戶資訊（結算撥款用）
  bank_name TEXT NOT NULL,                     -- 銀行名稱
  bank_branch TEXT NOT NULL,                   -- 分行
  bank_account TEXT NOT NULL,                  -- 銀行帳號
  bank_account_name TEXT NOT NULL,             -- 戶名（通常同 entity_name）

  -- 合約條件
  contract_years INTEGER NOT NULL,             -- 2 或 3
  contract_start_date TEXT NOT NULL,           -- 生效日（簽署當日，第 17 條）
  contract_end_date TEXT NOT NULL,             -- 到期日
  service_fee_rate INTEGER NOT NULL,           -- 服務手續費 % (公司 10 / 個人 15)

  -- 簽署證據
  signature_data TEXT NOT NULL,                -- 乙方 Canvas 簽名 base64 PNG
  signed_at TEXT NOT NULL,                     -- 簽署時間
  signed_ip TEXT NOT NULL,                     -- 簽署 IP
  signed_ua TEXT,                              -- User-Agent
  read_scrolled_at TEXT,                       -- 滾到底時間戳
  agreed_at TEXT NOT NULL,                     -- 勾同意時間戳

  -- 狀態
  status TEXT NOT NULL DEFAULT 'pending',      -- pending / approved / rejected / expired / terminated

  -- Jack 審核資訊
  approved_at TEXT,
  approved_by TEXT,                            -- admin email
  jack_signature_applied_at TEXT,
  rejection_reason TEXT,
  admin_note TEXT,                             -- 後台備註（例如附約已寄出）

  -- 時間戳
  created_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours'))
);

CREATE INDEX IF NOT EXISTS idx_ops_contracts_no ON ops_contracts(contract_no);
CREATE INDEX IF NOT EXISTS idx_ops_contracts_status ON ops_contracts(status);
CREATE INDEX IF NOT EXISTS idx_ops_contracts_query ON ops_contracts(phone_last4, tax_id_last4);
CREATE INDEX IF NOT EXISTS idx_ops_contracts_created ON ops_contracts(created_at DESC);

-- ============ 附件：公司大小章圖 ============
CREATE TABLE IF NOT EXISTS ops_attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contract_id INTEGER NOT NULL,                -- FK to ops_contracts.id
  file_type TEXT NOT NULL,                     -- company_stamp / other
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  content_type TEXT NOT NULL,
  storage_provider TEXT NOT NULL DEFAULT 'inline_base64',
  storage_key TEXT NOT NULL,
  storage_url TEXT,                            -- MVP: base64
  uploaded_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours')),

  FOREIGN KEY (contract_id) REFERENCES ops_contracts(id)
);

CREATE INDEX IF NOT EXISTS idx_ops_attachments_contract ON ops_attachments(contract_id);

-- ============ 稽核紀錄 ============
CREATE TABLE IF NOT EXISTS ops_audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contract_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  actor TEXT,
  actor_ip TEXT,
  actor_ua TEXT,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours')),

  FOREIGN KEY (contract_id) REFERENCES ops_contracts(id)
);

CREATE INDEX IF NOT EXISTS idx_ops_audit_contract ON ops_audit_logs(contract_id);

-- ============ Email 通知記錄 ============
CREATE TABLE IF NOT EXISTS ops_email_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contract_id INTEGER,
  to_email TEXT NOT NULL,
  template TEXT NOT NULL,
  subject TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'resend',
  provider_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  sent_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours')),

  FOREIGN KEY (contract_id) REFERENCES ops_contracts(id)
);

CREATE INDEX IF NOT EXISTS idx_ops_email_contract ON ops_email_logs(contract_id);
