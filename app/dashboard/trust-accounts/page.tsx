'use client'

import { useEffect, useState } from 'react'
import supabase from '@/lib/supabase'
import { Plus, Search, Edit, Trash2, X, Check, TrendingUp, Wallet, Building2 } from 'lucide-react'
import { TrustAccount } from '@/types'
import { format } from 'date-fns'

export default function TrustAccountsPage() {
  const [accounts, setAccounts] = useState<TrustAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingAccount, setEditingAccount] = useState<TrustAccount | null>(null)
  const [formData, setFormData] = useState({
    account_code: '',
    account_name: '',
    bank_name: '',
    account_number: '',
    account_type: '客戶信託' as '公司自有' | '客戶信託',
    currency: 'TWD',
    description: ''
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | '公司自有' | '客戶信託'>('all')

  useEffect(() => {
    loadAccounts()
  }, [])

  const loadAccounts = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('trust_accounts')
        .select('*')
        .order('account_code')

      if (error) throw error
      setAccounts(data || [])
    } catch (error: any) {
      console.error('Error loading accounts:', error)
      alert('載入失敗: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (editingAccount) {
        const { error } = await supabase
          .from('trust_accounts')
          .update({
            account_code: formData.account_code,
            account_name: formData.account_name,
            bank_name: formData.bank_name,
            account_number: formData.account_number,
            account_type: formData.account_type,
            currency: formData.currency,
            description: formData.description
          })
          .eq('id', editingAccount.id)

        if (error) throw error
        alert('信託專戶更新成功！')
      } else {
        const { error } = await supabase
          .from('trust_accounts')
          .insert([formData])

        if (error) throw error
        alert('信託專戶新增成功！')
      }

      setShowModal(false)
      resetForm()
      loadAccounts()
    } catch (error: any) {
      alert('操作失敗: ' + error.message)
    }
  }

  const handleEdit = (account: TrustAccount) => {
    setEditingAccount(account)
    setFormData({
      account_code: account.account_code,
      account_name: account.account_name,
      bank_name: account.bank_name || '',
      account_number: account.account_number || '',
      account_type: account.account_type,
      currency: account.currency,
      description: account.description || ''
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除此信託專戶嗎？')) return

    try {
      const { error } = await supabase
        .from('trust_accounts')
        .delete()
        .eq('id', id)

      if (error) throw error
      alert('刪除成功！')
      loadAccounts()
    } catch (error: any) {
      alert('刪除失敗: ' + error.message)
    }
  }

  const resetForm = () => {
    setEditingAccount(null)
    setFormData({
      account_code: '',
      account_name: '',
      bank_name: '',
      account_number: '',
      account_type: '客戶信託',
      currency: 'TWD',
      description: ''
    })
  }

  const filteredAccounts = accounts.filter(account => {
    const matchesSearch = 
      account.account_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.account_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.bank_name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesType = filterType === 'all' || account.account_type === filterType

    return matchesSearch && matchesType
  })

  // 計算專戶餘額（需要從會計分錄中計算）
  const getAccountBalance = async (accountId: string) => {
    // 這裡需要根據實際的會計科目來計算餘額
    // 暫時返回 0，後續可以實現
    return 0
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">信託專戶管理</h1>
          <p className="text-slate-600 mt-1">管理公司自有資金與客戶信託專戶</p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setShowModal(true)
          }}
          className="btn btn-primary flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>新增專戶</span>
        </button>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">總專戶數</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{accounts.length}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">客戶信託專戶</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">
                {accounts.filter(a => a.account_type === '客戶信託').length}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">公司自有專戶</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">
                {accounts.filter(a => a.account_type === '公司自有').length}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* 搜尋和篩選 */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="搜尋專戶代號、名稱、銀行..."
              className="input pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="input"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
          >
            <option value="all">全部類型</option>
            <option value="客戶信託">客戶信託</option>
            <option value="公司自有">公司自有</option>
          </select>
        </div>
      </div>

      {/* 專戶列表 */}
      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-slate-600">載入中...</p>
          </div>
        ) : filteredAccounts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>專戶代號</th>
                  <th>專戶名稱</th>
                  <th>類型</th>
                  <th>銀行名稱</th>
                  <th>帳號</th>
                  <th>幣別</th>
                  <th>狀態</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredAccounts.map((account) => (
                  <tr key={account.id}>
                    <td className="font-mono font-semibold">{account.account_code}</td>
                    <td>{account.account_name}</td>
                    <td>
                      <span className={`badge ${
                        account.account_type === '客戶信託' ? 'badge-success' : 'badge-info'
                      }`}>
                        {account.account_type}
                      </span>
                    </td>
                    <td>{account.bank_name || '-'}</td>
                    <td className="font-mono text-sm">{account.account_number || '-'}</td>
                    <td className="font-mono">{account.currency}</td>
                    <td>
                      <span className={`badge ${account.is_active ? 'badge-success' : 'badge-danger'}`}>
                        {account.is_active ? '啟用' : '停用'}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEdit(account)}
                          className="p-1 hover:bg-blue-50 rounded"
                        >
                          <Edit className="w-4 h-4 text-blue-600" />
                        </button>
                        <button
                          onClick={() => handleDelete(account.id)}
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
            <Wallet className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">尚無信託專戶</p>
          </div>
        )}
      </div>

      {/* 新增/編輯 Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-fadeIn">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">
                {editingAccount ? '編輯信託專戶' : '新增信託專戶'}
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
                  <label className="label">專戶代號 *</label>
                  <input
                    type="text"
                    className="input font-mono"
                    value={formData.account_code}
                    onChange={(e) => setFormData({ ...formData, account_code: e.target.value })}
                    placeholder="例如: TRUST-001"
                    required
                  />
                </div>
                <div>
                  <label className="label">專戶類型 *</label>
                  <select
                    className="input"
                    value={formData.account_type}
                    onChange={(e) => setFormData({ ...formData, account_type: e.target.value as any })}
                    required
                  >
                    <option value="客戶信託">客戶信託</option>
                    <option value="公司自有">公司自有</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">專戶名稱 *</label>
                <input
                  type="text"
                  className="input"
                  value={formData.account_name}
                  onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                  placeholder="例如: 客戶信託專戶-台幣"
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
                    placeholder="例如: 台灣銀行"
                  />
                </div>
                <div>
                  <label className="label">帳號</label>
                  <input
                    type="text"
                    className="input font-mono"
                    value={formData.account_number}
                    onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                    placeholder="銀行帳號"
                  />
                </div>
              </div>

              <div>
                <label className="label">幣別 *</label>
                <select
                  className="input"
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
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
                <label className="label">說明</label>
                <textarea
                  className="input"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="專戶說明..."
                ></textarea>
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
                  {editingAccount ? '更新' : '新增'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

