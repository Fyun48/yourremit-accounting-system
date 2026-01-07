-- 檢查 audit_logs 表的實際結構
-- 請在 Supabase SQL Editor 中執行此腳本

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default,
  character_maximum_length
FROM information_schema.columns
WHERE table_name = 'audit_logs'
ORDER BY ordinal_position;
