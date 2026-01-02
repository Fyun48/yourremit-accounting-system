'use client'

import { useState } from 'react'
import { BarChart3, TrendingUp, Download, Calendar } from 'lucide-react'

export default function ReportsPage() {
  const [reportType, setReportType] = useState('balance')
  const [dateRange, setDateRange] = useState('month')

  const reportTypes = [
    { id: 'balance', name: '資產負債表', icon: BarChart3 },
    { id: 'income', name: '損益表', icon: TrendingUp },
    { id: 'cashflow', name: '現金流量表', icon: Calendar },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">財務報表</h1>
          <p className="text-slate-600 mt-1">查看各類財務報表與分析</p>
        </div>
        <button className="btn btn-primary flex items-center space-x-2">
          <Download className="w-5 h-5" />
          <span>匯出報表</span>
        </button>
      </div>

      {/* 報表類型選擇 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {reportTypes.map((type) => (
          <button
            key={type.id}
            onClick={() => setReportType(type.id)}
            className={`card text-left hover:shadow-xl transition-all ${
              reportType === type.id ? 'ring-2 ring-blue-500' : ''
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                reportType === type.id
                  ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                <type.icon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">{type.name}</h3>
                <p className="text-sm text-slate-500">點擊查看</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* 日期範圍選擇 */}
      <div className="card">
        <div className="flex items-center space-x-4">
          <label className="label mb-0">報表期間：</label>
          <select
            className="input"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="month">本月</option>
            <option value="quarter">本季</option>
            <option value="year">本年</option>
            <option value="custom">自訂期間</option>
          </select>
        </div>
      </div>

      {/* 報表內容 */}
      <div className="card">
        {reportType === 'balance' && (
          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-6">資產負債表</h2>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-slate-700 mb-3 pb-2 border-b">資產</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">流動資產</span>
                    <span className="font-mono font-medium">$ 5,250,000</span>
                  </div>
                  <div className="flex justify-between text-sm pl-4">
                    <span className="text-slate-500">現金及約當現金</span>
                    <span className="font-mono">$ 2,500,000</span>
                  </div>
                  <div className="flex justify-between text-sm pl-4">
                    <span className="text-slate-500">銀行存款-外幣</span>
                    <span className="font-mono">$ 2,750,000</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-slate-700 mb-3 pb-2 border-b">負債</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">流動負債</span>
                    <span className="font-mono font-medium">$ 850,000</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-slate-700 mb-3 pb-2 border-b">權益</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">股東權益</span>
                    <span className="font-mono font-medium">$ 4,400,000</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t-2 border-slate-300">
                <div className="flex justify-between font-bold">
                  <span>資產總計</span>
                  <span className="font-mono">$ 5,250,000</span>
                </div>
                <div className="flex justify-between font-bold mt-2">
                  <span>負債及權益總計</span>
                  <span className="font-mono">$ 5,250,000</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {reportType === 'income' && (
          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-6">損益表</h2>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-slate-700 mb-3 pb-2 border-b">收入</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">匯兌收益</span>
                    <span className="font-mono font-medium text-green-600">$ 125,000</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-slate-700 mb-3 pb-2 border-b">費用</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">匯兌損失</span>
                    <span className="font-mono text-red-600">$ 15,000</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">銀行手續費</span>
                    <span className="font-mono text-red-600">$ 5,000</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t-2 border-slate-300">
                <div className="flex justify-between font-bold text-lg">
                  <span>本期淨利</span>
                  <span className="font-mono text-green-600">$ 105,000</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {reportType === 'cashflow' && (
          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-6">現金流量表</h2>
            <div className="text-center py-12 text-slate-500">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p>現金流量表功能開發中...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
