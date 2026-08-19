-- ============================================================
-- JDI 脈動傳媒 · D1 Database Schema
-- 執行：wrangler d1 execute jdi-pulse-leads --file=schema.sql
-- ============================================================

-- 主播測驗名單
CREATE TABLE IF NOT EXISTS quiz_leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  line_id TEXT NOT NULL,
  streamer_type TEXT NOT NULL,       -- singer / dancer / chat / battle / talent / variety
  type_name TEXT NOT NULL,           -- 中文名稱: 歌唱型主播...
  scores TEXT,                        -- JSON: 6 個類型的分數
  answers TEXT,                       -- JSON: 訪客的答案明細
  source TEXT,                        -- homepage-modal / quiz-page
  ip TEXT,
  user_agent TEXT,
  country TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
  notified INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_quiz_email ON quiz_leads (email);
CREATE INDEX IF NOT EXISTS idx_quiz_type ON quiz_leads (streamer_type);
CREATE INDEX IF NOT EXISTS idx_quiz_created ON quiz_leads (created_at);

-- 商業合作需求表單（partnership.html）
CREATE TABLE IF NOT EXISTS contact_leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company TEXT NOT NULL,              -- 公司/組織名稱
  name TEXT NOT NULL,                 -- 聯絡人姓名
  email TEXT NOT NULL,                -- 聯絡 Email
  phone TEXT,                         -- 聯絡電話（選填）
  types TEXT NOT NULL,                -- JSON array: ["業配代言媒合", "達人資源租借", ...]
  scale TEXT,                         -- 合作規模: 初次合作 / 中型專案 / 長期合作 / 待討論
  message TEXT NOT NULL,              -- 合作需求說明
  start_time TEXT,                    -- 希望開始時間（自由填寫）
  source TEXT,                        -- partnership-page
  ip TEXT,
  user_agent TEXT,
  country TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
  notified INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_contact_email ON contact_leads (email);
CREATE INDEX IF NOT EXISTS idx_contact_created ON contact_leads (created_at);
