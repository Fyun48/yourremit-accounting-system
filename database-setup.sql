-- 外匯會計系統資料庫設置腳本
-- 請在 Supabase SQL Editor 中執行此腳本

-- 啟用必要的擴展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. 用戶角色表
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 用戶資料表 (擴展 auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name VARCHAR(100),
  email VARCHAR(255),
  role_id UUID REFERENCES user_roles(id),
  department VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 匯率表
CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_currency VARCHAR(3) NOT NULL,
  to_currency VARCHAR(3) NOT NULL,
  rate DECIMAL(18, 6) NOT NULL,
  effective_date DATE NOT NULL,
  source VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(from_currency, to_currency, effective_date)
);

-- 4. 會計科目表
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  name_en VARCHAR(200),
  account_type VARCHAR(50) NOT NULL CHECK (account_type IN ('資產', '負債', '權益', '收入', '費用')),
  parent_id UUID REFERENCES chart_of_accounts(id),
  level INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 外匯交易表
CREATE TABLE IF NOT EXISTS forex_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_date DATE NOT NULL,
  transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('買入', '賣出', '兌換')),
  from_currency VARCHAR(3) NOT NULL,
  from_amount DECIMAL(18, 2) NOT NULL,
  to_currency VARCHAR(3) NOT NULL,
  to_amount DECIMAL(18, 2) NOT NULL,
  exchange_rate DECIMAL(18, 6) NOT NULL,
  bank_name VARCHAR(200),
  reference_number VARCHAR(100),
  purpose TEXT,
  status VARCHAR(50) DEFAULT '已完成' CHECK (status IN ('待處理', '已完成', '已取消')),
  created_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. 會計分錄表
CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_number VARCHAR(50) UNIQUE NOT NULL,
  entry_date DATE NOT NULL,
  description TEXT,
  forex_transaction_id UUID REFERENCES forex_transactions(id),
  status VARCHAR(50) DEFAULT '草稿' CHECK (status IN ('草稿', '已過帳', '已作廢')),
  total_debit DECIMAL(18, 2) NOT NULL DEFAULT 0,
  total_credit DECIMAL(18, 2) NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  posted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. 會計分錄明細表
CREATE TABLE IF NOT EXISTS journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  account_id UUID REFERENCES chart_of_accounts(id),
  description TEXT,
  debit_amount DECIMAL(18, 2) DEFAULT 0,
  credit_amount DECIMAL(18, 2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'TWD',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(journal_entry_id, line_number)
);

-- 8. 審計日誌表
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name VARCHAR(100) NOT NULL,
  record_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_values JSONB,
  new_values JSONB,
  user_id UUID REFERENCES auth.users(id),
  ip_address VARCHAR(45),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 創建索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role_id);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_currencies ON exchange_rates(from_currency, to_currency);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_date ON exchange_rates(effective_date);
CREATE INDEX IF NOT EXISTS idx_forex_transactions_date ON forex_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_forex_transactions_status ON forex_transactions(status);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_status ON journal_entries(status);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_account ON journal_entry_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs(table_name, record_id);

-- 創建更新時間自動更新函數
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 為各表創建更新時間觸發器
CREATE TRIGGER update_user_roles_updated_at BEFORE UPDATE ON user_roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exchange_rates_updated_at BEFORE UPDATE ON exchange_rates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chart_of_accounts_updated_at BEFORE UPDATE ON chart_of_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_forex_transactions_updated_at BEFORE UPDATE ON forex_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_journal_entries_updated_at BEFORE UPDATE ON journal_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_journal_entry_lines_updated_at BEFORE UPDATE ON journal_entry_lines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 插入預設角色
INSERT INTO user_roles (name, description, permissions) VALUES
  ('系統管理員', '擁有所有系統權限', '{"all": true}'),
  ('財務經理', '可以審核和核准交易', '{"view": true, "create": true, "edit": true, "approve": true}'),
  ('會計人員', '可以創建和編輯交易', '{"view": true, "create": true, "edit": true}'),
  ('查詢人員', '只能查看數據', '{"view": true}')
ON CONFLICT (name) DO NOTHING;

