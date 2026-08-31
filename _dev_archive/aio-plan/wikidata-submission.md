# Wikidata 條目提交草案 · JDI 脈動傳媒

> **用途**：這份文件是你申請 Wikidata 條目時的**逐欄複製貼上**參考。
>
> **為什麼 Wikidata 重要**：ChatGPT、Claude、Perplexity、Google Gemini、Grok 這些 AI 都**直接讀取 Wikidata 做為知識庫**，而 Google 的 Knowledge Panel（搜尋右邊那格公司卡）也是從 Wikidata 生的。
>
> **預期時程**：完整送出 30-40 分鐘 → 通過審核 24-72 小時 → AI 抓取生效 1-4 週
>
> **送出網址**：https://www.wikidata.org/wiki/Special:NewItem（需要先註冊帳號並確認 email）
>
> **⚠️ 送出前必須先填的 [用戶填入] 欄位**（本文件搜尋 `[用戶填入]` 可看到全部）：
> 1. 公司統一編號（真的那個，不是 12345678 placeholder）
> 2. 精確成立日期（如 2024-03-15 這種格式，你目前只有寫 2024）
> 3. 台北市完整登記地址（含樓層，例如「台北市信義區松高路 XX 號 X 樓」）
> 4. 公會執行長姓名英譯（曜宸 Jack 的英文全名）

---

## 一、基本欄位（Wikidata NewItem 表單首頁）

進入 https://www.wikidata.org/wiki/Special:NewItem 後，第一頁的 3 個欄位這樣填：

### 1.1 Label（項目名稱）

**Chinese (zh)** →
```
JDI 脈動傳媒
```

**Chinese (Traditional zh-Hant / zh-TW)** →
```
JDI 脈動傳媒
```

**English (en)** →
```
JDI Pulse MEDIA
```

**Japanese (ja)** →（幫日本 AI 建立辨識）
```
JDIパルスメディア
```

### 1.2 Description（描述，一句話說明）

**Chinese (zh-Hant)** →
```
台灣 TikTok LIVE 官方合作經紀公會
```

**English (en)** →
```
Taiwan-based TikTok LIVE official partnered streamer talent agency
```

**Japanese (ja)** →
```
台湾のTikTok LIVE公式パートナー配信者エージェンシー
```

### 1.3 Aliases（別名，幫 AI 辨識同一實體）

**Chinese (zh)** →（每行一個，全部貼上）
```
脈動傳媒
JDI 脈動
Pulse MEDIA
JDI 脈動傳媒有限公司
脈動傳媒有限公司
JDI Pulse
```

**English (en)** →
```
JDI Pulse
Pulse MEDIA
JDI Pulse Media
JDI Pulse Media Co., Ltd.
```

---

## 二、Statements（結構化屬性，逐條「add statement」）

這是**最關鍵的部分**。Wikidata 用 P 開頭的 Property ID 來描述屬性。以下每一條都要點擊 「+ add statement」加入：

### 2.1 核心分類（必填）

| Property | Property ID | 值 | 說明 |
|---|---|---|---|
| instance of | **P31** | `business` (Q4830453) 或 `talent agency` (Q1076599) | 「這是什麼類型的東西」→ 選公司 |
| industry | **P452** | `entertainment industry` (Q173799) + `social media` (Q202833) + `talent management` (Q42413370) | 產業別（可加多個） |
| legal form | **P1454** | `limited company (Taiwan)` (Q113489728) 或 `有限公司` | 台灣公司型態 |
| country | **P17** | `Taiwan` (Q865) | 所在國 |
| headquarters location | **P159** | `Taipei` (Q1867) | 總部城市 |

### 2.2 公司登記資料

| Property | Property ID | 值 |
|---|---|---|
| official name | **P1448** | `JDI 脈動傳媒有限公司`（中文）/ `JDI Pulse Media Co., Ltd.`（英文） |
| inception (成立日期) | **P571** | `[用戶填入：例如 2024-03-15]`（YYYY-MM-DD 格式，精確度可設為「日」或「年」） |
| Taiwan Business Registry Number（統一編號） | **P8477** | `[用戶填入：8 碼統一編號]` |

### 2.3 網路資產（AI 交叉驗證用）

