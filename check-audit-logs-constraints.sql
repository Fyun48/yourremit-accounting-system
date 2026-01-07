-- 檢查 audit_logs 表的 check constraints
-- 請在 Supabase SQL Editor 中執行此腳本

-- 1. 檢查 action 欄位的 check constraint
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'audit_logs'::regclass
  AND contype = 'c'
  AND conname LIKE '%action%';

-- 2. 檢查 action 欄位的所有約束
SELECT 
  tc.constraint_name,
  tc.constraint_type,
  cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'audit_logs'
  AND tc.constraint_type = 'CHECK'
  AND (tc.constraint_name LIKE '%action%' OR cc.check_clause LIKE '%action%');

-- 3. 檢查 action 欄位的定義
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default,
  character_maximum_length
FROM information_schema.columns
WHERE table_name = 'audit_logs'
  AND column_name IN ('action', 'action_type')
ORDER BY column_name;
