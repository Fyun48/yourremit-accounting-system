-- 檢查用戶帳號狀態
-- 請在 Supabase SQL Editor 中執行此腳本來診斷問題

-- 1. 檢查 user_profiles 表中是否有 a000001 的記錄
SELECT 
  id,
  login_name,
  email,
  full_name,
  is_active,
  role_id,
  created_at
FROM user_profiles
WHERE login_name = 'a000001';

-- 2. 檢查 auth.users 表中是否有對應的 email
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE email = 'jimmy@your-remit.com';

-- 3. 檢查兩個表中的用戶 ID 是否匹配
SELECT 
  up.id as profile_id,
  up.login_name,
  up.email as profile_email,
  up.is_active,
  au.id as auth_user_id,
  au.email as auth_email,
  CASE 
    WHEN up.id = au.id THEN '✓ ID 匹配'
    WHEN au.id IS NULL THEN '✗ Auth 用戶不存在'
    ELSE '✗ ID 不匹配'
  END as status
FROM user_profiles up
LEFT JOIN auth.users au ON up.id = au.id
WHERE up.login_name = 'a000001';

-- 4. 檢查所有用戶的登入名稱和 email
SELECT 
  login_name,
  email,
  full_name,
  is_active,
  CASE 
    WHEN login_name IS NULL THEN '✗ 未設定登入名稱'
    WHEN email IS NULL THEN '✗ 未設定電子郵件'
    WHEN is_active = false THEN '✗ 帳號已停用'
    ELSE '✓ 正常'
  END as status
FROM user_profiles
ORDER BY created_at DESC
LIMIT 10;
