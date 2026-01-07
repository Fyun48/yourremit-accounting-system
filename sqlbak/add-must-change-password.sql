-- 添加 must_change_password 欄位到 user_profiles 表
-- 用於追蹤用戶是否需要強制修改密碼

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;

-- 為現有用戶設定預設值
UPDATE user_profiles
SET must_change_password = false
WHERE must_change_password IS NULL;

-- 添加註釋
COMMENT ON COLUMN user_profiles.must_change_password IS '是否需要強制修改密碼（首次登入或管理員重置密碼後）';
