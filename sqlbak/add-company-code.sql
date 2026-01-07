-- 為公司表添加數字代號欄位
-- 請在 Supabase SQL Editor 中執行此腳本

-- 添加公司數字代號欄位
ALTER TABLE companies 
  ADD COLUMN IF NOT EXISTS numeric_code VARCHAR(2) UNIQUE; -- 2位數字代號（例如：01, 02）

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_companies_numeric_code ON companies(numeric_code);

-- 為現有公司設置默認代號（如果沒有）
-- 注意：這只是示例，實際應該手動設置
DO $$
DECLARE
  company_record RECORD;
  counter INTEGER := 1;
BEGIN
  FOR company_record IN 
    SELECT id FROM companies WHERE numeric_code IS NULL ORDER BY created_at
  LOOP
    UPDATE companies 
    SET numeric_code = LPAD(counter::TEXT, 2, '0')
    WHERE id = company_record.id;
    counter := counter + 1;
  END LOOP;
END $$;

-- 驗證
SELECT id, code, name, numeric_code 
FROM companies 
ORDER BY numeric_code;
