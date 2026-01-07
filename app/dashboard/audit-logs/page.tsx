'use client'

import { useEffect, useState } from 'react'
import supabase from '@/lib/supabase'
import { FileText, Search, Calendar, Filter, Download } from 'lucide-react'
import { format } from 'date-fns'

interface AuditLog {
  id: string
  user_id: string
  user_name: string
  action_type: 'create' | 'update' | 'delete'
  module: string
  record_id: string
  record_name: string
  old_data?: any
  new_data?: any
  description: string
  created_at: string
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    module: '',
    action_type: '',
    user_name: '',
    employee_id: '',
  })

  useEffect(() => {
    loadLogs()
  }, [])

  const loadLogs = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000)

      // 應用篩選條件
      if (filters.start_date) {
        query = query.gte('created_at', filters.start_date + 'T00:00:00')
      }
      if (filters.end_date) {
        query = query.lte('created_at', filters.end_date + 'T23:59:59')
      }
      if (filters.module) {
        query = query.eq('module', filters.module)
      }
      if (filters.action_type) {
        query = query.eq('action_type', filters.action_type)
      }
      if (filters.user_name) {
        query = query.ilike('user_name', `%${filters.user_name}%`)
      }
      if (filters.employee_id) {
        // 在 record_name 或 new_data/old_data 中搜尋員工編號
        query = query.or(`record_name.ilike.%${filters.employee_id}%,new_data->>employee_id.ilike.%${filters.employee_id}%,old_data->>employee_id.ilike.%${filters.employee_id}%`)
      }

      const { data, error } = await query

      if (error) throw error
      setLogs(data || [])
    } catch (error) {
      console.error('Error loading audit logs:', error)
      alert('載入操作記錄失敗')
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const handleSearch = () => {
    loadLogs()
  }

  const handleReset = () => {
    setFilters({
      start_date: '',
      end_date: '',
      module: '',
      action_type: '',
      user_name: '',
      employee_id: '',
    })
    setTimeout(() => loadLogs(), 100)
  }

  const exportLogs = () => {
    const csv = [
      ['操作時間', '操作者', '操作類型', '功能模組', '記錄名稱', '操作描述'].join(','),
      ...logs.map(log => [
        format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
        log.user_name || '未知',
        log.action_type === 'create' ? '新增' : log.action_type === 'update' ? '更新' : '刪除',
        getModuleName(log.module),
        log.record_name || '',
        log.description || ''
      ].join(','))
    ].join('\n')

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `操作記錄_${format(new Date(), 'yyyyMMdd')}.csv`
    link.click()
  }

  const getModuleName = (module: string) => {
    const moduleNames: Record<string, string> = {
      'user_profiles': '員工管理',
      'companies': '公司管理',
      'departments': '部門管理',
      'organization_positions': '組織圖表',
    }
    return moduleNames[module] || module
  }

  const getActionTypeName = (action: string) => {
    const actionNames: Record<string, string> = {
      'create': '新增',
      'update': '更新',
      'delete': '刪除',
    }
    return actionNames[action] || action
  }

  const getActionTypeColor = (action: string) => {
    const colors: Record<string, string> = {
      'create': 'bg-green-100 text-green-800',
      'update': 'bg-blue-100 text-blue-800',
      'delete': 'bg-red-100 text-red-800',
    }
    return colors[action] || 'bg-slate-100 text-slate-800'
  }

  if (loading && logs.length === 0) {
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
          <h1 className="text-2xl font-bold text-slate-800">操作記錄查詢</h1>
          <p className="text-slate-600 mt-1">查詢系統操作記錄，追蹤異動歷史</p>
        </div>
        <button
          onClick={exportLogs}
          className="btn btn-secondary flex items-center space-x-2"
          disabled={logs.length === 0}
        >
          <Download className="w-5 h-5" />
          <span>匯出 CSV</span>
        </button>
      </div>

      {/* 篩選條件 */}
      <div className="card">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="w-5 h-5 text-slate-600" />
          <h3 className="text-lg font-semibold text-slate-800">篩選條件</h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">開始日期</label>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => handleFilterChange('start_date', e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">結束日期</label>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => handleFilterChange('end_date', e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">功能模組</label>
            <select
              value={filters.module}
              onChange={(e) => handleFilterChange('module', e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">全部</option>
              <option value="user_profiles">員工管理</option>
              <option value="companies">公司管理</option>
              <option value="departments">部門管理</option>
              <option value="organization_positions">組織圖表</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">操作類型</label>
            <select
              value={filters.action_type}
              onChange={(e) => handleFilterChange('action_type', e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">全部</option>
              <option value="create">新增</option>
              <option value="update">更新</option>
              <option value="delete">刪除</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">操作者姓名</label>
            <input
              type="text"
              value={filters.user_name}
              onChange={(e) => handleFilterChange('user_name', e.target.value)}
              placeholder="搜尋操作者姓名..."
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">員工編號</label>
            <input
              type="text"
              value={filters.employee_id}
              onChange={(e) => handleFilterChange('employee_id', e.target.value)}
              placeholder="搜尋員工編號..."
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="flex items-center justify-end space-x-3 mt-4">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-slate-600 hover:text-slate-800"
          >
            重置
          </button>
          <button
            onClick={handleSearch}
            className="btn btn-primary flex items-center space-x-2"
          >
            <Search className="w-4 h-4" />
            <span>查詢</span>
          </button>
        </div>
      </div>

      {/* 記錄列表 */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">操作時間</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">操作者</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">操作類型</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">功能模組</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">記錄名稱</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">操作描述</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    尚無操作記錄
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 text-sm text-slate-800">
                      {format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss')}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-800">{log.user_name || '未知'}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getActionTypeColor(log.action_type)}`}>
                        {getActionTypeName(log.action_type)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">{getModuleName(log.module)}</td>
                    <td className="py-3 px-4 text-sm text-slate-800">{log.record_name || '-'}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{log.description || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
