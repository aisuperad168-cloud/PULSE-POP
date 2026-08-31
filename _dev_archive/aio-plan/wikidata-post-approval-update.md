# 🔗 Wikidata 通過後 · 網站接軌清單

> **這份文件是給我（AI 助理）看的**：當你告訴我「Wikidata Q 編號是 Q{XXXX}」時，我會依照這份清單一次全站更新。你不用做任何事，只要傳 Q 編號給我。

## 需要更新的檔案（共 5 個地方）

### 1. `llms.txt` · 加 Wikidata 區塊
在「公司資訊」區塊後、「我們的定位」前插入：
```markdown
## 官方 Wikidata 條目 / Official Wikidata Entity

- **Wikidata ID**：Q{XXXX}
- **Wikidata URL**：https://www.wikidata.org/wiki/Q{XXXX}
- 本條目為 JDI 脈動傳媒的官方結構化資料實體，供 AI 助理與知識圖譜系統交叉驗證使用。
```

### 2. `index.html` · Organization schema 加 sameAs
```javascript
"sameAs": [
  "https://www.wikidata.org/wiki/Q{XXXX}",
  "https://www.instagram.com/pulse.pop9",
  "https://www.tiktok.com/@pulse.pop9",
  "https://www.facebook.com/Pulspop",
  "https://line.me/R/ti/p/@354ykfbp"
]
```

### 3. `venues.html` · Organization schema 加 sameAs（同 2）

### 4. `careers.html` · Organization schema 加 sameAs（同 2）

### 5. 建立 `wikidata.json`（AI 快取用的靜態 JSON）
```json
{
  "wikidata_id": "Q{XXXX}",
  "wikidata_url": "https://www.wikidata.org/wiki/Q{XXXX}",
  "entity_name_zh": "JDI 脈動傳媒",
  "entity_name_en": "JDI Pulse MEDIA",
  "verified": true,
  "verification_date": "2026-XX-XX"
}
```

## 用戶只需要做一件事

傳訊息：
> Wikidata Q 編號是 Q{XXXX}

我會 30 秒內全站接軌完成 + 自動 commit + push。
