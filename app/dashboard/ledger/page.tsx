'use client'

import { useEffect, useState } from 'react'
import supabase from '@/lib/supabase'
import { Search, FileText, Download, Calendar } from 'lucide-react'
import { ChartOfAccount, JournalEntryLine } from '@/types'
import { format } from 'date-fns'

interface LedgerEntry {
  date: string
  entry_number: string
  description: string
  debit: number
  credit: number
  balance: number
}

interface AccountLedger {
  account: ChartOfAccount
  openingBalance: number
  entries: LedgerEntry[]
  closingBalance: number
  totalDebit: number
  totalCredit: number
}

export default function LedgerPage() {
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([])
  const [selectedAccount, setSelectedAccount] = useState<string>('')
  const [ledger, setLedger] = useState<AccountLedger | null>(null)
  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState({
    start: format(new Date(new Date().getFullYear(), 0, 1), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  })

  useEffect(() => {
    loadAccounts()
  }, [])

  useEffect(() => {
    if (selectedAccount) {
      loadLedger()
    }
  }, [selectedAccount, dateRange])

  const loadAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('is_active', true)
        .order('code')

      if (error) throw error
      setAccounts(data || [])
    } catch (error: any) {
      console.error('Error loading accounts:', error)
    }
  }

  const loadLedger = async () => {
    if (!selectedAccount) return

    try {
      setLoading(true)

      const account = accounts.find(a => a.id === selectedAccount)
      if (!account) return

      // 載入期初餘額（過帳日期在查詢日期之前的交易）
      const { data: openingData } = await supabase
        .from('journal_entry_lines')
        .select(`
          *,
          journal_entry:journal_entries(entry_date, entry_number, status)
        `)
        .eq('account_id', selectedAccount)
        .eq('journal_entry.status', '已過帳')
        .lt('journal_entry.entry_date', dateRange.start)
        .order('journal_entry.entry_date', { ascending: true })

      // 載入期間交易
      const { data: periodData, error } = await supabase
        .from('journal_entry_lines')
        .select(`
          *,
          journal_entry:journal_entries(entry_date, entry_number, description, status)
        `)
        .eq('account_id', selectedAccount)
        .eq('journal_entry.status', '已過帳')
        .gte('journal_entry.entry_date', dateRange.start)
        .lte('journal_entry.entry_date', dateRange.end)
        .order('journal_entry.entry_date', { ascending: true })
        .order('line_number', { ascending: true })

      if (error) throw error

      // 計算期初餘額
      let openingBalance = 0
      openingData?.forEach((line: any) => {
        const debit = parseFloat(String(line.debit_amount)) || 0
        const credit = parseFloat(String(line.credit_amount)) || 0
        
        if (account.account_type === '資產' || account.account_type === '費用') {
          openingBalance += debit - credit
        } else {
          openingBalance += credit - debit
        }
      })

      // 處理期間交易
      const entries: LedgerEntry[] = []
      let balance = openingBalance
      let totalDebit = 0
      let totalCredit = 0

      periodData?.forEach((line: any) => {
        const debit = parseFloat(String(line.debit_amount)) || 0
        const credit = parseFloat(String(line.credit_amount)) || 0
        
        if (account.account_type === '資產' || account.account_type === '費用') {
          balance += debit - credit
        } else {
          balance += credit - debit
        }

        totalDebit += debit
        totalCredit += credit

        entries.push({
          date: line.journal_entry.entry_date,
          entry_number: line.journal_entry.entry_number,
          description: line.description || line.journal_entry.description || '',
          debit,
          credit,
          balance
        })
      })

      setLedger({
        account,
        openingBalance,
        entries,
        closingBalance: balance,
        totalDebit,
        totalCredit
      })
    } catch (error: any) {
      console.error('Error loading ledger:', error)
      alert('載入總分類帳失敗: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">總分類帳</h1>
        <p className="text-slate-600 mt-1">查看各會計科目的詳細交易記錄與餘額</p>
      </div>

      {/* 查詢條件 */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">會計科目 *</label>
            <select
              className="input"
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              required
            >
              <option value="">請選擇科目</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.code} - {account.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">起始日期</label>
            <input
              type="date"
              className="input"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            />
          </div>
          <div>
            <label className="label">結束日期</label>
            <input
              type="date"
              className="input"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* 總分類帳內容 */}
      {loading ? (
        <div className="card text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">載入中...</p>
        </div>
      ) : ledger ? (
        <div className="card overflow-hidden p-0">
          {/* 科目資訊 */}
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">{ledger.account.name}</h2>
                <p className="text-sm opacity-90 mt-1">
                  {ledger.account.code} | {ledger.account.account_type}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm opacity-90">期初餘額</p>
                <p className="text-2xl font-bold">
                  {Number(ledger.openingBalance).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* 交易明細 */}
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>日期</th>
                  <th>傳票號碼</th>
                  <th>說明</th>
                  <th className="text-right">借方</th>
                  <th className="text-right">貸方</th>
                  <th className="text-right">餘額</th>
                </tr>
              </thead>
              <tbody>
                {/* 期初餘額行 */}
                <tr className="bg-slate-50 font-semibold">
                  <td colSpan={3} className="px-6 py-3">期初餘額</td>
                  <td className="px-6 py-3"></td>
                  <td className="px-6 py-3"></td>
                  <td className="px-6 py-3 text-right font-mono">
                    {Number(ledger.openingBalance).toLocaleString()}
                  </td>
                </tr>

                {/* 交易明細 */}
                {ledger.entries.map((entry, index) => (
                  <tr key={index}>
                    <td className="font-mono text-sm">
                      {format(new Date(entry.date), 'yyyy/MM/dd')}
                    </td>
                    <td className="font-mono text-sm">{entry.entry_number}</td>
                    <td>{entry.description}</td>
                    <td className="text-right font-mono">
                      {entry.debit > 0 ? Number(entry.debit).toLocaleString() : '-'}
                    </td>
                    <td className="text-right font-mono">
                      {entry.credit > 0 ? Number(entry.credit).toLocaleString() : '-'}
                    </td>
                    <td className="text-right font-mono font-semibold">
                      {Number(entry.balance).toLocaleString()}
                    </td>
                  </tr>
                ))}

                {/* 合計行 */}
                <tr className="bg-slate-50 font-semibold">
                  <td colSpan={3} className="px-6 py-3">本期合計</td>
                  <td className="px-6 py-3 text-right font-mono">
                    {Number(ledger.totalDebit).toLocaleString()}
                  </td>
                  <td className="px-6 py-3 text-right font-mono">
                    {Number(ledger.totalCredit).toLocaleString()}
                  </td>
                  <td className="px-6 py-3"></td>
                </tr>

                {/* 期末餘額行 */}
                <tr className="bg-blue-50 font-bold">
                  <td colSpan={3} className="px-6 py-3">期末餘額</td>
                  <td className="px-6 py-3"></td>
                  <td className="px-6 py-3"></td>
                  <td className="px-6 py-3 text-right font-mono text-blue-700">
                    {Number(ledger.closingBalance).toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : selectedAccount ? (
        <div className="card text-center py-12">
          <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">查無交易記錄</p>
        </div>
      ) : (
        <div className="card text-center py-12">
          <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">請選擇會計科目以查看總分類帳</p>
        </div>
      )}
    </div>
  )
}
