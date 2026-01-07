-- 修復審計日誌觸發器函數（簡單版本）
-- 處理 table_name 欄位問題
-- 請在 Supabase SQL Editor 中執行此腳本

-- 步驟 1: 檢查並修復表結構
DO $$
BEGIN
  -- 如果存在 table_name 欄位且為 NOT NULL，先更新現有 NULL 值
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audit_logs' 
    AND column_name = 'table_name'
    AND is_nullable = 'NO'
  ) THEN
    -- 更新現有的 NULL 值
    UPDATE audit_logs 
    SET table_name = COALESCE(table_name, module, 'unknown')
    WHERE table_name IS NULL;
    
    RAISE NOTICE '已更新 audit_logs 表中的 NULL table_name 值';
  END IF;
END $$;

-- 步驟 2: 重新創建觸發器函數
-- 這個版本會檢查 table_name 欄位是否存在，如果存在就提供值
CREATE OR REPLACE FUNCTION log_audit_action()
RETURNS TRIGGER AS $$
DECLARE
  current_user_id UUID;
  current_user_name VARCHAR(200);
  record_name_value VARCHAR(500);
  table_name_exists BOOLEAN;
BEGIN
  -- 獲取當前用戶（從 JWT token）
  current_user_id := auth.uid();
  
  -- 獲取用戶姓名
  SELECT full_name INTO current_user_name
  FROM user_profiles
  WHERE id = current_user_id;
  
  -- 檢查 table_name 欄位是否存在（緩存結果）
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audit_logs' 
    AND column_name = 'table_name'
  ) INTO table_name_exists;
  
  -- 根據表名獲取記錄名稱
  IF TG_TABLE_NAME = 'user_profiles' THEN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
      record_name_value := COALESCE(NEW.full_name, NEW.login_name, NEW.employee_id, NEW.id::text);
    ELSE
      record_name_value := COALESCE(OLD.full_name, OLD.login_name, OLD.employee_id, OLD.id::text);
    END IF;
  ELSIF TG_TABLE_NAME = 'companies' THEN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
      record_name_value := COALESCE(NEW.name, NEW.code, NEW.id::text);
    ELSE
      record_name_value := COALESCE(OLD.name, OLD.code, OLD.id::text);
    END IF;
  ELSIF TG_TABLE_NAME = 'departments' THEN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
      record_name_value := COALESCE(NEW.name, NEW.code, NEW.id::text);
    ELSE
      record_name_value := COALESCE(OLD.name, OLD.code, OLD.id::text);
    END IF;
  ELSIF TG_TABLE_NAME = 'organization_positions' THEN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
      record_name_value := COALESCE(NEW.position_name, NEW.position_code, NEW.id::text);
    ELSE
      record_name_value := COALESCE(OLD.position_name, OLD.position_code, OLD.id::text);
    END IF;
  ELSE
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
      record_name_value := NEW.id::text;
    ELSE
      record_name_value := OLD.id::text;
    END IF;
  END IF;
  
  -- 根據操作類型和 table_name 欄位是否存在來插入記錄
  IF TG_OP = 'INSERT' THEN
    IF table_name_exists THEN
      INSERT INTO audit_logs (
        user_id, user_name, action_type, module, table_name,
        record_id, record_name, new_data, description
      ) VALUES (
        current_user_id, current_user_name, 'create', TG_TABLE_NAME, TG_TABLE_NAME,
        NEW.id, record_name_value, to_jsonb(NEW), '創建新記錄'
      );
    ELSE
      INSERT INTO audit_logs (
        user_id, user_name, action_type, module,
        record_id, record_name, new_data, description
      ) VALUES (
        current_user_id, current_user_name, 'create', TG_TABLE_NAME,
        NEW.id, record_name_value, to_jsonb(NEW), '創建新記錄'
      );
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF table_name_exists THEN
      INSERT INTO audit_logs (
        user_id, user_name, action_type, module, table_name,
        record_id, record_name, old_data, new_data, description
      ) VALUES (
        current_user_id, current_user_name, 'update', TG_TABLE_NAME, TG_TABLE_NAME,
        NEW.id, record_name_value, to_jsonb(OLD), to_jsonb(NEW), '更新記錄'
      );
    ELSE
      INSERT INTO audit_logs (
        user_id, user_name, action_type, module,
        record_id, record_name, old_data, new_data, description
      ) VALUES (
        current_user_id, current_user_name, 'update', TG_TABLE_NAME,
        NEW.id, record_name_value, to_jsonb(OLD), to_jsonb(NEW), '更新記錄'
      );
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF table_name_exists THEN
      INSERT INTO audit_logs (
        user_id, user_name, action_type, module, table_name,
        record_id, record_name, old_data, description
      ) VALUES (
        current_user_id, current_user_name, 'delete', TG_TABLE_NAME, TG_TABLE_NAME,
        OLD.id, record_name_value, to_jsonb(OLD), '刪除記錄'
      );
    ELSE
      INSERT INTO audit_logs (
        user_id, user_name, action_type, module,
        record_id, record_name, old_data, description
      ) VALUES (
        current_user_id, current_user_name, 'delete', TG_TABLE_NAME,
        OLD.id, record_name_value, to_jsonb(OLD), '刪除記錄'
      );
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 驗證函數已更新
SELECT 
  proname AS function_name,
  'Function updated successfully' AS status
FROM pg_proc
WHERE proname = 'log_audit_action';
