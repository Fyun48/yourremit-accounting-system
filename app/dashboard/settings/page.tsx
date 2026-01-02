'use client'

import { useState, useEffect } from 'react'
import supabase from '@/lib/supabase'
import { Settings, Users, DollarSign, Shield, Save, BookOpen, Plus, Edit, Trash2, X, Check } from 'lucide-react'
import { ChartOfAccount } from '@/types'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('account')
  const [profile, setProfile] = useState({
    full_name: '',
    email: '',
    department: ''
  })
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([])
  const [showAccountModal, setShowAccountModal] = useState(false)
  const [editingAccount, setEditingAccount] = useState<ChartOfAccount | null>(null)
  const [accountForm, setAccountForm] = useState({
    code: '',
    name: '',
    name_en: '',
    account_type: '資產' as '資產' | '負債' | '權益' | '收入' | '費用',
    parent_id: '',
    level: 1,
    description: '',
    is_active: true
  })

  useEffect(() => {
    loadProfile()
    if (activeTab === 'accounts') {
      loadAccounts()
    }
  }, [activeTab])

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (data) {
        setProfile({
          full_name: data.full_name || '',
          email: data.email || user.email || '',
          department: data.department || ''
        })
      }
    }
  }

  const handleSaveProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: profile.full_name,
          department: profile.department
        })
        .eq('id', user.id)

      if (error) throw error
      alert('設定已儲存！')
    } catch (error: any) {
      alert('儲存失敗：' + error.message)
    }
  }

  const loadAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .order('code')

      if (error) throw error
      setAccounts(data || [])
    } catch (error: any) {
      console.error('Error loading accounts:', error)
      alert('載入會計科目失敗: ' + error.message)
    }
  }

  const handleSaveAccount = async () => {
    try {
      if (!accountForm.code || !accountForm.name) {
        alert('請填寫科目代號和名稱')
        return
      }

      if (editingAccount) {
        const { error } = await supabase
          .from('chart_of_accounts')
          .update({
            code: accountForm.code,
            name: accountForm.name,
            name_en: accountForm.name_en,
            account_type: accountForm.account_type,
            parent_id: accountForm.parent_id || null,
            level: accountForm.level,
            description: accountForm.description,
            is_active: accountForm.is_active
          })
          .eq('id', editingAccount.id)

        if (error) throw error
        alert('會計科目更新成功！')
      } else {
        const { error } = await supabase
          .from('chart_of_accounts')
          .insert([{
            code: accountForm.code,
            name: accountForm.name,
            name_en: accountForm.name_en,
            account_type: accountForm.account_type,
            parent_id: accountForm.parent_id || null,
            level: accountForm.level,
            description: accountForm.description,
            is_active: accountForm.is_active
          }])

        if (error) throw error
        alert('會計科目新增成功！')
      }

      setShowAccountModal(false)
      resetAccountForm()
      loadAccounts()
    } catch (error: any) {
      alert('儲存失敗: ' + error.message)
    }
  }

  const handleEditAccount = (account: ChartOfAccount) => {
    setEditingAccount(account)
    setAccountForm({
      code: account.code,
      name: account.name,
      name_en: account.name_en || '',
      account_type: account.account_type,
      parent_id: account.parent_id || '',
      level: account.level,
      description: account.description || '',
      is_active: account.is_active
    })
    setShowAccountModal(true)
  }

  const handleDeleteAccount = async (id: string) => {
    if (!confirm('確定要刪除此會計科目嗎？')) return

    try {
      const { error } = await supabase
        .from('chart_of_accounts')
        .delete()
        .eq('id', id)

      if (error) throw error
      alert('會計科目刪除成功！')
      loadAccounts()
    } catch (error: any) {
      alert('刪除失敗: ' + error.message)
    }
  }

  const resetAccountForm = () => {
    setEditingAccount(null)
    setAccountForm({
      code: '',
      name: '',
      name_en: '',
      account_type: '資產',
      parent_id: '',
      level: 1,
      description: '',
      is_active: true
    })
  }

  const tabs = [
    { id: 'account', name: '帳戶設定', icon: Users },
    { id: 'accounts', name: '會計科目', icon: BookOpen },
    { id: 'currency', name: '幣別設定', icon: DollarSign },
    { id: 'security', name: '安全性', icon: Shield },
    { id: 'system', name: '系統設定', icon: Settings },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">系統設定</h1>
        <p className="text-slate-600 mt-1">管理系統參數與個人設定</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 側邊選單 */}
        <div className="lg:col-span-1">
          <div className="card space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="font-medium">{tab.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 內容區域 */}
        <div className="lg:col-span-3">
          <div className="card">
            {activeTab === 'account' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-slate-800">帳戶資訊</h2>
                
                <div>
                  <label className="label">姓名</label>
                  <input
                    type="text"
                    className="input"
                    value={profile.full_name}
                    onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="label">電子郵件</label>
                  <input
                    type="email"
                    className="input"
                    value={profile.email}
                    disabled
                  />
                  <p className="text-sm text-slate-500 mt-1">電子郵件無法更改</p>
                </div>

                <div>
                  <label className="label">部門</label>
                  <input
                    type="text"
                    className="input"
                    value={profile.department}
                    onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                  />
                </div>

                <button 
                  onClick={handleSaveProfile}
                  className="btn btn-primary flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>儲存變更</span>
                </button>
              </div>
            )}

            {activeTab === 'accounts' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">會計科目管理</h2>
                    <p className="text-slate-600 mt-1">自訂和管理會計科目</p>
                  </div>
                  <button
                    onClick={() => {
                      resetAccountForm()
                      setShowAccountModal(true)
                    }}
                    className="btn btn-primary flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>新增科目</span>
                  </button>
                </div>

                <div className="card overflow-hidden p-0">
                  <div className="overflow-x-auto">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>科目代號</th>
                          <th>科目名稱</th>
                          <th>英文名稱</th>
                          <th>科目類型</th>
                          <th>層級</th>
                          <th>狀態</th>
                          <th>操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {accounts.map((account) => (
                          <tr key={account.id}>
                            <td className="font-mono font-semibold">{account.code}</td>
                            <td>{account.name}</td>
                            <td className="text-slate-600">{account.name_en || '-'}</td>
                            <td>
                              <span className={`badge ${
                                account.account_type === '資產' ? 'badge-info' :
                                account.account_type === '負債' ? 'badge-danger' :
                                account.account_type === '權益' ? 'badge-warning' :
                                account.account_type === '收入' ? 'badge-success' :
                                'badge-warning'
                              }`}>
                                {account.account_type}
                              </span>
                            </td>
                            <td>{account.level}</td>
                            <td>
                              <span className={`badge ${account.is_active ? 'badge-success' : 'badge-danger'}`}>
                                {account.is_active ? '啟用' : '停用'}
                              </span>
                            </td>
                            <td>
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => handleEditAccount(account)}
                                  className="p-1 hover:bg-blue-50 rounded"
                                >
                                  <Edit className="w-4 h-4 text-blue-600" />
                                </button>
                                <button
                                  onClick={() => handleDeleteAccount(account.id)}
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
                </div>

                {/* 新增/編輯會計科目 Modal */}
                {showAccountModal && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-fadeIn">
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-slate-800">
                          {editingAccount ? '編輯會計科目' : '新增會計科目'}
                        </h2>
                        <button
                          onClick={() => {
                            setShowAccountModal(false)
                            resetAccountForm()
                          }}
                          className="p-2 hover:bg-slate-100 rounded-lg"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="label">科目代號 *</label>
                            <input
                              type="text"
                              className="input font-mono"
                              value={accountForm.code}
                              onChange={(e) => setAccountForm({ ...accountForm, code: e.target.value })}
                              placeholder="例如: 1110"
                              required
                            />
                          </div>
                          <div>
                            <label className="label">科目類型 *</label>
                            <select
                              className="input"
                              value={accountForm.account_type}
                              onChange={(e) => setAccountForm({ ...accountForm, account_type: e.target.value as any })}
                              required
                            >
                              <option value="資產">資產</option>
                              <option value="負債">負債</option>
                              <option value="權益">權益</option>
                              <option value="收入">收入</option>
                              <option value="費用">費用</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="label">科目名稱 *</label>
                          <input
                            type="text"
                            className="input"
                            value={accountForm.name}
                            onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                            placeholder="例如: 現金及約當現金"
                            required
                          />
                        </div>

                        <div>
                          <label className="label">英文名稱</label>
                          <input
                            type="text"
                            className="input"
                            value={accountForm.name_en}
                            onChange={(e) => setAccountForm({ ...accountForm, name_en: e.target.value })}
                            placeholder="例如: Cash and Cash Equivalents"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="label">上層科目</label>
                            <select
                              className="input"
                              value={accountForm.parent_id}
                              onChange={(e) => setAccountForm({ ...accountForm, parent_id: e.target.value })}
                            >
                              <option value="">無（頂層科目）</option>
                              {accounts
                                .filter(a => a.id !== editingAccount?.id)
                                .map((account) => (
                                  <option key={account.id} value={account.id}>
                                    {account.code} - {account.name}
                                  </option>
                                ))}
                            </select>
                          </div>
                          <div>
                            <label className="label">層級</label>
                            <input
                              type="number"
                              className="input"
                              value={accountForm.level}
                              onChange={(e) => setAccountForm({ ...accountForm, level: parseInt(e.target.value) || 1 })}
                              min="1"
                              max="10"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="label">說明</label>
                          <textarea
                            className="input"
                            rows={3}
                            value={accountForm.description}
                            onChange={(e) => setAccountForm({ ...accountForm, description: e.target.value })}
                            placeholder="科目說明..."
                          />
                        </div>

                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="is_active"
                            checked={accountForm.is_active}
                            onChange={(e) => setAccountForm({ ...accountForm, is_active: e.target.checked })}
                            className="rounded"
                          />
                          <label htmlFor="is_active" className="text-sm text-slate-700">
                            啟用此科目
                          </label>
                        </div>

                        <div className="flex justify-end space-x-3 pt-4">
                          <button
                            type="button"
                            onClick={() => {
                              setShowAccountModal(false)
                              resetAccountForm()
                            }}
                            className="btn btn-secondary"
                          >
                            取消
                          </button>
                          <button
                            onClick={handleSaveAccount}
                            className="btn btn-primary"
                          >
                            <Check className="w-4 h-4 mr-2" />
                            {editingAccount ? '更新' : '新增'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'currency' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-slate-800">幣別設定</h2>
                <p className="text-slate-600">管理系統支援的幣別與匯率來源</p>
                
                <div className="space-y-3">
                  {['USD', 'EUR', 'JPY', 'CNY', 'GBP'].map((currency) => (
                    <div key={currency} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center font-mono font-bold text-blue-700">
                          {currency}
                        </div>
                        <span className="font-medium">{currency}</span>
                      </div>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input type="checkbox" defaultChecked className="rounded" />
                        <span className="text-sm text-slate-600">啟用</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-slate-800">安全性設定</h2>
                
                <div>
                  <label className="label">當前密碼</label>
                  <input type="password" className="input" />
                </div>

                <div>
                  <label className="label">新密碼</label>
                  <input type="password" className="input" />
                </div>

                <div>
                  <label className="label">確認新密碼</label>
                  <input type="password" className="input" />
                </div>

                <button className="btn btn-primary">
                  更新密碼
                </button>

                <div className="pt-6 border-t">
                  <h3 className="font-semibold text-slate-800 mb-3">雙因素認證</h3>
                  <p className="text-sm text-slate-600 mb-4">增強帳戶安全性</p>
                  <button className="btn btn-secondary">
                    啟用雙因素認證
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'system' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-slate-800">系統設定</h2>
                
                <div>
                  <label className="label">預設幣別</label>
                  <select className="input">
                    <option value="TWD">TWD - 台幣</option>
                    <option value="USD">USD - 美元</option>
                  </select>
                </div>

                <div>
                  <label className="label">日期格式</label>
                  <select className="input">
                    <option value="yyyy/MM/dd">yyyy/MM/dd</option>
                    <option value="dd/MM/yyyy">dd/MM/yyyy</option>
                    <option value="MM/dd/yyyy">MM/dd/yyyy</option>
                  </select>
                </div>

                <div>
                  <label className="label">數字格式</label>
                  <select className="input">
                    <option value="1,234.56">1,234.56</option>
                    <option value="1.234,56">1.234,56</option>
                  </select>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50">
                  <div>
                    <p className="font-medium text-slate-800">自動儲存</p>
                    <p className="text-sm text-slate-600">自動儲存輸入的資料</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
