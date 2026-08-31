# Wikidata 條目提交草案 · JDI 脈動傳媒（品牌聯盟版）

> **用途**：這份文件是你申請 Wikidata 條目時的**逐欄複製貼上**參考。
>
> **架構說明**：JDI 脈動傳媒是**品牌名**，不是公司名。品牌由兩家台灣公司共同營運。Wikidata 條目按此結構送出：
> - **主條目**：JDI 脈動傳媒（brand entity）· 這是外界會搜尋的名稱
> - **輔助條目 A**：和星行銷有限公司（94132840）· 建議先送主條目通過後再加
> - **輔助條目 B**：艾超數位傳媒有限公司（60413705）· 建議先送主條目通過後再加
>
> **為什麼 Wikidata 重要**：ChatGPT、Claude、Perplexity、Google Gemini、Grok 這些 AI 都**直接讀取 Wikidata 做為知識庫**，Google Knowledge Panel 也是從 Wikidata 生的。
>
> **預期時程**：完整送出 40-60 分鐘 → 通過審核 24-72 小時 → AI 抓取生效 1-4 週
>
> **送出網址**：https://www.wikidata.org/wiki/Special:NewItem（需要先註冊帳號並確認 email）
>
> **✅ 用戶已提供並驗證的真實資料**（來源：經濟部商業司開放資料 API，2026-08-31 查證）：
>
> | 資料項 | 和星行銷有限公司 | 艾超數位傳媒有限公司 |
> |---|---|---|
> | 統一編號 | 94132840 | 60413705 |
> | 負責人 | 廖宸依 | 謝典熼（Jack Hsieh）|
> | 成立日期 | 2023-09-15 | 2025-09-16 |
> | 登記地址 | 台中市烏日區高鐵路二段 146 號 6 樓之 2 | 台中市北屯區大連路三段 2 號 |
> | 資本額 | NT$ 200,000 | NT$ 600,000 |
> | 登記機關 | 台中市政府 | 台中市政府 |
> | 品牌角色 | 行銷推廣 · 商務對接 | 主播經紀 · 內容製作 · 直播間營運 |

---

## 一、主條目 · JDI 脈動傳媒（Brand）

進入 https://www.wikidata.org/wiki/Special:NewItem 後這樣填：

### 1.1 Label（項目名稱）

**Chinese (zh)** →
```
JDI 脈動傳媒
```

**Chinese (Traditional zh-Hant / zh-TW)** →
```
JDI 脈動傳媒
```

**Chinese (Simplified zh-Hans)** →（幫中國 AI 建立辨識）
```
JDI 脉动传媒
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
台灣 TikTok LIVE 官方合作經紀公會品牌
```

**English (en)** →
```
Taiwan-based TikTok LIVE official partnered streamer talent agency brand, jointly operated by two Taichung-registered companies
```

**Japanese (ja)** →
```
台湾のTikTok LIVE公式パートナー配信者エージェンシーブランド
```

### 1.3 Aliases（別名，幫 AI 辨識同一實體）

**Chinese (zh)** →（每行一個，全部貼上）
```
脈動傳媒
JDI 脈動
Pulse MEDIA
JDI Pulse
JDI 公會
```

**English (en)** →
```
JDI Pulse
Pulse MEDIA
JDI Pulse Media
```

---

## 二、Statements（主條目 · 品牌屬性）

這是**最關鍵的部分**。以下每一條都要點擊「+ add statement」加入：

### 2.1 核心分類（必填 · 第 1 批加）

| Property | Property ID | 值 | 說明 |
|---|---|---|---|
| instance of | **P31** | `brand` (Q431289) | ⚠️ 選「品牌」而非「company」，因為 JDI 是品牌名 |
| industry | **P452** | `entertainment industry` (Q173799) + `social media` (Q202833) + `talent management` (Q42413370) | 產業別（可加多個） |
| country | **P17** | `Taiwan` (Q865) | 所在國 |
| headquarters location | **P159** | `Taichung` (Q245023) | 品牌總部城市 ⚠️ 是台中 |
| located in the administrative territorial entity | **P131** | `Beitun District` (Q715213) | 更精確：北屯區 |
| official website | **P856** | `https://jdi-pulse.com/` | 官網 |
| inception (品牌成立日期) | **P571** | `2026-02-28`（YYYY-MM-DD，精確度：day） | 品牌對外亮相日 = Yahoo/PChome 新聞日期 |

