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

-- ============================================================
-- 全新素人測驗名單 (rookie-test/)
-- 24 題 6 模組加權計分，4 分型 + 次要分型，6 風險 flag
-- ============================================================
CREATE TABLE IF NOT EXISTS rookie_test_leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  -- 個資（rookie 表單欄位）
  nickname TEXT NOT NULL,                    -- 暱稱（做為 email 稱謂）
  email TEXT NOT NULL,
  line_id TEXT NOT NULL,
  age_range TEXT,                            -- under_18 / 18-24 / 25-29 / 30-34 / 35+
  identity TEXT,                             -- student / office_worker / freelancer / stay_home / between_jobs / other
  live_experience TEXT NOT NULL,             -- none / tried / short_active
  interest_directions TEXT,                  -- JSON array: ["entertainment","companion",...]
  intent_level TEXT NOT NULL,                -- curious / considering / ready_now
  consent INTEGER NOT NULL DEFAULT 1,
  -- 主要結果（後台快速查詢用）
  total_score REAL NOT NULL,                 -- 總分 0-100
  tier_key TEXT NOT NULL,                    -- excellent / developing / potential / needs_training
  tier_label TEXT NOT NULL,
  profile_key TEXT NOT NULL,                 -- natural_camera / content_sharer / companion_interactive / potential_rookie
  profile_name TEXT NOT NULL,
  secondary_profile_key TEXT,                -- 次要分型（rookie 特有）
  secondary_profile_name TEXT,
  -- 6 個模組分數
  score_expression REAL,                     -- expression
  score_interaction REAL,                    -- interaction
  score_stability REAL,                      -- stability
  score_discipline REAL,                     -- discipline
  score_content_potential REAL,              -- contentPotential
  score_boundary REAL,                       -- boundary
  -- 風險
  risk_count INTEGER NOT NULL DEFAULT 0,
  risk_flags TEXT,                           -- JSON array of risk keys
  -- 完整資料 (JSON)
  answers TEXT,                              -- JSON: { "1": 5, ... "24": 4 }
  full_result TEXT,                          -- JSON: buildResult() 完整回傳物件
  -- Meta
  source TEXT,                               -- rookie-test-page / rookie-test-quiz
  ip TEXT,
  user_agent TEXT,
  country TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
  notified INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_rook_email    ON rookie_test_leads (email);
CREATE INDEX IF NOT EXISTS idx_rook_profile  ON rookie_test_leads (profile_key);
CREATE INDEX IF NOT EXISTS idx_rook_total    ON rookie_test_leads (total_score);
CREATE INDEX IF NOT EXISTS idx_rook_created  ON rookie_test_leads (created_at);
CREATE INDEX IF NOT EXISTS idx_rook_intent   ON rookie_test_leads (intent_level);

-- ============================================================
-- 職缺應徵名單 (careers.html)
-- 8 大職缺（3 部門）· 履歷連結 · Email 通知
-- ============================================================
CREATE TABLE IF NOT EXISTS careers_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  -- 基本資料
  name TEXT NOT NULL,                        -- 姓名
  email TEXT NOT NULL,                       -- Email
  phone TEXT NOT NULL,                       -- 電話
  -- 應徵資訊
  position_key TEXT NOT NULL,                -- agent / bd / editor / studio_lead / tech / makeup / social / hr
  position_name TEXT NOT NULL,               -- 主播經紀人 / 招募 BD / ...（中文）
  department TEXT NOT NULL,                  -- online / studio / support
  start_date TEXT,                           -- 期望到職日（自由填寫）
  interview_slots TEXT,                      -- JSON array: ["weekday_day","weekday_night","weekend"]
  -- 經歷簡介
  experience TEXT,                            -- 相關經驗（可空，200 字內）
  motivation TEXT NOT NULL,                   -- 為什麼想加入 JDI（300 字內）
  resume_url TEXT,                            -- 履歷連結（Google Drive/Dropbox/iCloud）
  portfolio_url TEXT,                         -- 作品集連結（選填）
  -- 意願
  consent INTEGER NOT NULL DEFAULT 1,         -- 隱私同意
  -- Meta
  source TEXT,                                -- careers-page
  ip TEXT,
  user_agent TEXT,
  country TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
  notified INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_careers_email      ON careers_applications (email);
CREATE INDEX IF NOT EXISTS idx_careers_position   ON careers_applications (position_key);
CREATE INDEX IF NOT EXISTS idx_careers_department ON careers_applications (department);
CREATE INDEX IF NOT EXISTS idx_careers_created    ON careers_applications (created_at);

-- ============================================================
-- 全台直播間夥伴募集名單 (venues.html)
-- 屋主提供場地 · 抽成分潤 or 使用費 · 場勘 → 簽約 → 上線
-- ============================================================
CREATE TABLE IF NOT EXISTS venue_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  -- 屋主資料
  name TEXT NOT NULL,                       -- 屋主/聯絡人姓名
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  line_id TEXT,                             -- LINE ID（選填但推薦）
  -- 場地資訊
  city TEXT NOT NULL,                       -- 縣市: taipei / newtaipei / taoyuan / hsinchu / miaoli / taichung / changhua / nantou / yunlin / chiayi / tainan / kaohsiung / pingtung / yilan / hualien / taitung / penghu / kinmen / matsu
  district TEXT,                            -- 行政區（選填）
  space_size TEXT NOT NULL,                 -- 空間大小: under_3 / 3_5 / 5_10 / 10_20 / over_20 （坪）
  space_type TEXT NOT NULL,                 -- 空間類型: home / studio / cafe / homestay / shop / office / other
  wifi_speed TEXT NOT NULL,                 -- Wi-Fi 速度: under_100 / 100_300 / 300_500 / over_500 （Mbps）
  has_lighting INTEGER NOT NULL DEFAULT 0,  -- 有無基本補光: 0 無 / 1 有
  available_time TEXT,                      -- 可用時段: JSON array ["weekday_day","weekday_night","weekend_day","weekend_night","anytime"]
  -- 合作意向
  cooperation_mode TEXT NOT NULL,           -- 合作模式偏好: profit_share / hourly_rate / both
  photos_url TEXT,                          -- 場地照片連結（Google Drive/Photos）
  space_features TEXT,                      -- 場地特色描述（自由填寫）
  message TEXT,                             -- 其他備註
  -- 同意
  consent INTEGER NOT NULL DEFAULT 1,
  -- Meta
  source TEXT,                              -- venues-page
  ip TEXT,
  user_agent TEXT,
  country TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
  notified INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_venue_email      ON venue_applications (email);
CREATE INDEX IF NOT EXISTS idx_venue_city       ON venue_applications (city);
CREATE INDEX IF NOT EXISTS idx_venue_mode       ON venue_applications (cooperation_mode);
CREATE INDEX IF NOT EXISTS idx_venue_created    ON venue_applications (created_at);
