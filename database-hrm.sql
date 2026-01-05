-- 人力資源管理模組資料庫設置腳本
-- 請在 Supabase SQL Editor 中執行此腳本

-- ============================================
-- 1. 權限管理擴展
-- ============================================

-- 功能權限表（擴展現有的權限系統）
CREATE TABLE IF NOT EXISTS feature_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  feature_code VARCHAR(100) UNIQUE NOT NULL,
  feature_name VARCHAR(200) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 用戶功能權限表（個人特殊權限）
CREATE TABLE IF NOT EXISTS user_feature_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_id UUID NOT NULL REFERENCES feature_permissions(id) ON DELETE CASCADE,
  has_permission BOOLEAN DEFAULT true,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, feature_id)
);

-- ============================================
-- 2. 打卡功能
-- ============================================

-- 工作時間設定表
CREATE TABLE IF NOT EXISTS work_schedule_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  start_time TIME NOT NULL,
  lunch_start_time TIME,
  lunch_end_time TIME,
  end_time TIME NOT NULL,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 員工工作時間設定（可為不同員工設定不同時間）
CREATE TABLE IF NOT EXISTS employee_work_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  schedule_config_id UUID REFERENCES work_schedule_configs(id),
  start_time TIME,
  lunch_start_time TIME,
  lunch_end_time TIME,
  end_time TIME,
  effective_date DATE NOT NULL,
  expiry_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 打卡記錄表
CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  record_date DATE NOT NULL,
  clock_in_time TIMESTAMP WITH TIME ZONE,
  clock_out_time TIMESTAMP WITH TIME ZONE,
  lunch_start_time TIMESTAMP WITH TIME ZONE,
  lunch_end_time TIMESTAMP WITH TIME ZONE,
  work_hours DECIMAL(5, 2) DEFAULT 0,
  overtime_hours DECIMAL(5, 2) DEFAULT 0,
  status VARCHAR(50) DEFAULT '正常' CHECK (status IN ('正常', '遲到', '早退', '缺勤', '請假', '補打卡')),
  late_minutes INTEGER DEFAULT 0,
  early_leave_minutes INTEGER DEFAULT 0,
  notes TEXT,
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  ip_address VARCHAR(45),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, record_date)
);

-- ============================================
-- 3. 請假功能
-- ============================================

-- 請假類型表
CREATE TABLE IF NOT EXISTS leave_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  name_en VARCHAR(100),
  is_paid BOOLEAN DEFAULT true,
  max_days_per_year INTEGER,
  requires_approval BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 請假申請表
CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_number VARCHAR(50) UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES leave_types(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  total_days DECIMAL(5, 2) NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(50) DEFAULT '待審核' CHECK (status IN ('待審核', '已核准', '已駁回', '已取消')),
  current_approver_id UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 請假審核流程表
CREATE TABLE IF NOT EXISTS leave_approval_flows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  leave_request_id UUID NOT NULL REFERENCES leave_requests(id) ON DELETE CASCADE,
  approver_id UUID NOT NULL REFERENCES auth.users(id),
  step_order INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT '待審核' CHECK (status IN ('待審核', '已核准', '已駁回', '已跳過')),
  comments TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. 審核功能（通用審核流程）
-- ============================================

-- 審核流程模板表
CREATE TABLE IF NOT EXISTS approval_workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL, -- 例如: 'expense_voucher', 'purchase_order', 'leave_request'
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 審核流程步驟表
CREATE TABLE IF NOT EXISTS approval_workflow_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID NOT NULL REFERENCES approval_workflows(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  approver_role_id UUID REFERENCES user_roles(id),
  approver_user_id UUID REFERENCES auth.users(id),
  approval_type VARCHAR(50) DEFAULT 'any' CHECK (approval_type IN ('any', 'all')), -- any: 任一審核者, all: 全部審核者
  is_required BOOLEAN DEFAULT true,
  can_delegate BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 審核記錄表（通用）
CREATE TABLE IF NOT EXISTS approval_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID NOT NULL,
  workflow_id UUID REFERENCES approval_workflows(id),
  current_step INTEGER DEFAULT 1,
  status VARCHAR(50) DEFAULT '待審核' CHECK (status IN ('待審核', '審核中', '已核准', '已駁回', '已取消')),
  submitted_by UUID NOT NULL REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 審核步驟記錄表
CREATE TABLE IF NOT EXISTS approval_step_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  approval_record_id UUID NOT NULL REFERENCES approval_records(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  approver_id UUID NOT NULL REFERENCES auth.users(id),
  status VARCHAR(50) DEFAULT '待審核' CHECK (status IN ('待審核', '已核准', '已駁回', '已跳過')),
  comments TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 支出憑單表（示例）
CREATE TABLE IF NOT EXISTS expense_vouchers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  voucher_number VARCHAR(50) UNIQUE NOT NULL,
  request_date DATE NOT NULL,
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  department VARCHAR(100),
  total_amount DECIMAL(18, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'TWD',
  purpose TEXT NOT NULL,
  status VARCHAR(50) DEFAULT '草稿' CHECK (status IN ('草稿', '待審核', '審核中', '已核准', '已駁回', '已付款', '已取消')),
  approval_record_id UUID REFERENCES approval_records(id),
  paid_at TIMESTAMP WITH TIME ZONE,
  payment_reference VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 支出憑單明細表
CREATE TABLE IF NOT EXISTS expense_voucher_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  voucher_id UUID NOT NULL REFERENCES expense_vouchers(id) ON DELETE CASCADE,
  item_number INTEGER NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(18, 2) NOT NULL,
  account_id UUID REFERENCES chart_of_accounts(id),
  receipt_number VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 5. 薪資管理
-- ============================================

-- 員工薪資結構表
CREATE TABLE IF NOT EXISTS employee_salary_structures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  effective_date DATE NOT NULL,
  expiry_date DATE,
  base_salary DECIMAL(18, 2) NOT NULL DEFAULT 0,
  hourly_rate DECIMAL(10, 2),
  currency VARCHAR(3) DEFAULT 'TWD',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 薪資項目表（加項/減項）
CREATE TABLE IF NOT EXISTS salary_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salary_structure_id UUID NOT NULL REFERENCES employee_salary_structures(id) ON DELETE CASCADE,
  item_type VARCHAR(50) NOT NULL CHECK (item_type IN ('加項', '減項')),
  item_code VARCHAR(50) NOT NULL,
  item_name VARCHAR(100) NOT NULL,
  amount DECIMAL(18, 2) NOT NULL,
  calculation_type VARCHAR(50) DEFAULT '固定' CHECK (calculation_type IN ('固定', '百分比', '公式')),
  calculation_formula TEXT,
  is_taxable BOOLEAN DEFAULT true,
  is_insurance_base BOOLEAN DEFAULT false, -- 是否計入勞健保基數
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 勞健保設定表
CREATE TABLE IF NOT EXISTS insurance_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  effective_date DATE NOT NULL,
  expiry_date DATE,
  labor_insurance_base DECIMAL(18, 2) NOT NULL,
  health_insurance_base DECIMAL(18, 2) NOT NULL,
  employment_insurance_base DECIMAL(18, 2),
  labor_insurance_rate DECIMAL(5, 4) DEFAULT 0.02, -- 勞保費率
  health_insurance_rate DECIMAL(5, 4) DEFAULT 0.0517, -- 健保費率
  employment_insurance_rate DECIMAL(5, 4) DEFAULT 0.01, -- 就保費率
  pension_rate DECIMAL(5, 4) DEFAULT 0.06, -- 勞退提撥率
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 其他費用登記表
CREATE TABLE IF NOT EXISTS employee_other_expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expense_date DATE NOT NULL,
  expense_type VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(18, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'TWD',
  is_recurring BOOLEAN DEFAULT false,
  recurring_period VARCHAR(50), -- 'monthly', 'quarterly', 'yearly'
  account_id UUID REFERENCES chart_of_accounts(id),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 薪資計算記錄表
CREATE TABLE IF NOT EXISTS payroll_calculations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payroll_period VARCHAR(7) NOT NULL, -- 格式: YYYY-MM
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  base_salary DECIMAL(18, 2) NOT NULL DEFAULT 0,
  total_additions DECIMAL(18, 2) DEFAULT 0,
  total_deductions DECIMAL(18, 2) DEFAULT 0,
  labor_insurance DECIMAL(18, 2) DEFAULT 0,
  health_insurance DECIMAL(18, 2) DEFAULT 0,
  employment_insurance DECIMAL(18, 2) DEFAULT 0,
  pension_contribution DECIMAL(18, 2) DEFAULT 0,
  income_tax DECIMAL(18, 2) DEFAULT 0,
  net_salary DECIMAL(18, 2) NOT NULL DEFAULT 0,
  work_days INTEGER DEFAULT 0,
  actual_work_days INTEGER DEFAULT 0,
  leave_days DECIMAL(5, 2) DEFAULT 0,
  overtime_hours DECIMAL(5, 2) DEFAULT 0,
  status VARCHAR(50) DEFAULT '草稿' CHECK (status IN ('草稿', '已確認', '已發放', '已取消')),
  calculated_at TIMESTAMP WITH TIME ZONE,
  confirmed_by UUID REFERENCES auth.users(id),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  payment_date DATE,
  payment_reference VARCHAR(100),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(payroll_period, user_id)
);

-- 薪資轉帳記錄表
CREATE TABLE IF NOT EXISTS salary_transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transfer_batch_number VARCHAR(50) UNIQUE NOT NULL,
  transfer_date DATE NOT NULL,
  total_amount DECIMAL(18, 2) NOT NULL,
  total_employees INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'TWD',
  bank_account_id UUID,
  status VARCHAR(50) DEFAULT '待處理' CHECK (status IN ('待處理', '處理中', '已完成', '已取消', '部分失敗')),
  transfer_file_path TEXT,
  transfer_reference VARCHAR(100),
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 薪資轉帳明細表
CREATE TABLE IF NOT EXISTS salary_transfer_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transfer_id UUID NOT NULL REFERENCES salary_transfers(id) ON DELETE CASCADE,
  payroll_calculation_id UUID NOT NULL REFERENCES payroll_calculations(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  account_number VARCHAR(50),
  account_name VARCHAR(100),
  transfer_amount DECIMAL(18, 2) NOT NULL,
  status VARCHAR(50) DEFAULT '待轉帳' CHECK (status IN ('待轉帳', '已轉帳', '轉帳失敗')),
  transfer_reference VARCHAR(100),
  error_message TEXT,
  transferred_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 創建索引
-- ============================================

CREATE INDEX IF NOT EXISTS idx_user_feature_permissions_user ON user_feature_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feature_permissions_feature ON user_feature_permissions(feature_id);
CREATE INDEX IF NOT EXISTS idx_employee_work_schedules_user ON employee_work_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_user_date ON attendance_records(user_id, record_date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_user ON leave_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_approval_flows_request ON leave_approval_flows(leave_request_id);
CREATE INDEX IF NOT EXISTS idx_approval_records_entity ON approval_records(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_approval_records_status ON approval_records(status);
CREATE INDEX IF NOT EXISTS idx_approval_step_records_approval ON approval_step_records(approval_record_id);
CREATE INDEX IF NOT EXISTS idx_expense_vouchers_requested_by ON expense_vouchers(requested_by);
CREATE INDEX IF NOT EXISTS idx_expense_vouchers_status ON expense_vouchers(status);
CREATE INDEX IF NOT EXISTS idx_employee_salary_structures_user ON employee_salary_structures(user_id);
CREATE INDEX IF NOT EXISTS idx_salary_items_structure ON salary_items(salary_structure_id);
CREATE INDEX IF NOT EXISTS idx_insurance_configs_user ON insurance_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_employee_other_expenses_user ON employee_other_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_payroll_calculations_period_user ON payroll_calculations(payroll_period, user_id);
CREATE INDEX IF NOT EXISTS idx_salary_transfers_date ON salary_transfers(transfer_date);
CREATE INDEX IF NOT EXISTS idx_salary_transfer_items_transfer ON salary_transfer_items(transfer_id);

-- ============================================
-- 創建更新時間觸發器
-- ============================================

CREATE TRIGGER update_feature_permissions_updated_at BEFORE UPDATE ON feature_permissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_feature_permissions_updated_at BEFORE UPDATE ON user_feature_permissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_work_schedule_configs_updated_at BEFORE UPDATE ON work_schedule_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_work_schedules_updated_at BEFORE UPDATE ON employee_work_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_records_updated_at BEFORE UPDATE ON attendance_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leave_types_updated_at BEFORE UPDATE ON leave_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leave_requests_updated_at BEFORE UPDATE ON leave_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leave_approval_flows_updated_at BEFORE UPDATE ON leave_approval_flows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_approval_workflows_updated_at BEFORE UPDATE ON approval_workflows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_approval_workflow_steps_updated_at BEFORE UPDATE ON approval_workflow_steps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_approval_records_updated_at BEFORE UPDATE ON approval_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_approval_step_records_updated_at BEFORE UPDATE ON approval_step_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expense_vouchers_updated_at BEFORE UPDATE ON expense_vouchers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expense_voucher_items_updated_at BEFORE UPDATE ON expense_voucher_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_salary_structures_updated_at BEFORE UPDATE ON employee_salary_structures
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_salary_items_updated_at BEFORE UPDATE ON salary_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_insurance_configs_updated_at BEFORE UPDATE ON insurance_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_other_expenses_updated_at BEFORE UPDATE ON employee_other_expenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payroll_calculations_updated_at BEFORE UPDATE ON payroll_calculations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_salary_transfers_updated_at BEFORE UPDATE ON salary_transfers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_salary_transfer_items_updated_at BEFORE UPDATE ON salary_transfer_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 插入預設數據
-- ============================================

-- 插入預設功能權限
INSERT INTO feature_permissions (feature_code, feature_name, description) VALUES
  ('hrm_attendance', '打卡管理', '員工打卡功能'),
  ('hrm_attendance_admin', '打卡管理-管理', '管理打卡設定與查看所有打卡記錄'),
  ('hrm_leave', '請假管理', '請假申請功能'),
  ('hrm_leave_admin', '請假管理-管理', '審核請假申請'),
  ('hrm_payroll', '薪資管理', '查看個人薪資'),
  ('hrm_payroll_admin', '薪資管理-管理', '管理薪資結構與計算'),
  ('hrm_salary_transfer', '薪資轉帳', '執行薪資轉帳'),
  ('expense_voucher', '支出憑單', '申請支出憑單'),
  ('expense_voucher_approve', '支出憑單審核', '審核支出憑單')
ON CONFLICT (feature_code) DO NOTHING;

-- 插入預設請假類型
INSERT INTO leave_types (code, name, name_en, is_paid, max_days_per_year, requires_approval) VALUES
  ('annual', '特休假', 'Annual Leave', true, 14, true),
  ('sick', '病假', 'Sick Leave', true, 30, true),
  ('personal', '事假', 'Personal Leave', false, 14, true),
  ('marriage', '婚假', 'Marriage Leave', true, 8, true),
  ('funeral', '喪假', 'Funeral Leave', true, 8, true),
  ('maternity', '產假', 'Maternity Leave', true, 56, true),
  ('paternity', '陪產假', 'Paternity Leave', true, 5, true),
  ('unpaid', '無薪假', 'Unpaid Leave', false, NULL, true)
ON CONFLICT (code) DO NOTHING;

-- 插入預設工作時間設定
INSERT INTO work_schedule_configs (name, start_time, lunch_start_time, lunch_end_time, end_time, is_default) VALUES
  ('標準工作時間', '09:00:00', '12:00:00', '13:00:00', '18:00:00', true),
  ('彈性工作時間', '08:00:00', '12:00:00', '13:00:00', '17:00:00', false)
ON CONFLICT DO NOTHING;

-- ============================================
-- 設置 Row Level Security (RLS)
-- ============================================

ALTER TABLE feature_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feature_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_schedule_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_work_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_approval_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_step_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_voucher_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_salary_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_other_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_transfer_items ENABLE ROW LEVEL SECURITY;

-- RLS 政策（基本政策，可根據需求調整）
-- 所有已認證用戶可以查看功能權限
CREATE POLICY "Authenticated users can view feature permissions" ON feature_permissions
  FOR SELECT TO authenticated USING (true);

-- 用戶可以查看自己的功能權限
CREATE POLICY "Users can view own feature permissions" ON user_feature_permissions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 管理員可以管理功能權限
CREATE POLICY "Admins can manage feature permissions" ON user_feature_permissions
  FOR ALL TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role_id IN (SELECT id FROM user_roles WHERE name = '系統管理員')
    )
  );

-- 用戶可以查看自己的打卡記錄
CREATE POLICY "Users can view own attendance" ON attendance_records
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 用戶可以創建自己的打卡記錄
CREATE POLICY "Users can create own attendance" ON attendance_records
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 用戶可以更新自己的打卡記錄（在當天）
CREATE POLICY "Users can update own attendance" ON attendance_records
  FOR UPDATE TO authenticated 
  USING (auth.uid() = user_id AND record_date = CURRENT_DATE);

-- 管理員可以查看所有打卡記錄
CREATE POLICY "Admins can view all attendance" ON attendance_records
  FOR SELECT TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role_id IN (SELECT id FROM user_roles WHERE name IN ('系統管理員', '財務經理'))
    )
  );

-- 用戶可以查看和創建自己的請假申請
CREATE POLICY "Users can manage own leave requests" ON leave_requests
  FOR ALL TO authenticated 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 審核者可以查看待審核的請假申請
CREATE POLICY "Approvers can view leave requests" ON leave_requests
  FOR SELECT TO authenticated 
  USING (
    status = '待審核' OR 
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role_id IN (SELECT id FROM user_roles WHERE name IN ('系統管理員', '財務經理'))
    )
  );

-- 類似政策應用到其他表...

COMMENT ON TABLE feature_permissions IS '功能權限表';
COMMENT ON TABLE user_feature_permissions IS '用戶功能權限表';
COMMENT ON TABLE work_schedule_configs IS '工作時間設定表';
COMMENT ON TABLE employee_work_schedules IS '員工工作時間設定表';
COMMENT ON TABLE attendance_records IS '打卡記錄表';
COMMENT ON TABLE leave_types IS '請假類型表';
COMMENT ON TABLE leave_requests IS '請假申請表';
COMMENT ON TABLE leave_approval_flows IS '請假審核流程表';
COMMENT ON TABLE approval_workflows IS '審核流程模板表';
COMMENT ON TABLE approval_workflow_steps IS '審核流程步驟表';
COMMENT ON TABLE approval_records IS '審核記錄表';
COMMENT ON TABLE approval_step_records IS '審核步驟記錄表';
COMMENT ON TABLE expense_vouchers IS '支出憑單表';
COMMENT ON TABLE expense_voucher_items IS '支出憑單明細表';
COMMENT ON TABLE employee_salary_structures IS '員工薪資結構表';
COMMENT ON TABLE salary_items IS '薪資項目表';
COMMENT ON TABLE insurance_configs IS '勞健保設定表';
COMMENT ON TABLE employee_other_expenses IS '其他費用登記表';
COMMENT ON TABLE payroll_calculations IS '薪資計算記錄表';
COMMENT ON TABLE salary_transfers IS '薪資轉帳記錄表';
COMMENT ON TABLE salary_transfer_items IS '薪資轉帳明細表';
