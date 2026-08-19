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

-- 聯絡表單訊息（未來擴充用）
CREATE TABLE IF NOT EXISTS contact_leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  contact TEXT NOT NULL,
  contact_type TEXT,
  message TEXT,
  ip TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
);

CREATE INDEX IF NOT EXISTS idx_contact_created ON contact_leads (created_at);
