-- 人力資源管理模組補充功能資料庫設置腳本
-- 請在 Supabase SQL Editor 中執行此腳本（在執行 database-hrm.sql 之後）

-- ============================================
-- 1. 遲到扣款設定
-- ============================================

-- 遲到扣款規則表
CREATE TABLE IF NOT EXISTS late_deduction_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('固定金額', '比例扣款', '階梯式扣款')),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 遲到扣款規則明細表
CREATE TABLE IF NOT EXISTS late_deduction_rule_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rule_id UUID NOT NULL REFERENCES late_deduction_rules(id) ON DELETE CASCADE,
  min_minutes INTEGER NOT NULL, -- 遲到分鐘數下限
  max_minutes INTEGER, -- 遲到分鐘數上限（NULL表示無上限）
  deduction_type VARCHAR(50) NOT NULL CHECK (deduction_type IN ('固定金額', '比例', '階梯')),
  deduction_amount DECIMAL(10, 2), -- 固定金額或比例（比例為小數，如0.01表示1%）
  max_deduction_amount DECIMAL(10, 2), -- 最大扣款金額（用於比例扣款）
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 員工遲到扣款規則關聯表
CREATE TABLE IF NOT EXISTS employee_late_deduction_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES late_deduction_rules(id),
  effective_date DATE NOT NULL,
  expiry_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, rule_id, effective_date)
);

-- ============================================
-- 2. 公司管理
-- ============================================

-- 公司表（類似廠商登記）
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL, -- 公司代碼
  name VARCHAR(200) NOT NULL, -- 公司名稱
  name_en VARCHAR(200), -- 英文名稱
  tax_id VARCHAR(20), -- 統一編號
  registration_number VARCHAR(50), -- 登記字號
  company_type VARCHAR(50), -- 公司類型（有限公司、股份有限公司等）
  contact_person VARCHAR(100), -- 聯絡人
  phone VARCHAR(50), -- 電話
  email VARCHAR(255), -- 電子郵件
  address TEXT, -- 地址
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. 員工個人資料擴展
-- ============================================

-- 擴展現有的 user_profiles 表，添加新欄位
ALTER TABLE user_profiles 
  ADD COLUMN IF NOT EXISTS login_name VARCHAR(20) UNIQUE, -- 登入名稱（小寫字母+6位數字）
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id), -- 所屬公司
  ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50), -- 員工編號
  ADD COLUMN IF NOT EXISTS id_number VARCHAR(20), -- 身分證字號
  ADD COLUMN IF NOT EXISTS phone VARCHAR(50), -- 電話
  ADD COLUMN IF NOT EXISTS mobile VARCHAR(50), -- 手機
  ADD COLUMN IF NOT EXISTS address TEXT, -- 地址
  ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(100), -- 緊急聯絡人
  ADD COLUMN IF NOT EXISTS emergency_phone VARCHAR(50), -- 緊急聯絡電話
  ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100), -- 銀行名稱
  ADD COLUMN IF NOT EXISTS bank_account VARCHAR(50), -- 銀行帳號
  ADD COLUMN IF NOT EXISTS account_holder VARCHAR(100), -- 戶名
  ADD COLUMN IF NOT EXISTS hire_date DATE, -- 到職日期
  ADD COLUMN IF NOT EXISTS resignation_date DATE, -- 離職日期
  ADD COLUMN IF NOT EXISTS requires_attendance BOOLEAN DEFAULT true, -- 是否需要打卡
  ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false, -- 是否啟用2段式驗證
  ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR(100), -- 2段式驗證密鑰
  ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255), -- 密碼重置令牌
  ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP WITH TIME ZONE; -- 密碼重置過期時間

-- ============================================
-- 4. 打卡記錄添加扣款欄位
-- ============================================

ALTER TABLE attendance_records
  ADD COLUMN IF NOT EXISTS late_deduction_amount DECIMAL(10, 2) DEFAULT 0, -- 遲到扣款金額
  ADD COLUMN IF NOT EXISTS late_deduction_rule_id UUID REFERENCES late_deduction_rules(id); -- 使用的扣款規則

-- ============================================
-- 創建索引
-- ============================================

CREATE INDEX IF NOT EXISTS idx_late_deduction_rule_items_rule ON late_deduction_rule_items(rule_id);
CREATE INDEX IF NOT EXISTS idx_employee_late_deduction_rules_user ON employee_late_deduction_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_companies_code ON companies(code);
CREATE INDEX IF NOT EXISTS idx_user_profiles_login_name ON user_profiles(login_name);
CREATE INDEX IF NOT EXISTS idx_user_profiles_company ON user_profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_employee_id ON user_profiles(employee_id);

-- ============================================
-- 創建更新時間觸發器
-- ============================================