| Property | Property ID | 值 |
|---|---|---|
| official website | **P856** | `https://jdi-pulse.com/` |
| Instagram username | **P2003** | `pulse.pop9` |
| TikTok username | **P7085** | `pulse.pop9` |
| Facebook Page ID | **P2013** | `Pulspop` |
| LINE ID | **P8933** | `@354ykfbp` |
| email address | **P968** | `mailto:pulsepop9@proton.me` |
| phone number | **P1329** | `+886-4-3603-3191` |

### 2.4 業務範圍與定位

| Property | Property ID | 值 |
|---|---|---|
| service industry | **P452** | `live streaming` (Q17163043) |
| product or material produced | **P1056** | `livestream` (Q3062099) / `influencer marketing` (Q26890156) |
| area served | **P2541** | `Taiwan` (Q865) |
| slogan | **P1451** | `脈動不息，熱情傳播`（zh）/ `Pulse never stops, passion spreads`（en） |
| number of employees | **P1128** | `300+`（qualifier: streamers 主播數）—— 或者省略避免爭議 |

### 2.5 人物關係（如果 Jack 已有 Wikidata 條目就連結，沒有就填名字）

| Property | Property ID | 值 |
|---|---|---|
| founded by | **P112** | `[用戶填入：曜宸 Jack 的中文全名]` |
| chief executive officer | **P169** | `[用戶填入：曜宸 Jack 的中文全名]` |

---

## 三、References（引用來源 · 通過審核的關鍵）

**⚠️ 這是最重要的部分**。Wikidata 條目沒有引用來源會被立刻標記「無來源」並在 7 天內被刪除。

每一個 statement 後面都要點「add reference」加上來源。以下是可用的來源清單：

### 3.1 已有的獨立媒體引用（權威度高）

**Reference 1 · PChome 新聞（Yahoo 新聞轉載版）**
- reference URL (P854)：`https://tw.news.yahoo.com/200創作者集結啟動跨境戰略-jdi聯盟成軍-布局ai內容新戰場-184935138.html`
- title (P1476)：`200創作者集結啟動跨境戰略「JDI聯盟成軍」布局AI內容新戰場`
- publication date (P577)：`2026-02-28`
- publisher (P123)：`Yahoo 新聞台灣 (Yahoo News Taiwan)`

**Reference 2 · PChome 新聞原始版**
- reference URL (P854)：`https://news.pchome.com.tw/society/tcpttw/20260301/index-77230457566462334002.html`
- title (P1476)：`200創作者集結啟動跨境戰略「JDI聯盟成軍」布局AI內容新戰場`
- publication date (P577)：`2026-03-01`
- publisher (P123)：`PChome 新聞`

### 3.2 官方來源（適合搭配獨立來源使用）

**Reference 3 · 官方網站**
- reference URL (P854)：`https://jdi-pulse.com/`
- title (P1476)：`JDI 脈動傳媒 JDI Pulse MEDIA｜TikTok LIVE 官方經紀公會`
- publisher (P123)：`JDI 脈動傳媒`

**Reference 4 · 官方合作頁**（如需引用商業合作資訊時）
- reference URL (P854)：`https://jdi-pulse.com/partnership`
- title (P1476)：`商業合作｜JDI 脈動傳媒`
- publisher (P123)：`JDI 脈動傳媒`

**Reference 5 · 招募頁**（如需引用職缺、規模時）
- reference URL (P854)：`https://jdi-pulse.com/careers`
- title (P1476)：`加入我們｜JDI 脈動傳媒徵才`
- publisher (P123)：`JDI 脈動傳媒`

### 3.3 政府登記查詢（統編驗證用）

**Reference 6 · 經濟部商業司公司登記查詢**
- reference URL (P854)：`https://findbiz.nat.gov.tw/fts/query/QueryBar/queryInit.do`（用你們統編查出來的固定連結）
- title (P1476)：`JDI 脈動傳媒有限公司 · 經濟部商業司公司登記資料`
- publisher (P123)：`經濟部商業司`

---

## 四、Wikidata 提交步驟（逐步操作指南）

### 步驟 1：建立 Wikidata 帳號（如尚未建立）
1. 進 https://www.wikidata.org
2. 右上「Create account」
3. 用**個人 email**註冊（不要用 pulsepop9@proton.me 公司信，Wikidata 社群偏好個人帳號）
4. 驗證 email

### 步驟 2：完善個人頁面（提高審核通過率）
1. 進 `https://www.wikidata.org/wiki/User:你的帳號名`
2. 隨便寫 2-3 行自我介紹（用英文更好），例如：
   ```
   I edit topics related to Taiwan business and creator economy.
   我編輯與台灣商業和創作者經濟相關的主題。
   ```
