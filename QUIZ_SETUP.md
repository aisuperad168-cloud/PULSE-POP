# 🚀 主播測驗功能部署指南

**檔案清單**（本次新增）：
- `js/quiz-data.js` — 6 題題目 + 6 種類型定義 + 分數計算
- `js/quiz.js` — Modal + Page 兩用 UI 邏輯
- `css/quiz.css` — 完整樣式
- `quiz.html` — 獨立測驗頁 `/quiz`
- `functions/api/quiz-submit.js` — Pages Function（收表單、寄信、寫入 D1）
- `functions/api/_email-templates.js` — HTML Email 模板（訪客報告 + 內部通知）
- `wrangler.toml` — Cloudflare Pages 配置
- `schema.sql` — D1 資料表定義
- `deploy-quiz.sh` — 一鍵部署腳本
- `.gitignore` — 保護機密

**修改的檔案**：
- `index.html` — 加入 Quiz Modal + nav 選單「主播測驗 ✨」
- `sitemap.xml` — 新增 `/quiz` 條目
- `llms.txt` — 新增 quiz 頁面說明

---

## 📋 部署前你需要準備的 3 樣東西

### 1. Cloudflare API Token

1. 打開 https://dash.cloudflare.com/profile/api-tokens
2. **Create Token** → 選 **「Edit Cloudflare Workers」** template
3. **Continue to summary** → **Create Token**
4. 複製 Token（**只顯示一次，馬上保存**）

### 2. Cloudflare Account ID

1. 打開 https://dash.cloudflare.com
2. 點任一網域 → 右邊欄 **Account ID** → 複製

### 3. Resend API Key

1. 打開 https://resend.com/signup（用 Google 或 GitHub 登入）
2. 左側 **API Keys** → **Create API Key**
3. Name: `jdi-pulse-quiz`, Permission: `Full access`
4. 複製 Key（開頭 `re_xxxxxxxxx`）

---

## 🚀 一鍵部署

在 sandbox 或你自己的電腦執行：

```bash
cd /home/user/webapp

# 設定環境變數（貼上你的實際 key）
export CLOUDFLARE_API_TOKEN="你的_cloudflare_token"
export CLOUDFLARE_ACCOUNT_ID="你的_cloudflare_account_id"
export RESEND_API_KEY="re_你的_resend_key"

# 一鍵部署
bash deploy-quiz.sh
```

腳本會自動：
1. ✅ 檢查 / 安裝 wrangler
2. ✅ 建立 D1 資料庫 `jdi-pulse-leads`
3. ✅ 自動填入 `wrangler.toml` 的 `database_id`
4. ✅ 執行 `schema.sql` 建立資料表
5. ✅ 部署到 Cloudflare Pages
6. ✅ 設定 `RESEND_API_KEY` secret

---

## 🧪 部署完成後測試

### 打開網頁測試
- 首頁：https://jdi-pulse.com/ （3 秒後彈窗）
- 直接測驗頁：https://jdi-pulse.com/quiz
- 手動觸發（點 nav）：「主播測驗 ✨」

### 填完表單後應該發生的事
1. ✅ 訪客看到完整分析結果頁
2. ✅ 訪客的 Email 收到 HTML 報告
3. ✅ `pulsepop9@gmail.com` 收到通知信
4. ✅ D1 資料庫 `quiz_leads` 表有一筆新紀錄

### 查詢名單

```bash
# 最新 10 筆
wrangler d1 execute jdi-pulse-leads --remote \
  --command "SELECT id, name, email, line_id, type_name, source, created_at FROM quiz_leads ORDER BY id DESC LIMIT 10;"

# 統計各類型人數
wrangler d1 execute jdi-pulse-leads --remote \
  --command "SELECT type_name, COUNT(*) as n FROM quiz_leads GROUP BY type_name ORDER BY n DESC;"

# 匯出全部 CSV
wrangler d1 execute jdi-pulse-leads --remote \
  --command "SELECT * FROM quiz_leads;" --json > leads.json
```

