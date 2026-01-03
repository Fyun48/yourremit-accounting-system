export interface UserRole {
  id: string
  name: string
  description?: string
  permissions: Record<string, boolean>
  created_at: string
  updated_at: string
}

export interface UserProfile {
  id: string
  full_name?: string
  email?: string
  role_id?: string
  department?: string
  is_active: boolean
  last_login?: string
  created_at: string
  updated_at: string
  role?: UserRole
}

export interface ExchangeRate {
  id: string
  from_currency: string
  to_currency: string
  rate: number
  effective_date: string
  source?: string
  is_active: boolean
  created_by?: string
  created_at: string
  updated_at: string
}

export interface ChartOfAccount {
  id: string
  code: string
  name: string
  name_en?: string
  account_type: '資產' | '負債' | '權益' | '收入' | '費用'
  parent_id?: string
  level: number
  is_active: boolean
  description?: string
  created_at: string
  updated_at: string
}

export interface ForexTransaction {
  id: string
  transaction_date: string
  transaction_type: '買入' | '賣出' | '兌換'
  from_currency: string
  from_amount: number
  to_currency: string
  to_amount: number
  exchange_rate: number
  bank_name?: string
  reference_number?: string
  purpose?: string
  status: '待處理' | '已完成' | '已取消'
  created_by?: string
  approved_by?: string
  created_at: string
  updated_at: string
}

export interface JournalEntry {
  id: string
  entry_number: string
  entry_date: string
  description?: string
  forex_transaction_id?: string
  status: '草稿' | '已過帳' | '已作廢'
  total_debit: number
  total_credit: number
  created_by?: string
  approved_by?: string
  posted_at?: string
  created_at: string
  updated_at: string
  lines?: JournalEntryLine[]
}

export interface JournalEntryLine {
  id: string
  journal_entry_id: string
  line_number: number
  account_id: string
  description?: string
  debit_amount: number
  credit_amount: number
  currency: string
  created_at: string
  updated_at: string
  account?: ChartOfAccount
}

export interface AuditLog {
  id: string
  table_name: string
  record_id: string
  action: 'INSERT' | 'UPDATE' | 'DELETE'
  old_values?: Record<string, any>
  new_values?: Record<string, any>
  user_id?: string
  ip_address?: string
  created_at: string
}

// ============================================
// 常用分錄樣板
// ============================================
export interface JournalEntryTemplate {
  id: string
  name: string
  description?: string
  category?: string
  is_active: boolean
  created_by?: string
  created_at: string
  updated_at: string
  lines?: JournalEntryTemplateLine[]
}

export interface JournalEntryTemplateLine {
  id: string
  template_id: string
  line_number: number
  account_id: string
  description?: string
  debit_amount: number
  credit_amount: number
  currency: string
  is_variable: boolean
  variable_name?: string
  created_at: string
  updated_at: string
  account?: ChartOfAccount
}

// ============================================
// 應收帳款管理
// ============================================
export interface Customer {
  id: string
  code: string
  name: string
  tax_id?: string
  contact_person?: string
  phone?: string
  email?: string
  address?: string
  credit_limit: number
  payment_terms: number
  is_active: boolean
  notes?: string
  created_by?: string
  created_at: string
  updated_at: string
}

export interface SalesInvoice {
  id: string
  invoice_number: string
  invoice_date: string
  customer_id: string
  due_date: string
  subtotal: number
  tax_amount: number
  total_amount: number
  paid_amount: number
  balance_amount: number
  currency: string
  status: '未收款' | '部分收款' | '已收款' | '已作廢'
  description?: string
  journal_entry_id?: string
  created_by?: string
  created_at: string
  updated_at: string
  customer?: Customer
}

export interface InvoicePayment {
  id: string
  invoice_id: string
  payment_date: string
  payment_amount: number
  payment_method?: string
  bank_account?: string
  reference_number?: string
  journal_entry_id?: string
  notes?: string
  created_by?: string
  created_at: string
}

