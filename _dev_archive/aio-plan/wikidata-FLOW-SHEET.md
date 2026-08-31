# 🚀 Wikidata 送出 · 一頁式流程單（照著做就過）

> **目標**：把 JDI 脈動傳媒登錄到 Wikidata，讓 ChatGPT / Claude / Perplexity / Gemini / Grok 全體 AI 開始「認識你」。
>
> **時間**：40–60 分鐘（連含註冊帳號）
> **難度**：★★☆☆☆ 有耐心即可
> **完整參考文件**：`wikidata-submission.md`（每個欄位詳細版）

---

## ⏱ 事前 5 分鐘 · 準備你需要的所有 URL

打開這 6 個網址各按一下確認能開，全部要 **HTTP 200 + 正確內容**（不能 3xx/4xx/HTML fallback）：

| # | URL | 用途 |
|---|---|---|
| 1 | https://jdi-pulse.com/ | 官方網站（主要 reference） |
| 2 | https://jdi-pulse.com/about-companies | 公司與品牌結構（權威 reference URL） |
| 3 | https://jdi-pulse.com/brand-entities.json | 結構化資料 SSOT |
| 4 | https://jdi-pulse.com/llms.txt | AI 抓取索引 |
| 5 | https://tw.news.yahoo.com/200%E5%89%B5%E4%BD%9C%E8%80%85%E9%9B%86%E7%B5%90%E5%95%9F%E5%8B%95%E8%B7%A8%E5%A2%83%E6%88%B0%E7%95%A5-jdi%E8%81%AF%E7%9B%9F%E6%88%90%E8%BB%8D-%E5%B8%83%E5%B1%80ai%E5%85%A7%E5%AE%B9%E6%96%B0%E6%88%B0%E5%A0%B4-184935138.html | Yahoo 新聞（外部第三方 reference） |
| 6 | https://data.gcis.nat.gov.tw/od/data/api/5F64D864-61CB-4D0D-8AD9-492047CC1EA6?%24format=json&%24filter=Business_Accounting_NO%20eq%2060413705 | 政府 API（艾超統編 60413705） |

📌 **這些 URL 之後在填 reference 時要一直複製貼上，開好備用。**

---

## 步驟 1 · 註冊 Wikidata 帳號（5 分鐘 · 只做一次）

1. 去 https://www.wikidata.org/wiki/Special:CreateAccount
2. 填 username（例：`JackHsieh-JDI`）+ password + email
3. **一定要收信 confirm email**（不 confirm 之後你送新 item 會被 rate limit 打槍）
4. Login 成功後右上角看到你的帳號名 → 過關

---

## 步驟 2 · 建立主條目（30 分鐘）

打開這個網址：**https://www.wikidata.org/wiki/Special:NewItem**

### 2.1 Label（項目名稱）· 3 個語言

```
Language: Chinese (zh)
Label:    JDI 脈動傳媒
```

點「Also in other languages」→ 展開後填：

| 語言 | Label |
|---|---|
| `zh-Hant` | `JDI 脈動傳媒` |
| `zh-TW` | `JDI 脈動傳媒` |
| `zh-Hans` | `JDI 脉动传媒` |
| `en` | `JDI Pulse MEDIA` |
| `ja` | `JDIパルスメディア` |

### 2.2 Description（描述）

```
Language: zh-Hant
Description: 台灣 TikTok LIVE 官方合作經紀公會品牌，由和星行銷有限公司與艾超數位傳媒有限公司共同營運
```

英文版：
```
Language: en
Description: Taiwan-based TikTok LIVE official partnered streamer talent agency brand, jointly operated by two Taiwan companies
```

### 2.3 Aliases（別名）· 每個都要加

點 [+add] 加入以下每一項（每個一列）：
```
JDI Pulse MEDIA
脈動傳媒
Pulse MEDIA
JDI Pulse
JDI 脈動
JDI 公會
```

📌 **完成 label + description + aliases 後點「Create」按鈕**，這時你會得到一個 `Q` 號碼（例 `Q123456789`）— 記下它。