---

## ⚙️ 使用 Resend 測試網域的限制（首次上線）

因為我們目前用 `onboarding@resend.dev`（Resend 測試網域），有以下限制：

- ✅ **可以寄信**
- ⚠️ **只能寄到你註冊 Resend 用的信箱**（其他人的 email 會被拒絕）
- ⚠️ **每天寄件量有限**（100 封/天）

### 想要正式運作 → 需要驗證你的網域

1. 打開 https://resend.com/domains
2. 點 **Add Domain** → 輸入 `jdi-pulse.com`
3. 複製 Resend 給的 4 條 DNS 記錄（TXT + MX + 2 個 DKIM）
4. 到 Cloudflare Dashboard → `jdi-pulse.com` → **DNS** → **Add record**
5. 逐條加上（都是 **Proxied 關掉**，只保留 DNS）
6. 回 Resend 點 **Verify**（約 5–10 分鐘生效）

驗證後，更新 `wrangler.toml`:

```toml
[vars]
MAIL_FROM = "noreply@jdi-pulse.com"        # 或 hello@ / newcomer@
MAIL_FROM_NAME = "JDI 脈動傳媒"
MAIL_NOTIFY = "pulsepop9@gmail.com"
```

然後：
```bash
wrangler pages deploy . --project-name=jdi-pulse
```

---

## 🐛 疑難排解

### Q1: 部署後 https://jdi-pulse.com/quiz 顯示 404？
Cloudflare Pages 大約 30–60 秒才會生效，等等看。若持續 404：
```bash
wrangler pages deployment list --project-name=jdi-pulse
```
確認最新 deployment 狀態。

### Q2: 表單送出後沒收到 email？
1. 檢查垃圾郵件夾（Resend 測試網域容易被判為垃圾）
2. 檢查 Function log:
   ```bash
   wrangler pages deployment tail --project-name=jdi-pulse
   ```
3. 直接查 D1 資料庫確認資料有進來：
   ```bash
   wrangler d1 execute jdi-pulse-leads --remote --command "SELECT * FROM quiz_leads ORDER BY id DESC LIMIT 1;"
   ```

### Q3: Modal 沒有自動彈出？
- 檢查瀏覽器 console 是否有錯誤
- Session 內只彈一次：清除 sessionStorage 或用無痕視窗
  ```js
  sessionStorage.removeItem('jdi_quiz_modal_shown_v1')
  ```

### Q4: 想要調整彈窗延遲秒數？
編輯 `js/quiz.js` 第 15 行：
```js
const AUTO_OPEN_DELAY = 3000;  // 改成想要的毫秒
```

---

## 📊 資料欄位說明（quiz_leads 表）

| 欄位 | 說明 |
|------|------|
| `id` | 自動編號 |
| `name` | 訪客姓名 / 暱稱 |
| `email` | 訪客 Email |
| `line_id` | 訪客 LINE ID |
| `streamer_type` | 類型代碼（singer/dancer/chat/battle/talent/variety）|
| `type_name` | 類型中文名（歌唱型主播 等）|
| `scores` | JSON: 6 個類型的分數明細 |
| `answers` | JSON: 訪客實際回答的題目與選項 |
| `source` | homepage-modal / quiz-page |
| `ip` | 訪客 IP（隱私可考慮不記錄）|
| `user_agent` | 瀏覽器資訊 |
| `country` | Cloudflare 判斷的國家碼（TW / HK 等）|
| `created_at` | UTC 時間 |
| `notified` | 是否已成功寄出報告信 |

---

## 🎯 下一步優化建議（未來擴充）

1. **簡易後台**：建 `/admin/leads` 頁面（含 basic auth）查看名單
2. **匯出功能**：加一個 Function `/api/export-leads?token=xxx` 匯出 CSV
3. **重複填單處理**：同一 email 24h 內只寄一次報告
4. **A/B Testing**：測試不同彈窗延遲對填單率的影響
5. **UTM 追蹤**：紀錄訪客從哪個廣告來
