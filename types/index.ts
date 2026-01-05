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

// ============================================
// 人力資源管理模組
// ============================================

// 功能權限
export interface FeaturePermission {
  id: string
  feature_code: string
  feature_name: string
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface UserFeaturePermission {
  id: string
  user_id: string
  feature_id: string
  has_permission: boolean
  granted_by?: string
  granted_at: string
  expires_at?: string
  notes?: string
  created_at: string
  updated_at: string
  feature?: FeaturePermission
}

// 打卡功能
export interface WorkScheduleConfig {
  id: string
  name: string
  start_time: string
  lunch_start_time?: string
  lunch_end_time?: string
  end_time: string
  is_default: boolean
  is_active: boolean
  created_by?: string
  created_at: string
  updated_at: string
}

export interface EmployeeWorkSchedule {
  id: string
  user_id: string
  schedule_config_id?: string
  start_time?: string
  lunch_start_time?: string
  lunch_end_time?: string
  end_time?: string
  effective_date: string
  expiry_date?: string
  is_active: boolean
  created_by?: string
  created_at: string
  updated_at: string
  schedule_config?: WorkScheduleConfig
}

export interface AttendanceRecord {
  id: string
  user_id: string
  record_date: string
  clock_in_time?: string
  clock_out_time?: string
  lunch_start_time?: string
  lunch_end_time?: string
  work_hours: number
  overtime_hours: number
  status: '正常' | '遲到' | '早退' | '缺勤' | '請假' | '補打卡'
  late_minutes: number
  early_leave_minutes: number
  notes?: string
  location_lat?: number
  location_lng?: number
  ip_address?: string
  created_at: string
  updated_at: string
}

// 請假功能
export interface LeaveType {
  id: string
  code: string
  name: string
  name_en?: string
  is_paid: boolean
  max_days_per_year?: number
  requires_approval: boolean
  is_active: boolean
  description?: string
  created_at: string
  updated_at: string
}

export interface LeaveRequest {
  id: string
  request_number: string
  user_id: string
  leave_type_id: string
  start_date: string
  end_date: string
  start_time?: string
  end_time?: string
  total_days: number
  reason: string
  status: '待審核' | '已核准' | '已駁回' | '已取消'
  current_approver_id?: string
  approved_by?: string
  approved_at?: string
  rejected_reason?: string
  created_at: string
  updated_at: string
  leave_type?: LeaveType
}

export interface LeaveApprovalFlow {
  id: string
  leave_request_id: string
  approver_id: string
  step_order: number
  status: '待審核' | '已核准' | '已駁回' | '已跳過'
  comments?: string
  approved_at?: string
  created_at: string
  updated_at: string
}

// 審核功能
export interface ApprovalWorkflow {
  id: string
  name: string
  entity_type: string
  description?: string
  is_active: boolean
  created_by?: string
  created_at: string
  updated_at: string
}

export interface ApprovalWorkflowStep {
  id: string
  workflow_id: string
  step_order: number
  approver_role_id?: string
  approver_user_id?: string
  approval_type: 'any' | 'all'
  is_required: boolean
  can_delegate: boolean
  created_at: string
  updated_at: string
}

export interface ApprovalRecord {
  id: string
  entity_type: string
  entity_id: string
  workflow_id?: string
  current_step: number
  status: '待審核' | '審核中' | '已核准' | '已駁回' | '已取消'
  submitted_by: string
  approved_by?: string
  approved_at?: string
  rejected_reason?: string
  created_at: string
  updated_at: string
}

export interface ApprovalStepRecord {
  id: string
  approval_record_id: string
  step_order: number
  approver_id: string
  status: '待審核' | '已核准' | '已駁回' | '已跳過'
  comments?: string
  approved_at?: string
  created_at: string
  updated_at: string
}

// 支出憑單
export interface ExpenseVoucher {
  id: string
  voucher_number: string
  request_date: string
  requested_by: string
  department?: string
  total_amount: number
  currency: string
  purpose: string
  status: '草稿' | '待審核' | '審核中' | '已核准' | '已駁回' | '已付款' | '已取消'
  approval_record_id?: string
  paid_at?: string
  payment_reference?: string
  notes?: string
  created_at: string
  updated_at: string
  items?: ExpenseVoucherItem[]
}

export interface ExpenseVoucherItem {
  id: string
  voucher_id: string
  item_number: number
  description: string
  amount: number
  account_id?: string
  receipt_number?: string
  created_at: string
  updated_at: string
}

// 薪資管理
export interface EmployeeSalaryStructure {
  id: string
  user_id: string
  effective_date: string
  expiry_date?: string
  base_salary: number
  hourly_rate?: number
  currency: string
  is_active: boolean
  created_by?: string
  created_at: string
  updated_at: string
  items?: SalaryItem[]
}

export interface SalaryItem {
  id: string
  salary_structure_id: string
  item_type: '加項' | '減項'
  item_code: string
  item_name: string
  amount: number
  calculation_type: '固定' | '百分比' | '公式'
  calculation_formula?: string
  is_taxable: boolean
  is_insurance_base: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface InsuranceConfig {
  id: string
  user_id: string
  effective_date: string
  expiry_date?: string
  labor_insurance_base: number
  health_insurance_base: number
  employment_insurance_base?: number
  labor_insurance_rate: number
  health_insurance_rate: number
  employment_insurance_rate?: number
  pension_rate: number
  is_active: boolean
  created_by?: string
  created_at: string
  updated_at: string
}

export interface EmployeeOtherExpense {
  id: string
  user_id: string
  expense_date: string
  expense_type: string
  description: string
  amount: number
  currency: string
  is_recurring: boolean
  recurring_period?: string
  account_id?: string
  notes?: string
  created_by?: string
  created_at: string
  updated_at: string
}

export interface PayrollCalculation {
  id: string
  payroll_period: string
  user_id: string
  base_salary: number
  total_additions: number
  total_deductions: number
  labor_insurance: number
  health_insurance: number
  employment_insurance: number
  pension_contribution: number
  income_tax: number
  net_salary: number
  work_days: number
  actual_work_days: number
  leave_days: number
  overtime_hours: number
  status: '草稿' | '已確認' | '已發放' | '已取消'
  calculated_at?: string
  confirmed_by?: string
  confirmed_at?: string
  payment_date?: string
  payment_reference?: string
  notes?: string
  created_by?: string
  created_at: string
  updated_at: string
}

export interface SalaryTransfer {
  id: string
  transfer_batch_number: string
  transfer_date: string
  total_amount: number
  total_employees: number
  currency: string
  bank_account_id?: string
  status: '待處理' | '處理中' | '已完成' | '已取消' | '部分失敗'
  transfer_file_path?: string
  transfer_reference?: string
  processed_at?: string
  processed_by?: string
  notes?: string
  created_by?: string
  created_at: string
  updated_at: string
  items?: SalaryTransferItem[]
}

export interface SalaryTransferItem {
  id: string
  transfer_id: string
  payroll_calculation_id: string
  user_id: string
  account_number?: string
  account_name?: string
  transfer_amount: number
  status: '待轉帳' | '已轉帳' | '轉帳失敗'
  transfer_reference?: string
  error_message?: string
  transferred_at?: string
  created_at: string
  updated_at: string
}

// ============================================
// 補充功能類型定義
// ============================================

// 遲到扣款規則
export interface LateDeductionRule {
  id: string
  name: string
  rule_type: '固定金額' | '比例扣款' | '階梯式扣款'
  description?: string
  is_active: boolean
  created_by?: string
  created_at: string
  updated_at: string
  items?: LateDeductionRuleItem[]
}

export interface LateDeductionRuleItem {
  id: string
  rule_id: string
  min_minutes: number
  max_minutes?: number
  deduction_type: '固定金額' | '比例' | '階梯'
  deduction_amount?: number
  max_deduction_amount?: number
  sort_order: number
  created_at: string
  updated_at: string
}

export interface EmployeeLateDeductionRule {
  id: string
  user_id: string
  rule_id: string
  effective_date: string
  expiry_date?: string
  is_active: boolean
  created_by?: string
  created_at: string
  updated_at: string
  rule?: LateDeductionRule
}

// 公司管理
export interface Company {
  id: string
  code: string
  name: string
  name_en?: string
  tax_id?: string
  registration_number?: string
  company_type?: string
  contact_person?: string
  phone?: string
  email?: string
  address?: string
  is_active: boolean
  notes?: string
  created_by?: string
  created_at: string
  updated_at: string
}

// 擴展 UserProfile
export interface ExtendedUserProfile extends UserProfile {
  login_name?: string
  company_id?: string
  employee_id?: string
  id_number?: string
  phone?: string
  mobile?: string
  address?: string
  emergency_contact?: string
  emergency_phone?: string
  bank_name?: string
  bank_account?: string
  account_holder?: string
  hire_date?: string
  resignation_date?: string
  requires_attendance?: boolean
  two_factor_enabled?: boolean
  two_factor_secret?: string
  company?: Company
}