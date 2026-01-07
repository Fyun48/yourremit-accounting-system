-- 修復 audit_logs action 欄位的 check constraint 問題
-- 請在 Supabase SQL Editor 中執行此腳本

-- 步驟 1: 檢查並查看 check constraint
DO $$
DECLARE
  constraint_def TEXT;
BEGIN
  -- 獲取 action 欄位的 check constraint 定義
  SELECT pg_get_constraintdef(oid) INTO constraint_def
  FROM pg_constraint
  WHERE conrelid = 'audit_logs'::regclass
    AND contype = 'c'
    AND conname LIKE '%action%'
  LIMIT 1;
  
  IF constraint_def IS NOT NULL THEN
    RAISE NOTICE '找到 check constraint: %', constraint_def;
  ELSE
    RAISE NOTICE '未找到 action 相關的 check constraint';
  END IF;
END $$;

-- 步驟 2: 檢查 action 欄位允許的值
-- 通常 check constraint 可能要求值為 'INSERT', 'UPDATE', 'DELETE' 而不是 'create', 'update', 'delete'
-- 或者可能是其他格式

-- 步驟 3: 重新創建觸發器函數，使用可能符合 check constraint 的值
CREATE OR REPLACE FUNCTION log_audit_action()
RETURNS TRIGGER AS $$
DECLARE
  current_user_id UUID;
  current_user_name VARCHAR(200);
  record_name_value VARCHAR(500);
  action_value VARCHAR(50);
  has_action BOOLEAN;
  has_action_type BOOLEAN;
  has_table_name BOOLEAN;
  has_module BOOLEAN;