// ============================================
// 應付帳款管理
// ============================================
export interface Vendor {
  id: string
  code: string
  name: string
  tax_id?: string
  contact_person?: string
  phone?: string
  email?: string
  address?: string
  payment_terms: number
  is_active: boolean
  notes?: string
  created_by?: string
  created_at: string
  updated_at: string
}

export interface PurchaseInvoice {
  id: string
  invoice_number: string
  invoice_date: string
  vendor_id: string
  due_date: string
  subtotal: number
  tax_amount: number
  total_amount: number
  paid_amount: number
  balance_amount: number
  currency: string
  status: '未付款' | '部分付款' | '已付款' | '已作廢'
  description?: string
  journal_entry_id?: string
  created_by?: string
  created_at: string
  updated_at: string
  vendor?: Vendor
}

export interface VendorPayment {
  id: string
  invoice_id: string
  payment_date: string
  payment_amount: number
  payment_method?: string
  bank_account?: string
  reference_number?: string
  journal_entry_id?: string
  notes?: string
  created_by?: string
  created_at: string
}

export interface PaymentSchedule {
  id: string
  vendor_id: string
  invoice_id: string
  scheduled_date: string
  scheduled_amount: number
  status: '待付款' | '已付款' | '已取消'
  notes?: string
  created_by?: string
  created_at: string
  updated_at: string
  vendor?: Vendor
  invoice?: PurchaseInvoice
}

// ============================================
// 信託專戶管理
// ============================================
export interface TrustAccount {
  id: string
  account_code: string
  account_name: string
  bank_name?: string
  account_number?: string
  account_type: '公司自有' | '客戶信託'
  currency: string
  is_active: boolean
  description?: string
  created_at: string
  updated_at: string
}

export interface RemittanceTransaction {
  id: string
  transaction_number: string
  transaction_date: string
  customer_name?: string
  remittance_amount: number
  service_fee: number
  total_amount: number
  from_currency: string
  to_currency: string
  exchange_rate?: number
  remitted_amount?: number
  payment_method?: string
  payment_reference?: string
  trust_account_id?: string
  status: '待處理' | '已收款' | '已匯出' | '已取消'
  journal_entry_id?: string
  invoice_id?: string
  notes?: string
  created_by?: string
  created_at: string
  updated_at: string
  trust_account?: TrustAccount
}

// ============================================
// 銀行調節表
// ============================================
export interface BankAccount {
  id: string
  account_code: string
  account_name: string
  bank_name: string
  account_number?: string
  account_type?: '支票' | '活期' | '定期' | '外幣'
  currency: string
  chart_of_account_id?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface BankStatement {
  id: string
  bank_account_id: string
  statement_date: string
  opening_balance: number
  closing_balance: number
  total_deposits: number
  total_withdrawals: number
  status: '未對帳' | '已對帳' | '已確認'
  notes?: string
  created_by?: string
  created_at: string
  updated_at: string
  bank_account?: BankAccount
  items?: BankStatementItem[]
}

export interface BankStatementItem {
  id: string
  statement_id: string
  transaction_date: string
  description?: string
  deposit_amount: number
  withdrawal_amount: number
  balance: number
  reference_number?: string
  is_reconciled: boolean
  journal_entry_line_id?: string
  created_at: string
}

// ============================================
// 日結功能
// ============================================
export interface DailyClosing {
  id: string
  closing_date: string
  total_receipts_twd: number
  total_remittances: number
  remittance_currency?: string
  total_service_fees: number
  trust_account_balance: number
  company_account_balance: number
  status: '未結帳' | '已結帳' | '已確認'
  journal_entry_id?: string
  notes?: string
  created_by?: string
  created_at: string
  updated_at: string
}

// ============================================
// 匯兌損益重評價
// ============================================
export interface FXRevaluation {
  id: string
  revaluation_date: string
  currency: string
  revaluation_rate: number
  total_foreign_amount: number
  book_value_twd: number
  market_value_twd: number
  unrealized_gain_loss: number
  journal_entry_id?: string
  status: '草稿' | '已過帳' | '已作廢'
  created_by?: string
  created_at: string
  updated_at: string
}