'use client'

import { useEffect, useState } from 'react'
import supabase from '@/lib/supabase'
import { Plus, Search, Filter, Download, Edit, Trash2, Check, X } from 'lucide-react'
import { ForexTransaction } from '@/types'
import { format } from 'date-fns'

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<ForexTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  const [formData, setFormData] = useState({
    transaction_date: format(new Date(), 'yyyy-MM-dd'),
    transaction_type: '買入' as '買入' | '賣出' | '兌換',
    from_currency: 'USD',
    from_amount: '',
    to_currency: 'TWD',
    to_amount: '',
    exchange_rate: '',
    bank_name: '',
    reference_number: '',
    purpose: ''
  })

  useEffect(() => {
    loadTransactions()
  }, [])

  const loadTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('forex_transactions')
        .select('*')
        .order('transaction_date', { ascending: false })

      if (error) throw error
      setTransactions(data || [])
    } catch (error) {
      console.error('Error loading transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const { error } = await supabase
        .from('forex_transactions')
        .insert([{
          ...formData,
          from_amount: parseFloat(formData.from_amount),
          to_amount: parseFloat(formData.to_amount),
          exchange_rate: parseFloat(formData.exchange_rate),
          created_by: user?.id
        }])

      if (error) throw error

      setShowModal(false)
      loadTransactions()
      resetForm()
      alert('交易新增成功！')
    } catch (error: any) {
      alert('新增失敗: ' + error.message)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除此交易嗎？')) return

    try {
      const { error } = await supabase
        .from('forex_transactions')
        .delete()
        .eq('id', id)

      if (error) throw error
      loadTransactions()
    } catch (error: any) {
      alert('刪除失敗: ' + error.message)
    }
  }

  const resetForm = () => {
    setFormData({
      transaction_date: format(new Date(), 'yyyy-MM-dd'),
      transaction_type: '買入',
      from_currency: 'USD',
      from_amount: '',
      to_currency: 'TWD',
      to_amount: '',
      exchange_rate: '',
      bank_name: '',
      reference_number: '',
      purpose: ''
    })
  }

  const calculateAmount = (field: 'from' | 'to') => {
    const rate = parseFloat(formData.exchange_rate)
    if (!rate) return

    if (field === 'from' && formData.to_amount) {
      const fromAmount = parseFloat(formData.to_amount) / rate
      setFormData(prev => ({ ...prev, from_amount: fromAmount.toFixed(2) }))
    } else if (field === 'to' && formData.from_amount) {
      const toAmount = parseFloat(formData.from_amount) * rate
      setFormData(prev => ({ ...prev, to_amount: toAmount.toFixed(2) }))
    }
  }

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = 
      tx.reference_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.bank_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.from_currency.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.to_currency.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = filterStatus === 'all' || tx.status === filterStatus

    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* 頁面標題和操作 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">外匯交易管理</h1>
          <p className="text-slate-600 mt-1">管理所有外匯買賣與兌換交易</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn btn-primary flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>新增交易</span>
        </button>
      </div>

      {/* 搜尋和篩選 */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="搜尋交易編號、銀行名稱、幣別..."
              className="input pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <select 
              className="input"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">全部狀態</option>
              <option value="待處理">待處理</option>
              <option value="已完成">已完成</option>
              <option value="已取消">已取消</option>
            </select>
            <button className="btn btn-secondary flex items-center space-x-2">
              <Download className="w-4 h-4" />
              <span>匯出</span>
            </button>
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
                  <th>交易日期</th>
                  <th>類型</th>
                  <th>來源幣別</th>
                  <th>金額</th>
                  <th>目標幣別</th>
                  <th>金額</th>
                  <th>匯率</th>
                  <th>銀行</th>
                  <th>狀態</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id}>
                    <td>{format(new Date(tx.transaction_date), 'yyyy/MM/dd')}</td>
                    <td>
                      <span className={`badge ${
                        tx.transaction_type === '買入' ? 'badge-success' :
                        tx.transaction_type === '賣出' ? 'badge-danger' :
                        'badge-info'
                      }`}>
                        {tx.transaction_type}
                      </span>
                    </td>
                    <td className="font-mono font-semibold">{tx.from_currency}</td>
                    <td className="font-mono">{Number(tx.from_amount).toLocaleString()}</td>
                    <td className="font-mono font-semibold">{tx.to_currency}</td>
                    <td className="font-mono">{Number(tx.to_amount).toLocaleString()}</td>
                    <td className="font-mono">{Number(tx.exchange_rate).toFixed(4)}</td>
                    <td>{tx.bank_name || '-'}</td>
                    <td>
                      <span className={`badge ${
                        tx.status === '已完成' ? 'badge-success' :
                        tx.status === '待處理' ? 'badge-warning' :
                        'badge-danger'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center space-x-2">
                        <button className="p-1 hover:bg-blue-50 rounded">
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
            <p className="text-slate-500">查無交易記錄</p>
          </div>
        )}
      </div>

      {/* 新增交易 Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-fadeIn">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">新增外匯交易</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">交易日期</label>
                  <input
                    type="date"
                    className="input"
                    value={formData.transaction_date}
                    onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="label">交易類型</label>
                  <select
                    className="input"
                    value={formData.transaction_type}
                    onChange={(e) => setFormData({ ...formData, transaction_type: e.target.value as any })}
                    required
                  >
                    <option value="買入">買入</option>
                    <option value="賣出">賣出</option>
                    <option value="兌換">兌換</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">來源幣別</label>
                  <select
                    className="input"
                    value={formData.from_currency}
                    onChange={(e) => setFormData({ ...formData, from_currency: e.target.value })}
                    required
                  >
                    <option value="USD">USD - 美元</option>
                    <option value="EUR">EUR - 歐元</option>
                    <option value="JPY">JPY - 日圓</option>
                    <option value="CNY">CNY - 人民幣</option>
                    <option value="TWD">TWD - 台幣</option>
                  </select>
                </div>
                <div>
                  <label className="label">來源金額</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input font-mono"
                    value={formData.from_amount}
                    onChange={(e) => setFormData({ ...formData, from_amount: e.target.value })}
                    onBlur={() => calculateAmount('to')}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">目標幣別</label>
                  <select
                    className="input"
                    value={formData.to_currency}
                    onChange={(e) => setFormData({ ...formData, to_currency: e.target.value })}
                    required
                  >
                    <option value="TWD">TWD - 台幣</option>
                    <option value="USD">USD - 美元</option>
                    <option value="EUR">EUR - 歐元</option>
                    <option value="JPY">JPY - 日圓</option>
                    <option value="CNY">CNY - 人民幣</option>
                  </select>
                </div>
                <div>
                  <label className="label">目標金額</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input font-mono"
                    value={formData.to_amount}
                    onChange={(e) => setFormData({ ...formData, to_amount: e.target.value })}
                    onBlur={() => calculateAmount('from')}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="label">匯率</label>
                <input
                  type="number"
                  step="0.000001"
                  className="input font-mono"
                  value={formData.exchange_rate}
                  onChange={(e) => setFormData({ ...formData, exchange_rate: e.target.value })}
                  onBlur={() => calculateAmount('to')}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">銀行名稱</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.bank_name}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">交易編號</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.reference_number}
                    onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="label">交易目的</label>
                <textarea
                  className="input"
                  rows={3}
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                ></textarea>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-secondary"
                >
                  取消
                </button>
                <button type="submit" className="btn btn-primary">
                  <Check className="w-4 h-4 mr-2" />
                  確認新增
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
