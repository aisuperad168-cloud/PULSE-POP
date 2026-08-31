# 🚀 Wikidata 提交 · 15 分鐘懶人版

> 這是**先送出、之後再補完**的最小可行版本。
> 完整版看 `wikidata-submission.md`。

---

## Step 1 · 5 分鐘：註冊 + 驗證

1. 去 https://www.wikidata.org
2. 右上「Create account」→ 用個人 email 註冊
3. 收信點驗證連結

---

## Step 2 · 3 分鐘：練手（可略過，但通過率高很多）

1. 找一個既有條目，例如 https://www.wikidata.org/wiki/Q37372611（TikTok）
2. 隨便補一個小欄位（例如你想到 TikTok 中文別名還缺什麼就加）
3. 累積 3-5 次編輯

---

## Step 3 · 5 分鐘：建立條目

進 https://www.wikidata.org/wiki/Special:NewItem，貼這 3 個欄位：

**Label (zh-Hant)**：
```
JDI 脈動傳媒
```

**Description (zh-Hant)**：
```
台灣 TikTok LIVE 官方合作經紀公會
```

**Aliases (zh)**：
```
脈動傳媒
JDI Pulse MEDIA
```

點 **create** → 你得到一個 Q 編號（例如 Q12345678）

---

## Step 4 · 2 分鐘：加 3 個核心 Statement + Reference

進去條目後點「+ add statement」加以下 3 條：

### 條目 A：instance of（這是什麼類型）
- Property：`P31`（instance of）
- Value：搜尋 `business` → 選 Q4830453
- **+ add reference** → reference URL: `https://jdi-pulse.com/`, title: `JDI 脈動傳媒官方網站`

### 條目 B：country（在哪個國家）
- Property：`P17`（country）
- Value：搜尋 `Taiwan` → 選 Q865
- **+ add reference** → 同上

### 條目 C：official website（官網）
- Property：`P856`（official website）
- Value：`https://jdi-pulse.com/`
- **+ add reference** → reference URL: `https://tw.news.yahoo.com/200創作者集結啟動跨境戰略-jdi聯盟成軍-布局ai內容新戰場-184935138.html`, title: `200創作者集結啟動跨境戰略「JDI聯盟成軍」布局AI內容新戰場`, publication date: `2026-02-28`

**送出這 3 條就算條目建立完成** ✅

---

## Step 5 · 隔天：分批補剩下的 statement

打開完整版 `wikidata-submission.md` 第二節，一天加 3-5 個就好。

**⚠️ 一次全加會被系統當機器人 → 建議 3-4 天分批加完。**

---

## Step 6 · 完成後告訴我 Q 編號

當你的 Q 編號出來後（例如 Q12345678），只要傳訊息說：
> 「我的 Wikidata Q 編號是 Q12345678」

我會自動幫你更新網站上 5 個地方，讓 AI 立刻抓到你們的 Wikidata 實體。

---

## 常見錯誤 → 解決

| 你遇到 | 怎麼辦 |
|---|---|
| 「Notability not established」 | 至少加 1 個獨立媒體 reference（用 PChome/Yahoo 那篇） |
| 「Empty statement rejected」 | 每個 statement 至少加 1 個 reference |
| 「Please slow down」 | 等 10 分鐘再繼續，或改天再加 |
| 條目被標記「delete」 | 別緊張，去 Talk page 說明「這是台灣 TikTok LIVE 官方合作公會，見 [PChome 新聞連結]」通常 24-48h 內可以救回來 |

---

## 💡 為什麼要先建這 3 個核心 statement 就好？

- Wikidata 需要「基本可辨識」就能通過審核
- 加太多 statement 反而會被質疑「這是不是行銷帳號在灌資料」
- 通過後再慢慢補，反而更安全

**「先站穩腳步，再擴張版圖」是 Wikidata 條目建立的鐵律。**
