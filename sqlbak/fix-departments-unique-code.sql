-- 修正 departments 表的唯一約束，允許同一公司在不同上級部門下使用相同的部門代碼
-- 說明：
--   目前唯一約束為 UNIQUE(company_id, code)
--   這會導致同一公司內，只要代碼一樣（例如 S），不管是否有上級部門，都會被視為重複
--   但你的需求是：
--     - 同一公司頂層部門（沒有上級部門）代碼不能重複
--     - 如果有選擇上級部門，可以再使用相同的部門代碼（例如：S 底下再建一個 S）
--   因此改為：UNIQUE(company_id, code, COALESCE(parent_department_id, '00000000-0000-0000-0000-000000000000'))
--   這樣：
--     - 頂層部門：parent_department_id 為 NULL，會被當成同一個固定值，比較代碼是否重複
--     - 有上級部門的部門：會連同 parent_department_id 一起判斷，可以重複代碼，只要上級不同
--
-- 使用方式：
--   1. 將本檔內容貼到 Supabase SQL Editor 中執行
--   2. 或在本專案中保留作為版本管理記錄

DO $$
BEGIN
  -- 如果舊的唯一約束存在，先移除
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'departments_company_id_code_key'
      AND conrelid = 'departments'::regclass
  ) THEN
    ALTER TABLE departments DROP CONSTRAINT departments_company_id_code_key;
  END IF;

  -- 如果新的唯一索引尚未建立，則新增（使用索引來實作唯一性，允許表達式）
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'departments'
      AND indexname = 'departments_company_id_code_parent_key'
  ) THEN
    CREATE UNIQUE INDEX departments_company_id_code_parent_key
      ON departments (
        company_id,
        code,
        COALESCE(parent_department_id, '00000000-0000-0000-0000-000000000000'::uuid)
      );
  END IF;
END $$;

-- 驗證目前的唯一約束 / 索引
SELECT
  i.indexname,
  i.indexdef
FROM pg_indexes i
WHERE i.tablename = 'departments';

