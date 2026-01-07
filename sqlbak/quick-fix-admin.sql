-- 快速修復管理員帳號
-- 請在 Supabase SQL Editor 中執行此腳本
-- 
-- 此腳本會自動查找 auth.users 中的用戶，並創建/更新 user_profiles 記錄

DO $$
DECLARE
  admin_user_id UUID;
  admin_role_id UUID;
  user_email TEXT := 'jimmy@your-remit.com';  -- 請確認這是您在 Auth 中創建的 email
BEGIN
  -- 1. 獲取管理員角色
  SELECT id INTO admin_role_id FROM user_roles WHERE name = '系統管理員' LIMIT 1;
  
  IF admin_role_id IS NULL THEN
    INSERT INTO user_roles (name, description, permissions) 
    VALUES ('系統管理員', '擁有所有系統權限', '{"all": true}')
    RETURNING id INTO admin_role_id;
  END IF;

  -- 2. 查找 auth.users 中的用戶
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = user_email
  LIMIT 1;

  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION '錯誤：在 auth.users 中找不到 email = % 的用戶。請先在 Supabase Dashboard > Authentication > Users 中創建用戶，email: %, password: Admin@1234', user_email, user_email;
  END IF;

  -- 3. 創建或更新 user_profiles 記錄
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
    user_email,
    '系統管理員',
    admin_role_id,
    '管理部',
    true,
    false,
    false
  )
  ON CONFLICT (id) 
  DO UPDATE SET
    login_name = 'a000001',
    email = user_email,
    full_name = COALESCE(user_profiles.full_name, '系統管理員'),
    role_id = admin_role_id,
    department = COALESCE(user_profiles.department, '管理部'),
    is_active = true,
    requires_attendance = false,
    two_factor_enabled = false,
    updated_at = NOW();

  RAISE NOTICE '✓ 成功！管理員帳號已創建/更新';
  RAISE NOTICE '  登入名稱: a000001';
  RAISE NOTICE '  電子郵件: %', user_email;
  RAISE NOTICE '  用戶 ID: %', admin_user_id;
  RAISE NOTICE '';
  RAISE NOTICE '現在可以使用以下資訊登入：';
  RAISE NOTICE '  登入名稱: a000001';
  RAISE NOTICE '  密碼: Admin@1234';

END $$;

-- 驗證結果
SELECT 
  '驗證結果' as info,
  login_name,
  email,
  full_name,
  is_active,
  (SELECT name FROM user_roles WHERE id = user_profiles.role_id) as role_name,
  CASE 
    WHEN login_name IS NOT NULL AND email IS NOT NULL AND is_active = true THEN '✓ 帳號正常'
    WHEN login_name IS NULL THEN '✗ 未設定登入名稱'
    WHEN email IS NULL THEN '✗ 未設定電子郵件'
    WHEN is_active = false THEN '✗ 帳號已停用'
    ELSE '✗ 狀態異常'
  END as status
FROM user_profiles
WHERE login_name = 'a000001' OR email = 'jimmy@your-remit.com';
