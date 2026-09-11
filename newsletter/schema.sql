-- ============================================================
-- JDI 脈動傳媒 · 電子報系統 D1 Schema
-- ============================================================
-- 執行方式：
--   wrangler d1 execute pulse-pop --file=newsletter/schema.sql --remote
--   （本地測試改 --local）
-- ============================================================

-- ============ 訂閱者主表 ============
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,                    -- 訂閱信箱（唯一）

  -- 訂閱狀態
  status TEXT NOT NULL DEFAULT 'pending',        -- pending / confirmed / unsubscribed / bounced
  confirmed_at TEXT,                             -- 完成 double opt-in 的時間
  unsubscribed_at TEXT,                          -- 退訂時間

  -- 追蹤來源
  source TEXT NOT NULL,                          -- website / meta_ads / quiz / manual_import / streamer_test / rookie_test
  source_detail TEXT,                            -- 例如來源頁面 URL、廣告 campaign name

  -- 安全 token（用於確認 / 退訂連結）
  confirm_token TEXT NOT NULL UNIQUE,            -- 32 hex chars
  unsubscribe_token TEXT NOT NULL UNIQUE,        -- 32 hex chars

  -- 使用者資訊（可為空）
  nickname TEXT,                                 -- 訂閱者暱稱（訂閱時可選填）
  tags TEXT,                                     -- JSON array: ["主播", "運營", "已測驗"] 之類

  -- IP / UA 稽核
  subscribe_ip TEXT,
  subscribe_ua TEXT,
  confirm_ip TEXT,
  confirm_ua TEXT,

  -- 統計
  emails_sent INTEGER DEFAULT 0,                 -- 已寄送給此訂閱者的信件總數
  last_email_at TEXT,                            -- 最後一次寄送時間
  last_open_at TEXT,                             -- 最後一次開信（Resend webhook 追蹤，可選）

  -- 時間戳
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_nl_status         ON newsletter_subscribers (status);
CREATE INDEX IF NOT EXISTS idx_nl_source         ON newsletter_subscribers (source);
CREATE INDEX IF NOT EXISTS idx_nl_confirm_token  ON newsletter_subscribers (confirm_token);
CREATE INDEX IF NOT EXISTS idx_nl_unsub_token    ON newsletter_subscribers (unsubscribe_token);
CREATE INDEX IF NOT EXISTS idx_nl_created        ON newsletter_subscribers (created_at);


-- ============ 週報排程佇列 ============
-- 每次 GitHub Action 觸發時建立一筆 pending 記錄，
-- 30 分鐘 buffer 後 admin 未取消才實際寄送。
CREATE TABLE IF NOT EXISTS newsletter_broadcasts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- 排程狀態
  status TEXT NOT NULL DEFAULT 'pending',        -- pending / cancelled / sending / sent / failed
  scheduled_at TEXT NOT NULL,                    -- 何時觸發實際寄送（buffer 到期時間）
  triggered_by TEXT NOT NULL,                    -- github_action / admin_manual / cron

  -- 內容範圍
  articles_json TEXT NOT NULL,                   -- 本次週報包含的文章清單（JSON: [{slug, title, hero, description, date, category}])
  articles_count INTEGER NOT NULL,

  -- 執行結果
  started_at TEXT,
  finished_at TEXT,
  cancelled_at TEXT,
  cancelled_by TEXT,                             -- admin email
  recipient_count INTEGER,                       -- 實際收件數
  success_count INTEGER,
  fail_count INTEGER,
  error_summary TEXT,                            -- 若失敗，最後一筆錯誤摘要

  -- 時間戳
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_nlb_status        ON newsletter_broadcasts (status);
CREATE INDEX IF NOT EXISTS idx_nlb_scheduled     ON newsletter_broadcasts (scheduled_at);


-- ============ 寄送記錄（單筆 email 級別）============
CREATE TABLE IF NOT EXISTS newsletter_email_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  broadcast_id INTEGER,                          -- 對應 newsletter_broadcasts.id
  subscriber_id INTEGER,                         -- 對應 newsletter_subscribers.id
  to_email TEXT NOT NULL,
  template TEXT NOT NULL,                        -- welcome / confirm / weekly_digest / single_article / unsubscribed / reengagement
  subject TEXT,
  status TEXT NOT NULL,                          -- sent / failed / bounced
  resend_id TEXT,                                -- Resend API 回傳的 email id
  error_message TEXT,
  sent_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_nl_log_broadcast  ON newsletter_email_logs (broadcast_id);
CREATE INDEX IF NOT EXISTS idx_nl_log_subscriber ON newsletter_email_logs (subscriber_id);
CREATE INDEX IF NOT EXISTS idx_nl_log_sent       ON newsletter_email_logs (sent_at);


-- ============ 文章已推送記錄（避免重複推同一篇）============
-- 週報寄送時記錄每篇被納入的文章，之後掃描新文章時排除已推過的
CREATE TABLE IF NOT EXISTS newsletter_articles_sent (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  article_slug TEXT NOT NULL UNIQUE,             -- 例：video-livestream-double-traffic-hack
  broadcast_id INTEGER,                          -- 屬於哪次週報
  first_included_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_nl_art_slug       ON newsletter_articles_sent (article_slug);