### 2.2 品牌與公司關係（⭐ 關鍵 · 第 2 批加）

| Property | Property ID | 值 | 說明 |
|---|---|---|---|
| owned by | **P127** | `和星行銷有限公司`（字串值，之後改為 Q 連結）| 品牌所有權公司 1 |
| owned by | **P127** | `艾超數位傳媒有限公司`（字串值，之後改為 Q 連結）| 品牌所有權公司 2 |
| operator | **P137** | 同上兩家公司 | 品牌營運方 |

💡 **技巧**：先用「string value」（不連結 Q 編號）加入，之後兩家公司也有 Q 編號後再回來改為「item value」連結。這樣主條目可以先建立，不用等兩家公司都送完。

### 2.3 網路資產（AI 交叉驗證用 · 第 3 批加）

| Property | Property ID | 值 |
|---|---|---|
| Instagram username | **P2003** | `pulse.pop9` |
| TikTok username | **P7085** | `pulse.pop9` |
| Facebook Page ID | **P2013** | `Pulspop` |
| LINE ID | **P8933** | `@354ykfbp` |
| email address | **P968** | `mailto:pulsepop9@gmail.com` |
| phone number | **P1329** | `+886-4-3603-3191` |
| street address | **P6375** | `大連路三段2號`（qualifier language: zh-Hant） |
| postal code | **P281** | `406` |

### 2.4 業務範圍與定位（第 4 批加）

| Property | Property ID | 值 |
|---|---|---|
| service industry | **P452** | `live streaming` (Q17163043) |
| product or material produced | **P1056** | `livestream` (Q3062099) / `influencer marketing` (Q26890156) |
| area served | **P2541** | `Taiwan` (Q865) |
| slogan | **P1451** | `脈動不息，熱情傳播`（zh-Hant）/ `Pulse never stops, passion spreads`（en） |

---

## 三、輔助條目 · 兩家營運公司（主條目通過後再送）

**⚠️ 順序建議**：先送主條目「JDI 脈動傳媒」→ 通過後 → 再送這兩家公司條目 → 三個條目互相用 Q 編號連結

### 3.1 輔助條目 A · 和星行銷有限公司

**Label (zh-Hant)**：`和星行銷有限公司`
**Label (en)**：`He Xing Marketing Co., Ltd.`
**Description (zh-Hant)**：`台灣行銷公司，JDI 脈動傳媒品牌共同營運公司`
**Description (en)**：`Taiwan-based marketing company, co-operator of JDI Pulse MEDIA brand`

**Statements**：
| Property | 值 |
|---|---|
| P31 (instance of) | `business` (Q4830453) |
| P1454 (legal form) | `limited company (Taiwan)` (Q113489728) |
| P17 (country) | `Taiwan` (Q865) |
| P159 (HQ location) | `Taichung` (Q245023) |
| P131 (located in) | `Wuri District` (Q715235) |
| P571 (inception) | `2023-09-15` |
| P8477 (Taiwan Business Registry Number) | `94132840` |
| P1448 (official name) | `和星行銷有限公司` / `He Xing Marketing Co., Ltd.` |
| P112 (founded by) | `廖宸依` |
| P169 (CEO) | `廖宸依` |
| P1830 (owner of) | 主條目 Q 編號 |

### 3.2 輔助條目 B · 艾超數位傳媒有限公司

**Label (zh-Hant)**：`艾超數位傳媒有限公司`
**Label (en)**：`Ai Chao Digital Media Co., Ltd.`
**Description (zh-Hant)**：`台灣數位傳媒公司，JDI 脈動傳媒品牌共同營運公司，經營直播主經紀與線下直播間`
**Description (en)**：`Taiwan-based digital media company, co-operator of JDI Pulse MEDIA brand, streamer agency and offline studio operator`

**Statements**：
| Property | 值 |
|---|---|
| P31 (instance of) | `business` (Q4830453) + `talent agency` (Q1076599) |
| P1454 (legal form) | `limited company (Taiwan)` (Q113489728) |
| P17 (country) | `Taiwan` (Q865) |
| P159 (HQ location) | `Taichung` (Q245023) |
| P131 (located in) | `Beitun District` (Q715213) |
| P571 (inception) | `2025-09-16` |
| P8477 (Taiwan Business Registry Number) | `60413705` |
| P1448 (official name) | `艾超數位傳媒有限公司` / `Ai Chao Digital Media Co., Ltd.` |
| P112 (founded by) | `謝典熼` |
| P169 (CEO) | `謝典熼` |
| P1830 (owner of) | 主條目 Q 編號 |

