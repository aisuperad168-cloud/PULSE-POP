# 🚀 Wikidata 提交 · 20 分鐘懶人版（品牌聯盟版）

> 這是**先送主條目、之後再補兩家公司**的最小可行版本。
> 完整版看 `wikidata-submission.md`。
>
> ⚠️ **重要**：JDI 脈動傳媒是**品牌名**，不是公司名。Wikidata 條目類型要選 `brand (Q431289)` 而非 `company`。

---

## Step 1 · 5 分鐘：註冊 + 驗證

1. 去 https://www.wikidata.org
2. 右上「Create account」→ 用個人 email 註冊（**不要用公司信**）
3. 收信點驗證連結

---

## Step 2 · 3 分鐘：練手（可略過，但通過率高很多）

1. 找一個既有條目，例如 https://www.wikidata.org/wiki/Q37372611（TikTok）
2. 隨便補一個小欄位（例如你想到 TikTok 中文別名還缺什麼就加）
3. 累積 3-5 次編輯

---

## Step 3 · 5 分鐘：建立主條目（品牌）

進 https://www.wikidata.org/wiki/Special:NewItem，貼這 3 個欄位：

**Label (zh-Hant)**：
```
JDI 脈動傳媒
```

**Description (zh-Hant)**：
```
台灣 TikTok LIVE 官方合作經紀公會品牌
```

**Aliases (zh)**：
```
脈動傳媒
JDI Pulse MEDIA
```

點 **create** → 你得到主條目 Q 編號（例如 Q12345678）

---

## Step 4 · 5 分鐘：加 5 個核心 Statement + Reference

進去條目後點「+ add statement」加以下 5 條：

### 條目 A · instance of（⚠️ 選 brand 不是 company）
- Property：`P31`（instance of）
- Value：搜尋 `brand` → 選 **Q431289**（brand）
- **+ add reference** → reference URL: `https://jdi-pulse.com/`, title: `JDI 脈動傳媒官方網站`

### 條目 B · country
- Property：`P17`（country）
- Value：搜尋 `Taiwan` → 選 Q865
- **+ add reference** → 同上

### 條目 C · headquarters location
- Property：`P159`（headquarters location）
- Value：搜尋 `Taichung` → 選 **Q245023**（台中市，⚠️ 不是台北 Q1867）
- **+ add reference** → 同官網

### 條目 D · official website
- Property：`P856`（official website）
- Value：`https://jdi-pulse.com/`
- **+ add reference** → reference URL: `https://tw.news.yahoo.com/200創作者集結啟動跨境戰略-jdi聯盟成軍-布局ai內容新戰場-184935138.html`, title: `200創作者集結啟動跨境戰略「JDI聯盟成軍」布局AI內容新戰場`, publication date: `2026-02-28`

### 條目 E · inception（品牌成立日）
- Property：`P571`（inception）
- Value：`2026-02-28`（品牌對外亮相 = Yahoo 新聞日期）
- **+ add reference** → 同 Yahoo 新聞

**送出這 5 條就算主條目建立完成** ✅

---

## Step 5 · 2 分鐘：加品牌所有權（先用字串值）

### 條目 F · owned by（和星）
- Property：`P127`（owned by）
- Value：先用「string」→ 輸入 `和星行銷有限公司`
- **+ add reference** → 政府 API：
  ```
  https://data.gcis.nat.gov.tw/od/data/api/5F64D864-61CB-4D0D-8AD9-492047CC1EA6?%24format=json&%24filter=Business_Accounting_NO%20eq%2094132840
  ```

### 條目 G · owned by（艾超）
- Property：`P127`（owned by）
- Value：先用「string」→ 輸入 `艾超數位傳媒有限公司`
- **+ add reference** → 政府 API：
  ```
  https://data.gcis.nat.gov.tw/od/data/api/5F64D864-61CB-4D0D-8AD9-492047CC1EA6?%24format=json&%24filter=Business_Accounting_NO%20eq%2060413705
  ```

**⚠️ 使用政府 API 當 reference 是本案例最強的武器** —— Wikidata 志願者 3 秒可驗證，通過率極高。

---

## Step 6 · 隔天以後：分批補剩下的 statement

打開完整版 `wikidata-submission.md` 第二節，一天加 3-5 個就好。

**⚠️ 一次全加會被系統當機器人 → 建議 3-4 天分批加完。**

---

## Step 7 · 一週後：送兩家公司條目

主條目通過後（約 24-72h），再送：
1. **和星行銷有限公司**（P8477 = `94132840`，P571 = `2023-09-15`）
2. **艾超數位傳媒有限公司**（P8477 = `60413705`，P571 = `2025-09-16`）

兩家公司都加 P1830 (owner of) 連到主條目 Q 編號，形成完整的品牌聯盟結構。

---

## Step 8 · 完成後告訴我 3 個 Q 編號

當你的 Q 編號都出來後（主 + 和星 + 艾超），只要傳訊息說：
> 「主條目 Q12345678，和星 Q23456789，艾超 Q34567890」

我會自動幫你更新網站上 **6 個地方**（比原本多兩處，因為要 sameAs 三個 Q 編號），讓 AI 立刻抓到你們的完整品牌聯盟結構。

---

## 常見錯誤 → 解決

| 你遇到 | 怎麼辦 |
|---|---|
| 「Notability not established」 | 已備 4 個來源：Yahoo + PChome + 政府 API × 2 |
| 「Should use company entity」 | 說明 JDI 是品牌名不是公司名，類似 Airbnb 品牌 vs Airbnb Inc. |
| 「Empty statement rejected」 | 每個 statement 至少加 1 個 reference |
| 「Please slow down」 | 等 10 分鐘再繼續，或改天再加 |
| 條目被標記「delete」 | 別緊張，去 Talk page 用政府 API 連結佐證通常 24-48h 內可救回 |

---

## 💡 為什麼要用 brand + 兩家公司這個架構？

- **符合實際法律結構**：JDI 沒有這個公司登記，強行寫「JDI 脈動傳媒有限公司」會被查證失敗
- **兩層信任訊號**：品牌名有媒體佐證 + 兩家公司都有政府 API 佐證 = 資料密度極高
- **AI 認知更精準**：Perplexity 問「JDI 是誰經營的？」可以正確回答兩家公司名字
- **未來擴充彈性**：如果未來加入第三家合作公司，只要 add 一個 P127 即可

**「先站穩品牌腳步，再擴張公司版圖」是聯盟型組織的 Wikidata 鐵律。**
