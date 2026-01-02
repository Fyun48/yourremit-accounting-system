'use client'

import { useEffect, useState } from 'react'
import supabase from '@/lib/supabase'
import { Plus, Search, Filter, Download, FileText, Calendar } from 'lucide-react'
import { JournalEntryLine, ChartOfAccount } from '@/types'
import { format } from 'date-fns'

interface CashBookEntry {
  id: string
  date: string
  account_code: string
  account_name: string
  description: string
  debit: number
  credit: number
  balance: number
  entry_number: string
}

export default function CashBookPage() {
  const [entries, setEntries] = useState<CashBookEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterAccount, setFilterAccount] = useState('all')
  const [dateRange, setDateRange] = useState({
    start: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  })
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([])

  useEffect(() => {
    loadData()
  }, [dateRange])

  const loadData = async () => {
    try {
      setLoading(true)

      // 載入會計科目
      const { data: accountsData } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('is_active', true)
        .order('code')

      setAccounts(accountsData || [])

      // 載入會計分錄明細
      const { data: linesData, error } = await supabase
        .from('journal_entry_lines')
        .select(`
          *,
          account:chart_of_accounts(*),
          journal_entry:journal_entries(entry_number, entry_date, status)
        `)
        .gte('journal_entry.entry_date', dateRange.start)
        .lte('journal_entry.entry_date', dateRange.end)
        .eq('journal_entry.status', '已過帳')
        .order('journal_entry.entry_date', { ascending: true })
        .order('line_number', { ascending: true })

      if (error) throw error

      // 轉換為流水帳格式
      const cashBookEntries: CashBookEntry[] = []
      let runningBalance = 0

      linesData?.forEach((line: any) => {
        if (!line.account || !line.journal_entry) return

        const entry: CashBookEntry = {
          id: line.id,
          date: line.journal_entry.entry_date,
          account_code: line.account.code,
          account_name: line.account.name,
          description: line.description || line.journal_entry.entry_number,
          debit: parseFloat(String(line.debit_amount)) || 0,
          credit: parseFloat(String(line.credit_amount)) || 0,
          balance: 0,
          entry_number: line.journal_entry.entry_number
        }

        // 計算餘額（簡化版，實際應根據科目類型計算）
        if (line.account.account_type === '資產' || line.account.account_type === '費用') {
          runningBalance += entry.debit - entry.credit
        } else {
          runningBalance += entry.credit - entry.debit
        }
        entry.balance = runningBalance

        cashBookEntries.push(entry)
      })

      setEntries(cashBookEntries)
    } catch (error) {
      console.error('Error loading cash book:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredEntries = entries.filter(entry => {
    const matchesSearch = 
      entry.account_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.account_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.entry_number.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesAccount = filterAccount === 'all' || entry.account_code === filterAccount

    return matchesSearch && matchesAccount
  })

  const totalDebit = filteredEntries.reduce((sum, entry) => sum + entry.debit, 0)
  const totalCredit = filteredEntries.reduce((sum, entry) => sum + entry.credit, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">流水帳</h1>
          <p className="text-slate-600 mt-1">查看所有會計交易的流水記錄</p>
        </div>
      </div>

      {/* 搜尋和篩選 */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="搜尋科目代號、名稱、說明..."
              className="input pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div>
            <label className="label text-xs mb-1">會計科目</label>
            <select
              className="input"
              value={filterAccount}
              onChange={(e) => setFilterAccount(e.target.value)}
            >
              <option value="all">全部科目</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.code}>
                  {account.code} - {account.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label text-xs mb-1">日期範圍</label>
            <div className="flex items-center space-x-2">
              <input
                type="date"
                className="input text-sm"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              />
              <span className="text-slate-500">至</span>
              <input
                type="date"
                className="input text-sm"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 流水帳列表 */}
      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-slate-600">載入中...</p>
          </div>
        ) : filteredEntries.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>日期</th>
                  <th>傳票號碼</th>
                  <th>科目代號</th>
                  <th>科目名稱</th>
                  <th>說明</th>
                  <th className="text-right">借方</th>
                  <th className="text-right">貸方</th>
                  <th className="text-right">餘額</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="font-mono text-sm">
                      {format(new Date(entry.date), 'yyyy/MM/dd')}
                    </td>
                    <td className="font-mono text-sm">{entry.entry_number}</td>
                    <td className="font-mono font-semibold">{entry.account_code}</td>
                    <td>{entry.account_name}</td>
                    <td className="max-w-xs truncate">{entry.description}</td>
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
              </tbody>
              <tfoot>
                <tr className="font-bold bg-slate-50">
                  <td colSpan={5} className="px-6 py-3">合計</td>
                  <td className="px-6 py-3 text-right font-mono">
                    {totalDebit.toLocaleString()}
                  </td>
                  <td className="px-6 py-3 text-right font-mono">
                    {totalCredit.toLocaleString()}
                  </td>
                  <td className="px-6 py-3"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">查無流水帳記錄</p>
            <p className="text-sm text-slate-400 mt-2">請確認日期範圍或篩選條件</p>
          </div>
        )}
      </div>
    </div>
  )
}
