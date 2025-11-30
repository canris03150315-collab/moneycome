# 後端部署腳本

Write-Host "開始部署後端..." -ForegroundColor Green

# 設定變數
$PROJECT_ID = "goodmoney666-jackpot"
$REGION = "us-central1"
$SERVICE_NAME = "ichiban-backend-new"
$IMAGE_NAME = "us-central1-docker.pkg.dev/$PROJECT_ID/ichiban-backend/ichiban-backend:latest"

# 構建 Docker 鏡像
Write-Host "`n1. 構建 Docker 鏡像..." -ForegroundColor Yellow
docker build -t $IMAGE_NAME --no-cache .

if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker 構建失敗！" -ForegroundColor Red
    exit 1
}

# 推送到 Artifact Registry
Write-Host "`n2. 推送鏡像到 Artifact Registry..." -ForegroundColor Yellow
docker push $IMAGE_NAME

if ($LASTEXITCODE -ne 0) {
    Write-Host "鏡像推送失敗！" -ForegroundColor Red
    exit 1
}

# 部署到 Cloud Run
Write-Host "`n3. 部署到 Cloud Run..." -ForegroundColor Yellow
gcloud run deploy $SERVICE_NAME `
    --image=$IMAGE_NAME `
    --region=$REGION `
    --platform=managed `
    --allow-unauthenticated `
    --port=8080 `
    --max-instances=10 `
    --cpu=1 `
    --memory=512Mi `
    --set-env-vars="NODE_ENV=production"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Cloud Run 部署失敗！" -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ 後端部署成功！" -ForegroundColor Green
Write-Host "服務 URL: https://$SERVICE_NAME-248630813908.$REGION.run.app" -ForegroundColor Cyan
