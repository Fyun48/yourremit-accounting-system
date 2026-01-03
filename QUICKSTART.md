# ⚡ 快速開始指南

這是最簡化的開始步驟，讓您在 10 分鐘內啟動外匯會計系統。

## 📝 前置需求

- Node.js 18+ 安裝
- Supabase 帳戶
- GitHub 帳戶（用於部署）
- Netlify 帳戶

## 🚀 5 步驟快速啟動

### 步驟 1: 設置 Supabase 資料庫（3 分鐘）

1. 登入 https://supabase.com
2. 創建新專案（已完成 ✅）
3. 前往 SQL Editor
4. 複製並執行 \`database-setup.sql\` 的內容
5. 驗證資料表已建立

### 步驟 2: 下載並安裝專案（2 分鐘）

\`\`\`bash
# 克隆專案
git clone <your-repo>
cd forex-accounting-system

# 安裝依賴
npm install
\`\`\`

### 步驟 3: 設定環境變量（1 分鐘）

創建 \`.env.local\` 檔案（參考 \`.env.example\`）：

\`\`\`env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_APP_NAME=外匯會計系統
NEXT_PUBLIC_APP_URL=http://localhost:3000
\`\`\`

**注意**：請在 Supabase Dashboard 中取得實際的 URL 和 Key。

### 步驟 4: 啟動開發伺服器（1 分鐘）

\`\`\`bash
npm run dev
\`\`\`

開啟瀏覽器訪問: http://localhost:3000

### 步驟 5: 創建第一個帳戶（1 分鐘）

1. 點擊「註冊新帳戶」
2. 輸入 email 和密碼
3. 註冊完成後登入
4. 開始使用系統！

## 🌐 部署到 Netlify（可選）

### 快速部署（3 分鐘）

\`\`\`bash
# 推送到 GitHub
git add .
git commit -m "Initial commit"
git push origin main

# 在 Netlify 網站
1. New site from Git
2. 選擇儲存庫
3. 設置環境變量
4. Deploy!
\`\`\`

## ✅ 驗證清單

- [ ] 資料庫表格已建立
- [ ] 環境變量已設定
- [ ] 開發伺服器運行正常
- [ ] 可以註冊和登入
- [ ] 儀表板正常顯示

## 🎯 下一步

現在您可以：

1. **新增外匯交易**
   - 前往「外匯交易」頁面
   - 點擊「新增交易」
   - 填寫交易資料

2. **查看會計分錄**
   - 前往「會計分錄」頁面
   - 查看自動生成的分錄

3. **查看財務報表**
   - 前往「財務報表」頁面
   - 查看資產負債表和損益表

4. **設定系統參數**
   - 前往「系統設定」頁面
   - 調整個人資料和偏好

## 💡 小提示

- **第一次使用**: 建議先新增幾筆測試交易熟悉系統
- **角色權限**: 第一個註冊的用戶可以在 Supabase 手動設定為管理員
- **備份資料**: 定期匯出重要資料
- **更新匯率**: 在系統設定中可以更新最新匯率

## 🆘 需要幫助？

- 📖 詳細文檔: 查看 \`README.md\`
- 🚀 部署指南: 查看 \`DEPLOYMENT.md\`
- 🐛 遇到問題: 檢查 Supabase 和 Netlify 的錯誤日誌

## 📞 支援

如果遇到任何問題：
1. 檢查 \`database-setup.sql\` 是否完全執行
2. 確認環境變量設定正確
3. 查看瀏覽器控制台的錯誤訊息
4. 查看 Supabase 資料庫日誌

---

**預計完成時間**: 10 分鐘
**難度**: ⭐⭐☆☆☆ 簡單

祝您使用愉快！ 🎉
