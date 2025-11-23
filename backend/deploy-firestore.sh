#!/bin/bash

# Firestore 版本部署腳本
# 使用方式: ./deploy-firestore.sh

echo "╔════════════════════════════════════════╗"
echo "║   🚀 部署 Firestore 版本到 Cloud Run   ║"
echo "╚════════════════════════════════════════╝"
echo ""

# 檢查是否在正確的目錄
if [ ! -f "server-firestore.js" ]; then
    echo "❌ 錯誤：找不到 server-firestore.js"
    echo "請確保在 backend 目錄中執行此腳本"
    exit 1
fi

# 檢查 Google Cloud 認證
echo "🔍 檢查 Google Cloud 認證..."
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q "@"; then
    echo "❌ 請先執行: gcloud auth login"
    exit 1
fi

echo "✅ 認證檢查通過"
echo ""

# 備份當前 server.js
echo "📦 備份當前 server.js..."
if [ -f "server.js" ]; then
    cp server.js server.js.backup
    echo "✅ 已備份到 server.js.backup"
fi

# 切換到 Firestore 版本
echo "🔄 切換到 Firestore 版本..."
cp server-firestore.js server.js
echo "✅ 已切換到 Firestore 版本"
echo ""

# 部署到 Cloud Run
echo "🚀 開始部署到 Cloud Run..."
echo ""

gcloud run deploy ichiban-backend-new \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --platform managed \
  --memory 512Mi \
  --timeout 300

DEPLOY_STATUS=$?

if [ $DEPLOY_STATUS -eq 0 ]; then
    echo ""
    echo "╔════════════════════════════════════════╗"
    echo "║   ✅ 部署成功！                        ║"
    echo "╚════════════════════════════════════════╝"
    echo ""
    echo "📝 接下來的步驟:"
    echo "1. 測試新部署的 API"
    echo "2. 執行數據遷移腳本"
    echo "3. 部署 Firestore Security Rules"
    echo ""
    echo "🔗 後續命令:"
    echo "  測試連接: node migrations/migrate-to-firestore.js test"
    echo "  遷移數據: node migrations/migrate-to-firestore.js migrate"
    echo "  部署 Rules: firebase deploy --only firestore:rules"
else
    echo ""
    echo "❌ 部署失敗！"
    echo "恢復原始 server.js..."
    if [ -f "server.js.backup" ]; then
        cp server.js.backup server.js
        echo "✅ 已恢復"
    fi
    exit 1
fi
