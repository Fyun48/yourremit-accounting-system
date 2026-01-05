-- 修復管理員帳號
-- 請在 Supabase SQL Editor 中執行此腳本
-- 
-- 此腳本會：
-- 1. 檢查並創建/更新 user_profiles 記錄
-- 2. 確保登入名稱和 email 正確設定

DO $$
DECLARE
  admin_user_id UUID;
  admin_role_id UUID;
  profile_exists BOOLEAN;
BEGIN
  -- 1. 獲取或創建管理員角色
  SELECT id INTO admin_role_id FROM user_roles WHERE name = '系統管理員' LIMIT 1;
  
  IF admin_role_id IS NULL THEN
    INSERT INTO user_roles (name, description, permissions) 
    VALUES ('系統管理員', '擁有所有系統權限', '{"all": true}')
    RETURNING id INTO admin_role_id;
    RAISE NOTICE '已創建「系統管理員」角色，ID: %', admin_role_id;
  ELSE
    RAISE NOTICE '找到「系統管理員」角色，ID: %', admin_role_id;
  END IF;

  -- 2. 查找 auth.users 中的用戶（根據 email）
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = 'jimmy@your-remit.com' 
  LIMIT 1;

  IF admin_user_id IS NULL THEN
    RAISE NOTICE '錯誤：在 auth.users 中找不到 email = jimmy@your-remit.com 的用戶';
    RAISE NOTICE '請先在 Supabase Dashboard > Authentication > Users 中創建用戶';
    RAISE NOTICE 'Email: jimmy@your-remit.com';
    RAISE NOTICE 'Password: Admin@1234';
    RETURN;
  END IF;

  RAISE NOTICE '找到 Auth 用戶，ID: %', admin_user_id;

  -- 3. 檢查 user_profiles 中是否已有記錄
  SELECT EXISTS(SELECT 1 FROM user_profiles WHERE id = admin_user_id) INTO profile_exists;

  IF profile_exists THEN
    -- 更新現有記錄
    UPDATE user_profiles
    SET
      login_name = 'a000001',
      email = 'jimmy@your-remit.com',
      full_name = COALESCE(full_name, '系統管理員'),
      role_id = admin_role_id,
      department = COALESCE(department, '管理部'),
      is_active = true,
      requires_attendance = false,
      two_factor_enabled = false,
      updated_at = NOW()
    WHERE id = admin_user_id;
    
    RAISE NOTICE '✓ 已更新 user_profiles 記錄';
  ELSE
    -- 創建新記錄
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
      'a000001',
      'jimmy@your-remit.com',
      '系統管理員',
      admin_role_id,
      '管理部',
      true,
      false,
      false
    );
    
    RAISE NOTICE '✓ 已創建 user_profiles 記錄';
  END IF;

  -- 4. 驗證結果
  RAISE NOTICE '';
  RAISE NOTICE '=== 驗證結果 ===';
  RAISE NOTICE '登入名稱: a000001';
  RAISE NOTICE '電子郵件: jimmy@your-remit.com';
  RAISE NOTICE '用戶 ID: %', admin_user_id;
  RAISE NOTICE '角色: 系統管理員';
  RAISE NOTICE '';
  RAISE NOTICE '現在可以使用以下資訊登入：';
  RAISE NOTICE '  登入名稱: a000001';
  RAISE NOTICE '  密碼: Admin@1234';

END $$;

-- 執行後，請執行以下查詢來確認：
SELECT 
  login_name,
  email,
  full_name,
  is_active,
  (SELECT name FROM user_roles WHERE id = user_profiles.role_id) as role_name
FROM user_profiles
WHERE login_name = 'a000001';
