'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'
import supabase from '@/lib/supabase'
import { 
  LayoutDashboard, 
  ArrowLeftRight, 
  BookOpen, 
  PieChart, 
  Settings, 
  LogOut,
  Menu,
  X,
  User,
  Bell,
  FileText,
  Book,
  Calculator,
  Wallet,
  Users,
  Building2,
  Receipt,
  Clock,
  TrendingUp,
  Calendar,
  Fingerprint,
  CalendarDays,
  CheckCircle2,
  DollarSign,
  CreditCard,
  Shield,
  FileCheck
} from 'lucide-react'
import { UserFeaturePermission, UserProfile } from '@/types'

// 每個選單項目對應一個 feature_code，用來和權限系統串接
// 若 feature_code 為 null，表示所有登入用戶皆可見
const menuItems = [
  { name: '儀表板', path: '/dashboard', icon: LayoutDashboard, featureCode: null },
  { name: '外匯交易', path: '/dashboard/transactions', icon: ArrowLeftRight, featureCode: null },
  { name: '會計分錄', path: '/dashboard/journal', icon: BookOpen, featureCode: null },
  { name: '流水帳', path: '/dashboard/cashbook', icon: FileText, featureCode: null },
  { name: '總分類帳', path: '/dashboard/ledger', icon: Book, featureCode: null },
  { name: '試算表', path: '/dashboard/trial-balance', icon: Calculator, featureCode: null },
  { name: '財務報表', path: '/dashboard/reports', icon: PieChart, featureCode: null },
  { name: '信託專戶', path: '/dashboard/trust-accounts', icon: Wallet, featureCode: null },
  { name: '匯款交易', path: '/dashboard/remittances', icon: ArrowLeftRight, featureCode: null },
  { name: '應收帳款', path: '/dashboard/receivables', icon: Receipt, featureCode: null },
  { name: '應付帳款', path: '/dashboard/payables', icon: Building2, featureCode: null },
  { name: '日結作業', path: '/dashboard/daily-closing', icon: Calendar, featureCode: null },

  // HRM / 權限相關功能，綁定 feature_permissions
  { name: '權限管理', path: '/dashboard/permissions', icon: Shield, featureCode: 'permission_manage' },
  { name: '公司管理', path: '/dashboard/companies', icon: Building2, featureCode: 'company_manage' },
  { name: '員工管理', path: '/dashboard/employees', icon: Users, featureCode: 'employee_manage' },
  { name: '打卡管理', path: '/dashboard/attendance', icon: Fingerprint, featureCode: 'hrm_attendance_admin' },
  { name: '遲到扣款設定', path: '/dashboard/late-deduction', icon: Clock, featureCode: 'hrm_attendance_admin' },
  { name: '請假管理', path: '/dashboard/leave', icon: CalendarDays, featureCode: 'hrm_leave_admin' },
  { name: '審核流程', path: '/dashboard/approvals', icon: CheckCircle2, featureCode: 'hrm_leave_admin' },
  { name: '支出憑單', path: '/dashboard/expense-vouchers', icon: FileCheck, featureCode: 'expense_voucher' },
  { name: '出缺勤報表', path: '/dashboard/attendance-reports', icon: TrendingUp, featureCode: 'hrm_attendance_admin' },
  { name: '薪資管理', path: '/dashboard/payroll', icon: DollarSign, featureCode: 'hrm_payroll_admin' },
  { name: '薪資轉帳', path: '/dashboard/salary-transfers', icon: CreditCard, featureCode: 'hrm_salary_transfer' },
  { name: '操作記錄', path: '/dashboard/audit-logs', icon: FileText, featureCode: 'audit_log_view' },
  { name: '系統設定', path: '/dashboard/settings', icon: Settings, featureCode: 'system_settings' },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [featureCodes, setFeatureCodes] = useState<string[]>([])

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/')
        return
      }

      setUser(user)

      // 獲取用戶資料
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('*, role:user_roles(*)')
        .eq('id', user.id)
        .single()

      if (profileData) {
        setProfile(profileData)
      }

      // 讀取此用戶的特殊功能權限（user_feature_permissions）
      const { data: permissionsData } = await supabase
        .from('user_feature_permissions')
        .select('*, feature:feature_permissions(*)')

      if (permissionsData) {
        const codes = (permissionsData as UserFeaturePermission[])
          .filter(p => (p as any).feature?.feature_code)
          .map(p => (p as any).feature.feature_code as string)

        setFeatureCodes(codes)
      }
    } catch (error) {
      console.error('Error checking user:', error)
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">載入中...</p>
        </div>
      </div>
    )
  }

  // 依權限過濾側邊選單
  const visibleMenuItems = menuItems.filter(item => {
    // 沒有綁定 featureCode 的項目：所有登入用戶都可見
    if (!item.featureCode) return true
    // 有綁定 featureCode 的項目：只有有該功能權限的用戶可以看到
    return featureCodes.includes(item.featureCode)
  })

  return (
    <div className="min-h-screen">
      {/* 側邊欄 */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen w-64 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        <div className="h-full glass flex flex-col">
          {/* Logo */}
          <div className="p-6 border-b border-slate-200/50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center overflow-hidden shadow-sm">
                <Image 
                  src="/LOGO_ICON.png" 
                  alt="Logo" 
                  width={40} 
                  height={40} 
                  className="object-contain"
                />
              </div>
              <div>
                <h1 className="font-bold text-slate-800 font-display">外匯會計</h1>
                <p className="text-xs text-slate-500">Forex Accounting</p>
              </div>
            </div>
          </div>

          {/* 導航選單（依權限過濾後的結果） */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {visibleMenuItems.map((item) => {
              const isActive = pathname === item.path
              return (
                <button
                  key={item.path}
                  onClick={() => {
                    router.push(item.path)
                    setSidebarOpen(false)
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </button>
              )
            })}
          </nav>

          {/* 用戶資訊 */}
          <div className="p-4 border-t border-slate-200/50">
            <div className="flex items-center space-x-3 px-4 py-3 rounded-lg bg-slate-50">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-medium">
                {profile?.full_name?.charAt(0).toUpperCase() || <User className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">
                  {profile?.full_name || '用戶'}
                </p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full mt-2 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors duration-200"
            >
              <LogOut className="w-4 h-4" />
              <span className="font-medium">登出</span>
            </button>
          </div>
        </div>
      </aside>

      {/* 主要內容區 */}
      <div className="md:ml-64">
        {/* 頂部導航列 */}
        <header className="sticky top-0 z-30 glass border-b border-slate-200/50">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="md:hidden p-2 rounded-lg hover:bg-slate-100"
                >
                  {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
                <h2 className="text-xl font-semibold text-slate-800">
                  {menuItems.find(item => item.path === pathname)?.name || '儀表板'}
                </h2>
              </div>

              <div className="flex items-center space-x-3">
                <button className="p-2 rounded-lg hover:bg-slate-100 relative">
                  <Bell className="w-5 h-5 text-slate-600" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>
                <div className="hidden sm:block px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
                  {profile?.role?.name || '用戶'}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* 頁面內容 */}
        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>

      {/* 移動端側邊欄遮罩 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
    </div>
  )
}
