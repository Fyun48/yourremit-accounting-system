'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import supabase from '@/lib/supabase'
import { Lock, CheckCircle, XCircle } from 'lucide-react'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [passwordChecks, setPasswordChecks] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    symbol: false,
  })

  useEffect(() => {
    // 檢查是否有重置令牌
    const token = searchParams.get('token')
    if (!token) {
      setError('無效的重置連結')
    }
  }, [searchParams])

  // 驗證密碼強度
  useEffect(() => {
    setPasswordChecks({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      symbol: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    })
  }, [password])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // 驗證密碼
    if (!passwordChecks.length || !passwordChecks.uppercase || !passwordChecks.lowercase || !passwordChecks.number || !passwordChecks.symbol) {
      setError('密碼不符合要求')
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('兩次輸入的密碼不一致')
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      })

      if (error) throw error

      setSuccess(true)
      setTimeout(() => {
        router.push('/')
      }, 2000)
    } catch (error: any) {
      setError(error.message || '重置密碼失敗，請重試')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-md">
        <div className="card">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white mb-4">
              <Lock className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 font-display">重置密碼</h2>
            <p className="text-slate-600 mt-2">請設定您的新密碼</p>
          </div>

          {success ? (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <p className="text-lg font-medium text-slate-800 mb-2">密碼重置成功！</p>
              <p className="text-sm text-slate-600">正在跳轉到登入頁面...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="label">新密碼</label>
                <input
                  type="password"
                  className="input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <div className="mt-2 space-y-1">
                  <div className={`flex items-center space-x-2 text-sm ${passwordChecks.length ? 'text-green-600' : 'text-slate-400'}`}>
                    {passwordChecks.length ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    <span>至少8位數</span>
                  </div>
                  <div className={`flex items-center space-x-2 text-sm ${passwordChecks.uppercase ? 'text-green-600' : 'text-slate-400'}`}>
                    {passwordChecks.uppercase ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    <span>至少1個大寫字母</span>
                  </div>
                  <div className={`flex items-center space-x-2 text-sm ${passwordChecks.lowercase ? 'text-green-600' : 'text-slate-400'}`}>
                    {passwordChecks.lowercase ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    <span>至少1個小寫字母</span>
                  </div>
                  <div className={`flex items-center space-x-2 text-sm ${passwordChecks.number ? 'text-green-600' : 'text-slate-400'}`}>
                    {passwordChecks.number ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    <span>至少1個數字</span>
                  </div>
                  <div className={`flex items-center space-x-2 text-sm ${passwordChecks.symbol ? 'text-green-600' : 'text-slate-400'}`}>
                    {passwordChecks.symbol ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    <span>至少1個符號</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="label">確認密碼</label>
                <input
                  type="password"
                  className="input"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-sm text-red-600 mt-1">兩次輸入的密碼不一致</p>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-primary w-full py-3 text-lg"
                disabled={loading || !passwordChecks.length || !passwordChecks.uppercase || !passwordChecks.lowercase || !passwordChecks.number || !passwordChecks.symbol}
              >
                {loading ? '重置中...' : '重置密碼'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="w-full max-w-md">
          <div className="card">
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-slate-600">載入中...</p>
            </div>
          </div>
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}
