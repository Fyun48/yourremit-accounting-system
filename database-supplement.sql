-- 資料庫補充腳本 - 補充必要的會計科目
-- 請在 Supabase SQL Editor 中執行此腳本（在執行 database-extensions.sql 之後）

-- ============================================
-- 補充會計科目（銷項稅額等）
-- ============================================

-- 插入銷項稅額科目（營業稅負債）
INSERT INTO chart_of_accounts (code, name, name_en, account_type, level, parent_id) 
SELECT 
  '2199',
  '銷項稅額',
  'Output VAT',
  '負債',
  2,
  (SELECT id FROM chart_of_accounts WHERE code = '2000' LIMIT 1)
WHERE NOT EXISTS (
  SELECT 1 FROM chart_of_accounts WHERE code = '2199'
);

-- 如果 2000 負債科目不存在，先創建
INSERT INTO chart_of_accounts (code, name, name_en, account_type, level) 
VALUES ('2000', '負債', 'Liabilities', '負債', 1)
ON CONFLICT (code) DO NOTHING;

-- 再次嘗試插入銷項稅額（確保有父科目）
INSERT INTO chart_of_accounts (code, name, name_en, account_type, level, parent_id) 
SELECT 
  '2199',
  '銷項稅額',
  'Output VAT',
  '負債',
  2,
  (SELECT id FROM chart_of_accounts WHERE code = '2000' LIMIT 1)
WHERE NOT EXISTS (
  SELECT 1 FROM chart_of_accounts WHERE code = '2199'
);

-- 插入進項稅額科目（營業稅資產）
INSERT INTO chart_of_accounts (code, name, name_en, account_type, level, parent_id) 
SELECT 
  '1299',
  '進項稅額',
  'Input VAT',
  '資產',
  2,
  (SELECT id FROM chart_of_accounts WHERE code = '1000' LIMIT 1)
WHERE NOT EXISTS (
  SELECT 1 FROM chart_of_accounts WHERE code = '1299'
);

-- 如果 1000 資產科目不存在，先創建
INSERT INTO chart_of_accounts (code, name, name_en, account_type, level) 
VALUES ('1000', '資產', 'Assets', '資產', 1)
ON CONFLICT (code) DO NOTHING;

-- 再次嘗試插入進項稅額（確保有父科目）
INSERT INTO chart_of_accounts (code, name, name_en, account_type, level, parent_id) 
SELECT 
  '1299',
  '進項稅額',
  'Input VAT',
  '資產',
  2,
  (SELECT id FROM chart_of_accounts WHERE code = '1000' LIMIT 1)
WHERE NOT EXISTS (
  SELECT 1 FROM chart_of_accounts WHERE code = '1299'
);

-- 驗證科目是否已正確插入
SELECT code, name, account_type 
FROM chart_of_accounts 
WHERE code IN ('2199', '1299', '1121', '2001', '4101')
ORDER BY code;

