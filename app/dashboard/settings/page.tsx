'use client'

import { useState, useEffect } from 'react'
import supabase from '@/lib/supabase'
import { Settings, Users, DollarSign, Shield, Save } from 'lucide-react'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('account')
  const [profile, setProfile] = useState({
    full_name: '',
    email: '',
    department: ''
  })

  useEffect(() => {
    loadProfile()
  }, [])

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

  const tabs = [
    { id: 'account', name: '帳戶設定', icon: Users },
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
