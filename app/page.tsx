'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import supabase from '@/lib/supabase'
import { LogIn, TrendingUp, Shield, BarChart3 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [loginName, setLoginName] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('')
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false)
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState('')

  // 驗證登入名稱格式（小寫字母+6位數字）
  const validateLoginName = (name: string): boolean => {
    const pattern = /^[a-z][0-9]{6}$/
    return pattern.test(name)
  }

  // 驗證密碼強度
  const validatePassword = (pwd: string): { valid: boolean; message: string } => {
    if (pwd.length < 8) {
      return { valid: false, message: '密碼至少需要8位數' }
    }
    if (!/[A-Z]/.test(pwd)) {
      return { valid: false, message: '密碼必須包含至少1個大寫字母' }
    }
    if (!/[a-z]/.test(pwd)) {
      return { valid: false, message: '密碼必須包含至少1個小寫字母' }
    }
    if (!/[0-9]/.test(pwd)) {
      return { valid: false, message: '密碼必須包含至少1個數字' }
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) {
      return { valid: false, message: '密碼必須包含至少1個符號' }
    }
    return { valid: true, message: '' }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // 驗證登入名稱格式
    if (!validateLoginName(loginName)) {
      setError('登入名稱格式錯誤，應為小寫字母+6位數字（例如：a123456）')
      setLoading(false)
      return
    }

    try {
      // 先根據登入名稱查找用戶的email
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('email')
        .eq('login_name', loginName)
        .eq('is_active', true)
        .single()

      if (profileError || !profileData) {
        throw new Error('找不到該登入名稱的帳號')
      }

      // 使用email登入
      const { data, error } = await supabase.auth.signInWithPassword({
        email: profileData.email || '',
        password,
      })

      if (error) throw error

      if (data.user) {
        // 更新最後登入時間
        await supabase
          .from('user_profiles')
          .update({ last_login: new Date().toISOString() })
          .eq('id', data.user.id)

        router.push('/dashboard')
      }
    } catch (error: any) {
      setError(error.message || '登入失敗，請檢查您的帳號密碼')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotPasswordLoading(true)
    setForgotPasswordMessage('')

    if (!forgotPasswordEmail) {
      setForgotPasswordMessage('請輸入電子郵件')
      setForgotPasswordLoading(false)
      return
    }

    try {
      // 先查找該email對應的用戶
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, email')
        .eq('email', forgotPasswordEmail)
        .eq('is_active', true)
        .single()

      if (profileError || !profileData) {
        throw new Error('找不到該電子郵件的帳號')
      }

      // 發送密碼重置郵件
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (resetError) throw resetError

      setForgotPasswordMessage('密碼重置郵件已發送到您的信箱，請查收並按照指示重置密碼。')
    } catch (error: any) {
      setForgotPasswordMessage(error.message || '發送失敗，請重試')
    } finally {
      setForgotPasswordLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* 背景裝飾 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-400/10 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-6xl grid md:grid-cols-2 gap-8 relative z-10">
        {/* 左側 - 品牌資訊 */}
        <div className="hidden md:flex flex-col justify-center space-y-8 animate-fadeIn">
          <div>
            <h1 className="text-5xl font-bold text-slate-800 mb-4 font-display">
              外匯會計系統
            </h1>
            <p className="text-xl text-slate-600">
              專業的匯兌交易管理與財務記帳平台
            </p>
          </div>

          <div className="space-y-6">
            {[
              {
                icon: TrendingUp,
                title: '即時匯率追蹤',
                desc: '自動更新多幣別匯率，確保交易準確性'
              },
              {
                icon: Shield,
                title: '安全權限管理',
                desc: '多層級角色權限，保護敏感財務資料'
              },
              {
                icon: BarChart3,
                title: '智能財務報表',
                desc: '自動生成會計分錄與財務分析報告'
              }
            ].map((feature, index) => (
              <div 
                key={index}
                className="flex items-start space-x-4 animate-slideIn"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white">
                  <feature.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 mb-1">{feature.title}</h3>
                  <p className="text-sm text-slate-600">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 右側 - 登入表單 */}
        <div className="flex items-center justify-center">
          <div className="w-full max-w-md">
            <div className="card animate-fadeIn">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white mb-4">
                  <LogIn className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 font-display">歡迎回來</h2>
                <p className="text-slate-600 mt-2">登入您的帳戶以繼續</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label className="label">登入名稱</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="a123456（小寫字母+6位數字）"
                    value={loginName}
                    onChange={(e) => setLoginName(e.target.value.toLowerCase())}
                    pattern="[a-z][0-9]{6}"
                    required
                  />
                  <p className="text-xs text-slate-500 mt-1">格式：小寫字母 + 6位數字</p>
                </div>

                <div>
                  <label className="label">密碼</label>
                  <input
                    type="password"
                    className="input"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    至少8位數，包含1個大寫、1個小寫、1個數字、1個符號
                  </p>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" className="rounded border-slate-300" />
                    <span className="text-slate-600">記住我</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    忘記密碼？
                  </button>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-full py-3 text-lg"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      登入中...
                    </span>
                  ) : (
                    '登入'
                  )}
                </button>

              </form>
            </div>

            <p className="text-center text-sm text-slate-500 mt-6">
              © 2026 外匯會計系統. 保留所有權利.
            </p>
          </div>
        </div>
      </div>

      {/* 忘記密碼模態框 */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-slate-800 mb-4">忘記密碼</h2>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  電子郵件
                </label>
                <input
                  type="email"
                  value={forgotPasswordEmail}
                  onChange={(e) => setForgotPasswordEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="your@email.com"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">
                  請輸入您申請帳號時使用的電子郵件地址
                </p>
              </div>

              {forgotPasswordMessage && (
                <div className={`p-3 rounded-lg text-sm ${
                  forgotPasswordMessage.includes('已發送') 
                    ? 'bg-green-50 text-green-700 border border-green-200' 
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {forgotPasswordMessage}
                </div>
              )}

              <div className="flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false)
                    setForgotPasswordEmail('')
                    setForgotPasswordMessage('')
                  }}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={forgotPasswordLoading}
                >
                  {forgotPasswordLoading ? '發送中...' : '發送重置郵件'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
