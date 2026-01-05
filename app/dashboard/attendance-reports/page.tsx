'use client'

import { useEffect, useState } from 'react'
import supabase from '@/lib/supabase'
import { TrendingUp, Download, Calendar, Filter } from 'lucide-react'
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import * as XLSX from 'xlsx'
import { AttendanceRecord, UserProfile } from '@/types'

export default function AttendanceReportsPage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [periodType, setPeriodType] = useState<'month' | 'quarter' | 'year'>('month')
  const [selectedPeriod, setSelectedPeriod] = useState(format(new Date(), 'yyyy-MM'))
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [summary, setSummary] = useState({
    totalWorkDays: 0,
    totalWorkHours: 0,
    totalOvertimeHours: 0,
    lateCount: 0,
    earlyLeaveCount: 0,
    absentCount: 0,
    leaveDays: 0,
  })

  useEffect(() => {
    loadUsers()
  }, [])

  useEffect(() => {
    if (selectedPeriod) {
      loadData()
    }
  }, [selectedPeriod, periodType, selectedUserId])

  const loadUsers = async () => {
    try {
      const { data } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('is_active', true)
        .order('full_name')

      setUsers(data || [])
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  const getDateRange = () => {
    const date = new Date(selectedPeriod + '-01')
    let start: Date, end: Date

    switch (periodType) {
      case 'month':
        start = startOfMonth(date)
        end = endOfMonth(date)
        break
      case 'quarter':
        const quarter = Math.floor(date.getMonth() / 3)
        const quarterStart = new Date(date.getFullYear(), quarter * 3, 1)
        start = startOfQuarter(quarterStart)
        end = endOfQuarter(quarterStart)
        break
      case 'year':
        start = startOfYear(date)
        end = endOfYear(date)
        break
    }

    return { start, end }
  }

  const loadData = async () => {
    try {
      setLoading(true)
      const { start, end } = getDateRange()

      let query = supabase
        .from('attendance_records')
        .select('*')
        .gte('record_date', format(start, 'yyyy-MM-dd'))
        .lte('record_date', format(end, 'yyyy-MM-dd'))
        .order('record_date', { ascending: true })

      if (selectedUserId) {
        query = query.eq('user_id', selectedUserId)
      }

      const { data } = await query

      setRecords(data || [])

      // 計算統計
      const stats = {
        totalWorkDays: data?.filter(r => r.status !== '缺勤' && r.status !== '請假').length || 0,
        totalWorkHours: data?.reduce((sum, r) => sum + (r.work_hours || 0), 0) || 0,
        totalOvertimeHours: data?.reduce((sum, r) => sum + (r.overtime_hours || 0), 0) || 0,
        lateCount: data?.filter(r => r.status === '遲到').length || 0,
        earlyLeaveCount: data?.filter(r => r.status === '早退').length || 0,
        absentCount: data?.filter(r => r.status === '缺勤').length || 0,
        leaveDays: data?.filter(r => r.status === '請假').length || 0,
      }

      setSummary(stats)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExportExcel = () => {
    const { start, end } = getDateRange()
    const periodLabel = periodType === 'month' ? '月' : periodType === 'quarter' ? '季' : '年'
    const fileName = `出缺勤報表_${format(start, 'yyyyMMdd')}_${format(end, 'yyyyMMdd')}.xlsx`

    // 準備數據
    const exportData = records.map(record => {
      const user = users.find(u => u.id === record.user_id)
      return {
        '日期': format(new Date(record.record_date), 'yyyy/MM/dd', { locale: zhTW }),
        '員工姓名': user?.full_name || '未知',
        '上班時間': record.clock_in_time ? format(new Date(record.clock_in_time), 'HH:mm') : '',
        '下班時間': record.clock_out_time ? format(new Date(record.clock_out_time), 'HH:mm') : '',
        '工作時數': record.work_hours.toFixed(2),
        '加班時數': record.overtime_hours.toFixed(2),
        '狀態': record.status,
        '遲到分鐘': record.late_minutes,
        '早退分鐘': record.early_leave_minutes,
        '備註': record.notes || '',
      }
    })

    // 創建工作表
    const ws = XLSX.utils.json_to_sheet(exportData)

    // 設置列寬
    const colWidths = [
      { wch: 12 }, // 日期
      { wch: 12 }, // 員工姓名
      { wch: 10 }, // 上班時間
      { wch: 10 }, // 下班時間
      { wch: 10 }, // 工作時數
      { wch: 10 }, // 加班時數
      { wch: 10 }, // 狀態
      { wch: 10 }, // 遲到分鐘
      { wch: 10 }, // 早退分鐘
      { wch: 20 }, // 備註
    ]
    ws['!cols'] = colWidths

    // 創建工作簿
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '出缺勤記錄')

    // 添加統計工作表
    const summaryData = [
      ['統計項目', '數值'],
      ['總工作天數', summary.totalWorkDays],
      ['總工作時數', summary.totalWorkHours.toFixed(2)],
      ['總加班時數', summary.totalOvertimeHours.toFixed(2)],
      ['遲到次數', summary.lateCount],
      ['早退次數', summary.earlyLeaveCount],
      ['缺勤次數', summary.absentCount],
      ['請假天數', summary.leaveDays],
    ]
    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData)
    summaryWs['!cols'] = [{ wch: 15 }, { wch: 15 }]
    XLSX.utils.book_append_sheet(wb, summaryWs, '統計摘要')

    // 導出
    XLSX.writeFile(wb, fileName)
  }

  const getPeriodLabel = () => {
    const { start, end } = getDateRange()
    switch (periodType) {
      case 'month':
        return format(start, 'yyyy年MM月', { locale: zhTW })
      case 'quarter':
        return `${format(start, 'yyyy年', { locale: zhTW })}第${Math.floor(start.getMonth() / 3) + 1}季`
      case 'year':
        return format(start, 'yyyy年', { locale: zhTW })
    }
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
          <h1 className="text-2xl font-bold text-slate-800">出缺勤報表</h1>
          <p className="text-slate-600 mt-1">查看月/季/年出缺勤統計報表</p>
        </div>
        <button
          onClick={handleExportExcel}
          className="btn btn-primary flex items-center space-x-2"
        >
          <Download className="w-5 h-5" />
          <span>匯出Excel</span>
        </button>
      </div>

      {/* 篩選條件 */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">期間類型</label>
            <select
              value={periodType}
              onChange={(e) => {
                setPeriodType(e.target.value as 'month' | 'quarter' | 'year')
                if (periodType === 'month') {
                  setSelectedPeriod(format(new Date(), 'yyyy-MM'))
                } else if (periodType === 'quarter') {
                  setSelectedPeriod(format(new Date(), 'yyyy'))
                } else {
                  setSelectedPeriod(format(new Date(), 'yyyy'))
                }
              }}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="month">月</option>
              <option value="quarter">季</option>
              <option value="year">年</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">選擇期間</label>
            <input
              type={periodType === 'month' ? 'month' : 'text'}
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder={periodType === 'month' ? 'yyyy-MM' : 'yyyy'}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">選擇員工</label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">全部員工</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name || user.email}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={loadData}
              className="btn btn-secondary w-full flex items-center justify-center space-x-2"
            >
              <Filter className="w-5 h-5" />
              <span>查詢</span>
            </button>
          </div>
        </div>
      </div>

      {/* 統計摘要 */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <div className="card text-center">
          <p className="text-sm text-slate-500 mb-1">期間</p>
          <p className="text-lg font-bold text-slate-800">{getPeriodLabel()}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-slate-500 mb-1">工作天數</p>
          <p className="text-lg font-bold text-blue-600">{summary.totalWorkDays}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-slate-500 mb-1">工作時數</p>
          <p className="text-lg font-bold text-blue-600">{summary.totalWorkHours.toFixed(1)}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-slate-500 mb-1">加班時數</p>
          <p className="text-lg font-bold text-orange-600">{summary.totalOvertimeHours.toFixed(1)}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-slate-500 mb-1">遲到次數</p>
          <p className="text-lg font-bold text-yellow-600">{summary.lateCount}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-slate-500 mb-1">早退次數</p>
          <p className="text-lg font-bold text-yellow-600">{summary.earlyLeaveCount}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-slate-500 mb-1">缺勤次數</p>
          <p className="text-lg font-bold text-red-600">{summary.absentCount}</p>
        </div>
      </div>

      {/* 詳細記錄 */}
      <div className="card">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">詳細記錄</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">日期</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">員工</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">上班</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">下班</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-700">工作時數</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-700">加班時數</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-slate-700">狀態</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    尚無記錄
                  </td>
                </tr>
              ) : (
                records.map((record) => {
                  const user = users.find(u => u.id === record.user_id)
                  return (
                    <tr key={record.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 text-sm text-slate-800">
                        {format(new Date(record.record_date), 'yyyy/MM/dd', { locale: zhTW })}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-800">
                        {user?.full_name || '未知'}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">
                        {record.clock_in_time ? format(new Date(record.clock_in_time), 'HH:mm') : '-'}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">
                        {record.clock_out_time ? format(new Date(record.clock_out_time), 'HH:mm') : '-'}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-800 text-right">
                        {record.work_hours.toFixed(1)}
                      </td>
                      <td className="py-3 px-4 text-sm text-orange-600 text-right">
                        {record.overtime_hours.toFixed(1)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          record.status === '正常' ? 'bg-green-100 text-green-800' :
                          record.status === '遲到' || record.status === '早退' ? 'bg-yellow-100 text-yellow-800' :
                          record.status === '缺勤' ? 'bg-red-100 text-red-800' :
                          'bg-slate-100 text-slate-800'
                        }`}>
                          {record.status}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
