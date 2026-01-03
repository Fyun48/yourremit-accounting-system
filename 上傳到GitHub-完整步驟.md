# 上傳到 GitHub 完整步驟

## 📍 目標儲存庫
**GitHub URL**: https://github.com/Fyun48/yourremit-accounting-system.git

## 🔍 當前狀態
根據 GitHub 儲存庫資訊，您的專案已經存在並有 4 個提交。現在需要將本地的新變更推送到遠端。

## 🚀 上傳步驟

### 方法一：使用 Git 命令列（如果已安裝 Git）

#### 步驟 1: 檢查 Git 是否安裝
開啟 PowerShell 或命令提示字元，執行：
```powershell
git --version
```

如果顯示版本號，表示已安裝。如果顯示錯誤，請先安裝 Git：
- 下載：https://git-scm.com/download/win
- 安裝後重新開啟終端機

#### 步驟 2: 進入專案目錄
```powershell
cd f:\yourremit-accounting-system\yourremit-accounting-system
```

#### 步驟 3: 檢查 Git 狀態
```powershell
git status
```

#### 步驟 4: 初始化 Git（如果尚未初始化）
```powershell
git init
```

#### 步驟 5: 檢查遠端設定
```powershell
git remote -v
```

如果沒有遠端，添加遠端：
```powershell
git remote add origin https://github.com/Fyun48/yourremit-accounting-system.git
```

如果遠端 URL 不正確，更新它：
```powershell
git remote set-url origin https://github.com/Fyun48/yourremit-accounting-system.git
```

#### 步驟 6: 添加所有檔案
```powershell
git add .
```

#### 步驟 7: 提交變更
```powershell
git commit -m "feat: 新增移工匯款核心功能

- 實現信託專戶管理
- 實現匯款交易管理（含自動分錄）
- 實現日結作業功能
- 實現常用分錄樣板
- 完整的資料庫結構擴展"
```

#### 步驟 8: 設定分支名稱（如果需要）
```powershell
git branch -M main
```

#### 步驟 9: 推送到 GitHub
```powershell
git push -u origin main
```

如果遇到衝突，可能需要先拉取：
```powershell
git pull origin main --allow-unrelated-histories
# 解決衝突後
git push -u origin main
```

### 方法二：使用 GitHub Desktop（推薦，圖形化介面）

1. **下載並安裝 GitHub Desktop**
   - 下載：https://desktop.github.com/
   - 安裝後開啟

2. **登入 GitHub 帳號**
   - 在 GitHub Desktop 中登入您的 GitHub 帳號（Fyun48）

3. **添加現有儲存庫**
   - 點擊「File」→「Add Local Repository」
   - 選擇資料夾：`f:\yourremit-accounting-system\yourremit-accounting-system`
   - 點擊「Add repository」

4. **如果儲存庫已存在但未連接**
   - GitHub Desktop 會自動偵測
   - 點擊「Publish repository」或「Push origin」

5. **提交並推送變更**
   - 在左側會看到所有變更的檔案
   - 在下方輸入提交訊息
   - 點擊「Commit to main」
   - 點擊「Push origin」推送到 GitHub

### 方法三：使用 VS Code 的 Git 整合

1. **開啟專案**
   - 在 VS Code 中開啟 `f:\yourremit-accounting-system\yourremit-accounting-system`

2. **初始化 Git（如果需要）**
   - 點擊左側「Source Control」圖示（或按 `Ctrl+Shift+G`）
   - 如果提示初始化，點擊「Initialize Repository」

3. **設定遠端**
   - 點擊「...」→「Remote」→「Add Remote」
   - 輸入名稱：`origin`
   - 輸入 URL：`https://github.com/Fyun48/yourremit-accounting-system.git`

4. **提交變更**
   - 在「Source Control」面板中，輸入提交訊息
   - 點擊「✓ Commit」

5. **推送到 GitHub**
   - 點擊「...」→「Push」
   - 或點擊「Sync Changes」

## ⚠️ 常見問題排除

### 問題 1: 認證失敗
如果推送時要求輸入帳號密碼，請使用：
- **Personal Access Token**（推薦）
  - 前往：https://github.com/settings/tokens
  - 點擊「Generate new token (classic)」
  - 選擇權限：`repo`
  - 複製 token，在密碼欄位貼上

### 問題 2: 推送被拒絕（非快轉）
如果遠端有您本地沒有的提交：
```powershell
git pull origin main --allow-unrelated-histories
# 解決衝突後
git push -u origin main
```

### 問題 3: 找不到 Git 命令
- 確認已安裝 Git
- 重新開啟終端機
- 檢查 PATH 環境變數

### 問題 4: 檔案太大
如果某些檔案太大（如 node_modules），確認 `.gitignore` 已正確設定。

## ✅ 驗證上傳成功

上傳完成後，前往以下網址確認：
https://github.com/Fyun48/yourremit-accounting-system

應該能看到：
- ✅ 所有新檔案
- ✅ 最新的提交記錄
- ✅ 正確的檔案結構

## 📋 上傳前檢查清單

- [ ] `.gitignore` 已正確設定
- [ ] `.env.local` 不會被上傳（已在 .gitignore 中）
- [ ] 沒有實際的 API Key 在程式碼中
- [ ] 所有新功能檔案都已包含
- [ ] 資料庫腳本檔案都已包含

## 🎯 快速命令（複製貼上）

如果 Git 已安裝，可以直接執行以下命令：

```powershell
cd f:\yourremit-accounting-system\yourremit-accounting-system
git init
git remote add origin https://github.com/Fyun48/yourremit-accounting-system.git
git add .
git commit -m "feat: 新增移工匯款核心功能"
git branch -M main
git push -u origin main
```

---

**提示**：如果 Git 命令無法執行，建議使用 **GitHub Desktop**，它提供圖形化介面，更容易操作。