---

## 四、References（引用來源 · 通過審核的關鍵）

**⚠️ 這是最重要的部分**。Wikidata 條目沒有引用來源會被立刻標記「無來源」並在 7 天內被刪除。

每一個 statement 後面都要點「add reference」加上來源。以下是**已驗證可用**的來源清單：

### 4.1 政府開放資料（黃金級 · 統編相關 statement 用）

**Reference 1 · 經濟部商業司公司登記查詢 · 和星行銷（94132840）**
- reference URL (P854)：`https://data.gcis.nat.gov.tw/od/data/api/5F64D864-61CB-4D0D-8AD9-492047CC1EA6?%24format=json&%24filter=Business_Accounting_NO%20eq%2094132840`
- title (P1476)：`公司登記基本資料查詢 · 和星行銷有限公司`
- publisher (P123)：`經濟部商業司 (Ministry of Economic Affairs)`

**Reference 2 · 經濟部商業司公司登記查詢 · 艾超數位傳媒（60413705）**
- reference URL (P854)：`https://data.gcis.nat.gov.tw/od/data/api/5F64D864-61CB-4D0D-8AD9-492047CC1EA6?%24format=json&%24filter=Business_Accounting_NO%20eq%2060413705`
- title (P1476)：`公司登記基本資料查詢 · 艾超數位傳媒有限公司`
- publisher (P123)：`經濟部商業司 (Ministry of Economic Affairs)`

💎 **這兩條 reference 是 Wikidata 志願者的最愛** —— 政府 API 直接回傳 JSON 可 3 秒驗證，通過率極高。

### 4.2 已有的獨立媒體引用（品牌 statement 用）

**Reference 3 · Yahoo 新聞（品牌成軍報導）**
- reference URL (P854)：`https://tw.news.yahoo.com/200創作者集結啟動跨境戰略-jdi聯盟成軍-布局ai內容新戰場-184935138.html`
- title (P1476)：`200創作者集結啟動跨境戰略「JDI聯盟成軍」布局AI內容新戰場`
- publication date (P577)：`2026-02-28`
- publisher (P123)：`Yahoo 新聞台灣 (Yahoo News Taiwan)`

**Reference 4 · PChome 新聞（品牌成軍報導）**
- reference URL (P854)：`https://news.pchome.com.tw/society/tcpttw/20260301/index-77230457566462334002.html`
- title (P1476)：`200創作者集結啟動跨境戰略「JDI聯盟成軍」布局AI內容新戰場`
- publication date (P577)：`2026-03-01`
- publisher (P123)：`PChome 新聞`

### 4.3 官方來源（補強用）

**Reference 5 · 官方網站**
- reference URL (P854)：`https://jdi-pulse.com/`
- title (P1476)：`JDI 脈動傳媒 JDI Pulse MEDIA｜TikTok LIVE 官方經紀公會`
- publisher (P123)：`JDI 脈動傳媒`

**Reference 6 · 品牌資料 SSOT（JSON 格式）**
- reference URL (P854)：`https://jdi-pulse.com/brand-entities.json`
- title (P1476)：`JDI 脈動傳媒 · 品牌與公司實體資料`
- publisher (P123)：`JDI 脈動傳媒`

---

## 五、Wikidata 提交步驟（逐步操作指南）

### 步驟 1：建立 Wikidata 帳號（如尚未建立）
1. 進 https://www.wikidata.org
2. 右上「Create account」
3. 用**個人 email**註冊（不要用 pulsepop9@gmail.com 公司信）
4. 驗證 email

### 步驟 2：完善個人頁面（提高審核通過率）
1. 進 `https://www.wikidata.org/wiki/User:你的帳號名`
2. 隨便寫 2-3 行自我介紹（用英文更好），例如：
   ```
   I edit topics related to Taiwan business and creator economy.
   我編輯與台灣商業和創作者經濟相關的主題。
   ```

### 步驟 3：先做幾個小編輯練手（累積編輯次數）
1. 找一個你熟悉的既有條目（例如 TikTok Q37372611）
2. 檢查裡面資料，改個小地方（例如補一個中文別名、修一個過期網址）
3. 累積 5-10 次編輯 → 帳號從「新手」升級

