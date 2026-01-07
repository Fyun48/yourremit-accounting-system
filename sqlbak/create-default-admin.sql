-- 創建預設管理員帳號
-- 請在 Supabase SQL Editor 中執行此腳本
-- 
-- 注意：此腳本會創建一個預設的管理員帳號
-- 登入名稱：a000001
-- 電子郵件：admin@example.com
-- 密碼：Admin@1234
-- 
-- 請在首次登入後立即修改密碼！

-- 1. 創建 auth 用戶（需要手動在 Supabase Auth 中創建，或使用管理 API）
-- 這裡提供一個參考的用戶 ID（實際執行時需要替換為真實的用戶 ID）
-- 或者您可以在 Supabase Dashboard > Authentication > Users 中手動創建用戶

-- 假設您已經在 Supabase Auth 中創建了用戶，email 為 admin@example.com
-- 以下是創建用戶資料的 SQL：

-- 首先獲取用戶 ID（如果用戶已存在）
DO $$
DECLARE
  admin_user_id UUID;
  admin_role_id UUID;
BEGIN
  -- 查找或創建管理員角色
  SELECT id INTO admin_role_id FROM user_roles WHERE name = '系統管理員' LIMIT 1;
  
  IF admin_role_id IS NULL THEN
    INSERT INTO user_roles (name, description, permissions) 
    VALUES ('系統管理員', '擁有所有系統權限', '{"all": true}')
    RETURNING id INTO admin_role_id;
  END IF;

  -- 查找是否存在 admin@example.com 的用戶
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = 'admin@example.com' 
  LIMIT 1;

  -- 如果用戶存在，創建或更新用戶資料
  IF admin_user_id IS NOT NULL THEN
    -- 更新或插入用戶資料
    INSERT INTO user_profiles (
      id,
      login_name,
      email,
      full_name,
      role_id,
      department,
      is_active,
      requires_attendance,
      two_factor_enabled
    ) VALUES (
      admin_user_id,
      'a000001',  -- 登入名稱：小寫字母+6位數字
      'jimmy@your-remit.com',
      '系統管理員',
      admin_role_id,
      '管理部',
      true,
      false,  -- 管理員不需要打卡
      false   -- 預設不啟用2段式驗證
    )
    ON CONFLICT (id) 
    DO UPDATE SET
      login_name = 'a000001',
      email = 'jimmy@your-remit.com',
      full_name = '系統管理員',
      role_id = admin_role_id,
      department = '管理部',
      is_active = true,
      requires_attendance = false,
      two_factor_enabled = false,
      updated_at = NOW();
    
    RAISE NOTICE '管理員帳號已創建/更新，用戶 ID: %', admin_user_id;
  ELSE
    RAISE NOTICE '請先在 Supabase Auth 中創建用戶（email: admin@example.com）';
    RAISE NOTICE '然後再執行此腳本';
  END IF;
END $$;

-- 使用說明：
-- 1. 首先在 Supabase Dashboard > Authentication > Users 中手動創建用戶
--     - Email: admin@example.com
--     - Password: Admin@1234（符合密碼規則：至少8位數，包含大寫、小寫、數字、符號）
--     - 或者使用 Supabase Auth API 創建
--
-- 2. 然後執行此 SQL 腳本，它會自動：
--     - 創建或獲取「系統管理員」角色
--     - 為該用戶創建用戶資料
--     - 設定登入名稱為 a000001
--     - 設定為系統管理員角色
--
-- 3. 登入資訊：
--     登入名稱：a000001
--     密碼：Admin@1234
--
-- 4. 重要：首次登入後請立即修改密碼！
