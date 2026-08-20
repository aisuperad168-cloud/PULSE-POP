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

-- ============================================================
-- 主播適配度心理測驗名單 (streamer-test.html)
-- 60 題 6 模組加權計分，含分型、風險 flag、誠實檢核
-- ============================================================
CREATE TABLE IF NOT EXISTS streamer_test_leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  -- 個資
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  line_id TEXT NOT NULL,
  gender TEXT,                              -- 男 / 女 / 其他 / 不方便透露
  age TEXT,                                 -- 18-24 / 25-29 / 30-34 / 35+
  region TEXT,                              -- 北北基 / 桃竹苗 / 中彰投 / 雲嘉南 / 高屏 / 宜花東 / 離島 / 海外
  experience TEXT,                          -- new / experienced / current
  consent INTEGER NOT NULL DEFAULT 1,        -- 隱私同意
  -- 主要結果（後台快速查詢用）
  total_score REAL NOT NULL,                 -- 總分 0-100
  tier_key TEXT NOT NULL,                    -- excellent/developing/potential/training/unstable
  tier_label TEXT NOT NULL,                  -- 高適配型/發展型/...
  profile_key TEXT NOT NULL,                 -- stage/companion/knowledge/stable/high_potential/not_recommended
  profile_name TEXT NOT NULL,                -- 鏡頭舞台型/陪伴型/...
  -- 6 個模組分數（篩選 / 排序用）
  score_camera REAL,                         -- camera_expression
  score_audience REAL,                       -- audience_interaction
  score_emotional REAL,                      -- emotional_regulation
  score_self_disc REAL,                      -- self_discipline
  score_creativity REAL,                     -- content_creativity
  score_boundary REAL,                       -- boundary_control
  -- 風險 + 誠實檢核
  risk_count INTEGER NOT NULL DEFAULT 0,     -- 觸發幾個風險 flag
  risk_flags TEXT,                           -- JSON array of risk keys
  lie_triggered INTEGER NOT NULL DEFAULT 0,  -- 是否觸發誠實檢核
  lie_avg REAL,                              -- 誠實檢核平均值
  -- 完整資料 (JSON)
  answers TEXT,                              -- JSON: { "1": 5, ... "60": 4 }
  lie_answers TEXT,                          -- JSON: { "L1": 2, "L2": 3, "L3": 2 }
  full_result TEXT,                          -- JSON: buildResult() 完整回傳物件
  -- Meta
  source TEXT,                               -- streamer-test-page
  ip TEXT,
  user_agent TEXT,
  country TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
  notified INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_stmt_email     ON streamer_test_leads (email);
CREATE INDEX IF NOT EXISTS idx_stmt_profile   ON streamer_test_leads (profile_key);
CREATE INDEX IF NOT EXISTS idx_stmt_total     ON streamer_test_leads (total_score);
CREATE INDEX IF NOT EXISTS idx_stmt_created   ON streamer_test_leads (created_at);
CREATE INDEX IF NOT EXISTS idx_stmt_experience ON streamer_test_leads (experience);