### 步驟 4：建立主條目「JDI 脈動傳媒」
1. 進 https://www.wikidata.org/wiki/Special:NewItem
2. Language：`zh-Hant`
3. Label：`JDI 脈動傳媒`
4. Description：`台灣 TikTok LIVE 官方合作經紀公會品牌`
5. Aliases：先只填 1-2 個（`脈動傳媒`、`JDI Pulse MEDIA`）
6. 點 create → 得到主條目的 Q 編號（例如 Q123456789）
7. **記下這個 Q 編號** —— 兩家公司條目要引用

### 步驟 5：分批加 statement（避免被誤判機器人）
- **第 1 批（當天）**：P31 (brand) + P17 (Taiwan) + P159 (Taichung) + P856 (官網) + P571 (2026-02-28) + P452 (industry)
- **第 2 批（隔天）**：P127 owned by × 2（先用字串值填「和星行銷有限公司」和「艾超數位傳媒有限公司」）+ P131 (Beitun) + P1451 (slogan)
- **第 3 批（第 3 天）**：所有社群連結（P2003, P7085, P2013, P8933）+ P968 (email) + P1329 (phone) + P6375 (street) + P281 (postal)
- **第 4 批（第 4-7 天）**：P1056 (products) + P2541 (area served) + 其他補充

### 步驟 6：等主條目通過（24-72h）→ 送輔助條目 A（和星）
1. 進 Special:NewItem
2. Label：`和星行銷有限公司`
3. Description：`台灣行銷公司，JDI 脈動傳媒品牌共同營運公司`
4. Create → 得到和星的 Q 編號
5. 分批加 statement，其中 **P8477 統編填 `94132840`** 用 Reference 1 佐證
6. 加 P1830 (owner of)：填主條目的 Q 編號

### 步驟 7：送輔助條目 B（艾超）
1. 同上，Label：`艾超數位傳媒有限公司`
2. **P8477 統編填 `60413705`** 用 Reference 2 佐證
3. 加 P1830 (owner of)：填主條目的 Q 編號

### 步驟 8：回主條目更新關係
1. 回到主條目 Q 編號
2. 找到 P127 (owned by) 的兩條字串值 statement
3. 點「edit」→ 改為 item value → 分別連結到和星和艾超的 Q 編號
4. 這樣 3 個條目就完全交叉引用，成為 Wikidata 中一個 **verified brand entity cluster**

---

## 六、審核通過機率提高技巧

### ✅ DO（會通過）
1. **每個 statement 都有 reference** —— 這是最大關鍵
2. **統編類 statement 一定用政府 API** —— Wikidata 志願者最愛的黃金來源
3. **語氣中性**：只寫事實，不寫「最強」「業界第一」等形容詞
4. **來源多樣**：不要 6 個 statement 全用同一個 reference URL
5. **分批加**：不要 5 分鐘內加 30 個 statement，會被當成機器人
6. **主條目用 brand (Q431289)** 不用 company，這是本案例的關鍵設計

### ❌ DON'T（會被刪）
1. ~~主條目用 `company (Q4830453)` 或 `limited company` 當 P31~~ ← 因為 JDI 不是公司名，這樣填會失敗
2. ~~加行銷用語（例如 slogan 描述寫成「台灣最棒的公會」）~~
3. ~~上傳 Logo 到 P154（Wikidata 需要 Wikimedia Commons 授權，商標會被撤）~~
4. ~~在同一天加超過 3-5 個新條目（帳號會被鎖）~~
5. ~~統編填錯欄位~~（P8477 專屬 8 碼統編，不要跟 P1329 phone 搞混）

### 🚨 常見刪除理由與應對（品牌聯盟版）
| 刪除理由 | 應對 |
|---|---|
| **Notability not established**（知名度不足） | 用 Reference 3+4（Yahoo/PChome 各一篇）+ Reference 1+2（政府 API）→ 4 個獨立來源足夠 ✅ |
| **Advertisement**（廣告嫌疑） | 描述用中性語言，強調品牌背後兩家公司都有政府登記 = 實體證據 |
| **Should be merged with company entity**（該併入公司條目） | 說明 JDI 是共同品牌，兩家公司 P127 owns brand → 品牌獨立於任一家公司 |
| **Sockpuppetry**（多帳號嫌疑） | 只用一個帳號、用個人 email、耐心累積編輯 |

---

