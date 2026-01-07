-- 檢查 companies 表結構
-- 確認 numeric_code 欄位是否存在
-- 請在 Supabase SQL Editor 中執行此腳本

-- 1. 檢查欄位是否存在
SELECT 
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'companies'
  AND column_name = 'numeric_code';

-- 2. 如果欄位不存在，顯示提示
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'companies' 
    AND column_name = 'numeric_code'
  ) THEN
    RAISE NOTICE '警告：numeric_code 欄位不存在！請執行 add-company-code.sql 腳本。';
  ELSE
    RAISE NOTICE '成功：numeric_code 欄位已存在。';
  END IF;
END $$;

-- 3. 檢查 RLS 政策
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'companies'
ORDER BY policyname;

-- 4. 檢查外鍵約束
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.table_name = 'companies'
  AND tc.constraint_type = 'FOREIGN KEY';