CREATE TRIGGER update_late_deduction_rules_updated_at BEFORE UPDATE ON late_deduction_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_late_deduction_rule_items_updated_at BEFORE UPDATE ON late_deduction_rule_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_late_deduction_rules_updated_at BEFORE UPDATE ON employee_late_deduction_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 設置 Row Level Security (RLS)
-- ============================================

ALTER TABLE late_deduction_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE late_deduction_rule_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_late_deduction_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- RLS 政策
-- 所有已認證用戶可以查看遲到扣款規則
CREATE POLICY "Authenticated users can view late deduction rules" ON late_deduction_rules
  FOR SELECT TO authenticated USING (true);

-- 管理員可以管理遲到扣款規則
CREATE POLICY "Admins can manage late deduction rules" ON late_deduction_rules
  FOR ALL TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role_id IN (SELECT id FROM user_roles WHERE name = '系統管理員')
    )
  );

-- 所有已認證用戶可以查看公司
CREATE POLICY "Authenticated users can view companies" ON companies
  FOR SELECT TO authenticated USING (true);

-- 管理員可以管理公司
CREATE POLICY "Admins can manage companies" ON companies
  FOR ALL TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role_id IN (SELECT id FROM user_roles WHERE name = '系統管理員')
    )
  );

-- ============================================
-- 插入預設遲到扣款規則（符合台灣勞基法）
-- ============================================

-- 規則1：固定金額扣款（每遲到1分鐘扣固定金額）
INSERT INTO late_deduction_rules (name, rule_type, description) VALUES
  ('固定金額扣款', '固定金額', '每遲到1分鐘扣固定金額，符合勞基法規定')
ON CONFLICT DO NOTHING;

-- 規則2：比例扣款（按日薪比例扣款）
INSERT INTO late_deduction_rules (name, rule_type, description) VALUES
  ('比例扣款', '比例扣款', '按日薪比例扣款，遲到時間佔工作時間的比例')
ON CONFLICT DO NOTHING;

-- 規則3：階梯式扣款（不同遲到時間區間不同扣款金額）
INSERT INTO late_deduction_rules (name, rule_type, description) VALUES
  ('階梯式扣款', '階梯式扣款', '根據遲到時間區間設定不同扣款金額')
ON CONFLICT DO NOTHING;

-- 插入預設規則明細（示例）
DO $$
DECLARE
  rule1_id UUID;
  rule2_id UUID;
  rule3_id UUID;
BEGIN
  -- 規則1：固定金額扣款（每分鐘扣10元，最多扣500元）
  SELECT id INTO rule1_id FROM late_deduction_rules WHERE name = '固定金額扣款';
  IF rule1_id IS NOT NULL THEN
    INSERT INTO late_deduction_rule_items (rule_id, min_minutes, max_minutes, deduction_type, deduction_amount, max_deduction_amount, sort_order) VALUES
      (rule1_id, 1, NULL, '固定金額', 10.00, 500.00, 1)
    ON CONFLICT DO NOTHING;
  END IF;

  -- 規則2：比例扣款（遲到時間佔工作時間的比例，最多扣日薪的10%）
  SELECT id INTO rule2_id FROM late_deduction_rules WHERE name = '比例扣款';
  IF rule2_id IS NOT NULL THEN
    INSERT INTO late_deduction_rule_items (rule_id, min_minutes, deduction_type, deduction_amount, max_deduction_amount, sort_order) VALUES
      (rule2_id, 1, '比例', 0.001, NULL, 1) -- 每分鐘扣日薪的0.1%，最多扣日薪的10%
    ON CONFLICT DO NOTHING;
  END IF;

  -- 規則3：階梯式扣款
  SELECT id INTO rule3_id FROM late_deduction_rules WHERE name = '階梯式扣款';
  IF rule3_id IS NOT NULL THEN
    INSERT INTO late_deduction_rule_items (rule_id, min_minutes, max_minutes, deduction_type, deduction_amount, sort_order) VALUES
      (rule3_id, 1, 15, '階梯', 50.00, 1),   -- 1-15分鐘：扣50元
      (rule3_id, 16, 30, '階梯', 100.00, 2), -- 16-30分鐘：扣100元
      (rule3_id, 31, 60, '階梯', 200.00, 3), -- 31-60分鐘：扣200元
      (rule3_id, 61, NULL, '階梯', 500.00, 4) -- 超過60分鐘：扣500元
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

COMMENT ON TABLE late_deduction_rules IS '遲到扣款規則表';
COMMENT ON TABLE late_deduction_rule_items IS '遲到扣款規則明細表';
COMMENT ON TABLE employee_late_deduction_rules IS '員工遲到扣款規則關聯表';
COMMENT ON TABLE companies IS '公司表（類似廠商登記）';