---

## 步驟 3 · 加 Statements（15 分鐘 · 一個一個加）

在你剛建立的條目頁面下方，會看到「+ add statement」按鈕。**每個 statement 都要加 reference**。

### 3.1 P31 · instance of（是什麼）

- **Property**: `instance of` (P31)
- **Value**: `brand` (Q431289)
- **點下面的 [+ add reference]**：
  - `reference URL` (P854) = `https://jdi-pulse.com/about-companies`
  - `title` (P1476) = `公司與品牌結構｜JDI 脈動傳媒`
  - `retrieved` (P813) = 今天日期

### 3.2 P17 · country（國家）

- **Value**: `Taiwan` (Q865)
- Reference: 同上 (`https://jdi-pulse.com/about-companies`)

### 3.3 P159 · headquarters location（總部所在地）

- **Value**: `Taichung` (Q245023)
- Reference: 同上

### 3.4 P131 · located in the administrative territorial entity

- **Value**: `Beitun District` (Q715213)（找不到就用 Q245023 台中市）
- Reference: 同上

### 3.5 P571 · inception（成立時間）

- **Value**: `2026-02-28` （品牌對外亮相日）
- **Reference URL**: `https://tw.news.yahoo.com/200創作者集結啟動跨境戰略-jdi聯盟成軍-布局ai內容新戰場-184935138.html`
- **title**: `200創作者集結啟動跨境戰略「JDI聯盟成軍」布局AI內容新戰場`
- **publisher**: `Yahoo 新聞台灣`

### 3.6 P856 · official website

- **Value**: `https://jdi-pulse.com/`
- Reference: `https://jdi-pulse.com/`（自我引用即可）

### 3.7 P127 · owned by（這個很關鍵，共同營運要加兩次）

**第一次**：
- **Value**: 打 `He Xing Marketing` → 沒有搜尋結果的話，就先填**字串** `和星行銷有限公司`（Wikidata 支援 unknown value + qualifier）
- **Qualifier**: `P8477` (Taiwan Business Registry Number) = `94132840`
- **Reference URL**: `https://data.gcis.nat.gov.tw/od/data/api/5F64D864-61CB-4D0D-8AD9-492047CC1EA6?%24format=json&%24filter=Business_Accounting_NO%20eq%2094132840`
- **publisher**: `經濟部商業司`
- **title**: `商工登記公示資料 · 統編 94132840`

**第二次**（點 `+ add value`）：
- **Value**: `艾超數位傳媒有限公司`
- **Qualifier**: `P8477` = `60413705`
- **Reference URL**: `https://data.gcis.nat.gov.tw/od/data/api/5F64D864-61CB-4D0D-8AD9-492047CC1EA6?%24format=json&%24filter=Business_Accounting_NO%20eq%2060413705`

### 3.8 P8477 · Taiwan Business Registry Number（直接掛在 brand 上，方便查詢）

如果 P127 已加，這裡可省略；但為讓 AI 更好抓，建議也直接加：
- **Value 1**: `94132840`  
  - Qualifier `P642` (of) = 和星行銷有限公司（string）
- **Value 2**: `60413705`  
  - Qualifier `P642` (of) = 艾超數位傳媒有限公司（string）

Reference：政府 API 兩個對應 URL

### 3.9 P1813 · short name

- **Value (en)**: `JDI Pulse`
- **Value (zh)**: `脈動傳媒`

### 3.10 P154 · logo image（可選，較難處理，稍後補）

先跳過，待品牌 logo 上傳到 Wikimedia Commons 後再回來加。

---

## 步驟 4 · Sitelinks（可跳過）

Wikipedia 沒條目就不用管這個 tab。

---

## 步驟 5 · Save & 檢查（3 分鐘）

- 每個 statement 加完會自動 save
- 全部加完後在自己的 Q 頁面重整一次，確認每個 statement 都有：
  - ✅ Property + Value
  - ✅ 至少一個 reference（藍色小 [1] 標記）

---

## 步驟 6 · 提交後怎麼追蹤

