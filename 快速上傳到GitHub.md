# 🚀 快速上傳到 GitHub

## ⚠️ 重要：需要先安裝 Git

您的系統目前沒有安裝 Git。請按照以下步驟操作：

## 📥 步驟 1：安裝 Git

### 方法 A：下載安裝程式（推薦）
1. 前往：https://git-scm.com/download/win
2. 下載 Windows 版本的 Git
3. 執行安裝程式，使用預設設定即可
4. **安裝完成後，請重新開啟 PowerShell 或命令提示字元**

### 方法 B：使用 winget（如果已安裝）
```powershell
winget install --id Git.Git -e --source winget
```

## ✅ 步驟 2：驗證 Git 安裝

重新開啟 PowerShell 後，執行：
```powershell
git --version
```

如果顯示版本號（例如：`git version 2.xx.x`），表示安裝成功！

## 🚀 步驟 3：上傳專案到 GitHub

### 方法一：使用自動化腳本（最簡單）

1. 在專案資料夾中，雙擊執行 `upload-to-github.bat`
2. 腳本會自動執行所有步驟
3. 如果需要認證，請使用 **Personal Access Token**（見下方說明）

### 方法二：手動執行命令

開啟 PowerShell，執行以下命令：

```powershell
# 進入專案目錄
cd f:\yourremit-accounting-system

# 初始化 Git（如果尚未初始化）
git init

# 添加所有檔案
git add .

# 建立提交
git commit -m "feat: 移工匯款會計系統 - 完整功能實現

- 實現信託專戶管理
- 實現匯款交易管理（含自動分錄）
- 實現日結作業功能
- 實現常用分錄樣板
- 完整的資料庫結構設計"

# 設定遠端儲存庫
git remote add origin https://github.com/Fyun48/yourremit-accounting-system.git

# 設定分支名稱
git branch -M main

# 推送到 GitHub
git push -u origin main
```

## 🔐 認證說明

當執行 `git push` 時，GitHub 會要求認證。**請使用 Personal Access Token，不要使用密碼**：

### 建立 Personal Access Token：

1. 前往：https://github.com/settings/tokens
2. 點擊「Generate new token (classic)」
3. 輸入 Token 名稱（例如：`yourremit-accounting-system`）
4. 選擇過期時間
5. **勾選權限**：`repo`（完整權限）
6. 點擊「Generate token」
7. **複製 Token**（只會顯示一次，請妥善保存）

### 使用 Token：

當 Git 要求輸入密碼時：
- **使用者名稱**：輸入您的 GitHub 使用者名稱（Fyun48）
- **密碼**：貼上剛才複製的 Personal Access Token

## 🎯 方法三：使用 GitHub Desktop（圖形化介面，推薦新手）

如果您不熟悉命令列，可以使用 GitHub Desktop：

1. **下載 GitHub Desktop**
   - 前往：https://desktop.github.com/
   - 下載並安裝

2. **登入 GitHub 帳號**
   - 開啟 GitHub Desktop
   - 登入您的 GitHub 帳號（Fyun48）

3. **添加本地儲存庫**
   - 點擊「File」→「Add Local Repository」
   - 選擇資料夾：`f:\yourremit-accounting-system`
   - 點擊「Add repository」

4. **提交並推送**
   - 在左側會看到所有變更的檔案
   - 在下方輸入提交訊息
   - 點擊「Commit to main」
   - 點擊「Push origin」推送到 GitHub

## ⚠️ 常見問題

### 問題 1：推送被拒絕（非快轉）
如果遠端有您本地沒有的提交：
```powershell
git pull origin main --allow-unrelated-histories
# 解決衝突後
git push -u origin main
```

### 問題 2：檔案太大
確認 `.gitignore` 已正確設定，`node_modules` 等大檔案不會被上傳。

### 問題 3：認證失敗
- 確認使用 Personal Access Token 而不是密碼
- 確認 Token 有 `repo` 權限
- 確認 Token 尚未過期

## ✅ 驗證上傳成功

上傳完成後，前往以下網址確認：
**https://github.com/Fyun48/yourremit-accounting-system**

應該能看到：
- ✅ 所有專案檔案
- ✅ 最新的提交記錄
- ✅ 正確的檔案結構

## 📋 上傳前檢查清單

- [x] `.gitignore` 已正確設定
- [x] `.env.local` 不會被上傳（已在 .gitignore 中）
- [ ] 確認沒有實際的 API Key 在程式碼中
- [ ] 所有新功能檔案都已包含
- [ ] 資料庫腳本檔案都已包含

---

**提示**：如果遇到任何問題，建議使用 **GitHub Desktop**，它提供圖形化介面，更容易操作。

