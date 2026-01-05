'use client'

import { useEffect, useState } from 'react'
import supabase from '@/lib/supabase'
import { Shield, User, Check, X, Plus, Search, Filter } from 'lucide-react'
import { FeaturePermission, UserFeaturePermission, UserProfile } from '@/types'

export default function PermissionsPage() {
  const [features, setFeatures] = useState<FeaturePermission[]>([])
  const [userPermissions, setUserPermissions] = useState<UserFeaturePermission[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [selectedUser, setSelectedUser] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [showGrantModal, setShowGrantModal] = useState(false)
  const [selectedFeature, setSelectedFeature] = useState<string>('')
  const [expiresAt, setExpiresAt] = useState<string>('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // 載入功能權限列表
      const { data: featuresData } = await supabase
        .from('feature_permissions')
        .select('*')
        .eq('is_active', true)
        .order('feature_name')

      // 載入用戶列表
      const { data: usersData } = await supabase
        .from('user_profiles')
        .select('*, role:user_roles(*)')
        .eq('is_active', true)
        .order('full_name')

      // 載入用戶功能權限
      const { data: permissionsData } = await supabase
        .from('user_feature_permissions')
        .select('*, feature:feature_permissions(*)')
        .order('created_at', { ascending: false })

      setFeatures(featuresData || [])
      setUsers(usersData || [])
      setUserPermissions(permissionsData || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGrantPermission = async () => {
    if (!selectedUser || !selectedFeature) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('user_feature_permissions')
        .upsert({
          user_id: selectedUser,
          feature_id: selectedFeature,
          has_permission: true,
          granted_by: user.id,
          expires_at: expiresAt || null,
        }, {
          onConflict: 'user_id,feature_id'
        })

      if (error) throw error

      setShowGrantModal(false)
      setSelectedUser('')
      setSelectedFeature('')
      setExpiresAt('')
      loadData()
    } catch (error) {
      console.error('Error granting permission:', error)
      alert('授權失敗，請重試')
    }
  }

  const handleRevokePermission = async (permissionId: string) => {
    if (!confirm('確定要撤銷此權限嗎？')) return

    try {
      const { error } = await supabase
        .from('user_feature_permissions')
        .delete()
        .eq('id', permissionId)

      if (error) throw error

      loadData()
    } catch (error) {
      console.error('Error revoking permission:', error)
      alert('撤銷權限失敗，請重試')
    }
  }

  const filteredUsers = users.filter(user =>
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getUserPermissions = (userId: string) => {
    return userPermissions.filter(p => p.user_id === userId)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">權限管理</h1>
          <p className="text-slate-600 mt-1">管理個人帳戶權限與特殊權限</p>
        </div>
        <button
          onClick={() => setShowGrantModal(true)}
          className="btn btn-primary flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>授予權限</span>
        </button>
      </div>

      {/* 功能權限列表 */}
      <div className="card">
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center space-x-2">
          <Shield className="w-5 h-5" />
          <span>功能權限列表</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature) => (
            <div
              key={feature.id}
              className="p-4 border border-slate-200 rounded-lg hover:border-blue-300 transition-colors"
            >
              <h3 className="font-medium text-slate-800">{feature.feature_name}</h3>
              <p className="text-sm text-slate-500 mt-1">{feature.description}</p>
              <p className="text-xs text-slate-400 mt-2 font-mono">{feature.feature_code}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 用戶權限列表 */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center space-x-2">
            <User className="w-5 h-5" />
            <span>用戶權限列表</span>
          </h2>
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="搜尋用戶..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {filteredUsers.map((user) => {
            const permissions = getUserPermissions(user.id)
            return (
              <div
                key={user.id}
                className="p-4 border border-slate-200 rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-medium">
                        {user.full_name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div>
                        <h3 className="font-medium text-slate-800">{user.full_name || '未命名用戶'}</h3>
                        <p className="text-sm text-slate-500">{user.email}</p>
                        <p className="text-xs text-slate-400 mt-1">
                          角色: {user.role?.name || '未設定'}
                        </p>
                      </div>
                    </div>

                    {permissions.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <p className="text-sm font-medium text-slate-600">特殊權限：</p>
                        <div className="flex flex-wrap gap-2">
                          {permissions.map((perm) => (
                            <div
                              key={perm.id}
                              className="flex items-center space-x-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg"
                            >
                              <Check className="w-4 h-4 text-blue-600" />
                              <span className="text-sm text-blue-800">
                                {perm.feature?.feature_name}
                              </span>
                              {perm.expires_at && (
                                <span className="text-xs text-blue-600">
                                  (至 {new Date(perm.expires_at).toLocaleDateString('zh-TW')})
                                </span>
                              )}
                              <button
                                onClick={() => handleRevokePermission(perm.id)}
                                className="ml-2 text-red-600 hover:text-red-800"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {permissions.length === 0 && (
                      <p className="text-sm text-slate-400 mt-2">無特殊權限</p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 授予權限模態框 */}
      {showGrantModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-slate-800 mb-4">授予權限</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">選擇用戶</label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">請選擇用戶</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.full_name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">選擇功能</label>
                <select
                  value={selectedFeature}
                  onChange={(e) => setSelectedFeature(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">請選擇功能</option>
                  {features.map((feature) => (
                    <option key={feature.id} value={feature.id}>
                      {feature.feature_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  到期日（選填）
                </label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowGrantModal(false)
                  setSelectedUser('')
                  setSelectedFeature('')
                  setExpiresAt('')
                }}
                className="px-4 py-2 text-slate-600 hover:text-slate-800"
              >
                取消
              </button>
              <button
                onClick={handleGrantPermission}
                className="btn btn-primary"
                disabled={!selectedUser || !selectedFeature}
              >
                授予權限
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
