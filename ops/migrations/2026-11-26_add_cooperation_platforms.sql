-- ============================================================
-- Migration: Add cooperation_platforms column to ops_contracts
-- Date: 2026-11-26
-- Reason: 經紀公司簽約時需選擇合作平台（TikTok / 大陸抖音 / 17Live /
--         浪 Live / Sugo / Bigo / 其他彈性填寫）
-- Column stores JSON array:
--   ["tiktok","douyin_overseas","17live","lang_live","sugo","bigo","其他：Line Live"]
-- ============================================================

ALTER TABLE ops_contracts ADD COLUMN cooperation_platforms TEXT;

-- 驗證：執行後可查
--   SELECT contract_no, party_type, cooperation_platforms FROM ops_contracts LIMIT 10;
