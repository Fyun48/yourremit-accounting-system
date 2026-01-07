-- 完整修復審計日誌觸發器函數（使用動態 SQL）
-- 處理所有可能的欄位：action, action_type, table_name, module
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
    UPDATE audit_logs 
    SET table_name = COALESCE(table_name, module, 'unknown')
    WHERE table_name IS NULL;
  END IF;
  
  -- 如果存在 action 欄位且為 NOT NULL，先更新現有 NULL 值
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audit_logs' 
    AND column_name = 'action'
    AND is_nullable = 'NO'
  ) THEN
    UPDATE audit_logs 
    SET action = COALESCE(action, action_type, 'unknown')
    WHERE action IS NULL;
  END IF;
END $$;

-- 步驟 2: 重新創建觸發器函數（使用動態 SQL）
CREATE OR REPLACE FUNCTION log_audit_action()
RETURNS TRIGGER AS $$
DECLARE
  current_user_id UUID;
  current_user_name VARCHAR(200);
  record_name_value VARCHAR(500);
  action_value VARCHAR(50);
  sql_text TEXT;
  column_list TEXT;
  value_list TEXT;
BEGIN
  -- 獲取當前用戶（從 JWT token）
  current_user_id := auth.uid();
  
  -- 獲取用戶姓名
  SELECT full_name INTO current_user_name
  FROM user_profiles
  WHERE id = current_user_id;
  
  -- 根據操作類型設定 action 值
  IF TG_OP = 'INSERT' THEN
    action_value := 'create';
  ELSIF TG_OP = 'UPDATE' THEN
    action_value := 'update';
  ELSIF TG_OP = 'DELETE' THEN
    action_value := 'delete';
  ELSE
    action_value := 'unknown';
  END IF;
  
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
  
  -- 動態構建欄位列表和值列表
  column_list := 'user_id, user_name';
  value_list := quote_literal(current_user_id) || ', ' || quote_literal(current_user_name);
  
  -- 添加 action 欄位（如果存在）
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audit_logs' AND column_name = 'action'
  ) THEN
    column_list := column_list || ', action';
    value_list := value_list || ', ' || quote_literal(action_value);
  END IF;
  
  -- 添加 action_type 欄位（如果存在）
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audit_logs' AND column_name = 'action_type'
  ) THEN
    column_list := column_list || ', action_type';
    value_list := value_list || ', ' || quote_literal(action_value);
  END IF;
  
  -- 添加 module 欄位（如果存在）
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audit_logs' AND column_name = 'module'
  ) THEN
    column_list := column_list || ', module';
    value_list := value_list || ', ' || quote_literal(TG_TABLE_NAME);
  END IF;
  
  -- 添加 table_name 欄位（如果存在）
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audit_logs' AND column_name = 'table_name'
  ) THEN
    column_list := column_list || ', table_name';
    value_list := value_list || ', ' || quote_literal(TG_TABLE_NAME);
  END IF;
  
  -- 根據操作類型構建 SQL（使用參數化查詢處理 JSONB）
  IF TG_OP = 'INSERT' THEN
    column_list := column_list || ', record_id, record_name, new_data, description';
    sql_text := 'INSERT INTO audit_logs (' || column_list || ') VALUES (' || value_list || 
                ', $1, $2, $3, $4)';
    EXECUTE sql_text USING NEW.id, record_name_value, to_jsonb(NEW), '創建新記錄';
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    column_list := column_list || ', record_id, record_name, old_data, new_data, description';
    sql_text := 'INSERT INTO audit_logs (' || column_list || ') VALUES (' || value_list || 
                ', $1, $2, $3, $4, $5)';
    EXECUTE sql_text USING NEW.id, record_name_value, to_jsonb(OLD), to_jsonb(NEW), '更新記錄';
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    column_list := column_list || ', record_id, record_name, old_data, description';
    sql_text := 'INSERT INTO audit_logs (' || column_list || ') VALUES (' || value_list || 
                ', $1, $2, $3, $4)';
    EXECUTE sql_text USING OLD.id, record_name_value, to_jsonb(OLD), '刪除記錄';
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
