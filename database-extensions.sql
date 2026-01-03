-- 資料庫擴展腳本 - 新增功能模組
-- 請在 Supabase SQL Editor 中執行此腳本（在執行 database-setup.sql 之後）

-- ============================================
-- 1. 常用分錄樣板 (Journal Entry Templates)
-- ============================================
CREATE TABLE IF NOT EXISTS journal_entry_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(100), -- 例如：房租、水電費、薪資等
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS journal_entry_template_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID REFERENCES journal_entry_templates(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  account_id UUID REFERENCES chart_of_accounts(id),
  description TEXT,
  debit_amount DECIMAL(18, 2) DEFAULT 0,
  credit_amount DECIMAL(18, 2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'TWD',
  is_variable BOOLEAN DEFAULT false, -- 是否為變數（金額可修改）
  variable_name VARCHAR(100), -- 變數名稱，如 "房租金額"
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(template_id, line_number)
);

-- ============================================
-- 2. 應收帳款管理 (Accounts Receivable)
-- ============================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  tax_id VARCHAR(20), -- 統一編號
  contact_person VARCHAR(100),
  phone VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  credit_limit DECIMAL(18, 2) DEFAULT 0,
  payment_terms INTEGER DEFAULT 30, -- 付款天數
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  invoice_date DATE NOT NULL,
  customer_id UUID REFERENCES customers(id),
  due_date DATE NOT NULL,
  subtotal DECIMAL(18, 2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(18, 2) DEFAULT 0,
  total_amount DECIMAL(18, 2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(18, 2) DEFAULT 0,
  balance_amount DECIMAL(18, 2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'TWD',
  status VARCHAR(50) DEFAULT '未收款' CHECK (status IN ('未收款', '部分收款', '已收款', '已作廢')),
  description TEXT,
  journal_entry_id UUID REFERENCES journal_entries(id), -- 關聯的會計分錄
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoice_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID REFERENCES sales_invoices(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL,
  payment_amount DECIMAL(18, 2) NOT NULL,
  payment_method VARCHAR(50), -- 現金、轉帳、支票等
  bank_account VARCHAR(200),
  reference_number VARCHAR(100),
  journal_entry_id UUID REFERENCES journal_entries(id),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. 應付帳款管理 (Accounts Payable)
-- ============================================
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  tax_id VARCHAR(20), -- 統一編號
  contact_person VARCHAR(100),
  phone VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  payment_terms INTEGER DEFAULT 30, -- 付款天數
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  invoice_date DATE NOT NULL,
  vendor_id UUID REFERENCES vendors(id),
  due_date DATE NOT NULL,
  subtotal DECIMAL(18, 2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(18, 2) DEFAULT 0,
  total_amount DECIMAL(18, 2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(18, 2) DEFAULT 0,
  balance_amount DECIMAL(18, 2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'TWD',
  status VARCHAR(50) DEFAULT '未付款' CHECK (status IN ('未付款', '部分付款', '已付款', '已作廢')),
  description TEXT,
  journal_entry_id UUID REFERENCES journal_entries(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vendor_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID REFERENCES purchase_invoices(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL,
  payment_amount DECIMAL(18, 2) NOT NULL,
  payment_method VARCHAR(50),
  bank_account VARCHAR(200),
  reference_number VARCHAR(100),
  journal_entry_id UUID REFERENCES journal_entries(id),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id UUID REFERENCES vendors(id),
  invoice_id UUID REFERENCES purchase_invoices(id),
  scheduled_date DATE NOT NULL,
  scheduled_amount DECIMAL(18, 2) NOT NULL,
  status VARCHAR(50) DEFAULT '待付款' CHECK (status IN ('待付款', '已付款', '已取消')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. 信託專戶管理 (Trust Account Management)
-- ============================================
CREATE TABLE IF NOT EXISTS trust_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_code VARCHAR(50) UNIQUE NOT NULL,
  account_name VARCHAR(200) NOT NULL,
  bank_name VARCHAR(200),
  account_number VARCHAR(100),
  account_type VARCHAR(50) NOT NULL CHECK (account_type IN ('公司自有', '客戶信託')),
  currency VARCHAR(3) DEFAULT 'TWD',
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS remittance_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_number VARCHAR(50) UNIQUE NOT NULL,
  transaction_date DATE NOT NULL,
  customer_name VARCHAR(200), -- 移工姓名
  remittance_amount DECIMAL(18, 2) NOT NULL, -- 匯款金額（本金）
  service_fee DECIMAL(18, 2) NOT NULL DEFAULT 0, -- 手續費
  total_amount DECIMAL(18, 2) NOT NULL, -- 總金額 = 匯款金額 + 手續費
  from_currency VARCHAR(3) DEFAULT 'TWD',
  to_currency VARCHAR(3) NOT NULL,
  exchange_rate DECIMAL(18, 6),
  remitted_amount DECIMAL(18, 2), -- 實際匯出金額（外幣）
  payment_method VARCHAR(50), -- 便利商店、ATM、虛擬帳號等
  payment_reference VARCHAR(100), -- 付款參考號碼
  trust_account_id UUID REFERENCES trust_accounts(id),
  status VARCHAR(50) DEFAULT '待處理' CHECK (status IN ('待處理', '已收款', '已匯出', '已取消')),
  journal_entry_id UUID REFERENCES journal_entries(id),
  invoice_id UUID, -- 電子發票 ID（未來串接用）
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 5. 銀行調節表 (Bank Reconciliation)
-- ============================================
CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_code VARCHAR(50) UNIQUE NOT NULL,
  account_name VARCHAR(200) NOT NULL,
  bank_name VARCHAR(200) NOT NULL,
  account_number VARCHAR(100),
  account_type VARCHAR(50) CHECK (account_type IN ('支票', '活期', '定期', '外幣')),
  currency VARCHAR(3) DEFAULT 'TWD',
  chart_of_account_id UUID REFERENCES chart_of_accounts(id), -- 對應的會計科目
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bank_statements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bank_account_id UUID REFERENCES bank_accounts(id),
  statement_date DATE NOT NULL,
  opening_balance DECIMAL(18, 2) NOT NULL,
  closing_balance DECIMAL(18, 2) NOT NULL,
  total_deposits DECIMAL(18, 2) DEFAULT 0,
  total_withdrawals DECIMAL(18, 2) DEFAULT 0,
  status VARCHAR(50) DEFAULT '未對帳' CHECK (status IN ('未對帳', '已對帳', '已確認')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bank_statement_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  statement_id UUID REFERENCES bank_statements(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL,
  description TEXT,
  deposit_amount DECIMAL(18, 2) DEFAULT 0,
  withdrawal_amount DECIMAL(18, 2) DEFAULT 0,
  balance DECIMAL(18, 2) NOT NULL,
  reference_number VARCHAR(100),
  is_reconciled BOOLEAN DEFAULT false,
  journal_entry_line_id UUID REFERENCES journal_entry_lines(id), -- 對應的會計分錄明細
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 6. 日結功能 (Daily Closing)
-- ============================================
CREATE TABLE IF NOT EXISTS daily_closings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  closing_date DATE NOT NULL UNIQUE,
  total_receipts_twd DECIMAL(18, 2) DEFAULT 0, -- 今日總收款（TWD）
  total_remittances DECIMAL(18, 2) DEFAULT 0, -- 今日總匯出
  remittance_currency VARCHAR(3),
  total_service_fees DECIMAL(18, 2) DEFAULT 0, -- 今日手續費收入
  trust_account_balance DECIMAL(18, 2) DEFAULT 0, -- 專戶餘額
  company_account_balance DECIMAL(18, 2) DEFAULT 0, -- 公司帳戶餘額
  status VARCHAR(50) DEFAULT '未結帳' CHECK (status IN ('未結帳', '已結帳', '已確認')),
  journal_entry_id UUID REFERENCES journal_entries(id), -- 日結傳票
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 7. 匯兌損益重評價 (FX Revaluation)
-- ============================================
CREATE TABLE IF NOT EXISTS fx_revaluations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  revaluation_date DATE NOT NULL,
  currency VARCHAR(3) NOT NULL,
  revaluation_rate DECIMAL(18, 6) NOT NULL, -- 重評價匯率
  total_foreign_amount DECIMAL(18, 2) NOT NULL, -- 外幣總額
  book_value_twd DECIMAL(18, 2) NOT NULL, -- 帳面價值（TWD）
  market_value_twd DECIMAL(18, 2) NOT NULL, -- 市價價值（TWD）
  unrealized_gain_loss DECIMAL(18, 2) NOT NULL, -- 未實現損益
  journal_entry_id UUID REFERENCES journal_entries(id),
  status VARCHAR(50) DEFAULT '草稿' CHECK (status IN ('草稿', '已過帳', '已作廢')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 創建索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_template_lines_template ON journal_entry_template_lines(template_id);
CREATE INDEX IF NOT EXISTS idx_customers_code ON customers(code);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_customer ON sales_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_date ON sales_invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_status ON sales_invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice ON invoice_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_vendors_code ON vendors(code);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_vendor ON purchase_invoices(vendor_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_date ON purchase_invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_date ON payment_schedules(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_status ON payment_schedules(status);
CREATE INDEX IF NOT EXISTS idx_remittance_transactions_date ON remittance_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_remittance_transactions_status ON remittance_transactions(status);
CREATE INDEX IF NOT EXISTS idx_remittance_transactions_account ON remittance_transactions(trust_account_id);
CREATE INDEX IF NOT EXISTS idx_bank_statements_account ON bank_statements(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_bank_statements_date ON bank_statements(statement_date);
CREATE INDEX IF NOT EXISTS idx_daily_closings_date ON daily_closings(closing_date);
CREATE INDEX IF NOT EXISTS idx_fx_revaluations_date ON fx_revaluations(revaluation_date);
CREATE INDEX IF NOT EXISTS idx_fx_revaluations_currency ON fx_revaluations(currency);

-- ============================================
-- 創建更新時間觸發器
-- ============================================
CREATE TRIGGER update_journal_entry_templates_updated_at BEFORE UPDATE ON journal_entry_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_journal_entry_template_lines_updated_at BEFORE UPDATE ON journal_entry_template_lines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_invoices_updated_at BEFORE UPDATE ON sales_invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchase_invoices_updated_at BEFORE UPDATE ON purchase_invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_schedules_updated_at BEFORE UPDATE ON payment_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trust_accounts_updated_at BEFORE UPDATE ON trust_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_remittance_transactions_updated_at BEFORE UPDATE ON remittance_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bank_accounts_updated_at BEFORE UPDATE ON bank_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bank_statements_updated_at BEFORE UPDATE ON bank_statements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_closings_updated_at BEFORE UPDATE ON daily_closings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fx_revaluations_updated_at BEFORE UPDATE ON fx_revaluations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 設置 Row Level Security (RLS)
-- ============================================
ALTER TABLE journal_entry_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entry_template_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE trust_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE remittance_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_statement_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_closings ENABLE ROW LEVEL SECURITY;
ALTER TABLE fx_revaluations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 創建 RLS 政策（所有已認證用戶可查看和管理）
-- ============================================
-- 常用分錄樣板
CREATE POLICY "Authenticated users can manage journal entry templates" ON journal_entry_templates
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage journal entry template lines" ON journal_entry_template_lines
  FOR ALL TO authenticated USING (true);

-- 應收帳款
CREATE POLICY "Authenticated users can manage customers" ON customers
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage sales invoices" ON sales_invoices
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage invoice payments" ON invoice_payments
  FOR ALL TO authenticated USING (true);

-- 應付帳款
CREATE POLICY "Authenticated users can manage vendors" ON vendors
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage purchase invoices" ON purchase_invoices
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage vendor payments" ON vendor_payments
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage payment schedules" ON payment_schedules
  FOR ALL TO authenticated USING (true);

-- 信託專戶
CREATE POLICY "Authenticated users can manage trust accounts" ON trust_accounts
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage remittance transactions" ON remittance_transactions
  FOR ALL TO authenticated USING (true);

-- 銀行調節
CREATE POLICY "Authenticated users can manage bank accounts" ON bank_accounts
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage bank statements" ON bank_statements
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage bank statement items" ON bank_statement_items
  FOR ALL TO authenticated USING (true);

-- 日結
CREATE POLICY "Authenticated users can manage daily closings" ON daily_closings
  FOR ALL TO authenticated USING (true);

-- 匯兌損益
CREATE POLICY "Authenticated users can manage fx revaluations" ON fx_revaluations
  FOR ALL TO authenticated USING (true);

-- ============================================
-- 插入預設會計科目（信託專戶相關）
-- ============================================
INSERT INTO chart_of_accounts (code, name, name_en, account_type, level) VALUES
  ('1120', '信託專戶存款', 'Trust Account Deposits', '資產', 3),
  ('1121', '信託專戶-台幣', 'Trust Account-TWD', '資產', 4),
  ('2001', '代付款項', 'Payables on Behalf', '負債', 2),
  ('2002', '代收款項', 'Receivables on Behalf', '負債', 2),
  ('4101', '匯款手續費收入', 'Remittance Service Fee Revenue', '收入', 2),
  ('4102', '匯差收益', 'Exchange Spread Revenue', '收入', 2)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- 註解
-- ============================================
COMMENT ON TABLE journal_entry_templates IS '常用分錄樣板表';
COMMENT ON TABLE journal_entry_template_lines IS '分錄樣板明細表';
COMMENT ON TABLE customers IS '客戶資料表';
COMMENT ON TABLE sales_invoices IS '銷貨發票表';
COMMENT ON TABLE invoice_payments IS '發票收款記錄表';
COMMENT ON TABLE vendors IS '廠商資料表';
COMMENT ON TABLE purchase_invoices IS '進貨發票表';
COMMENT ON TABLE vendor_payments IS '廠商付款記錄表';
COMMENT ON TABLE payment_schedules IS '付款排程表';
COMMENT ON TABLE trust_accounts IS '信託專戶表';
COMMENT ON TABLE remittance_transactions IS '匯款交易表';
COMMENT ON TABLE bank_accounts IS '銀行帳戶表';
COMMENT ON TABLE bank_statements IS '銀行對帳單表';
COMMENT ON TABLE bank_statement_items IS '銀行對帳單明細表';
COMMENT ON TABLE daily_closings IS '日結記錄表';
COMMENT ON TABLE fx_revaluations IS '匯兌損益重評價表';