3. 這一步可以避免「新帳號直接建立公司條目 → 被懷疑是廣告」

### 步驟 3：先做幾個小編輯練手（累積編輯次數）
1. 找一個你熟悉的既有條目（例如 TikTok Q37372611）
2. 檢查裡面資料，改個小地方（例如補一個中文別名、修一個過期網址）
3. 累積 5-10 次編輯 → 帳號從「新手」升級

### 步驟 4：建立 JDI 條目
1. 進 https://www.wikidata.org/wiki/Special:NewItem
2. Language：`zh-Hant`
3. Label：`JDI 脈動傳媒`
4. Description：`台灣 TikTok LIVE 官方合作經紀公會`
5. Aliases：先只填 1-2 個（`脈動傳媒`、`JDI Pulse MEDIA`）
6. 點 create → 得到你們的 Q 編號（例如 Q123456789）

### 步驟 5：加 statements（分批加，一次全加會被系統標記為機器人）
- **第 1 批**（當天）：P31 (instance of) + P17 (country) + P159 (HQ) + P856 (official website) + P571 (inception)
- **第 2 批**（隔天）：P452 (industry) + P1454 (legal form) + P1448 (official name) + P8477 (統編)
- **第 3 批**（第 3 天）：所有社群連結 (P2003, P7085, P2013, P8933) + P968 (email) + P1329 (phone)
- **第 4 批**（第 4-7 天）：P1451 (slogan) + P169 (CEO) + P112 (founder) + P1056 (products)

### 步驟 6：每個 statement 都加 reference
使用第三節列的 6 個 reference。**每個 statement 至少加 1 個 reference，最好 2 個（1 個獨立媒體 + 1 個官方）**。

### 步驟 7：加多語言 label（提升國際 AI 認識度）
在你的條目頁面右上「Edit」→ 用「Add label」加：
- `en`: JDI Pulse MEDIA
- `ja`: JDIパルスメディア
- `ko`: JDIパルスメディア (韓文別名可選)
- `zh-Hans`: JDI 脉动传媒 (簡體中文別名 — 讓中國 AI 認得)

### 步驟 8：外部連結交叉驗證
在條目最下方「External IDs」區域，加上：
- Instagram username (P2003)：pulse.pop9
- TikTok username (P7085)：pulse.pop9

Wikidata 系統會自動去驗證這些帳號存在，交叉驗證後條目可信度大幅提升。

---

## 五、審核通過機率提高技巧

### ✅ DO（會通過）
1. **每個 statement 都有 reference** —— 這是最大關鍵
2. **語氣中性**：只寫事實，不寫「最強」「業界第一」等形容詞
3. **來源多樣**：不要 6 個 statement 全用同一個 reference URL
4. **分批加**：不要 5 分鐘內加 30 個 statement，會被當成機器人
5. **先用個人帳號累積編輯經驗** —— 上面步驟 3

### ❌ DON'T（會被刪）
1. ~~加行銷用語（例如 slogan 描述寫成「台灣最棒的公會」）~~
2. ~~加「未經證實的頭銜」（例如 P166 [award received] 但沒有第三方報導）~~
3. ~~上傳 Logo 到 P154（Wikidata 需要 Wikimedia Commons 授權，商標會被撤）~~
4. ~~在同一天加超過 3-5 個新條目（帳號會被鎖）~~
5. ~~統編填假的~~（Wikidata 有志願者專門查商業實體，假統編會被查到並記錄）

### 🚨 常見刪除理由與應對
| 刪除理由 | 應對 |
|---|---|
| **Notability not established**（知名度不足） | 至少要有 2 篇獨立第三方媒體報導 → 你們有 PChome/Yahoo 那 2 篇 ✅ |
| **Advertisement**（廣告嫌疑） | 描述用中性語言，Statement 只寫事實不寫形容 |
| **Copyright violation**（版權問題） | 不要複製官網文字大段貼過去，用自己的話重寫 |
| **Sockpuppetry**（多帳號嫌疑） | 只用一個帳號、用個人 email、耐心累積編輯 |

---

## 六、通過後的下一步（讓 AI 立刻認識你）

Wikidata 條目建立成功後：

