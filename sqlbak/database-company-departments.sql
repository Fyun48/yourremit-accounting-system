-- 公司部門與組織圖表功能
-- 請在 Supabase SQL Editor 中執行此腳本

-- ============================================
-- 1. 部門表
-- ============================================

CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL, -- 部門代碼
  name VARCHAR(200) NOT NULL, -- 部門名稱
  name_en VARCHAR(200), -- 英文名稱
  parent_department_id UUID REFERENCES departments(id) ON DELETE SET NULL, -- 上級部門（支持層級結構）
  manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- 部門主管
  description TEXT, -- 部門描述
  level INTEGER DEFAULT 1, -- 部門層級（1=頂層）
  display_order INTEGER DEFAULT 0, -- 顯示順序
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, code) -- 同一公司內部門代碼唯一
);

-- ============================================
-- 2. 組織圖表職位表
-- ============================================

CREATE TABLE IF NOT EXISTS organization_positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL, -- 所屬部門
  position_code VARCHAR(50) NOT NULL, -- 職位代碼
  position_name VARCHAR(200) NOT NULL, -- 職位名稱
  position_name_en VARCHAR(200), -- 英文名稱
  parent_position_id UUID REFERENCES organization_positions(id) ON DELETE SET NULL, -- 上級職位
  employee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- 在職員工
  job_description TEXT, -- 職位描述
  level INTEGER DEFAULT 1, -- 職位層級
  display_order INTEGER DEFAULT 0, -- 顯示順序
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, position_code) -- 同一公司內職位代碼唯一
);

-- ============================================
-- 創建索引
-- ============================================

CREATE INDEX IF NOT EXISTS idx_departments_company ON departments(company_id);
CREATE INDEX IF NOT EXISTS idx_departments_parent ON departments(parent_department_id);
CREATE INDEX IF NOT EXISTS idx_departments_manager ON departments(manager_id);
CREATE INDEX IF NOT EXISTS idx_org_positions_company ON organization_positions(company_id);
CREATE INDEX IF NOT EXISTS idx_org_positions_department ON organization_positions(department_id);
CREATE INDEX IF NOT EXISTS idx_org_positions_parent ON organization_positions(parent_position_id);
CREATE INDEX IF NOT EXISTS idx_org_positions_employee ON organization_positions(employee_id);

-- ============================================
-- RLS 政策
-- ============================================

-- 部門表 RLS
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

-- 允許已認證用戶查看所有部門
CREATE POLICY "Authenticated users can view departments" ON departments
  FOR SELECT
  TO authenticated
  USING (true);

-- 允許系統管理員和財務經理管理部門
CREATE POLICY "Admins can manage departments" ON departments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN user_roles ur ON up.role_id = ur.id
      WHERE up.id = auth.uid()
      AND ur.name IN ('系統管理員', '財務經理')
    )
  );

-- 組織圖表職位表 RLS
ALTER TABLE organization_positions ENABLE ROW LEVEL SECURITY;

-- 允許已認證用戶查看所有職位
CREATE POLICY "Authenticated users can view positions" ON organization_positions
  FOR SELECT
  TO authenticated
  USING (true);

-- 允許系統管理員和財務經理管理職位
CREATE POLICY "Admins can manage positions" ON organization_positions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN user_roles ur ON up.role_id = ur.id
      WHERE up.id = auth.uid()
      AND ur.name IN ('系統管理員', '財務經理')
    )
  );

-- ============================================
-- 觸發器：自動更新 updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_departments_updated_at
  BEFORE UPDATE ON departments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_positions_updated_at
  BEFORE UPDATE ON organization_positions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 驗證
-- ============================================

SELECT 
  'departments' as table_name,
  COUNT(*) as row_count
FROM departments
UNION ALL
SELECT 
  'organization_positions' as table_name,
  COUNT(*) as row_count
FROM organization_positions;
