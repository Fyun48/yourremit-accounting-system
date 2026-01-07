-- 修復 audit_logs 表結構問題
-- 檢查並處理 table_name 欄位
-- 請在 Supabase SQL Editor 中執行此腳本

DO $$
BEGIN
  -- 檢查是否存在 table_name 欄位
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audit_logs' 
    AND column_name = 'table_name'
  ) THEN
    -- 如果存在 table_name 欄位，檢查是否為 NOT NULL
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'audit_logs' 
      AND column_name = 'table_name'
      AND is_nullable = 'NO'
    ) THEN
      -- 將 table_name 改為可為 NULL，或添加默認值
      -- 先更新現有 NULL 值
      UPDATE audit_logs 
      SET table_name = COALESCE(table_name, module, 'unknown')
      WHERE table_name IS NULL;
      
      -- 將欄位改為可為 NULL（如果需要的話）
      -- 或者保持 NOT NULL 但確保觸發器提供值
      -- 這裡我們選擇保持 NOT NULL，但確保觸發器會提供值
    END IF;
  END IF;
  
  -- 如果不存在 table_name 欄位，但需要與 module 同步
  -- 這裡我們不添加 table_name，因為我們使用 module 欄位
END $$;

-- 重新創建觸發器函數，確保處理 table_name 欄位（如果存在）
CREATE OR REPLACE FUNCTION log_audit_action()
RETURNS TRIGGER AS $$
DECLARE
  current_user_id UUID;
  current_user_name VARCHAR(200);
  record_name_value VARCHAR(500);
  has_table_name_column BOOLEAN;
BEGIN
  -- 獲取當前用戶（從 JWT token）
  current_user_id := auth.uid();
  
  -- 獲取用戶姓名
  SELECT full_name INTO current_user_name
  FROM user_profiles
  WHERE id = current_user_id;
  
  -- 檢查是否存在 table_name 欄位
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audit_logs' 
    AND column_name = 'table_name'
  ) INTO has_table_name_column;
  
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
    -- 根據是否存在 table_name 欄位來決定插入語句
    IF has_table_name_column THEN
      INSERT INTO audit_logs (
        user_id,
        user_name,
        action_type,
        module,
        table_name,
        record_id,
        record_name,
        new_data,
        description
      ) VALUES (
        current_user_id,
        current_user_name,
        'create',
        TG_TABLE_NAME,
        TG_TABLE_NAME,
        NEW.id,
        record_name_value,
        to_jsonb(NEW),
        '創建新記錄'
      );
    ELSE
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
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF has_table_name_column THEN
      INSERT INTO audit_logs (
        user_id,
        user_name,
        action_type,
        module,
        table_name,
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
        TG_TABLE_NAME,
        NEW.id,
        record_name_value,
        to_jsonb(OLD),
        to_jsonb(NEW),
        '更新記錄'
      );
    ELSE
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
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF has_table_name_column THEN
      INSERT INTO audit_logs (
        user_id,
        user_name,
        action_type,
        module,
        table_name,
        record_id,
        record_name,
        old_data,
        description
      ) VALUES (
        current_user_id,
        current_user_name,
        'delete',
        TG_TABLE_NAME,
        TG_TABLE_NAME,
        OLD.id,
        record_name_value,
        to_jsonb(OLD),
        '刪除記錄'
      );
    ELSE
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
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 驗證函數已更新
SELECT 
  proname AS function_name,
  pg_get_functiondef(oid) AS function_definition
FROM pg_proc
WHERE proname = 'log_audit_action';