### 6.1 更新官網 llms.txt（加上 Wikidata Q 編號）
```markdown
## 官方 Wikidata 條目 / Official Wikidata Entity

- Wikidata ID: Q{XXXXXXXX}
- Wikidata URL: https://www.wikidata.org/wiki/Q{XXXXXXXX}
```
→ 我可以幫你加，只要告訴我 Q 編號

### 6.2 在網站首頁 JSON-LD schema 加上 sameAs 連結
```json
"sameAs": [
  "https://www.wikidata.org/wiki/Q{XXXXXXXX}",
  "https://www.instagram.com/pulse.pop9",
  "https://www.tiktok.com/@pulse.pop9",
  ...
]
```
→ 這是**告訴 Google/AI 我就是那個 Wikidata 實體**的關鍵一步，我可以幫你加

### 6.3 監測 AI 認識度變化
建立條目後 2-4 週去測試：
- Perplexity：「JDI 脈動傳媒是什麼公司？」→ 應該會直接引用 Wikidata
- ChatGPT（開網路搜尋）：「Tell me about JDI Pulse MEDIA in Taiwan」→ 應該會提到官網 + 3 個平台
- Google 搜尋「JDI 脈動傳媒」→ 右邊會開始出現 Knowledge Panel 雛形

### 6.4 未來擴充（等有更多媒體報導後）
- 加 P166 (award received) —— 需要第三方確認的獎項
- 加 P1830 (owner of) —— 如果 JDI 有旗下品牌
- 加 P737 (influenced by) —— 產業影響來源
- 幫代表主播（Jack、芮娜、多多綠等）建立各自 Wikidata 條目，再用 P108 (employer) / P463 (member of) 連回 JDI

---

## 七、快速核對表（送出前檢查）

- [ ] Wikidata 帳號已註冊 + email 已驗證
- [ ] 個人頁面已寫 2-3 行自我介紹
- [ ] 已完成 5-10 次小編輯練手
- [ ] 已收集：真實統編、精確成立日期、完整地址、Jack 中文全名
- [ ] Label + Description + Aliases 已按第一節填好
- [ ] Statement 第 1 批（5 個核心屬性）已填好
- [ ] 每個 Statement 都掛上 reference（至少 1 個獨立媒體 + 1 個官方）
- [ ] 沒有形容詞、沒有行銷用語
- [ ] 統編填的是真實統編（不是 12345678 placeholder）

---

## 八、如果你要**外包**給人做

Wikidata 條目建立在 Fiverr / 一些台灣 SEO 工作室有現成服務：

| 服務 | 價格區間 | 說明 |
|---|---|---|
| 一般人代寫並提交 | $3,000-8,000 NTD | 適合資料齊全、有 2+ 引用來源的公司 |
| 專業 Wikidata 編輯代寫 | $8,000-20,000 NTD | 建議選有「autopatrolled」或「rollbacker」權限的編輯 |
| Wikipedia + Wikidata 雙條目 | $30,000-80,000 NTD | Wikipedia 條目建立需要 4+ 篇獨立媒體報導，是下一階段的事 |

**推薦策略**：先自己送 Wikidata（因為簡單），累積 3-4 篇媒體報導後再委外 Wikipedia。

---

## 九、風險提示

1. **不保證通過**：Wikidata 有志願者審核，可能第一次送被拒絕。被拒不是終點，可以修改後重送。
2. **可能被質疑 notability**：只有 1-2 篇 PChome/Yahoo 引用可能會被要求補充。建議下個月主動再多發 1-2 篇媒體投稿（我可以幫你寫新聞稿）。
3. **不要付錢給「保證通過」的服務**：Wikidata 從來沒有「保證通過」，聲稱保證的都是騙子。
4. **不要用公司 email 註冊帳號**：Wikidata 社群把「公司帳號自建條目」視為 COI（利益衝突），可能會加速刪除。

---

## 十、我可以幫你做的後續工作

當你完成 Wikidata 送出後告訴我 Q 編號，我可以：

1. **一鍵更新 llms.txt** 加上 Wikidata ID
2. **一鍵更新 index.html Organization schema** 加 `sameAs: ["https://www.wikidata.org/wiki/Q..."]`
3. **一鍵更新所有頁面（venues/careers/partnership）** 統一 sameAs
4. **建立 Wikidata JSON export** 存到 `/wikidata.json` 供 AI 快取用

---

**這份文件版本**：v1.0 · 2026-08-31 建立
**建議 review 週期**：每季度更新一次（媒體引用累積、統計數字變化）
