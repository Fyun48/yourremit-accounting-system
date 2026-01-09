-- 更新管理員登入名稱
-- 將 a000001 改成 UUA01001（符合新的8位元命名規則）
-- 請在 Supabase SQL Editor 中執行此腳本

DO $$
DECLARE
  admin_user_id UUID;
  updated_count INTEGER;
BEGIN
  -- 1. 查找管理員帳號
  SELECT id INTO admin_user_id
  FROM user_profiles
  WHERE login_name = 'a000001' OR email = 'jimmy@your-remit.com'
  LIMIT 1;

  IF admin_user_id IS NULL THEN
    RAISE NOTICE '錯誤：找不到登入名稱為 a000001 或 email 為 jimmy@your-remit.com 的用戶';
    RETURN;
  END IF;

  RAISE NOTICE '找到管理員帳號，ID: %', admin_user_id;

  -- 2. 更新登入名稱和員工編號
  UPDATE user_profiles
  SET
    login_name = 'UUA01001',
    employee_id = 'UUA01001',  -- 員工編號應該和登入名稱一致
    updated_at = NOW()
  WHERE id = admin_user_id;

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  IF updated_count > 0 THEN
    RAISE NOTICE '✓ 成功更新管理員登入名稱';
    RAISE NOTICE '  舊登入名稱: a000001';
    RAISE NOTICE '  新登入名稱: UUA01001';
    RAISE NOTICE '  員工編號: UUA01001';
  ELSE
    RAISE NOTICE '✗ 更新失敗';
  END IF;

  -- 3. 驗證更新結果
  RAISE NOTICE '';
  RAISE NOTICE '=== 驗證結果 ===';
  
END $$;

-- 驗證更新後的資料
SELECT 
  id,
  login_name as "登入名稱",
  employee_id as "員工編號",
  email as "電子郵件",
  full_name as "姓名",
  is_active as "是否啟用",
  CASE 
    WHEN login_name IS NULL THEN '✗ 未設定登入名稱'
    WHEN LENGTH(login_name) != 8 THEN CONCAT('✗ 登入名稱長度錯誤（目前：', LENGTH(login_name), '位，應為8位）')
    WHEN login_name !~ '^[A-Z]{3}[0-9]{2}[0-9]{3}$' THEN '✗ 登入名稱格式不符合規則'
    ELSE '✓ 登入名稱格式正確'
  END as "格式檢查",
  updated_at as "更新時間"
FROM user_profiles
WHERE login_name = 'UUA01001' OR email = 'jimmy@your-remit.com';

-- 更新完成後，可以使用以下資訊登入：
-- 登入名稱: UUA01001
-- 密碼: Admin@1234（如果沒有修改過）
-- 電子郵件: jimmy@your-remit.com
