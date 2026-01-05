'use client'

import { useEffect, useState } from 'react'
import supabase from '@/lib/supabase'
import { CreditCard, Plus, Download, CheckCircle, XCircle, Eye } from 'lucide-react'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import * as XLSX from 'xlsx'
import { SalaryTransfer, SalaryTransferItem, PayrollCalculation, UserProfile } from '@/types'

export default function SalaryTransfersPage() {
  const [transfers, setTransfers] = useState<SalaryTransfer[]>([])
  const [payrollCalculations, setPayrollCalculations] = useState<PayrollCalculation[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState(format(new Date(), 'yyyy-MM'))
  const [selectedTransfer, setSelectedTransfer] = useState<SalaryTransfer | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    loadData()
    checkAdminPermission()
  }, [])

  useEffect(() => {
    if (selectedPeriod) {
      loadPayrollCalculations()
    }
  }, [selectedPeriod])

  const checkAdminPermission = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*, role:user_roles(*)')
        .eq('id', user.id)
        .single()

      if (profile?.role?.name === '系統管理員' || profile?.role?.name === '財務經理') {
        setIsAdmin(true)
      }
    } catch (error) {
      console.error('Error checking admin permission:', error)
    }
  }

  const loadData = async () => {
    try {
      // 載入用戶列表
      const { data: usersData } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('is_active', true)
        .order('full_name')

      // 載入薪資轉帳記錄
      const { data: transfersData } = await supabase
        .from('salary_transfers')
        .select('*, items:salary_transfer_items(*)')
        .order('created_at', { ascending: false })

      setUsers(usersData || [])
      setTransfers(transfersData || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadPayrollCalculations = async () => {
    try {
      const { data } = await supabase
        .from('payroll_calculations')
        .select('*')
        .eq('payroll_period', selectedPeriod)
        .eq('status', '已確認')
        .order('created_at', { ascending: false })

      setPayrollCalculations(data || [])
    } catch (error) {
      console.error('Error loading payroll calculations:', error)
    }
  }

  const handleCreateTransfer = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      if (payrollCalculations.length === 0) {
        alert('該期間無已確認的薪資計算記錄')
        return
      }

      // 生成批次編號
      const batchNumber = `ST${format(new Date(), 'yyyyMMdd')}${Math.random().toString(36).substr(2, 6).toUpperCase()}`

      const totalAmount = payrollCalculations.reduce((sum, calc) => sum + calc.net_salary, 0)

      // 創建轉帳記錄
      const { data: transfer, error: transferError } = await supabase
        .from('salary_transfers')
        .insert({
          transfer_batch_number: batchNumber,
          transfer_date: format(new Date(), 'yyyy-MM-dd'),
          total_amount: totalAmount,
          total_employees: payrollCalculations.length,
          currency: 'TWD',
          status: '待處理',
          created_by: user.id,
        })
        .select()
        .single()

      if (transferError) throw transferError

      // 創建轉帳明細
      const itemsData = await Promise.all(
        payrollCalculations.map(async (calc) => {
          const userProfile = users.find(u => u.id === calc.user_id)
          // 這裡應該從用戶資料中獲取銀行帳號，暫時使用空值
          return {
            transfer_id: transfer.id,
            payroll_calculation_id: calc.id,
            user_id: calc.user_id,
            account_number: '', // 應從用戶資料獲取
            account_name: userProfile?.full_name || '未知',
            transfer_amount: calc.net_salary,
            status: '待轉帳',
          }
        })
      )

      const { error: itemsError } = await supabase
        .from('salary_transfer_items')
        .insert(itemsData)

      if (itemsError) throw itemsError

      loadData()
      setShowCreateModal(false)
      alert('薪資轉帳批次已創建')
    } catch (error) {
      console.error('Error creating transfer:', error)
      alert('創建失敗，請重試')
    }
  }

  const handleProcessTransfer = async (transferId: string) => {
    if (!confirm('確定要處理此薪資轉帳嗎？')) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 更新轉帳狀態
      const { error } = await supabase
        .from('salary_transfers')
        .update({
          status: '處理中',
          processed_by: user.id,
        })
        .eq('id', transferId)

      if (error) throw error

      // 這裡應該實際執行轉帳操作（例如調用銀行API）
      // 模擬轉帳處理
      setTimeout(async () => {
        const { error: updateError } = await supabase
          .from('salary_transfers')
          .update({
            status: '已完成',
            processed_at: new Date().toISOString(),
          })
          .eq('id', transferId)

        if (updateError) {
          console.error('Error updating transfer status:', updateError)
        } else {
          // 更新明細狀態
          const transfer = transfers.find(t => t.id === transferId)
          if (transfer?.items) {
            await supabase
              .from('salary_transfer_items')
              .update({
                status: '已轉帳',
                transferred_at: new Date().toISOString(),
              })
              .eq('transfer_id', transferId)
          }

          loadData()
          alert('薪資轉帳已完成')
        }
      }, 2000)

      loadData()
    } catch (error) {
      console.error('Error processing transfer:', error)
      alert('處理失敗，請重試')
    }
  }

  const handleExportTransferFile = (transfer: SalaryTransfer) => {
    const fileName = `薪資轉帳_${transfer.transfer_batch_number}.xlsx`

    // 準備數據
    const exportData = transfer.items?.map(item => {
      const user = users.find(u => u.id === item.user_id)
      return {
        '員工姓名': user?.full_name || '未知',
        '帳號': item.account_number || '',
        '戶名': item.account_name || '',
        '轉帳金額': item.transfer_amount,
        '狀態': item.status,
      }
    }) || []

    // 創建工作表
    const ws = XLSX.utils.json_to_sheet(exportData)

    // 設置列寬
    ws['!cols'] = [
      { wch: 12 }, { wch: 20 }, { wch: 12 }, { wch: 15 }, { wch: 10 },
    ]

    // 創建工作簿
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '薪資轉帳明細')

    // 添加摘要
    const summaryData = [
      ['批次編號', transfer.transfer_batch_number],
      ['轉帳日期', format(new Date(transfer.transfer_date), 'yyyy/MM/dd', { locale: zhTW })],
      ['總金額', transfer.total_amount],
      ['員工人數', transfer.total_employees],
      ['狀態', transfer.status],
    ]
    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData)
    summaryWs['!cols'] = [{ wch: 15 }, { wch: 20 }]
    XLSX.utils.book_append_sheet(wb, summaryWs, '摘要')

    // 導出
    XLSX.writeFile(wb, fileName)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case '已完成':
        return 'bg-green-100 text-green-800 border-green-200'
      case '處理中':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case '部分失敗':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case '已取消':
        return 'bg-slate-100 text-slate-800 border-slate-200'
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200'
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
          <h1 className="text-2xl font-bold text-slate-800">薪資轉帳</h1>
          <p className="text-slate-600 mt-1">薪資轉帳批次管理</p>
        </div>
        {isAdmin && (
          <div className="flex items-center space-x-2">
            <input
              type="month"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary flex items-center space-x-2"
              disabled={payrollCalculations.length === 0}
            >
              <Plus className="w-5 h-5" />
              <span>創建轉帳批次</span>
            </button>
          </div>
        )}
      </div>

      {/* 轉帳批次列表 */}
      <div className="card">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">轉帳批次列表</h2>
        <div className="space-y-4">
          {transfers.length === 0 ? (
            <p className="text-center text-slate-400 py-8">尚無轉帳記錄</p>
          ) : (
            transfers.map((transfer) => (
              <div
                key={transfer.id}
                className="p-4 border border-slate-200 rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(transfer.status)}`}>
                        {transfer.status}
                      </span>
                      <span className="text-sm text-slate-500">批次編號: {transfer.transfer_batch_number}</span>
                      <span className="text-sm text-slate-500">
                        轉帳日期: {format(new Date(transfer.transfer_date), 'yyyy/MM/dd', { locale: zhTW })}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      <div>
                        <p className="text-sm text-slate-500">總金額</p>
                        <p className="font-medium text-slate-800 text-lg">
                          {transfer.currency} {transfer.total_amount.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">員工人數</p>
                        <p className="font-medium text-slate-800">{transfer.total_employees} 人</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">平均金額</p>
                        <p className="font-medium text-slate-800">
                          {transfer.currency} {Math.round(transfer.total_amount / transfer.total_employees).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {transfer.processed_at && (
                      <p className="text-sm text-slate-500 mt-2">
                        處理時間: {format(new Date(transfer.processed_at), 'yyyy/MM/dd HH:mm', { locale: zhTW })}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => setSelectedTransfer(transfer)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    {isAdmin && transfer.status === '待處理' && (
                      <button
                        onClick={() => handleProcessTransfer(transfer.id)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>處理轉帳</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleExportTransferFile(transfer)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
                    >
                      <Download className="w-4 h-4" />
                      <span>匯出</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 創建轉帳批次確認模態框 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-slate-800 mb-4">創建薪資轉帳批次</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-600 mb-2">期間: {format(new Date(selectedPeriod + '-01'), 'yyyy年MM月', { locale: zhTW })}</p>
                <p className="text-sm text-slate-600 mb-2">員工人數: {payrollCalculations.length} 人</p>
                <p className="text-sm text-slate-600 mb-4">
                  總金額: TWD {payrollCalculations.reduce((sum, calc) => sum + calc.net_salary, 0).toLocaleString()}
                </p>
              </div>
              <p className="text-sm text-slate-500">
                確定要為以上 {payrollCalculations.length} 位員工創建薪資轉帳批次嗎？
              </p>
            </div>
            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-slate-600 hover:text-slate-800"
              >
                取消
              </button>
              <button
                onClick={handleCreateTransfer}
                className="btn btn-primary"
              >
                確認創建
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 查看詳情模態框 */}
      {selectedTransfer && (
        <TransferDetailModal
          transfer={selectedTransfer}
          users={users}
          onClose={() => setSelectedTransfer(null)}
        />
      )}
    </div>
  )
}

// 轉帳詳情模態框
function TransferDetailModal({ transfer, users, onClose }: {
  transfer: SalaryTransfer
  users: UserProfile[]
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-slate-800 mb-4">轉帳批次詳情</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-slate-500">批次編號</p>
              <p className="font-medium text-slate-800">{transfer.transfer_batch_number}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">轉帳日期</p>
              <p className="font-medium text-slate-800">
                {format(new Date(transfer.transfer_date), 'yyyy/MM/dd', { locale: zhTW })}
              </p>
            </div>
          </div>

          {transfer.items && transfer.items.length > 0 && (
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">轉帳明細</p>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2 px-3 text-sm font-medium text-slate-700">員工</th>
                      <th className="text-left py-2 px-3 text-sm font-medium text-slate-700">帳號</th>
                      <th className="text-left py-2 px-3 text-sm font-medium text-slate-700">戶名</th>
                      <th className="text-right py-2 px-3 text-sm font-medium text-slate-700">金額</th>
                      <th className="text-center py-2 px-3 text-sm font-medium text-slate-700">狀態</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transfer.items.map((item) => {
                      const user = users.find(u => u.id === item.user_id)
                      return (
                        <tr key={item.id} className="border-b border-slate-100">
                          <td className="py-2 px-3 text-sm text-slate-800">{user?.full_name || '未知'}</td>
                          <td className="py-2 px-3 text-sm text-slate-600">{item.account_number || '-'}</td>
                          <td className="py-2 px-3 text-sm text-slate-600">{item.account_name || '-'}</td>
                          <td className="py-2 px-3 text-sm text-slate-800 text-right">
                            {transfer.currency} {item.transfer_amount.toLocaleString()}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              item.status === '已轉帳' ? 'bg-green-100 text-green-800' :
                              item.status === '轉帳失敗' ? 'bg-red-100 text-red-800' :
                              'bg-slate-100 text-slate-800'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end mt-6">
          <button onClick={onClose} className="btn btn-secondary">關閉</button>
        </div>
      </div>
    </div>
  )
}
