# GitHub 上傳指南

## 📋 上傳前準備

### 1. 確認已安裝 Git
如果系統提示找不到 git 命令，請先安裝 Git：
- 下載：https://git-scm.com/download/win
- 安裝後重新開啟終端機

### 2. 確認檔案已準備
- ✅ `.gitignore` 已建立
- ✅ 所有程式碼檔案已準備完成
- ✅ 敏感資訊已移除（如環境變數中的實際 API Key）

## 🚀 上傳步驟

### 方法一：使用 Git 命令列（推薦）

#### 步驟 1: 初始化 Git 儲存庫
```bash
cd f:\yourremit-accounting-system\yourremit-accounting-system
git init
```

#### 步驟 2: 添加所有檔案
```bash
git add .
```

#### 步驟 3: 建立初始提交
```bash
git commit -m "Initial commit: 移工匯款會計系統 - 核心功能實現"
```

#### 步驟 4: 在 GitHub 建立新儲存庫
1. 登入 GitHub (https://github.com)
2. 點擊右上角「+」→「New repository」
3. 輸入儲存庫名稱（例如：`yourremit-accounting-system`）
4. 選擇 Public 或 Private
5. **不要**勾選「Initialize this repository with a README」
6. 點擊「Create repository」

#### 步驟 5: 連接遠端儲存庫並推送
```bash
# 將 YOUR_USERNAME 和 YOUR_REPO_NAME 替換為您的實際值
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

### 方法二：使用 GitHub Desktop（圖形化介面）

1. 下載並安裝 GitHub Desktop：https://desktop.github.com/
2. 開啟 GitHub Desktop
3. 點擊「File」→「Add Local Repository」
4. 選擇專案資料夾：`f:\yourremit-accounting-system\yourremit-accounting-system`
5. 點擊「Publish repository」
6. 輸入儲存庫名稱和描述
7. 選擇是否公開
8. 點擊「Publish Repository」

### 方法三：使用 VS Code 的 Git 整合

1. 在 VS Code 中開啟專案資料夾
2. 點擊左側的「Source Control」圖示（或按 `Ctrl+Shift+G`）
3. 點擊「Initialize Repository」
4. 輸入提交訊息：「Initial commit: 移工匯款會計系統」
5. 點擊「✓ Commit」
6. 點擊「...」→「Publish to GitHub」
7. 選擇是否公開，輸入儲存庫名稱
8. 點擊「Publish to GitHub」

## ⚠️ 重要注意事項

### 1. 環境變數檔案
**不要**將包含實際 API Key 的 `.env.local` 檔案上傳！

如果 `.env.local` 已存在，請確認：
- `.gitignore` 已包含 `.env*.local`
- 或手動刪除 `.env.local` 後再提交

### 2. 建議建立 `.env.example` 檔案
創建一個範例環境變數檔案供其他開發者參考：

```env
# .env.example
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
NEXT_PUBLIC_APP_NAME=外匯會計系統
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. 敏感資訊檢查
上傳前請確認以下檔案不包含敏感資訊：
- ✅ `database-setup.sql` - 檢查是否有實際的 API Key
- ✅ `README.md` - 檢查是否有實際的 Supabase URL 和 Key
- ✅ `QUICKSTART.md` - 檢查是否有實際的 Supabase URL 和 Key

**建議**：將實際的 Supabase URL 和 Key 改為佔位符，例如：
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## 📝 提交訊息建議

### 初始提交
```
Initial commit: 移工匯款會計系統

- 實現信託專戶管理
- 實現匯款交易管理（含自動分錄）
- 實現日結作業功能
- 實現常用分錄樣板
- 完整的資料庫結構設計
```

### 後續提交範例
```
feat: 新增應收帳款管理功能

- 客戶資料管理
- 銷貨發票管理
- 帳齡分析報表
```

## 🔒 安全性檢查清單

上傳前請確認：
- [ ] `.env.local` 已加入 `.gitignore`
- [ ] 所有實際的 API Key 已移除或替換為佔位符
- [ ] 資料庫密碼未包含在程式碼中
- [ ] Supabase 專案的實際 URL 已替換為範例
- [ ] 個人資訊已移除

## 📦 專案結構

上傳後，GitHub 儲存庫應包含以下主要目錄和檔案：

```
yourremit-accounting-system/
├── app/                    # Next.js 應用程式
│   ├── dashboard/         # 儀表板頁面
│   └── ...
├── lib/                    # 工具函數
├── types/                  # TypeScript 類型定義
├── database-setup.sql      # 基礎資料庫腳本
├── database-extensions.sql # 功能擴展腳本
├── database-supplement.sql # 補充會計科目腳本
├── package.json           # 專案依賴
├── README.md              # 專案說明
└── ...
```

## 🎯 上傳後建議

1. **更新 README.md**
   - 添加專案描述
   - 添加安裝步驟
   - 添加功能說明

2. **建立 LICENSE**
   - 選擇適合的開源授權（如 MIT、Apache 2.0）

3. **設定 GitHub Actions**（可選）
   - 自動化測試
   - 自動化部署

4. **建立 Issues 模板**（可選）
   - Bug 回報模板
   - 功能請求模板

## 🆘 遇到問題？

### 問題 1: 認證失敗
```bash
# 使用 Personal Access Token 代替密碼
# 或使用 SSH 金鑰
git remote set-url origin git@github.com:USERNAME/REPO.git
```

### 問題 2: 推送被拒絕
```bash
# 先拉取遠端變更
git pull origin main --allow-unrelated-histories
# 解決衝突後再推送
git push -u origin main
```

### 問題 3: 檔案太大
```bash
# 檢查大檔案
git ls-files | xargs du -h | sort -h | tail -20

# 如果 node_modules 被意外加入，移除它
git rm -r --cached node_modules
git commit -m "Remove node_modules"
```

---

**完成上傳後，您的專案將可以在 GitHub 上查看和管理！** 🎉

