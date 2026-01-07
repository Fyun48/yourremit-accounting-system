-- 檢查系統管理員帳號資訊
-- 請在 Supabase SQL Editor 中執行此腳本

-- 1. 查詢所有管理員角色的用戶
SELECT 
  up.id,
  up.login_name as "登入名稱",
  up.email as "電子郵件",
  up.full_name as "姓名",
  up.employee_id as "員工編號",
  ur.name as "角色名稱",
  up.is_active as "是否啟用",
  up.is_resigned as "是否離職",
  up.created_at as "建立時間",
  up.updated_at as "更新時間"
FROM user_profiles up
LEFT JOIN user_roles ur ON up.role_id = ur.id
WHERE ur.name = '系統管理員' OR up.login_name = 'a000001'
ORDER BY up.created_at DESC;

-- 2. 檢查 Auth 用戶資訊（email 和建立時間）
SELECT 
  au.id,
  au.email,
  au.created_at as "建立時間",
  au.last_sign_in_at as "最後登入時間",
  au.email_confirmed_at as "Email確認時間"
FROM auth.users au
WHERE au.email = 'jimmy@your-remit.com' OR au.email LIKE '%admin%'
ORDER BY au.created_at DESC;

-- 3. 檢查登入名稱格式（根據新的命名規則：8位元）
SELECT 
  login_name as "登入名稱",
  email as "電子郵件",
  full_name as "姓名",
  employee_id as "員工編號",
  CASE 
    WHEN login_name IS NULL THEN '✗ 未設定登入名稱'
    WHEN LENGTH(login_name) != 8 THEN CONCAT('✗ 登入名稱長度錯誤（目前：', LENGTH(login_name), '位，應為8位）')
    WHEN login_name !~ '^[A-Z]{3}[0-9]{2}[0-9]{3}$' THEN '✗ 登入名稱格式不符合規則（應為：3位部門代碼 + 2位公司代號 + 3位員工編號）'
    ELSE '✓ 登入名稱格式正確'
  END as "格式檢查",
  is_active as "是否啟用"
FROM user_profiles
WHERE role_id IN (SELECT id FROM user_roles WHERE name = '系統管理員')
   OR login_name = 'a000001'
   OR email = 'jimmy@your-remit.com';

-- 4. 總結：顯示管理員登入資訊
SELECT 
  '=== 管理員帳號資訊 ===' as info,
  '' as " "
UNION ALL
SELECT 
  CONCAT('登入名稱: ', COALESCE(up.login_name, '未設定')) as info,
  CONCAT('電子郵件: ', COALESCE(up.email, '未設定')) as " "
FROM user_profiles up
LEFT JOIN user_roles ur ON up.role_id = ur.id
WHERE (ur.name = '系統管理員' OR up.login_name = 'a000001' OR up.email = 'jimmy@your-remit.com')
LIMIT 1;

-- 注意：密碼無法直接查詢（儲存在 Supabase Auth 中，已加密）
-- 預設密碼通常是：Admin@1234
-- 如需重置密碼，請在 Supabase Dashboard > Authentication > Users 中操作
