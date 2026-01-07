-- 操作記錄追蹤功能
-- 請在 Supabase SQL Editor 中執行此腳本

-- ============================================
-- 1. 操作記錄表
-- ============================================

-- 如果表已存在但結構不同，先刪除舊的觸發器
DROP TRIGGER IF EXISTS audit_user_profiles ON user_profiles;
DROP TRIGGER IF EXISTS audit_companies ON companies;
DROP TRIGGER IF EXISTS audit_departments ON departments;
DROP TRIGGER IF EXISTS audit_organization_positions ON organization_positions;

-- 刪除舊的函數
DROP FUNCTION IF EXISTS log_audit_action();

-- 如果表已存在，檢查並添加缺失的欄位
DO $$
BEGIN
  -- 創建表（如果不存在）
  CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_name VARCHAR(200),
    action_type VARCHAR(50) NOT NULL,
    module VARCHAR(100) NOT NULL,
    record_id UUID,
    record_name VARCHAR(500),
    old_data JSONB,
    new_data JSONB,
    description TEXT,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- 添加缺失的欄位（如果表已存在但缺少某些欄位）
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'user_id') THEN
    ALTER TABLE audit_logs ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'user_name') THEN
    ALTER TABLE audit_logs ADD COLUMN user_name VARCHAR(200);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'action_type') THEN
    ALTER TABLE audit_logs ADD COLUMN action_type VARCHAR(50) NOT NULL DEFAULT 'unknown';
    -- 更新現有記錄
    UPDATE audit_logs SET action_type = 'unknown' WHERE action_type IS NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'module') THEN
    ALTER TABLE audit_logs ADD COLUMN module VARCHAR(100) NOT NULL DEFAULT 'unknown';
    -- 更新現有記錄
    UPDATE audit_logs SET module = 'unknown' WHERE module IS NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'record_id') THEN
    ALTER TABLE audit_logs ADD COLUMN record_id UUID;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'record_name') THEN
    ALTER TABLE audit_logs ADD COLUMN record_name VARCHAR(500);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'old_data') THEN
    ALTER TABLE audit_logs ADD COLUMN old_data JSONB;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'new_data') THEN
    ALTER TABLE audit_logs ADD COLUMN new_data JSONB;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'description') THEN
    ALTER TABLE audit_logs ADD COLUMN description TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'ip_address') THEN
    ALTER TABLE audit_logs ADD COLUMN ip_address VARCHAR(50);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'user_agent') THEN
    ALTER TABLE audit_logs ADD COLUMN user_agent TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'created_at') THEN
    ALTER TABLE audit_logs ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;

  -- 確保 action_type 欄位是 NOT NULL
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'action_type' AND is_nullable = 'YES') THEN
    UPDATE audit_logs SET action_type = 'unknown' WHERE action_type IS NULL;
    ALTER TABLE audit_logs ALTER COLUMN action_type SET NOT NULL;
  END IF;
  
  -- 確保 module 欄位是 NOT NULL
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'module' AND is_nullable = 'YES') THEN
    UPDATE audit_logs SET module = 'unknown' WHERE module IS NULL;
    ALTER TABLE audit_logs ALTER COLUMN module SET NOT NULL;
  END IF;
  
  -- 移除 DEFAULT 值（如果有的話）
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audit_logs' 
    AND column_name = 'action_type' 
    AND column_default IS NOT NULL
  ) THEN
    ALTER TABLE audit_logs ALTER COLUMN action_type DROP DEFAULT;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audit_logs' 
    AND column_name = 'module' 
    AND column_default IS NOT NULL
  ) THEN
    ALTER TABLE audit_logs ALTER COLUMN module DROP DEFAULT;
  END IF;
END $$;

-- ============================================
-- 創建索引（在表結構確認後）
-- ============================================

-- 確保所有欄位都存在後再創建索引
DO $$
BEGIN
  -- 檢查表是否存在且所有必要欄位都存在
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
    -- 檢查欄位是否存在，然後創建索引
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'user_id') THEN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_audit_logs_user_id') THEN
        CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
      END IF;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'module') THEN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_audit_logs_module') THEN
        CREATE INDEX idx_audit_logs_module ON audit_logs(module);
      END IF;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'action_type') THEN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_audit_logs_action_type') THEN
        CREATE INDEX idx_audit_logs_action_type ON audit_logs(action_type);
      END IF;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'created_at') THEN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_audit_logs_created_at') THEN
        CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
      END IF;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'record_id') THEN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_audit_logs_record_id') THEN
        CREATE INDEX idx_audit_logs_record_id ON audit_logs(record_id);
      END IF;
    END IF;
  END IF;
END $$;

-- ============================================
-- RLS 政策
-- ============================================

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 刪除現有的政策（如果存在）
DROP POLICY IF EXISTS "Authenticated users can view audit logs" ON audit_logs;

