-- 更新 user_profiles 表，添加部門、職位和離職狀態欄位
-- 請在 Supabase SQL Editor 中執行此腳本

-- 添加部門ID欄位
ALTER TABLE user_profiles 
  ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL;

-- 添加職位ID欄位
ALTER TABLE user_profiles 
  ADD COLUMN IF NOT EXISTS position_id UUID REFERENCES organization_positions(id) ON DELETE SET NULL;

-- 添加離職狀態欄位
ALTER TABLE user_profiles 
  ADD COLUMN IF NOT EXISTS is_resigned BOOLEAN DEFAULT false;

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_user_profiles_department ON user_profiles(department_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_position ON user_profiles(position_id);

-- 驗證
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_profiles'
  AND column_name IN ('department_id', 'position_id', 'is_resigned')
ORDER BY column_name;
