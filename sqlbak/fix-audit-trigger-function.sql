-- 修復審計日誌觸發器函數
-- 解決不同表使用不同欄位名稱的問題
-- 請在 Supabase SQL Editor 中執行此腳本

-- 重新創建記錄操作的函數
CREATE OR REPLACE FUNCTION log_audit_action()
RETURNS TRIGGER AS $$
DECLARE
  current_user_id UUID;
  current_user_name VARCHAR(200);
  record_name_value VARCHAR(500);
BEGIN
  -- 獲取當前用戶（從 JWT token）
  current_user_id := auth.uid();
  
  -- 獲取用戶姓名
  SELECT full_name INTO current_user_name
  FROM user_profiles
  WHERE id = current_user_id;
  
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
    -- 通用處理：使用 ID
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
      record_name_value := NEW.id::text;
    ELSE
      record_name_value := OLD.id::text;
    END IF;
  END IF;
  
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (
      user_id,
      user_name,
      action_type,
      module,
      record_id,
      record_name,
      new_data,
      description
    ) VALUES (
      current_user_id,
      current_user_name,
      'create',
      TG_TABLE_NAME,
      NEW.id,
      record_name_value,
      to_jsonb(NEW),
      '創建新記錄'
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (
      user_id,
      user_name,
      action_type,
      module,
      record_id,
      record_name,
      old_data,
      new_data,
      description
    ) VALUES (
      current_user_id,
      current_user_name,
      'update',
      TG_TABLE_NAME,
      NEW.id,
      record_name_value,
      to_jsonb(OLD),
      to_jsonb(NEW),
      '更新記錄'
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (
      user_id,
      user_name,
      action_type,
      module,
      record_id,
      record_name,
      old_data,
      description
    ) VALUES (
      current_user_id,
      current_user_name,
      'delete',
      TG_TABLE_NAME,
      OLD.id,
      record_name_value,
      to_jsonb(OLD),
      '刪除記錄'
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 驗證函數已更新
SELECT 
  proname AS function_name,
  prosrc AS function_source
FROM pg_proc
WHERE proname = 'log_audit_action';
