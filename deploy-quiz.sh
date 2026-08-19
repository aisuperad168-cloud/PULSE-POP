#!/usr/bin/env bash
# ============================================================
# JDI 脈動傳媒 · Quiz Function 一鍵部署腳本
# ============================================================
# 用法：
#   1. 準備好 3 個 token/key（見 REQUIREMENTS 區塊）
#   2. export CLOUDFLARE_API_TOKEN=xxx
#   3. export CLOUDFLARE_ACCOUNT_ID=xxx
#   4. export RESEND_API_KEY=re_xxx
#   5. bash deploy-quiz.sh
# ============================================================

set -e

echo "============================================================"
echo "🚀 JDI 脈動傳媒 · Quiz Function 部署"
echo "============================================================"

# ============ REQUIREMENTS ============
: "${CLOUDFLARE_API_TOKEN:?❌ 請先 export CLOUDFLARE_API_TOKEN}"
: "${CLOUDFLARE_ACCOUNT_ID:?❌ 請先 export CLOUDFLARE_ACCOUNT_ID}"
: "${RESEND_API_KEY:?❌ 請先 export RESEND_API_KEY}"

PROJECT_NAME="jdi-pulse"
DB_NAME="jdi-pulse-leads"

# ============ Step 1: Check wrangler ============
echo ""
echo "📦 Step 1: 檢查 wrangler..."
if ! command -v wrangler &> /dev/null; then
  echo "→ wrangler 未安裝，執行 npm install..."
  npm install -g wrangler
fi
wrangler --version

# ============ Step 2: Create D1 Database ============
echo ""
echo "🗄️  Step 2: 建立 D1 資料庫（若已存在會跳過）..."
DB_CREATE_OUTPUT=$(wrangler d1 create "$DB_NAME" 2>&1 || true)
echo "$DB_CREATE_OUTPUT"

# 從輸出擷取 database_id
DB_ID=$(echo "$DB_CREATE_OUTPUT" | grep -oE '[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}' | head -1)

# 若 create 失敗（已存在），從 list 取得
if [ -z "$DB_ID" ]; then
  echo "→ 從既有資料庫取得 ID..."
  DB_ID=$(wrangler d1 list 2>/dev/null | grep "$DB_NAME" | grep -oE '[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}' | head -1)
fi

if [ -z "$DB_ID" ]; then
  echo "❌ 無法取得 D1 database_id"
  exit 1
fi

echo "✅ D1 Database ID: $DB_ID"

# ============ Step 3: 更新 wrangler.toml with real DB ID ============
echo ""
echo "📝 Step 3: 更新 wrangler.toml 的 database_id..."
sed -i.bak "s|REPLACE_WITH_ACTUAL_D1_ID_AFTER_CREATE|$DB_ID|g" wrangler.toml
rm -f wrangler.toml.bak
echo "✅ wrangler.toml updated"

# ============ Step 4: Apply schema ============
echo ""
echo "🏗️  Step 4: 建立 D1 資料表..."
wrangler d1 execute "$DB_NAME" --remote --file=schema.sql

# ============ Step 5: Deploy Pages ============
echo ""
echo "🚀 Step 5: 部署到 Cloudflare Pages..."
wrangler pages deploy . --project-name="$PROJECT_NAME" --commit-dirty=true --branch=main

# ============ Step 6: Set secrets ============
echo ""
echo "🔐 Step 6: 設定 RESEND_API_KEY..."
echo "$RESEND_API_KEY" | wrangler pages secret put RESEND_API_KEY --project-name="$PROJECT_NAME"

# ============ Done ============
echo ""
echo "============================================================"
echo "✅ 部署完成！"
echo "============================================================"
echo ""
echo "🌐 網站：https://jdi-pulse.com/"
echo "🧪 測驗頁：https://jdi-pulse.com/quiz"
echo "📊 D1 Database: $DB_NAME ($DB_ID)"
echo ""
echo "🔍 檢查名單："
echo "   wrangler d1 execute $DB_NAME --remote --command \"SELECT * FROM quiz_leads ORDER BY id DESC LIMIT 10;\""
echo ""
echo "📮 測試寄信："
echo "   打開 https://jdi-pulse.com/quiz，做完 6 題填 email 提交"
echo ""
