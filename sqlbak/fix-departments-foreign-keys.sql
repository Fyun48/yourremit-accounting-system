-- 修復部門和組織圖表的外鍵關聯
-- 將 manager_id 和 employee_id 從 auth.users 改為 user_profiles
-- 請在 Supabase SQL Editor 中執行此腳本

-- ============================================
-- 1. 修改 departments 表
-- ============================================

-- 刪除舊的外鍵約束（如果存在）
ALTER TABLE departments 
  DROP CONSTRAINT IF EXISTS departments_manager_id_fkey;

-- 添加新的外鍵約束，引用 user_profiles 而不是 auth.users
ALTER TABLE departments 
  ADD CONSTRAINT departments_manager_id_fkey 
  FOREIGN KEY (manager_id) 
  REFERENCES user_profiles(id) 
  ON DELETE SET NULL;

-- ============================================
-- 2. 修改 organization_positions 表
-- ============================================

-- 刪除舊的外鍵約束（如果存在）
ALTER TABLE organization_positions 
  DROP CONSTRAINT IF EXISTS organization_positions_employee_id_fkey;

-- 添加新的外鍵約束，引用 user_profiles 而不是 auth.users
ALTER TABLE organization_positions 
  ADD CONSTRAINT organization_positions_employee_id_fkey 
  FOREIGN KEY (employee_id) 
  REFERENCES user_profiles(id) 
  ON DELETE SET NULL;

-- ============================================
-- 驗證
-- ============================================

SELECT 
  tc.table_name, 
  tc.constraint_name, 
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name IN ('departments', 'organization_positions')
  AND tc.constraint_type = 'FOREIGN KEY'
  AND (kcu.column_name IN ('manager_id', 'employee_id') OR ccu.table_name = 'user_profiles')
ORDER BY tc.table_name, kcu.column_name;
