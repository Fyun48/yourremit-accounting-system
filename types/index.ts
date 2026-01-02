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
