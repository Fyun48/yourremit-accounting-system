'use client'

import { useEffect, useState } from 'react'

interface AdminAccount {
  id: string
  登入名稱: string
  電子郵件: string
  姓名: string
  員工編號: string
  角色: string
  是否啟用: string
  是否離職: string
  格式檢查: string
  建立時間: string
  更新時間: string
}

interface CheckResult {
  success: boolean
  message: string
  data: {
    管理員帳號: AdminAccount[]
    總數: number
    注意事項: {
      密碼: string
      預設密碼: string
      重置密碼: string
    }
  }
}

export default function CheckAdminPage() {
  const [result, setResult] = useState<CheckResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/check-admin')
      .then(res => res.json())
      .then((data: CheckResult) => {
        setResult(data)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">正在查詢管理員帳號資訊...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="text-xl font-bold text-red-800 mb-2">查詢錯誤</h2>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  if (!result) {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-slate-800 mb-6">系統管理員帳號資訊</h1>

          {result.data.管理員帳號.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800">未找到管理員帳號</p>
              <p className="text-sm text-yellow-600 mt-2">
                建議執行 sqlbak/quick-fix-admin.sql 或 sqlbak/fix-admin-account.sql 來創建管理員帳號
              </p>
            </div>
          ) : (
            <>
              {result.data.管理員帳號.map((admin, index) => (
                <div key={admin.id} className="mb-6 border border-slate-200 rounded-lg p-6">
                  <h2 className="text-xl font-semibold text-slate-800 mb-4">
                    管理員帳號 #{index + 1}
                  </h2>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-slate-600">登入名稱</label>
                      <p className="text-lg font-mono text-slate-800">{admin.登入名稱}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-slate-600">電子郵件</label>
                      <p className="text-lg text-slate-800">{admin.電子郵件}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-slate-600">姓名</label>
                      <p className="text-lg text-slate-800">{admin.姓名}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-slate-600">員工編號</label>
                      <p className="text-lg text-slate-800">{admin.員工編號 || '未設定'}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-slate-600">角色</label>
                      <p className="text-lg text-slate-800">{admin.角色}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-slate-600">帳號狀態</label>
                      <div className="flex gap-4 mt-1">
                        <span className={`px-3 py-1 rounded-full text-sm ${
                          admin.是否啟用 === '是' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {admin.是否啟用}
                        </span>
                        {admin.是否離職 === '是' && (
                          <span className="px-3 py-1 rounded-full text-sm bg-orange-100 text-orange-800">
                            已離職
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-slate-600">格式檢查</label>
                      <p className={`text-sm mt-1 ${
                        admin.格式檢查.includes('✓') 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {admin.格式檢查}
                      </p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-slate-600">建立時間</label>
                      <p className="text-sm text-slate-600">{admin.建立時間}</p>
                    </div>
                  </div>
                </div>
              ))}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                <h3 className="font-semibold text-blue-800 mb-2">注意事項</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• {result.data.注意事項.密碼}</li>
                  <li>• <strong>預設密碼：</strong>{result.data.注意事項.預設密碼}</li>
                  <li>• {result.data.注意事項.重置密碼}</li>
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
