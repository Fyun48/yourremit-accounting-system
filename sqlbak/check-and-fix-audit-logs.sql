-- 檢查並修復 audit_logs 表結構
-- 請在 Supabase SQL Editor 中執行此腳本

-- 1. 檢查表結構
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'audit_logs'
ORDER BY ordinal_position;

-- 2. 如果存在 table_name 欄位且為 NOT NULL，處理它
DO $$
BEGIN
  -- 如果存在 table_name 欄位
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audit_logs' 
    AND column_name = 'table_name'
  ) THEN
    -- 更新現有的 NULL 值（如果有的話）
    UPDATE audit_logs 
    SET table_name = COALESCE(table_name, module, TG_TABLE_NAME)
    WHERE table_name IS NULL;
    
    RAISE NOTICE 'table_name 欄位已存在，將在觸發器中提供值';
  ELSE
    RAISE NOTICE 'table_name 欄位不存在，使用 module 欄位';
  END IF;
END $$;

-- 3. 重新創建觸發器函數（簡化版本，總是提供 table_name 如果欄位存在）
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
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
      record_name_value := NEW.id::text;
    ELSE
      record_name_value := OLD.id::text;
    END IF;
  END IF;
  
  -- 使用動態 SQL 來處理可能存在或不存在的 table_name 欄位
  IF TG_OP = 'INSERT' THEN
    EXECUTE format('
      INSERT INTO audit_logs (
        user_id,
        user_name,
        action_type,
        module,
        %s
        record_id,
        record_name,
        new_data,
        description
      ) VALUES ($1, $2, $3, $4, %s $5, $6, $7, $8)',
      CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'audit_logs' AND column_name = 'table_name'
      ) THEN 'table_name,' ELSE '' END,
      CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'audit_logs' AND column_name = 'table_name'
      ) THEN '$4,' ELSE '' END
    ) USING 
      current_user_id,
      current_user_name,
      'create',
      TG_TABLE_NAME,
      NEW.id,
      record_name_value,
      to_jsonb(NEW),
      '創建新記錄';
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- 簡化：直接插入，讓 PostgreSQL 處理不存在的欄位
    -- 但這不會工作，因為我們需要動態構建 INSERT
    -- 更好的方法是：檢查並使用條件插入
    
    -- 先嘗試標準插入（不包含 table_name）
    BEGIN
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
    EXCEPTION WHEN OTHERS THEN
      -- 如果失敗，可能是因為 table_name 欄位存在且為 NOT NULL
      -- 嘗試包含 table_name
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
    END;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    BEGIN
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
    EXCEPTION WHEN OTHERS THEN
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
    END;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