BEGIN
  -- 獲取當前用戶（從 JWT token）
  current_user_id := auth.uid();
  
  -- 獲取用戶姓名
  SELECT full_name INTO current_user_name
  FROM user_profiles
  WHERE id = current_user_id;
  
  -- 檢查欄位是否存在
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audit_logs' AND column_name = 'action'
  ) INTO has_action;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audit_logs' AND column_name = 'action_type'
  ) INTO has_action_type;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audit_logs' AND column_name = 'table_name'
  ) INTO has_table_name;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audit_logs' AND column_name = 'module'
  ) INTO has_module;
  
  -- 根據操作類型設定 action 值
  -- 嘗試使用大寫格式（可能 check constraint 要求大寫）
  IF TG_OP = 'INSERT' THEN
    action_value := 'INSERT';  -- 使用大寫
  ELSIF TG_OP = 'UPDATE' THEN
    action_value := 'UPDATE';  -- 使用大寫
  ELSIF TG_OP = 'DELETE' THEN
    action_value := 'DELETE';  -- 使用大寫
  ELSE
    action_value := 'UNKNOWN';
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
  
  -- 根據操作類型和欄位存在情況來插入記錄
  IF TG_OP = 'INSERT' THEN
    IF has_action AND has_action_type AND has_table_name AND has_module THEN
      INSERT INTO audit_logs (user_id, user_name, action, action_type, module, table_name, record_id, record_name, new_data, description)
      VALUES (current_user_id, current_user_name, action_value, LOWER(action_value), TG_TABLE_NAME, TG_TABLE_NAME, NEW.id, record_name_value, to_jsonb(NEW), '創建新記錄');
    ELSIF has_action AND has_table_name AND has_module THEN
      INSERT INTO audit_logs (user_id, user_name, action, module, table_name, record_id, record_name, new_data, description)
      VALUES (current_user_id, current_user_name, action_value, TG_TABLE_NAME, TG_TABLE_NAME, NEW.id, record_name_value, to_jsonb(NEW), '創建新記錄');
    ELSIF has_action AND has_action_type AND has_module THEN
      INSERT INTO audit_logs (user_id, user_name, action, action_type, module, record_id, record_name, new_data, description)
      VALUES (current_user_id, current_user_name, action_value, LOWER(action_value), TG_TABLE_NAME, NEW.id, record_name_value, to_jsonb(NEW), '創建新記錄');
    ELSIF has_action AND has_module THEN
      INSERT INTO audit_logs (user_id, user_name, action, module, record_id, record_name, new_data, description)
      VALUES (current_user_id, current_user_name, action_value, TG_TABLE_NAME, NEW.id, record_name_value, to_jsonb(NEW), '創建新記錄');
    ELSIF has_action_type AND has_table_name AND has_module THEN
      INSERT INTO audit_logs (user_id, user_name, action_type, module, table_name, record_id, record_name, new_data, description)
      VALUES (current_user_id, current_user_name, LOWER(action_value), TG_TABLE_NAME, TG_TABLE_NAME, NEW.id, record_name_value, to_jsonb(NEW), '創建新記錄');
    ELSIF has_action_type AND has_module THEN
      INSERT INTO audit_logs (user_id, user_name, action_type, module, record_id, record_name, new_data, description)
      VALUES (current_user_id, current_user_name, LOWER(action_value), TG_TABLE_NAME, NEW.id, record_name_value, to_jsonb(NEW), '創建新記錄');
    ELSIF has_module THEN
      INSERT INTO audit_logs (user_id, user_name, module, record_id, record_name, new_data, description)
      VALUES (current_user_id, current_user_name, TG_TABLE_NAME, NEW.id, record_name_value, to_jsonb(NEW), '創建新記錄');
    ELSE
      INSERT INTO audit_logs (user_id, user_name, record_id, record_name, new_data, description)
      VALUES (current_user_id, current_user_name, NEW.id, record_name_value, to_jsonb(NEW), '創建新記錄');
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF has_action AND has_action_type AND has_table_name AND has_module THEN
      INSERT INTO audit_logs (user_id, user_name, action, action_type, module, table_name, record_id, record_name, old_data, new_data, description)
      VALUES (current_user_id, current_user_name, action_value, LOWER(action_value), TG_TABLE_NAME, TG_TABLE_NAME, NEW.id, record_name_value, to_jsonb(OLD), to_jsonb(NEW), '更新記錄');
    ELSIF has_action AND has_table_name AND has_module THEN
      INSERT INTO audit_logs (user_id, user_name, action, module, table_name, record_id, record_name, old_data, new_data, description)
      VALUES (current_user_id, current_user_name, action_value, TG_TABLE_NAME, TG_TABLE_NAME, NEW.id, record_name_value, to_jsonb(OLD), to_jsonb(NEW), '更新記錄');
    ELSIF has_action AND has_action_type AND has_module THEN
      INSERT INTO audit_logs (user_id, user_name, action, action_type, module, record_id, record_name, old_data, new_data, description)
      VALUES (current_user_id, current_user_name, action_value, LOWER(action_value), TG_TABLE_NAME, NEW.id, record_name_value, to_jsonb(OLD), to_jsonb(NEW), '更新記錄');
    ELSIF has_action AND has_module THEN
      INSERT INTO audit_logs (user_id, user_name, action, module, record_id, record_name, old_data, new_data, description)
      VALUES (current_user_id, current_user_name, action_value, TG_TABLE_NAME, NEW.id, record_name_value, to_jsonb(OLD), to_jsonb(NEW), '更新記錄');
    ELSIF has_action_type AND has_table_name AND has_module THEN
      INSERT INTO audit_logs (user_id, user_name, action_type, module, table_name, record_id, record_name, old_data, new_data, description)
      VALUES (current_user_id, current_user_name, LOWER(action_value), TG_TABLE_NAME, TG_TABLE_NAME, NEW.id, record_name_value, to_jsonb(OLD), to_jsonb(NEW), '更新記錄');
    ELSIF has_action_type AND has_module THEN
      INSERT INTO audit_logs (user_id, user_name, action_type, module, record_id, record_name, old_data, new_data, description)
      VALUES (current_user_id, current_user_name, LOWER(action_value), TG_TABLE_NAME, NEW.id, record_name_value, to_jsonb(OLD), to_jsonb(NEW), '更新記錄');
    ELSIF has_module THEN
      INSERT INTO audit_logs (user_id, user_name, module, record_id, record_name, old_data, new_data, description)
      VALUES (current_user_id, current_user_name, TG_TABLE_NAME, NEW.id, record_name_value, to_jsonb(OLD), to_jsonb(NEW), '更新記錄');
    ELSE
      INSERT INTO audit_logs (user_id, user_name, record_id, record_name, old_data, new_data, description)
      VALUES (current_user_id, current_user_name, NEW.id, record_name_value, to_jsonb(OLD), to_jsonb(NEW), '更新記錄');
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF has_action AND has_action_type AND has_table_name AND has_module THEN
      INSERT INTO audit_logs (user_id, user_name, action, action_type, module, table_name, record_id, record_name, old_data, description)
      VALUES (current_user_id, current_user_name, action_value, LOWER(action_value), TG_TABLE_NAME, TG_TABLE_NAME, OLD.id, record_name_value, to_jsonb(OLD), '刪除記錄');
    ELSIF has_action AND has_table_name AND has_module THEN
      INSERT INTO audit_logs (user_id, user_name, action, module, table_name, record_id, record_name, old_data, description)
      VALUES (current_user_id, current_user_name, action_value, TG_TABLE_NAME, TG_TABLE_NAME, OLD.id, record_name_value, to_jsonb(OLD), '刪除記錄');
    ELSIF has_action AND has_action_type AND has_module THEN
      INSERT INTO audit_logs (user_id, user_name, action, action_type, module, record_id, record_name, old_data, description)
      VALUES (current_user_id, current_user_name, action_value, LOWER(action_value), TG_TABLE_NAME, OLD.id, record_name_value, to_jsonb(OLD), '刪除記錄');
    ELSIF has_action AND has_module THEN
      INSERT INTO audit_logs (user_id, user_name, action, module, record_id, record_name, old_data, description)
      VALUES (current_user_id, current_user_name, action_value, TG_TABLE_NAME, OLD.id, record_name_value, to_jsonb(OLD), '刪除記錄');
    ELSIF has_action_type AND has_table_name AND has_module THEN
      INSERT INTO audit_logs (user_id, user_name, action_type, module, table_name, record_id, record_name, old_data, description)
      VALUES (current_user_id, current_user_name, LOWER(action_value), TG_TABLE_NAME, TG_TABLE_NAME, OLD.id, record_name_value, to_jsonb(OLD), '刪除記錄');
    ELSIF has_action_type AND has_module THEN
      INSERT INTO audit_logs (user_id, user_name, action_type, module, record_id, record_name, old_data, description)
      VALUES (current_user_id, current_user_name, LOWER(action_value), TG_TABLE_NAME, OLD.id, record_name_value, to_jsonb(OLD), '刪除記錄');
    ELSIF has_module THEN
      INSERT INTO audit_logs (user_id, user_name, module, record_id, record_name, old_data, description)
      VALUES (current_user_id, current_user_name, TG_TABLE_NAME, OLD.id, record_name_value, to_jsonb(OLD), '刪除記錄');
    ELSE
      INSERT INTO audit_logs (user_id, user_name, record_id, record_name, old_data, description)
      VALUES (current_user_id, current_user_name, OLD.id, record_name_value, to_jsonb(OLD), '刪除記錄');
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
