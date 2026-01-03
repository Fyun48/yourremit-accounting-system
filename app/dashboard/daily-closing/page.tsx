'use client'

import { useEffect, useState } from 'react'
import supabase from '@/lib/supabase'
import { Calendar, Download, CheckCircle, XCircle, FileText, TrendingUp, DollarSign, Wallet } from 'lucide-react'
import { DailyClosing, ChartOfAccount } from '@/types'
import { format, parseISO } from 'date-fns'

interface DailyStats {
  totalReceiptsTWD: number
  totalRemittances: number
  remittanceCurrency: string
  totalServiceFees: number
  trustAccountBalance: number
  companyAccountBalance: number
  transactionCount: number
}

export default function DailyClosingPage() {
  const [closings, setClosings] = useState<DailyClosing[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [dailyStats, setDailyStats] = useState<DailyStats | null>(null)
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([])
  const [calculating, setCalculating] = useState(false)
  const [showClosingModal, setShowClosingModal] = useState(false)
  const [closingNotes, setClosingNotes] = useState('')

  useEffect(() => {
    loadClosings()
    loadAccounts()
  }, [])

  useEffect(() => {
    if (selectedDate) {
      calculateDailyStats()
    }
  }, [selectedDate])

  const loadClosings = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_closings')
        .select('*')
        .order('closing_date', { ascending: false })
        .limit(30)

      if (error) throw error
      setClosings(data || [])
    } catch (error: any) {
      console.error('Error loading closings:', error)
    }
  }

  const loadAccounts = async () => {
    try {
      const { data } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('is_active', true)
        .order('code')

      setAccounts(data || [])
    } catch (error: any) {
      console.error('Error loading accounts:', error)
    }
  }

  const calculateDailyStats = async () => {
    try {
      setCalculating(true)

      // 1. 計算今日總收款（TWD）- 從匯款交易中查詢
      const { data: receiptsData } = await supabase
        .from('remittance_transactions')
        .select('total_amount, from_currency, service_fee, remittance_amount, to_currency, remitted_amount, status')
        .eq('transaction_date', selectedDate)
        .eq('from_currency', 'TWD')

      const totalReceiptsTWD = receiptsData?.reduce((sum, tx) => {
        if (tx.status === '已收款' || tx.status === '已匯出') {
          return sum + (parseFloat(String(tx.total_amount)) || 0)
        }
        return sum
      }, 0) || 0

      // 2. 計算今日總匯出（外幣）- 已匯出的交易
      const { data: remittancesData } = await supabase
        .from('remittance_transactions')
        .select('remitted_amount, to_currency, status')
        .eq('transaction_date', selectedDate)
        .eq('status', '已匯出')

      const remittancesByCurrency: Record<string, number> = {}
      remittancesData?.forEach(tx => {
        const currency = tx.to_currency || 'USD'
        const amount = parseFloat(String(tx.remitted_amount)) || 0
        remittancesByCurrency[currency] = (remittancesByCurrency[currency] || 0) + amount
      })

      const mainCurrency = Object.keys(remittancesByCurrency)[0] || 'USD'
      const totalRemittances = remittancesByCurrency[mainCurrency] || 0

      // 3. 計算今日手續費收入
      const totalServiceFees = receiptsData?.reduce((sum, tx) => {
        if (tx.status === '已收款' || tx.status === '已匯出') {
          return sum + (parseFloat(String(tx.service_fee)) || 0)
        }
        return sum
      }, 0) || 0

      // 4. 計算專戶餘額（從會計分錄計算）
      const trustAccountSubject = accounts.find(a => 
        a.code === '1121' || a.name.includes('信託專戶')
      )

      let trustAccountBalance = 0
      if (trustAccountSubject) {
        const { data: trustLines } = await supabase
          .from('journal_entry_lines')
          .select(`
            *,
            journal_entry:journal_entries(entry_date, status)
          `)
          .eq('account_id', trustAccountSubject.id)
          .lte('journal_entry.entry_date', selectedDate)
          .eq('journal_entry.status', '已過帳')

        trustLines?.forEach((line: any) => {
          const debit = parseFloat(String(line.debit_amount)) || 0
          const credit = parseFloat(String(line.credit_amount)) || 0
          trustAccountBalance += debit - credit
        })
      }

      // 5. 計算公司帳戶餘額（排除信託專戶的其他銀行存款）
      const companyAccountSubjects = accounts.filter(a => 
        (a.code.startsWith('111') && !a.name.includes('信託')) || 
        a.code === '1111'
      )

      let companyAccountBalance = 0
      for (const account of companyAccountSubjects) {
        const { data: companyLines } = await supabase
          .from('journal_entry_lines')
          .select(`
            *,
            journal_entry:journal_entries(entry_date, status)
          `)
          .eq('account_id', account.id)
          .lte('journal_entry.entry_date', selectedDate)
          .eq('journal_entry.status', '已過帳')

        companyLines?.forEach((line: any) => {
          const debit = parseFloat(String(line.debit_amount)) || 0
          const credit = parseFloat(String(line.credit_amount)) || 0
          companyAccountBalance += debit - credit
        })
      }

      setDailyStats({
        totalReceiptsTWD,
        totalRemittances,
        remittanceCurrency: mainCurrency,
        totalServiceFees,
        trustAccountBalance,
        companyAccountBalance,
        transactionCount: receiptsData?.length || 0
      })
    } catch (error: any) {
      console.error('Error calculating stats:', error)
      alert('計算失敗: ' + error.message)
    } finally {
      setCalculating(false)
    }
  }

  const generateClosingJournalEntry = async (stats: DailyStats, date: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      // 生成傳票號碼
      const dateStr = date.replace(/-/g, '')
      const { data: existingEntries } = await supabase
        .from('journal_entries')
        .select('entry_number')
        .like('entry_number', `${dateStr}%`)
        .order('entry_number', { ascending: false })
        .limit(1)

      let entryNumber = `${dateStr}-0001`
      if (existingEntries && existingEntries.length > 0) {
        const lastNumber = parseInt(existingEntries[0].entry_number.slice(-4))
        entryNumber = `${dateStr}-${String(lastNumber + 1).padStart(4, '0')}`
      }

      // 創建日結傳票
      const { data: entry, error: entryError } = await supabase
        .from('journal_entries')
        .insert([{
          entry_number: entryNumber,
          entry_date: date,
          description: `日結傳票 - ${date}`,
          status: '已過帳',
          total_debit: stats.totalReceiptsTWD,
          total_credit: stats.totalReceiptsTWD,
          created_by: user?.id,
          approved_by: user?.id,
          posted_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (entryError) throw entryError

      // 這裡可以添加日結傳票的明細分錄（如果需要）
      // 目前日結主要是記錄統計數據，實際的分錄已在匯款交易時生成

      return entry.id
    } catch (error: any) {
      console.error('Error generating journal entry:', error)
      return null
    }
  }

  const handleDailyClosing = async () => {
    if (!dailyStats) return

    try {
      setCalculating(true)
      const { data: { user } } = await supabase.auth.getUser()

      // 檢查是否已經結帳
      const { data: existingClosing } = await supabase
        .from('daily_closings')
        .select('*')
        .eq('closing_date', selectedDate)
        .single()

      if (existingClosing && existingClosing.status === '已結帳') {
        if (!confirm('該日期已結帳，是否要重新結帳？')) return
      }

      // 生成日結傳票
      const journalEntryId = await generateClosingJournalEntry(dailyStats, selectedDate)

      // 創建或更新日結記錄
      const closingData = {
        closing_date: selectedDate,
        total_receipts_twd: dailyStats.totalReceiptsTWD,
        total_remittances: dailyStats.totalRemittances,
        remittance_currency: dailyStats.remittanceCurrency,
        total_service_fees: dailyStats.totalServiceFees,
        trust_account_balance: dailyStats.trustAccountBalance,
        company_account_balance: dailyStats.companyAccountBalance,
        status: '已結帳',
        journal_entry_id: journalEntryId,
        notes: closingNotes,
        created_by: user?.id
      }

      if (existingClosing) {
        const { error } = await supabase
          .from('daily_closings')
          .update(closingData)
          .eq('id', existingClosing.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('daily_closings')
          .insert([closingData])

        if (error) throw error
      }

      alert('日結完成！')
      setShowClosingModal(false)
      setClosingNotes('')
      loadClosings()
      calculateDailyStats()
    } catch (error: any) {
      alert('日結失敗: ' + error.message)
    } finally {
      setCalculating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">日結作業</h1>
          <p className="text-slate-600 mt-1">每日結帳與日計表生成</p>
        </div>
        <div className="flex items-center space-x-3">
          <input
            type="date"
            className="input"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
          <button
            onClick={() => {
              setClosingNotes('')
              setShowClosingModal(true)
            }}
            className="btn btn-primary flex items-center space-x-2"
            disabled={!dailyStats || calculating}
          >
            <CheckCircle className="w-5 h-5" />
            <span>執行日結</span>
          </button>
        </div>
      </div>

      {/* 日計表統計 */}
      {calculating ? (
        <div className="card text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">計算中...</p>
        </div>
      ) : dailyStats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">今日總收款（TWD）</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">
                  {dailyStats.totalReceiptsTWD.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">今日總匯出</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">
                  {dailyStats.totalRemittances.toLocaleString()} {dailyStats.remittanceCurrency}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">今日手續費收入</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {dailyStats.totalServiceFees.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">專戶餘額</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">
                  {dailyStats.trustAccountBalance.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">公司帳戶餘額</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">
                  {dailyStats.companyAccountBalance.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                <FileText className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">交易筆數</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">
                  {dailyStats.transactionCount}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-pink-100 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-pink-600" />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card text-center py-12">
          <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">請選擇日期以查看日計表</p>
        </div>
      )}

      {/* 日結歷史記錄 */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-800">日結歷史記錄</h2>
          <button className="btn btn-secondary flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>匯出</span>
          </button>
        </div>

        {closings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>結帳日期</th>
                  <th>總收款（TWD）</th>
                  <th>總匯出</th>
                  <th>手續費收入</th>
                  <th>專戶餘額</th>
                  <th>公司餘額</th>
                  <th>狀態</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {closings.map((closing) => (
                  <tr key={closing.id}>
                    <td className="font-mono">
                      {format(parseISO(closing.closing_date), 'yyyy/MM/dd')}
                    </td>
                    <td className="font-mono text-right">
                      {closing.total_receipts_twd.toLocaleString()}
                    </td>
                    <td className="font-mono text-right">
                      {closing.total_remittances.toLocaleString()} {closing.remittance_currency}
                    </td>
                    <td className="font-mono text-right text-green-600">
                      {closing.total_service_fees.toLocaleString()}
                    </td>
                    <td className="font-mono text-right">
                      {closing.trust_account_balance.toLocaleString()}
                    </td>
                    <td className="font-mono text-right">
                      {closing.company_account_balance.toLocaleString()}
                    </td>
                    <td>
                      <span className={`badge ${
                        closing.status === '已結帳' ? 'badge-success' :
                        closing.status === '已確認' ? 'badge-info' :
                        'badge-warning'
                      }`}>
                        {closing.status}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-secondary text-sm">
                        查看詳情
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            尚無日結記錄
          </div>
        )}
      </div>

      {/* 日結確認 Modal */}
      {showClosingModal && dailyStats && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card max-w-2xl w-full animate-fadeIn">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">確認日結</h2>
              <button
                onClick={() => setShowClosingModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600">結帳日期：</span>
                  <span className="font-semibold">{selectedDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">今日總收款（TWD）：</span>
                  <span className="font-mono font-semibold">
                    {dailyStats.totalReceiptsTWD.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">今日總匯出：</span>
                  <span className="font-mono font-semibold">
                    {dailyStats.totalRemittances.toLocaleString()} {dailyStats.remittanceCurrency}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">今日手續費收入：</span>
                  <span className="font-mono font-semibold text-green-600">
                    {dailyStats.totalServiceFees.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">專戶餘額：</span>
                  <span className="font-mono font-semibold">
                    {dailyStats.trustAccountBalance.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">公司帳戶餘額：</span>
                  <span className="font-mono font-semibold">
                    {dailyStats.companyAccountBalance.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">交易筆數：</span>
                  <span className="font-semibold">{dailyStats.transactionCount}</span>
                </div>
              </div>

              <div>
                <label className="label">備註</label>
                <textarea
                  className="input"
                  rows={3}
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  placeholder="日結備註..."
                ></textarea>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>注意：</strong>執行日結後，系統會自動生成日結傳票，並將狀態設為「已結帳」。
                  請確認以上數據無誤後再執行。
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowClosingModal(false)}
                  className="btn btn-secondary"
                >
                  取消
                </button>
                <button
                  onClick={handleDailyClosing}
                  className="btn btn-primary"
                  disabled={calculating}
                >
                  {calculating ? '處理中...' : '確認日結'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

