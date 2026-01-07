# 部署指南

## 📋 部署前準備清單

在開始部署之前，請確保您已完成以下步驟：

### 1. Supabase 設置
- [x] 已建立 Supabase 專案
- [x] 已執行 database-setup.sql 腳本
- [x] 已確認所有資料表正確建立
- [x] 已取得 Project URL 和 Anon Key

### 2. 本地測試
- [x] 本地開發環境運行正常
- [x] 登入/註冊功能正常
- [x] 資料庫連接正常
- [x] 所有頁面功能正常

### 3. 代碼準備
- [x] 已將代碼推送到 Git 儲存庫（GitHub、GitLab 或 Bitbucket）
- [x] 已創建 .gitignore 避免上傳敏感資料
- [x] 已準備環境變量

## 🚀 Netlify 部署步驟

### 步驟 1: 準備 Git 儲存庫

如果還沒有 Git 儲存庫：

\`\`\`bash
# 初始化 Git
git init

# 添加所有檔案
git add .

# 提交變更
git commit -m "Initial commit - Forex Accounting System"

# 創建 GitHub 儲存庫後，連接遠端
git remote add origin https://github.com/your-username/forex-accounting-system.git

# 推送到 GitHub
git push -u origin main
\`\`\`

### 步驟 2: 連接 Netlify

1. 前往 [Netlify](https://app.netlify.com/)
2. 點擊 "Add new site" → "Import an existing project"
3. 選擇您的 Git 提供者（GitHub、GitLab 或 Bitbucket）
4. 授權 Netlify 訪問您的儲存庫
5. 選擇 `forex-accounting-system` 儲存庫

### 步驟 3: 配置建置設定

在 Netlify 部署設定頁面：

**Basic build settings:**
- Branch to deploy: \`main\`
- Build command: \`npm run build\`
- Publish directory: \`.next\`

**Advanced build settings:**
點擊 "Show advanced" 添加環境變量：

| Key | Value |
|-----|-------|
| NEXT_PUBLIC_SUPABASE_URL | https://ooheiofjailthttunjdk.supabase.co |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... |
| SUPABASE_SERVICE_ROLE_KEY | eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (用於後端 API，創建員工等功能) |
| NEXT_PUBLIC_APP_NAME | 外匯會計系統 |
| NEXT_PUBLIC_APP_URL | https://your-site.netlify.app |

### 步驟 4: 部署

1. 點擊 "Deploy site"
2. 等待建置完成（通常需要 2-5 分鐘）
3. 建置完成後，您會獲得一個網址，如：\`https://random-name-123.netlify.app\`

### 步驟 5: 設定自訂網域（可選）

1. 在 Netlify 專案頁面，前往 "Domain settings"
2. 點擊 "Add custom domain"
3. 輸入您的網域名稱
4. 按照指示在您的網域提供商處設定 DNS

## 🔧 使用 Netlify CLI 部署

如果您偏好使用命令列：

### 安裝 Netlify CLI

\`\`\`bash
npm install -g netlify-cli
\`\`\`

### 登入 Netlify

\`\`\`bash
netlify login
\`\`\`

### 初始化專案

\`\`\`bash
netlify init
\`\`\`

按照提示選擇：
- Create & configure a new site
- 選擇您的團隊
- 輸入網站名稱
- Build command: \`npm run build\`
- Publish directory: \`.next\`

### 設定環境變量

\`\`\`bash
netlify env:set NEXT_PUBLIC_SUPABASE_URL "https://ooheiofjailthttunjdk.supabase.co"
netlify env:set NEXT_PUBLIC_SUPABASE_ANON_KEY "your-anon-key"
netlify env:set SUPABASE_SERVICE_ROLE_KEY "your-service-role-key"
netlify env:set NEXT_PUBLIC_APP_NAME "外匯會計系統"
\`\`\`

### 部署

\`\`\`bash
# 測試部署
netlify deploy

# 正式部署
netlify deploy --prod
\`\`\`

## 🔍 部署後檢查

部署完成後，請驗證以下項目：

### 1. 網站訪問
- [ ] 網站可以正常訪問
- [ ] HTTPS 已啟用
- [ ] 所有頁面都能正確載入

### 2. 功能測試
- [ ] 註冊新帳戶功能正常
- [ ] 登入功能正常
- [ ] 儀表板數據正確顯示
- [ ] 外匯交易新增功能正常
- [ ] 資料庫讀寫正常

### 3. Supabase 連接
- [ ] 環境變量設定正確
- [ ] API 請求成功
- [ ] 認證功能正常
- [ ] RLS 政策運作正常

## 🔄 持續部署

Netlify 會自動設定持續部署：

1. 每次推送到 \`main\` 分支時，Netlify 會自動重新建置和部署
2. Pull Request 會創建預覽部署
3. 可以在 Netlify 控制台查看部署狀態和日誌

## ⚙️ Netlify 進階設定

### 設定重定向規則

編輯 \`netlify.toml\`（已包含在專案中）：

\`\`\`toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
\`\`\`

### 設定 Headers

在 \`netlify.toml\` 中添加：

\`\`\`toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"
\`\`\`

### 啟用分析

1. 在 Netlify 控制台，前往 "Site settings" → "Analytics"
2. 啟用 Netlify Analytics
3. 查看網站流量和效能數據

## 🐛 常見問題排解

### 問題 1: 建置失敗

**錯誤**: "Build failed"

**解決方案**:
1. 檢查 Netlify 建置日誌
2. 確認 \`package.json\` 中的依賴正確
3. 確認環境變量設定正確
4. 本地執行 \`npm run build\` 檢查是否有錯誤

### 問題 2: 無法連接資料庫

**錯誤**: Supabase connection failed

**解決方案**:
1. 確認 Supabase URL 和 API Key 正確
2. 檢查 Supabase 專案狀態
3. 確認環境變量名稱正確（必須以 NEXT_PUBLIC_ 開頭）

### 問題 3: 404 錯誤

**錯誤**: 頁面重新整理後出現 404

**解決方案**:
1. 確認 \`netlify.toml\` 檔案存在
2. 確認重定向規則設定正確
3. 重新部署網站

### 問題 4: 環境變量未生效

**解決方案**:
1. 確認變量名稱正確（區分大小寫）
2. 在 Netlify 控制台重新設定環境變量
3. 觸發新的部署

## 📊 監控與維護

### 定期檢查
- 每週檢查 Netlify 部署狀態
- 監控 Supabase 資料庫使用量
- 檢查應用程式錯誤日誌

### 更新流程
1. 在本地進行變更和測試
2. 提交並推送到 GitHub
3. Netlify 自動部署新版本
4. 驗證部署成功

### 備份策略
- 定期備份 Supabase 資料庫
- 使用 Git 版本控制管理程式碼
- 匯出重要資料

## 🎉 完成！

恭喜！您的外匯會計系統已成功部署到 Netlify。

現在您可以：
- 分享網站網址給團隊成員
- 開始使用系統管理外匯交易
- 監控系統效能
- 持續改進功能

如有任何問題，請參考：
- [Netlify 文檔](https://docs.netlify.com/)
- [Supabase 文檔](https://supabase.com/docs)
- [Next.js 文檔](https://nextjs.org/docs)

祝您使用順利！ 🚀
