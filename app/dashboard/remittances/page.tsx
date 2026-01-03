'use client'

import { useEffect, useState } from 'react'
import supabase from '@/lib/supabase'
import { Plus, Search, Edit, Trash2, X, Check, Filter, Download, FileText, CheckCircle, XCircle } from 'lucide-react'
import { RemittanceTransaction, TrustAccount, ChartOfAccount } from '@/types'
import { format } from 'date-fns'

export default function RemittancesPage() {
  const [transactions, setTransactions] = useState<RemittanceTransaction[]>([])
  const [trustAccounts, setTrustAccounts] = useState<TrustAccount[]>([])
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<RemittanceTransaction | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | '待處理' | '已收款' | '已匯出' | '已取消'>('all')
  const [dateRange, setDateRange] = useState({
    start: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  })

  const [formData, setFormData] = useState({
    transaction_number: '',
    transaction_date: format(new Date(), 'yyyy-MM-dd'),
    customer_name: '',
    remittance_amount: '',
    service_fee: '',
    total_amount: '',
    from_currency: 'TWD',
    to_currency: 'USD',
    exchange_rate: '',
    remitted_amount: '',
    payment_method: '',
    payment_reference: '',
    trust_account_id: '',
    status: '待處理' as '待處理' | '已收款' | '已匯出' | '已取消',
    notes: ''
  })

  useEffect(() => {
    loadData()
  }, [dateRange])

  const loadData = async () => {
    try {
      setLoading(true)

      // 載入信託專戶
      const { data: trustData } = await supabase
        .from('trust_accounts')
        .select('*')
        .eq('is_active', true)
        .order('account_code')

      // 載入會計科目（用於自動生成分錄）
      const { data: accountsData } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('is_active', true)
        .order('code')

      // 載入匯款交易
      const { data: transactionsData, error } = await supabase
        .from('remittance_transactions')
        .select('*, trust_account:trust_accounts(*)')
        .gte('transaction_date', dateRange.start)
        .lte('transaction_date', dateRange.end)
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error

      setTrustAccounts(trustData || [])
      setAccounts(accountsData || [])
      setTransactions(transactionsData || [])
    } catch (error: any) {
      console.error('Error loading data:', error)
      alert('載入失敗: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const generateTransactionNumber = async () => {
    const today = format(new Date(), 'yyyyMMdd')
    const { data } = await supabase
      .from('remittance_transactions')
      .select('transaction_number')
      .like('transaction_number', `RM${today}%`)
      .order('transaction_number', { ascending: false })
      .limit(1)

    if (data && data.length > 0) {
      const lastNumber = parseInt(data[0].transaction_number.slice(-4))
      return `RM${today}${String(lastNumber + 1).padStart(4, '0')}`
    }
    return `RM${today}0001`
  }

  const calculateTotalAmount = () => {
    const remittance = parseFloat(formData.remittance_amount) || 0
    const fee = parseFloat(formData.service_fee) || 0
    const total = remittance + fee
    setFormData({ ...formData, total_amount: total.toFixed(2) })
  }

  const calculateRemittedAmount = () => {
    const total = parseFloat(formData.total_amount) || 0
    const rate = parseFloat(formData.exchange_rate) || 0
    if (rate > 0) {
      const remitted = total / rate
      setFormData({ ...formData, remitted_amount: remitted.toFixed(2) })
    }
  }

  useEffect(() => {
    calculateTotalAmount()
  }, [formData.remittance_amount, formData.service_fee])

  useEffect(() => {
    if (formData.exchange_rate && formData.total_amount) {
      calculateRemittedAmount()
    }
  }, [formData.exchange_rate, formData.total_amount])

  const createJournalEntry = async (transactionId: string, transaction: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      // 找到相關會計科目
      const trustAccount = trustAccounts.find(a => a.id === transaction.trust_account_id)
      const trustAccountCode = trustAccount?.account_code || '1121' // 預設信託專戶科目
      
      // 查找會計科目 ID
      const trustAccountSubject = accounts.find(a => a.code === trustAccountCode || a.name.includes('信託專戶'))
      const payableSubject = accounts.find(a => a.code === '2001' || a.name.includes('代付款項'))
      const feeRevenueSubject = accounts.find(a => a.code === '4101' || a.name.includes('手續費收入'))
      const taxSubject = accounts.find(a => a.code.includes('2199') || a.name.includes('銷項稅額'))

      if (!trustAccountSubject || !payableSubject || !feeRevenueSubject) {
        console.warn('找不到必要的會計科目，跳過自動分錄生成')
        return null
      }

      const remittanceAmount = parseFloat(transaction.remittance_amount)
      const serviceFee = parseFloat(transaction.service_fee)
      const totalAmount = parseFloat(transaction.total_amount)
      const taxAmount = serviceFee * 0.05 // 假設營業稅 5%

      const entryNumber = await generateEntryNumber(transaction.transaction_date)

      // 創建會計分錄
      const { data: entry, error: entryError } = await supabase
        .from('journal_entries')
        .insert([{
          entry_number: entryNumber,
          entry_date: transaction.transaction_date,
          description: `匯款交易 ${transaction.transaction_number} - ${transaction.customer_name || '客戶'}`,
          status: '草稿',
          total_debit: totalAmount,
          total_credit: totalAmount,
          created_by: user?.id
        }])
        .select()
        .single()

      if (entryError) throw entryError

      // 創建分錄明細
      const lines = [
        {
          journal_entry_id: entry.id,
          line_number: 1,
          account_id: trustAccountSubject.id,
          description: `匯款交易 ${transaction.transaction_number} - 收款`,
          debit_amount: totalAmount,
          credit_amount: 0,
          currency: transaction.from_currency
        },
        {
          journal_entry_id: entry.id,
          line_number: 2,
          account_id: payableSubject.id,
          description: `代付款項 - ${transaction.customer_name || '客戶'}`,
          debit_amount: 0,
          credit_amount: remittanceAmount,
          currency: transaction.from_currency
        },
        {
          journal_entry_id: entry.id,
          line_number: 3,
          account_id: feeRevenueSubject.id,
          description: `手續費收入 - ${transaction.transaction_number}`,
          debit_amount: 0,
          credit_amount: serviceFee - taxAmount,
          currency: transaction.from_currency
        }
      ]

      // 如果有稅額科目，添加稅額分錄
      if (taxSubject && taxAmount > 0) {
        lines.push({
          journal_entry_id: entry.id,
          line_number: 4,
          account_id: taxSubject.id,
          description: `銷項稅額 - ${transaction.transaction_number}`,
          debit_amount: 0,
          credit_amount: taxAmount,
          currency: transaction.from_currency
        })
      }

      const { error: linesError } = await supabase
        .from('journal_entry_lines')
        .insert(lines)

      if (linesError) throw linesError

      return entry.id
    } catch (error: any) {
      console.error('Error creating journal entry:', error)
      return null
    }
  }

  const generateEntryNumber = async (date: string) => {
    const dateStr = date.replace(/-/g, '')
    const { data } = await supabase
      .from('journal_entries')
      .select('entry_number')
      .like('entry_number', `${dateStr}%`)
      .order('entry_number', { ascending: false })
      .limit(1)

    if (data && data.length > 0) {
      const lastNumber = parseInt(data[0].entry_number.slice(-4))
      return `${dateStr}-${String(lastNumber + 1).padStart(4, '0')}`
    }
    return `${dateStr}-0001`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      let transactionNumber = formData.transaction_number
      if (!transactionNumber) {
        transactionNumber = await generateTransactionNumber()
      }

      const transactionData = {
        transaction_number: transactionNumber,
        transaction_date: formData.transaction_date,
        customer_name: formData.customer_name,
        remittance_amount: parseFloat(formData.remittance_amount),
        service_fee: parseFloat(formData.service_fee),
        total_amount: parseFloat(formData.total_amount),
        from_currency: formData.from_currency,
        to_currency: formData.to_currency,
        exchange_rate: formData.exchange_rate ? parseFloat(formData.exchange_rate) : null,
        remitted_amount: formData.remitted_amount ? parseFloat(formData.remitted_amount) : null,
        payment_method: formData.payment_method,
        payment_reference: formData.payment_reference,
        trust_account_id: formData.trust_account_id || null,
        status: formData.status,
        notes: formData.notes,
        created_by: user?.id
      }

      let journalEntryId = null

      if (editingTransaction) {
        const { error } = await supabase
          .from('remittance_transactions')
          .update(transactionData)
          .eq('id', editingTransaction.id)

        if (error) throw error
        alert('匯款交易更新成功！')
      } else {
        const { data: newTransaction, error } = await supabase
          .from('remittance_transactions')
          .insert([transactionData])
          .select()
          .single()

        if (error) throw error

        // 如果狀態是「已收款」，自動生成會計分錄
        if (formData.status === '已收款' && newTransaction) {
          journalEntryId = await createJournalEntry(newTransaction.id, newTransaction)
          
          if (journalEntryId) {
            // 更新交易記錄，關聯會計分錄
            await supabase
              .from('remittance_transactions')
              .update({ journal_entry_id: journalEntryId })
              .eq('id', newTransaction.id)
          }
        }

        alert('匯款交易新增成功！' + (journalEntryId ? '已自動生成會計分錄。' : ''))
      }

      setShowModal(false)
      resetForm()
      loadData()
    } catch (error: any) {
      alert('操作失敗: ' + error.message)
    }
  }

  const handleStatusChange = async (transactionId: string, newStatus: string) => {
    try {
      const transaction = transactions.find(t => t.id === transactionId)
      if (!transaction) return

      // 如果從其他狀態變為「已收款」，且還沒有會計分錄，則生成
      if (newStatus === '已收款' && !transaction.journal_entry_id) {
        const journalEntryId = await createJournalEntry(transactionId, transaction)
        
        const { error } = await supabase
          .from('remittance_transactions')
          .update({
            status: newStatus as any,
            journal_entry_id: journalEntryId
          })
          .eq('id', transactionId)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('remittance_transactions')
          .update({ status: newStatus as any })
          .eq('id', transactionId)

        if (error) throw error
      }

      alert('狀態更新成功！')
      loadData()
    } catch (error: any) {
      alert('狀態更新失敗: ' + error.message)
    }
  }

  const handleEdit = (transaction: RemittanceTransaction) => {
    setEditingTransaction(transaction)
    setFormData({
      transaction_number: transaction.transaction_number,
      transaction_date: transaction.transaction_date,
      customer_name: transaction.customer_name || '',
      remittance_amount: transaction.remittance_amount.toString(),
      service_fee: transaction.service_fee.toString(),
      total_amount: transaction.total_amount.toString(),
      from_currency: transaction.from_currency,
      to_currency: transaction.to_currency,
      exchange_rate: transaction.exchange_rate?.toString() || '',
      remitted_amount: transaction.remitted_amount?.toString() || '',
      payment_method: transaction.payment_method || '',
      payment_reference: transaction.payment_reference || '',
      trust_account_id: transaction.trust_account_id || '',
      status: transaction.status,
      notes: transaction.notes || ''
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除此匯款交易嗎？')) return

    try {
      const { error } = await supabase
        .from('remittance_transactions')
        .delete()
        .eq('id', id)

      if (error) throw error
      alert('刪除成功！')
      loadData()
    } catch (error: any) {
      alert('刪除失敗: ' + error.message)
    }
  }

  const resetForm = () => {
    setEditingTransaction(null)
    setFormData({
      transaction_number: '',
      transaction_date: format(new Date(), 'yyyy-MM-dd'),
      customer_name: '',
      remittance_amount: '',
      service_fee: '',
      total_amount: '',
      from_currency: 'TWD',
      to_currency: 'USD',
      exchange_rate: '',
      remitted_amount: '',
      payment_method: '',
      payment_reference: '',
      trust_account_id: '',
      status: '待處理',
      notes: ''
    })
  }

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = 
      tx.transaction_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.payment_reference?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = filterStatus === 'all' || tx.status === filterStatus

    return matchesSearch && matchesStatus
  })

  // 計算統計數據
  const stats = {
    totalTransactions: filteredTransactions.length,
    totalRemittance: filteredTransactions.reduce((sum, tx) => sum + tx.remittance_amount, 0),
    totalServiceFees: filteredTransactions.reduce((sum, tx) => sum + tx.service_fee, 0),
    totalAmount: filteredTransactions.reduce((sum, tx) => sum + tx.total_amount, 0)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">匯款交易管理</h1>
          <p className="text-slate-600 mt-1">管理移工匯款交易，自動分離手續費與本金</p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setShowModal(true)
          }}
          className="btn btn-primary flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>新增交易</span>
        </button>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-sm text-slate-600">總交易數</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{stats.totalTransactions}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-600">總匯款金額</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">
            {stats.totalRemittance.toLocaleString()}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-600">總手續費</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {stats.totalServiceFees.toLocaleString()}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-600">總收款金額</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {stats.totalAmount.toLocaleString()}
          </p>
        </div>
      </div>

      {/* 搜尋和篩選 */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="搜尋交易編號、客戶姓名、付款參考號..."
              className="input pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div>
            <label className="label text-xs mb-1">狀態</label>
            <select
              className="input"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
            >
              <option value="all">全部狀態</option>
              <option value="待處理">待處理</option>
              <option value="已收款">已收款</option>
              <option value="已匯出">已匯出</option>
              <option value="已取消">已取消</option>
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

      {/* 交易列表 */}
      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-slate-600">載入中...</p>
          </div>
        ) : filteredTransactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>交易編號</th>
                  <th>交易日期</th>
                  <th>客戶姓名</th>
                  <th>匯款金額</th>
                  <th>手續費</th>
                  <th>總金額</th>
                  <th>目標幣別</th>
                  <th>付款方式</th>
                  <th>狀態</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="font-mono font-semibold">{tx.transaction_number}</td>
                    <td className="font-mono text-sm">
                      {format(new Date(tx.transaction_date), 'yyyy/MM/dd')}
                    </td>
                    <td>{tx.customer_name || '-'}</td>
                    <td className="font-mono text-right">
                      {tx.remittance_amount.toLocaleString()} {tx.from_currency}
                    </td>
                    <td className="font-mono text-right text-green-600">
                      {tx.service_fee.toLocaleString()} {tx.from_currency}
                    </td>
                    <td className="font-mono text-right font-semibold">
                      {tx.total_amount.toLocaleString()} {tx.from_currency}
                    </td>
                    <td className="font-mono">{tx.to_currency}</td>
                    <td>{tx.payment_method || '-'}</td>
                    <td>
                      <div className="flex items-center space-x-2">
                        <span className={`badge ${
                          tx.status === '已匯出' ? 'badge-success' :
                          tx.status === '已收款' ? 'badge-info' :
                          tx.status === '已取消' ? 'badge-danger' :
                          'badge-warning'
                        }`}>
                          {tx.status}
                        </span>
                        {tx.journal_entry_id && (
                          <CheckCircle className="w-4 h-4 text-green-500" title="已生成會計分錄" />
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center space-x-2">
                        {tx.status !== '已匯出' && tx.status !== '已取消' && (
                          <select
                            className="input text-xs"
                            value={tx.status}
                            onChange={(e) => handleStatusChange(tx.id, e.target.value)}
                          >
                            <option value="待處理">待處理</option>
                            <option value="已收款">已收款</option>
                            <option value="已匯出">已匯出</option>
                            <option value="已取消">已取消</option>
                          </select>
                        )}
                        <button
                          onClick={() => handleEdit(tx)}
                          className="p-1 hover:bg-blue-50 rounded"
                        >
                          <Edit className="w-4 h-4 text-blue-600" />
                        </button>
                        <button
                          onClick={() => handleDelete(tx.id)}
                          className="p-1 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">查無匯款交易記錄</p>
          </div>
        )}
      </div>

      {/* 新增/編輯 Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-fadeIn">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">
                {editingTransaction ? '編輯匯款交易' : '新增匯款交易'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false)
                  resetForm()
                }}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">交易編號</label>
                  <input
                    type="text"
                    className="input font-mono"
                    value={formData.transaction_number}
                    onChange={(e) => setFormData({ ...formData, transaction_number: e.target.value })}
                    placeholder="自動生成（留空）"
                  />
                </div>
                <div>
                  <label className="label">交易日期 *</label>
                  <input
                    type="date"
                    className="input"
                    value={formData.transaction_date}
                    onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">客戶姓名</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    placeholder="移工姓名"
                  />
                </div>
                <div>
                  <label className="label">信託專戶 *</label>
                  <select
                    className="input"
                    value={formData.trust_account_id}
                    onChange={(e) => setFormData({ ...formData, trust_account_id: e.target.value })}
                    required
                  >
                    <option value="">請選擇專戶</option>
                    {trustAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.account_code} - {account.account_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold text-slate-800 mb-3">金額資訊</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="label">匯款金額（本金）*</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input font-mono"
                      value={formData.remittance_amount}
                      onChange={(e) => setFormData({ ...formData, remittance_amount: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                    <p className="text-xs text-slate-500 mt-1">代收代付金額</p>
                  </div>
                  <div>
                    <label className="label">手續費 *</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input font-mono"
                      value={formData.service_fee}
                      onChange={(e) => setFormData({ ...formData, service_fee: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                    <p className="text-xs text-slate-500 mt-1">公司營收</p>
                  </div>
                  <div>
                    <label className="label">總金額</label>
                    <input
                      type="text"
                      className="input font-mono bg-slate-50"
                      value={formData.total_amount}
                      readOnly
                    />
                    <p className="text-xs text-slate-500 mt-1">自動計算</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">來源幣別 *</label>
                  <select
                    className="input"
                    value={formData.from_currency}
                    onChange={(e) => setFormData({ ...formData, from_currency: e.target.value })}
                    required
                  >
                    <option value="TWD">TWD - 台幣</option>
                    <option value="USD">USD - 美元</option>
                    <option value="EUR">EUR - 歐元</option>
                  </select>
                </div>
                <div>
                  <label className="label">目標幣別 *</label>
                  <select
                    className="input"
                    value={formData.to_currency}
                    onChange={(e) => setFormData({ ...formData, to_currency: e.target.value })}
                    required
                  >
                    <option value="USD">USD - 美元</option>
                    <option value="EUR">EUR - 歐元</option>
                    <option value="JPY">JPY - 日圓</option>
                    <option value="CNY">CNY - 人民幣</option>
                    <option value="VND">VND - 越南盾</option>
                    <option value="IDR">IDR - 印尼盾</option>
                    <option value="PHP">PHP - 菲律賓披索</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">匯率</label>
                  <input
                    type="number"
                    step="0.000001"
                    className="input font-mono"
                    value={formData.exchange_rate}
                    onChange={(e) => setFormData({ ...formData, exchange_rate: e.target.value })}
                    placeholder="例如: 31.5"
                  />
                </div>
                <div>
                  <label className="label">實際匯出金額（外幣）</label>
                  <input
                    type="text"
                    className="input font-mono bg-slate-50"
                    value={formData.remitted_amount}
                    readOnly
                  />
                  <p className="text-xs text-slate-500 mt-1">自動計算</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">付款方式</label>
                  <select
                    className="input"
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                  >
                    <option value="">請選擇</option>
                    <option value="便利商店">便利商店</option>
                    <option value="ATM">ATM</option>
                    <option value="虛擬帳號">虛擬帳號</option>
                    <option value="銀行轉帳">銀行轉帳</option>
                    <option value="現金">現金</option>
                  </select>
                </div>
                <div>
                  <label className="label">付款參考號</label>
                  <input
                    type="text"
                    className="input font-mono"
                    value={formData.payment_reference}
                    onChange={(e) => setFormData({ ...formData, payment_reference: e.target.value })}
                    placeholder="便利商店代碼或虛擬帳號"
                  />
                </div>
              </div>

              <div>
                <label className="label">狀態 *</label>
                <select
                  className="input"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  required
                >
                  <option value="待處理">待處理</option>
                  <option value="已收款">已收款（將自動生成會計分錄）</option>
                  <option value="已匯出">已匯出</option>
                  <option value="已取消">已取消</option>
                </select>
              </div>

              <div>
                <label className="label">備註</label>
                <textarea
                  className="input"
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="備註說明..."
                ></textarea>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>注意：</strong>當狀態設為「已收款」時，系統會自動生成會計分錄：
                  <br />
                  • 借：信託專戶存款（總金額）
                  <br />
                  • 貸：代付款項（匯款金額）
                  <br />
                  • 貸：手續費收入（手續費）
                  <br />
                  • 貸：銷項稅額（手續費的 5%）
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    resetForm()
                  }}
                  className="btn btn-secondary"
                >
                  取消
                </button>
                <button type="submit" className="btn btn-primary">
                  <Check className="w-4 h-4 mr-2" />
                  {editingTransaction ? '更新' : '新增'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