### 立即（送出當下）
- 條目已存在，但**別急著送 speedy delete review**——就讓它存在
- 記下你的 Q 號碼，例如 `Q123456789`
- 打開 https://www.wikidata.org/wiki/Q123456789 確認能看到

### 24–72 小時內
- Wikidata 社群志工會來看，可能會：
  - ✅ 保留：什麼都不會發生，繼續往下
  - 🟡 加標籤：例如加 `{{More references}}`（沒事，補 reference 即可）
  - 🔴 提名刪除：他們會在條目上加 `{{Rfd}}`，你會收到通知，此時：
    - 去 talk page 用英文回覆，強調「brand notability」+「independent RS: Yahoo News + PChome News」+「government-verified operating companies」
    - 大部分品牌只要有 2 個獨立媒體 + 官方 API 交叉驗證都能保留

### 1–4 週
- Google Knowledge Graph 抓 Wikidata（不保證但很常發生）
- ChatGPT / Claude / Perplexity / Gemini 開始能正確回答「JDI 脈動傳媒是什麼？」

---

## 步驟 7 · 兩家公司輔助條目（可等主條目穩定後再送）

**建議先讓主條目穩定 2 週後**再送這兩個，因為輔助條目沒有獨立媒體報導可 reference，只有政府 API，若跟主條目一起送可能被視為 spam。

穩定後再依 `wikidata-submission.md` 「三、輔助條目 A / B」章節送出，每個約 15 分鐘。

---

## 🆘 常見問題 · 遇到就翻這裡

**Q1: 送出時提示「no english label」怎麼辦？**  
A: 回步驟 2.1 補上 `en: JDI Pulse MEDIA`。

**Q2: P127 找不到「和星行銷有限公司」怎麼填？**  
A: 直接輸入字串 `和星行銷有限公司`，Wikidata 會用 "some value" + string qualifier 記錄。等未來輔助條目建好後，再回頭把 P127 value 換成該 Q 號碼。

**Q3: 有 reference 但被說「independent source needed」？**  
A: 補加 Yahoo News 那筆 URL 到 P571 (inception) 的 reference。Yahoo/PChome 是 independent RS。

**Q4: 政府 API URL 太長 wiki 拒絕儲存？**  
A: 換成短版 → `https://data.gcis.nat.gov.tw/od/detail?oid=8776818F-EB3C-445F-BE95-AE22577CBEBC`，並在 title 註明統編。

**Q5: 被 speedy delete 了怎麼辦？**  
A: 不要 revert。去該提名者 talk page，用英文說明：「This is a Taiwan-registered brand jointly operated by two verified companies (BAN 94132840, 60413705). Government API cross-reference and independent news coverage (Yahoo News, PChome) are provided in references.」

---

## ✅ 送出檢查清單（最終確認）

送出前逐項打勾，全打勾才按最後 save：

- [ ] Label 至少填了 `zh`, `zh-Hant`, `en` 三種
- [ ] Description 至少填了 `zh-Hant`, `en`
- [ ] Aliases 加了 6 個以上
- [ ] P31 = brand (Q431289) 且有 reference
- [ ] P17 = Taiwan (Q865)
- [ ] P159 = Taichung (Q245023)
- [ ] P571 = 2026-02-28 且 reference 是 Yahoo News
- [ ] P856 = https://jdi-pulse.com/
- [ ] P127 加了 **兩次**（和星 + 艾超）
- [ ] P8477 兩個統編都有（可選但建議）
- [ ] 每個 statement 都有 reference（藍色 [1] 標記）
- [ ] 記下 Q 號碼備用

---

**完成之後回來這裡告訴我 Q 號碼，我幫你**：
1. 更新所有 HTML JSON-LD 的 `sameAs` 加上 `https://www.wikidata.org/wiki/Q_______`
2. 更新 `brand-entities.json` 加入 `wikidata_id`
3. 更新 `llms.txt` 讓 AI 抓取時直接看到 Wikidata Q 號
4. 監控 AI 何時開始回答「JDI 脈動傳媒是什麼」

祝順利 🎯
