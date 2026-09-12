# 📋 Newsletter 週報測試 — 明日 checklist

**背景**：昨日已完成 newsletter 系統建置 + 60 位 Meta leads 匯入 + 歡迎信全數寄出。
週報首次測試因 Resend 免費版每日 100 封配額用光而中斷（訂閱者已 61 人）。

---

## 🌅 早上進來後的順序

### Step 0：確認 Resend 配額已重置
- 開 https://resend.com/emails
- Dashboard 上看今日 quota 應該是 `0/100`（新一天重置了）

### Step 1：預覽信測試（1 封配額，不影響大局）
1. 進 https://jdi-pulse.com/sign/admin/#newsletter
2. 點 **「👀 預覽週報信」**
3. 留空 → 確定 → 檢查 admin 自己的信箱
4. 確認信件排版正確、圖片有出現、按鈕能點

### Step 2：清掉昨天卡住的排程
1. Admin panel → 「📅 待推送排程」
2. 如有 pending broadcast → 點「取消」

### Step 3：診斷確認起始狀態
開這個 URL 確認：
```
https://jdi-pulse.com/api/newsletter/admin-diagnostics
```
應該看到：
- `broadcasts: []` （已清空）
- `articles_sent: []` （沒推過任何文章）
- `confirmed_subscribers: 61`

### Step 4：手動排一次乾淨的週報
在你的電腦 Terminal 貼（把 secret 換成你的）：

```bash
curl -X POST "https://jdi-pulse.com/api/newsletter/schedule-weekly" \
  -H "X-Cron-Secret: 16c566f0038bcb2b1db3ca9bd64daa38" \
  -H "Content-Type: application/json" \
  -d '{
    "articles": [{
      "slug": "video-livestream-double-traffic-hack",
      "title": "為什麼發完影片就要馬上開播？主播必學的「雙倍流量密技」",
      "description": "搞懂 TikTok 演算法對「短影音→直播」的加權邏輯，讓你單場觀看數翻倍",
      "date": "2026-09-12",
      "hero": "/assets/live-center/double-traffic-hero.jpg",
      "category": "📈 流量密技"
    }],
    "delay_minutes": 2,
    "triggered_by": "test_day2"
  }'
```

預期看到：
```json
{"ok":true,"broadcast_id":2,"scheduled_at":"...","articles_count":1}
```

### Step 5：立即寄送（不等 runner）
1. Admin panel → 「📅 待推送排程」→ 出現 1 筆 pending
2. 點該筆的 **「立即寄送」** 按鈕
3. 確認 → 等 30-60 秒
4. 跳提示：`✅ 已寄送 · 收件人 61 · 成功 N · 失敗 M`

### Step 6：確認結果
開這個 URL 看實際寄送狀況：
```
https://jdi-pulse.com/api/newsletter/admin-email-logs?limit=100&template=weekly_digest
```
應該看到 61 筆記錄，`stats.sent` 應接近 61。

### Step 7：檢查訂閱者統計
Admin panel 每位訂閱者的「已寄 X 封」應該從 1 變 2 或更多。

---

## ⚠️ 可能會遇到的問題

### 問題 A：又撞 Resend rate limit (10 req/sec)
- 症狀：`stats.failed` 有 10+ 筆
- 解法：admin panel 點「🔁 重寄失敗信」（但目前只支援 welcome template）

**若要重寄 weekly_digest，明天告訴 AI**：
> 「幫我改 retry-failed 支援 weekly_digest template，或加一個新按鈕」

### 問題 B：又撞 Resend 每日配額
- 症狀：中途停下、剩下訂閱者收不到
- 解法：升級 Resend Pro ($20/月，50,000 封)
- 短期：等隔天再手動 retry

### 問題 C：workflow 自動觸發還是有問題
- 這是**下週一 11:00 才會知道**
- 到時如果沒自動寄，貼 GitHub Actions log 給 AI 診斷

---

## 💰 Resend 升級決策點

**建議在下列任一情境升到 Pro ($20/月)**：
- 訂閱者到 80+ 人
- 週報寄送有失敗（配額或 rate limit）
- 想開始跑 A/B test 寄多種內容
- 想加開新 domain（例如 marketing.jdi-pulse.com）

升級網址：https://resend.com/settings/billing

---

## 🔧 有用的 Diagnostic URLs（需 CF Access 登入）

| URL | 用途 |
|---|---|
| `/api/newsletter/admin-diagnostics` | 看 broadcasts + articles_sent + env 狀態 |
| `/api/newsletter/admin-email-logs?limit=50` | 看最近 50 封信寄送狀況 |
| `/api/newsletter/admin-email-logs?limit=50&status=failed` | 只看失敗 |
| `/api/newsletter/admin-email-logs?limit=50&template=weekly_digest` | 只看週報 |
| `/api/newsletter/admin-list?status=confirmed&limit=200` | 看所有已確認訂閱者 |

---

## 🚀 未來（訂閱者破 500 後）

1. 升 Resend Pro / Scale
2. 考慮買 marketing domain（如 mail.jdi-pulse.com）分開發送
3. 加 open rate / click tracking（Resend 已支援，只要在寄信時開）
4. A/B test 主旨、內容、寄送時段
5. Segment 訂閱者（新加入 vs 老用戶不同內容）

---

**今日戰績**：60 筆匯入、11 API 端點、22 頁訂閱框、8 個 bug 修復、系統從 0 到 100% 可用。

**明天目標**：完成週報首次全體寄送，驗證整個生產流程。