-- 允許已認證用戶查看所有操作記錄
CREATE POLICY "Authenticated users can view audit logs" ON audit_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- 允許系統記錄操作（通過服務端）
-- 注意：實際插入操作應該通過服務端 API 或數據庫函數執行

-- ============================================
-- 觸發器函數：自動記錄操作
-- ============================================

-- 創建記錄操作的函數
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
    record_name_value := COALESCE(NEW.full_name, NEW.login_name, NEW.employee_id, NEW.id::text);
  ELSIF TG_TABLE_NAME = 'companies' THEN
    record_name_value := COALESCE(NEW.name, NEW.code, NEW.id::text);
  ELSIF TG_TABLE_NAME = 'departments' THEN
    record_name_value := COALESCE(NEW.name, NEW.code, NEW.id::text);
  ELSIF TG_TABLE_NAME = 'organization_positions' THEN
    record_name_value := COALESCE(NEW.position_name, NEW.position_code, NEW.id::text);
  ELSE
    -- 通用處理：嘗試常見的欄位名稱
    BEGIN
      IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        record_name_value := COALESCE(
          (NEW::jsonb->>'name')::text,
          (NEW::jsonb->>'full_name')::text,
          (NEW::jsonb->>'position_name')::text,
          (NEW::jsonb->>'code')::text,
          (NEW::jsonb->>'id')::text
        );
      ELSE
        record_name_value := COALESCE(
          (OLD::jsonb->>'name')::text,
          (OLD::jsonb->>'full_name')::text,
          (OLD::jsonb->>'position_name')::text,
          (OLD::jsonb->>'code')::text,
          (OLD::jsonb->>'id')::text
        );
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        record_name_value := '未知記錄';
    END;
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
    -- 更新時也需要獲取舊的記錄名稱
    DECLARE
      old_record_name VARCHAR(500);
    BEGIN
      IF TG_TABLE_NAME = 'user_profiles' THEN
        old_record_name := COALESCE(OLD.full_name, OLD.login_name, OLD.employee_id, OLD.id::text);
      ELSIF TG_TABLE_NAME = 'companies' THEN
        old_record_name := COALESCE(OLD.name, OLD.code, OLD.id::text);
      ELSIF TG_TABLE_NAME = 'departments' THEN
        old_record_name := COALESCE(OLD.name, OLD.code, OLD.id::text);
      ELSIF TG_TABLE_NAME = 'organization_positions' THEN
        old_record_name := COALESCE(OLD.position_name, OLD.position_code, OLD.id::text);
      ELSE
        old_record_name := record_name_value;
      END IF;
      
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
    END;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- 刪除時獲取記錄名稱
    DECLARE
      delete_record_name VARCHAR(500);
    BEGIN
      IF TG_TABLE_NAME = 'user_profiles' THEN
        delete_record_name := COALESCE(OLD.full_name, OLD.login_name, OLD.employee_id, OLD.id::text);
      ELSIF TG_TABLE_NAME = 'companies' THEN
        delete_record_name := COALESCE(OLD.name, OLD.code, OLD.id::text);
      ELSIF TG_TABLE_NAME = 'departments' THEN
        delete_record_name := COALESCE(OLD.name, OLD.code, OLD.id::text);
      ELSIF TG_TABLE_NAME = 'organization_positions' THEN
        delete_record_name := COALESCE(OLD.position_name, OLD.position_code, OLD.id::text);
      ELSE
        delete_record_name := '未知記錄';
      END IF;
      
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
        delete_record_name,
        to_jsonb(OLD),
        '刪除記錄'
      );
    END;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 為相關表創建觸發器
-- ============================================

-- 員工資料
DROP TRIGGER IF EXISTS audit_user_profiles ON user_profiles;
CREATE TRIGGER audit_user_profiles
  AFTER INSERT OR UPDATE OR DELETE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION log_audit_action();

-- 公司
DROP TRIGGER IF EXISTS audit_companies ON companies;
CREATE TRIGGER audit_companies
  AFTER INSERT OR UPDATE OR DELETE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION log_audit_action();

-- 部門
DROP TRIGGER IF EXISTS audit_departments ON departments;
CREATE TRIGGER audit_departments
  AFTER INSERT OR UPDATE OR DELETE ON departments
  FOR EACH ROW
  EXECUTE FUNCTION log_audit_action();

-- 組織圖職位
DROP TRIGGER IF EXISTS audit_organization_positions ON organization_positions;
CREATE TRIGGER audit_organization_positions
  AFTER INSERT OR UPDATE OR DELETE ON organization_positions
  FOR EACH ROW
  EXECUTE FUNCTION log_audit_action();

-- ============================================
-- 驗證
-- ============================================

SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table IN ('user_profiles', 'companies', 'departments', 'organization_positions')
ORDER BY event_object_table, trigger_name;
