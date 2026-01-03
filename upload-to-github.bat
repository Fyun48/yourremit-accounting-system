@echo off
echo ========================================
echo GitHub 上傳腳本
echo ========================================
echo.

REM 檢查是否已初始化 Git
if not exist .git (
    echo [1/5] 初始化 Git 儲存庫...
    git init
    if errorlevel 1 (
        echo 錯誤：無法初始化 Git。請確認已安裝 Git。
        pause
        exit /b 1
    )
    echo ✓ Git 儲存庫已初始化
) else (
    echo [1/5] Git 儲存庫已存在，跳過初始化
)

echo.
echo [2/5] 添加所有檔案...
git add .
if errorlevel 1 (
    echo 錯誤：無法添加檔案
    pause
    exit /b 1
)
echo ✓ 檔案已添加

echo.
echo [3/5] 建立初始提交...
git commit -m "feat: 新增移工匯款核心功能

- 實現信託專戶管理
- 實現匯款交易管理（含自動分錄）
- 實現日結作業功能
- 實現常用分錄樣板
- 完整的資料庫結構擴展"
if errorlevel 1 (
    echo 警告：提交失敗或沒有變更需要提交
)

echo.
echo [4/5] 設定遠端儲存庫...
git remote remove origin 2>nul
git remote add origin https://github.com/Fyun48/yourremit-accounting-system.git
if errorlevel 1 (
    echo 警告：遠端設定失敗，可能已存在
) else (
    echo ✓ 遠端儲存庫已設定
)

echo.
echo [5/5] 設定分支名稱...
git branch -M main
if errorlevel 1 (
    echo 警告：分支設定失敗
) else (
    echo ✓ 分支已設定為 main
)

echo.
echo ========================================
echo 準備推送到 GitHub...
echo ========================================
echo.
echo 遠端 URL: https://github.com/Fyun48/yourremit-accounting-system.git
echo.
echo 正在推送，請稍候...
echo 注意：可能需要輸入 GitHub 帳號密碼或 Personal Access Token
echo.
git push -u origin main
if errorlevel 1 (
    echo.
    echo ========================================
    echo 推送失敗，可能的原因：
    echo ========================================
    echo 1. 需要認證（請使用 Personal Access Token）
    echo 2. 遠端有衝突的提交
    echo.
    echo 解決方法：
    echo - 使用 GitHub Desktop 進行圖形化操作
    echo - 或手動執行：git pull origin main --allow-unrelated-histories
    echo.
) else (
    echo.
    echo ========================================
    echo ✓ 上傳成功！
    echo ========================================
    echo.
    echo 請前往以下網址確認：
    echo https://github.com/Fyun48/yourremit-accounting-system
    echo.
)

echo.
pause