-- 插入預設會計科目
INSERT INTO chart_of_accounts (code, name, name_en, account_type, level) VALUES
  ('1000', '資產', 'Assets', '資產', 1),
  ('1100', '流動資產', 'Current Assets', '資產', 2),
  ('1110', '現金及約當現金', 'Cash and Cash Equivalents', '資產', 3),
  ('1111', '銀行存款-台幣', 'Bank Deposits-TWD', '資產', 4),
  ('1112', '銀行存款-美金', 'Bank Deposits-USD', '資產', 4),
  ('1113', '銀行存款-歐元', 'Bank Deposits-EUR', '資產', 4),
  ('1114', '銀行存款-日圓', 'Bank Deposits-JPY', '資產', 4),
  ('2000', '負債', 'Liabilities', '負債', 1),
  ('3000', '權益', 'Equity', '權益', 1),
  ('4000', '收入', 'Revenue', '收入', 1),
  ('4100', '匯兌收益', 'Foreign Exchange Gain', '收入', 2),
  ('5000', '費用', 'Expenses', '費用', 1),
  ('5100', '匯兌損失', 'Foreign Exchange Loss', '費用', 2),
  ('5200', '銀行手續費', 'Bank Fees', '費用', 2)
ON CONFLICT (code) DO NOTHING;

-- 插入預設匯率數據
INSERT INTO exchange_rates (from_currency, to_currency, rate, effective_date, source) VALUES
  ('USD', 'TWD', 31.50, CURRENT_DATE, '台灣銀行'),
  ('EUR', 'TWD', 34.20, CURRENT_DATE, '台灣銀行'),
  ('JPY', 'TWD', 0.21, CURRENT_DATE, '台灣銀行'),
  ('CNY', 'TWD', 4.35, CURRENT_DATE, '台灣銀行')
ON CONFLICT (from_currency, to_currency, effective_date) DO NOTHING;

-- 設置 Row Level Security (RLS)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE forex_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entry_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 創建 RLS 政策
-- 用戶只能查看和編輯自己的資料
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- 所有已認證用戶可以查看匯率
CREATE POLICY "Authenticated users can view exchange rates" ON exchange_rates
  FOR SELECT TO authenticated USING (true);

-- 只有特定角色可以新增匯率
CREATE POLICY "Admins can insert exchange rates" ON exchange_rates
  FOR INSERT TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role_id IN (SELECT id FROM user_roles WHERE name IN ('系統管理員', '財務經理'))
    )
  );

-- 所有已認證用戶可以查看會計科目
CREATE POLICY "Authenticated users can view chart of accounts" ON chart_of_accounts
  FOR SELECT TO authenticated USING (true);

-- 所有已認證用戶可以查看外匯交易
CREATE POLICY "Authenticated users can view forex transactions" ON forex_transactions
  FOR SELECT TO authenticated USING (true);

-- 所有已認證用戶可以創建外匯交易
CREATE POLICY "Authenticated users can create forex transactions" ON forex_transactions
  FOR INSERT TO authenticated WITH CHECK (true);

-- 用戶可以更新自己創建的交易
CREATE POLICY "Users can update own forex transactions" ON forex_transactions
  FOR UPDATE TO authenticated 
  USING (created_by = auth.uid() OR 
         EXISTS (
           SELECT 1 FROM user_profiles 
           WHERE id = auth.uid() 
           AND role_id IN (SELECT id FROM user_roles WHERE name IN ('系統管理員', '財務經理'))
         ));

-- 會計分錄政策
CREATE POLICY "Authenticated users can view journal entries" ON journal_entries
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create journal entries" ON journal_entries
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update own journal entries" ON journal_entries
  FOR UPDATE TO authenticated 
  USING (created_by = auth.uid() OR 
         EXISTS (
           SELECT 1 FROM user_profiles 
           WHERE id = auth.uid() 
           AND role_id IN (SELECT id FROM user_roles WHERE name IN ('系統管理員', '財務經理'))
         ));

-- 會計分錄明細政策
CREATE POLICY "Authenticated users can view journal entry lines" ON journal_entry_lines
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage journal entry lines" ON journal_entry_lines
  FOR ALL TO authenticated USING (true);

-- 審計日誌只能查看
CREATE POLICY "Authenticated users can view audit logs" ON audit_logs
  FOR SELECT TO authenticated USING (true);

COMMENT ON TABLE user_roles IS '用戶角色表';
COMMENT ON TABLE user_profiles IS '用戶資料表';
COMMENT ON TABLE exchange_rates IS '匯率表';
COMMENT ON TABLE chart_of_accounts IS '會計科目表';
COMMENT ON TABLE forex_transactions IS '外匯交易表';
COMMENT ON TABLE journal_entries IS '會計分錄表';
COMMENT ON TABLE journal_entry_lines IS '會計分錄明細表';
COMMENT ON TABLE audit_logs IS '審計日誌表';
