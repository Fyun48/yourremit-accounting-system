'use client'

import { useEffect, useState } from 'react'
import supabase from '@/lib/supabase'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Calendar
} from 'lucide-react'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'

interface DashboardStats {
  totalTransactions: number
  totalVolume: number
  monthlyGain: number
  monthlyLoss: number
  recentTransactions: any[]
  exchangeRates: any[]
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalTransactions: 0,
    totalVolume: 0,
    monthlyGain: 0,
    monthlyLoss: 0,
    recentTransactions: [],
    exchangeRates: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      // 獲取本月交易統計
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const { data: transactions } = await supabase
        .from('forex_transactions')
        .select('*')
        .gte('transaction_date', startOfMonth.toISOString())
        .order('transaction_date', { ascending: false })

      // 獲取最近5筆交易
      const { data: recentTx } = await supabase
        .from('forex_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)

      // 獲取當前匯率
      const { data: rates } = await supabase
        .from('exchange_rates')
        .select('*')
        .eq('is_active', true)
        .order('effective_date', { ascending: false })

      // 計算統計數據
      const totalVolume = transactions?.reduce((sum, tx) => sum + Number(tx.to_amount), 0) || 0
      
      setStats({
        totalTransactions: transactions?.length || 0,
        totalVolume,
        monthlyGain: 125000, // 示例數據
        monthlyLoss: 15000, // 示例數據
        recentTransactions: recentTx || [],
        exchangeRates: rates?.slice(0, 4) || []
      })
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      title: '本月交易筆數',
      value: stats.totalTransactions,
      change: '+12.5%',
      positive: true,
      icon: Activity,
      color: 'from-blue-500 to-cyan-500'
    },
    {
      title: '交易總額',
      value: `NT$ ${stats.totalVolume.toLocaleString()}`,
      change: '+8.2%',
      positive: true,
      icon: DollarSign,
      color: 'from-green-500 to-emerald-500'
    },
    {
      title: '匯兌收益',
      value: `NT$ ${stats.monthlyGain.toLocaleString()}`,
      change: '+15.3%',
      positive: true,
      icon: TrendingUp,
      color: 'from-purple-500 to-pink-500'
    },
    {
      title: '匯兌損失',
      value: `NT$ ${stats.monthlyLoss.toLocaleString()}`,
      change: '-3.1%',
      positive: false,
      icon: TrendingDown,
      color: 'from-orange-500 to-red-500'
    }
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-24 bg-slate-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 歡迎橫幅 */}
      <div className="glass rounded-2xl p-8 bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 font-display">歡迎回來！</h1>
            <p className="text-blue-100 text-lg">
              今天是 {format(new Date(), 'yyyy年MM月dd日 EEEE', { locale: zhTW })}
            </p>
          </div>
          <Calendar className="w-16 h-16 text-white/30" />
        </div>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <div 
            key={index} 
            className="card hover:shadow-xl transition-shadow duration-300"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-slate-500 mb-1">{stat.title}</p>
                <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-white`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
            <div className="flex items-center space-x-1">
              {stat.positive ? (
                <ArrowUpRight className="w-4 h-4 text-green-600" />
              ) : (
                <ArrowDownRight className="w-4 h-4 text-red-600" />
              )}
              <span className={`text-sm font-medium ${stat.positive ? 'text-green-600' : 'text-red-600'}`}>
                {stat.change}
              </span>
              <span className="text-sm text-slate-500">vs 上月</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 最近交易 */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-800">最近交易</h3>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              查看全部 →
            </button>
          </div>

          <div className="space-y-3">
            {stats.recentTransactions.length > 0 ? (
              stats.recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      tx.transaction_type === '買入' 
                        ? 'bg-green-100 text-green-600' 
                        : 'bg-red-100 text-red-600'
                    }`}>
                      {tx.transaction_type === '買入' ? '↑' : '↓'}
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">
                        {tx.from_currency} → {tx.to_currency}
                      </p>
                      <p className="text-sm text-slate-500">
                        {format(new Date(tx.transaction_date), 'MM/dd HH:mm')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-slate-800">
                      {Number(tx.to_amount).toLocaleString()}
                    </p>
                    <p className="text-sm text-slate-500">@ {Number(tx.exchange_rate).toFixed(4)}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-slate-500 py-8">暫無交易記錄</p>
            )}
          </div>
        </div>

        {/* 當前匯率 */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-800">當前匯率</h3>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              更新匯率 →
            </button>
          </div>

          <div className="space-y-3">
            {stats.exchangeRates.length > 0 ? (
              stats.exchangeRates.map((rate) => (
                <div key={rate.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center font-mono font-bold text-blue-700">
                      {rate.from_currency}
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">
                        {rate.from_currency} / {rate.to_currency}
                      </p>
                      <p className="text-sm text-slate-500">{rate.source || '官方匯率'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-slate-800 font-mono">
                      {Number(rate.rate).toFixed(4)}
                    </p>
                    <p className="text-xs text-green-600">+0.12%</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-slate-500 py-8">暫無匯率數據</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
