-- 修復 user_profiles 表的 RLS 政策
-- 確保登入時可以查詢 user_profiles 表
-- 請在 Supabase SQL Editor 中執行此腳本

-- 刪除現有的可能衝突的政策
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Authenticated users can view all profiles for login" ON user_profiles;
DROP POLICY IF EXISTS "Allow login name lookup for authentication" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;

-- 創建新的政策：允許未認證用戶根據 login_name 查詢（用於登入）
-- 這是關鍵：允許 anon（未認證）用戶查詢，這樣登入功能才能工作
CREATE POLICY "Allow login name lookup for authentication" ON user_profiles
  FOR SELECT
  TO anon, authenticated
  USING (
    -- 允許根據 login_name 查詢（用於登入功能）
    login_name IS NOT NULL
  );

-- 允許已認證用戶查看自己的資料
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- 允許已認證用戶更新自己的資料
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- 允許系統管理員查看所有用戶資料
CREATE POLICY "Admins can view all profiles" ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN user_roles ur ON up.role_id = ur.id
      WHERE up.id = auth.uid()
      AND ur.name = '系統管理員'
    )
  );

-- 驗證政策
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY policyname;