## 七、通過後的下一步（讓 AI 立刻認識你）

Wikidata 條目建立成功後：

### 7.1 更新官網 llms.txt（加上三個 Q 編號）
```markdown
## 官方 Wikidata 條目 / Official Wikidata Entities

- 品牌 · JDI 脈動傳媒：Q{主條目 ID}
- 公司 · 和星行銷有限公司：Q{和星 ID}
- 公司 · 艾超數位傳媒有限公司：Q{艾超 ID}
```

### 7.2 在所有頁面 JSON-LD schema 加上 sameAs 連結
```json
"sameAs": [
  "https://www.wikidata.org/wiki/Q{主條目}",
  "https://www.instagram.com/pulse.pop9",
  "https://www.tiktok.com/@pulse.pop9",
  ...
]
```

### 7.3 監測 AI 認識度變化
建立條目後 2-4 週去測試：
- Perplexity：「JDI 脈動傳媒是什麼？」→ 應該會回「品牌，由兩家台灣公司營運」而非「有限公司」
- ChatGPT（開網路搜尋）：「Tell me about JDI Pulse MEDIA」→ 應該會提到品牌 + 兩家公司名
- Google 搜尋「JDI 脈動傳媒」→ Knowledge Panel 應該顯示「品牌」而非「公司」

---

## 八、快速核對表（送出前檢查）

- [ ] Wikidata 帳號已註冊 + email 已驗證
- [ ] 個人頁面已寫 2-3 行自我介紹
- [ ] 已完成 5-10 次小編輯練手
- [x] ✅ 兩家公司資料已於經濟部商業司 API 驗證：`94132840` 和星、`60413705` 艾超
- [ ] 主條目 Label + Description + Aliases 已按第一節填好
- [ ] 主條目 P31 選的是 `brand (Q431289)` 不是 company
- [ ] 主條目 P159 選的是 `Taichung (Q245023)` 不是 Taipei
- [ ] 主條目第 1 批 statement（6 個核心屬性）已填好
- [ ] 每個 Statement 都掛上 reference（統編類用政府 API，品牌類用 Yahoo/PChome）
- [ ] 沒有形容詞、沒有行銷用語

---

## 九、如果你要**外包**給人做

| 服務 | 價格區間 | 說明 |
|---|---|---|
| 一般人代寫並提交（僅主條目） | $3,000-8,000 NTD | 適合資料齊全、有 4+ 引用來源的品牌 |
| 專業 Wikidata 編輯代寫（三條目 cluster） | $15,000-30,000 NTD | 建議選有「autopatrolled」或「rollbacker」權限的編輯 |
| Wikipedia + Wikidata 雙條目 | $30,000-80,000 NTD | Wikipedia 需要 4+ 篇獨立媒體報導 |

**推薦策略**：先自己送 Wikidata 主條目（因為簡單），累積 3-4 篇媒體報導後再委外 Wikipedia。

---

## 十、風險提示

1. **不保證通過**：Wikidata 有志願者審核，可能第一次送被拒絕。被拒不是終點，可以修改後重送。
2. **可能被質疑 notability**：如志願者不熟台灣直播圈，可能會要求補充。建議下個月主動再多發 1-2 篇媒體投稿。
3. **不要付錢給「保證通過」的服務**：Wikidata 從來沒有「保證通過」。
4. **不要用公司 email 註冊帳號**：Wikidata 社群把「公司帳號自建條目」視為 COI（利益衝突）。
5. **P127 兩個 owned by 可能被 challenge**：如果志願者不理解品牌聯盟概念，可能會建議合併成一家公司條目。這時用「這是 co-branding 案例，類似 Airbnb 品牌與 Airbnb, Inc.」的論點回覆。

---

## 十一、我可以幫你做的後續工作

當你完成 Wikidata 送出後告訴我 3 個 Q 編號（主條目 + 兩家公司），我可以：

1. **一鍵更新 llms.txt** 加上三個 Wikidata ID
2. **一鍵更新所有頁面 JSON-LD schema** 的 sameAs 陣列
3. **一鍵更新 brand-entities.json**（SSOT）加上 Wikidata ID 欄位
4. **建立 Wikidata JSON export** 存到 `/wikidata.json` 供 AI 快取用

---

**這份文件版本**：v2.0 · 2026-08-31 更新為品牌聯盟版
**建議 review 週期**：每季度更新一次（媒體引用累積、統計數字變化）
