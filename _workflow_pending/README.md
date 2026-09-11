# ⚠️ Pending Manual Deploy: GitHub Actions Workflows

這兩個檔案因為 GitHub App 沒有 `workflows` permission 無法透過 API push。
請你手動把它們移到 `.github/workflows/` 目錄後 commit push。

## 檔案

1. `newsletter-weekly.yml` — 每週一 UTC 03:00 掃新文章排程週報
2. `newsletter-runner.yml` — 每 5 分鐘檢查 pending broadcast 執行寄送

## 手動部署步驟

```bash
git mv _workflow_pending/newsletter-weekly.yml .github/workflows/
git mv _workflow_pending/newsletter-runner.yml .github/workflows/
rmdir _workflow_pending 2>/dev/null || rm _workflow_pending/README.md && rmdir _workflow_pending
git add .github/workflows/*.yml
git commit -m "ci(newsletter): 加入 GitHub Actions workflows"
git push origin main
```

## GitHub Secrets 設定

在 GitHub repo Settings → Secrets and variables → Actions → New repository secret：

- Name: `NEWSLETTER_CRON_SECRET`
- Value: 32 字元隨機字串（例：openssl rand -hex 16）

同時用 wrangler 設定同一個值：
```bash
wrangler secret put NEWSLETTER_CRON_SECRET
```
