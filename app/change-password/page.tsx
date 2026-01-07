'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import supabase from '@/lib/supabase'
import { validateNewPassword } from '@/lib/password-utils'

export default function ChangePasswordPage() {
  const router = useRouter()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mustChange, setMustChange] = useState(false)

  useEffect(() => {
    // 檢查是否需要強制修改密碼
    checkMustChangePassword()
  }, [])

  const checkMustChangePassword = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('must_change_password')
        .eq('id', user.id)
        .single()

      if (profile?.must_change_password) {
        setMustChange(true)
      } else {
        // 如果不需要強制修改，可以選擇返回或顯示選單
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Error checking password change requirement:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // 驗證新密碼
    const passwordValidation = validateNewPassword(newPassword)
    if (!passwordValidation.valid) {
      setError(passwordValidation.message)
      setLoading(false)
      return
    }

    // 確認密碼
    if (newPassword !== confirmPassword) {
      setError('新密碼與確認密碼不一致')
      setLoading(false)
      return
    }

    // 如果必須修改密碼，不需要驗證舊密碼
    if (!mustChange && currentPassword) {
      // 驗證舊密碼
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !user.email) {
        setError('無法取得用戶資訊')
        setLoading(false)
        return
      }

      // 嘗試用舊密碼登入來驗證
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      })

      if (verifyError) {
        setError('舊密碼錯誤')
        setLoading(false)
        return
      }
    }

    try {
      // 更新密碼
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (updateError) {
        throw updateError
      }

      // 清除 must_change_password 標記
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('user_profiles')
          .update({ must_change_password: false })
          .eq('id', user.id)
      }

      alert('密碼修改成功！')
      router.push('/dashboard')
    } catch (error: any) {
      setError(error.message || '修改密碼失敗')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            {mustChange ? '首次登入，請修改密碼' : '修改密碼'}
          </h2>
          {mustChange && (
            <p className="text-sm text-slate-600 mb-6">
              為了您的帳號安全，首次登入必須修改密碼
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {!mustChange && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  舊密碼
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required={!mustChange}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                新密碼
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
                minLength={8}
                maxLength={20}
              />
              <p className="text-xs text-slate-500 mt-1">
                8-20位元，必須包含至少1個大寫字母、1個小寫字母、1個符號
                <br />
                不可使用底線(_)、斜線(/)、反斜線(\)、開根號(√)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                確認新密碼
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
                minLength={8}
                maxLength={20}
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? '修改中...' : '確認修改'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
