'use client'

import { useEffect, useState } from 'react'
import supabase from '@/lib/supabase'
import { FileText, Download, Calendar, Search } from 'lucide-react'
import { ChartOfAccount } from '@/types'
import { format } from 'date-fns'

interface TrialBalanceItem {
  account: ChartOfAccount
  debit: number
  credit: number
  balance: number
}

export default function TrialBalancePage() {
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([])
  const [trialBalance, setTrialBalance] = useState<TrialBalanceItem[]>([])
  const [loading, setLoading] = useState(false)
  const [asOfDate, setAsOfDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadAccounts()
  }, [])

  useEffect(() => {
    if (accounts.length > 0) {
      loadTrialBalance()
    }
  }, [asOfDate, accounts])

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

  const loadTrialBalance = async () => {
    try {
      setLoading(true)

      // 載入所有已過帳的分錄明細（截至指定日期）
      const { data: linesData, error } = await supabase
        .from('journal_entry_lines')
        .select(`
          *,
          account:chart_of_accounts(*),
          journal_entry:journal_entries(entry_date, status)
        `)
        .lte('journal_entry.entry_date', asOfDate)
        .eq('journal_entry.status', '已過帳')

      if (error) throw error

      // 按科目彙總
      const accountMap = new Map<string, TrialBalanceItem>()

      // 初始化所有科目
      accounts.forEach(account => {
        accountMap.set(account.id, {
          account,
          debit: 0,
          credit: 0,
          balance: 0
        })
      })

      // 彙總交易
      linesData?.forEach((line: any) => {
        if (!line.account) return

        const accountId = line.account.id
        const debit = parseFloat(String(line.debit_amount)) || 0
        const credit = parseFloat(String(line.credit_amount)) || 0

        const item = accountMap.get(accountId)
        if (item) {
          item.debit += debit
          item.credit += credit
        }
      })

      // 計算餘額
      accountMap.forEach((item) => {
        const { account } = item
        if (account.account_type === '資產' || account.account_type === '費用') {
          item.balance = item.debit - item.credit
        } else {
          item.balance = item.credit - item.debit
        }
      })

      // 過濾出有交易或餘額的科目
      const items = Array.from(accountMap.values())
        .filter(item => item.debit > 0 || item.credit > 0 || item.balance !== 0)
        .sort((a, b) => a.account.code.localeCompare(b.account.code))

      setTrialBalance(items)
    } catch (error: any) {
      console.error('Error loading trial balance:', error)
      alert('載入試算表失敗: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const filteredItems = trialBalance.filter(item =>
    item.account.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.account.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalDebit = filteredItems.reduce((sum, item) => sum + item.debit, 0)
  const totalCredit = filteredItems.reduce((sum, item) => sum + item.credit, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">試算表</h1>
          <p className="text-slate-600 mt-1">查看所有會計科目的借貸餘額</p>
        </div>
        <div className="flex items-center space-x-3">
          <div>
            <label className="label text-xs mb-1">截至日期</label>
            <input
              type="date"
              className="input text-sm"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
            />
          </div>
          <button className="btn btn-secondary flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>匯出</span>
          </button>
        </div>
      </div>

      {/* 搜尋 */}
      <div className="card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="搜尋科目代號或名稱..."
            className="input pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* 試算表 */}
      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-slate-600">載入中...</p>
          </div>
        ) : filteredItems.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>科目代號</th>
                    <th>科目名稱</th>
                    <th>科目類型</th>
                    <th className="text-right">借方餘額</th>
                    <th className="text-right">貸方餘額</th>
                    <th className="text-right">淨餘額</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => {
                    const isDebitBalance = item.account.account_type === '資產' || item.account.account_type === '費用'
                    const displayBalance = isDebitBalance 
                      ? (item.balance > 0 ? item.balance : 0)
                      : (item.balance > 0 ? 0 : Math.abs(item.balance))
                    const displayCredit = isDebitBalance
                      ? (item.balance < 0 ? Math.abs(item.balance) : 0)
                      : (item.balance > 0 ? item.balance : 0)

                    return (
                      <tr key={item.account.id}>
                        <td className="font-mono font-semibold">{item.account.code}</td>
                        <td>{item.account.name}</td>
                        <td>
                          <span className={`badge ${
                            item.account.account_type === '資產' ? 'badge-info' :
                            item.account.account_type === '負債' ? 'badge-danger' :
                            item.account.account_type === '權益' ? 'badge-warning' :
                            item.account.account_type === '收入' ? 'badge-success' :
                            'badge-warning'
                          }`}>
                            {item.account.account_type}
                          </span>
                        </td>
                        <td className="text-right font-mono">
                          {displayBalance > 0 ? Number(displayBalance).toLocaleString() : '-'}
                        </td>
                        <td className="text-right font-mono">
                          {displayCredit > 0 ? Number(displayCredit).toLocaleString() : '-'}
                        </td>
                        <td className={`text-right font-mono font-semibold ${
                          item.balance > 0 ? 'text-blue-700' : item.balance < 0 ? 'text-red-700' : ''
                        }`}>
                          {item.balance !== 0 ? Number(item.balance).toLocaleString() : '-'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="font-bold bg-slate-50">
                    <td colSpan={3} className="px-6 py-3">合計</td>
                    <td className="px-6 py-3 text-right font-mono">
                      {filteredItems
                        .filter(item => {
                          const isDebit = item.account.account_type === '資產' || item.account.account_type === '費用'
                          return isDebit ? item.balance > 0 : item.balance < 0
                        })
                        .reduce((sum, item) => sum + Math.abs(item.balance), 0)
                        .toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-right font-mono">
                      {filteredItems
                        .filter(item => {
                          const isDebit = item.account.account_type === '資產' || item.account.account_type === '費用'
                          return isDebit ? item.balance < 0 : item.balance > 0
                        })
                        .reduce((sum, item) => sum + Math.abs(item.balance), 0)
                        .toLocaleString()}
                    </td>
                    <td className="px-6 py-3"></td>
                  </tr>
                  <tr className="font-bold bg-blue-50">
                    <td colSpan={3} className="px-6 py-3">借貸總額</td>
                    <td className="px-6 py-3 text-right font-mono text-blue-700">
                      {totalDebit.toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-blue-700">
                      {totalCredit.toLocaleString()}
                    </td>
                    <td className={`px-6 py-3 text-right font-mono ${
                      Math.abs(totalDebit - totalCredit) < 0.01 ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {Math.abs(totalDebit - totalCredit) < 0.01 ? '✓ 平衡' : '✗ 不平衡'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        ) : (
          <div className="p-12 text-center">
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">查無試算表資料</p>
            <p className="text-sm text-slate-400 mt-2">請確認日期或是否有已過帳的分錄</p>
          </div>
        )}
      </div>
    </div>
  )
}
