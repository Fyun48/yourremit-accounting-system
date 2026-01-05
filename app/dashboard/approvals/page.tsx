'use client'

import { useEffect, useState } from 'react'
import supabase from '@/lib/supabase'
import { CheckCircle2, Clock, XCircle, Eye, Filter } from 'lucide-react'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { ApprovalRecord, ApprovalStepRecord } from '@/types'

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<ApprovalRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterEntityType, setFilterEntityType] = useState<string>('')
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRecord | null>(null)
  const [isApprover, setIsApprover] = useState(false)

  useEffect(() => {
    loadData()
    checkApproverPermission()
  }, [])

  useEffect(() => {
    loadData()
  }, [filterStatus, filterEntityType])

  const checkApproverPermission = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*, role:user_roles(*)')
        .eq('id', user.id)
        .single()

      if (profile?.role?.name === '系統管理員' || profile?.role?.name === '財務經理') {
        setIsApprover(true)
      }
    } catch (error) {
      console.error('Error checking approver permission:', error)
    }
  }

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let query = supabase
        .from('approval_records')
        .select('*')
        .order('created_at', { ascending: false })

      // 如果不是審核者，只顯示自己提交的
      if (!isApprover) {
        query = query.eq('submitted_by', user.id)
      }

      // 應用篩選
      if (filterStatus) {
        query = query.eq('status', filterStatus)
      }
      if (filterEntityType) {
        query = query.eq('entity_type', filterEntityType)
      }

      const { data } = await query

      setApprovals(data || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (approvalId: string) => {
    if (!confirm('確定要核准此申請嗎？')) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const approval = approvals.find(a => a.id === approvalId)
      if (!approval) return

      // 更新審核記錄
      const { error } = await supabase
        .from('approval_records')
        .update({
          status: '已核准',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', approvalId)

      if (error) throw error

      // 根據實體類型更新對應表的狀態
      if (approval.entity_type === 'expense_voucher') {
        await supabase
          .from('expense_vouchers')
          .update({ status: '已核准' })
          .eq('id', approval.entity_id)
      } else if (approval.entity_type === 'leave_request') {
        await supabase
          .from('leave_requests')
          .update({ status: '已核准', approved_by: user.id, approved_at: new Date().toISOString() })
          .eq('id', approval.entity_id)
      }

      loadData()
      alert('已核准')
    } catch (error) {
      console.error('Error approving:', error)
      alert('核准失敗，請重試')
    }
  }

  const handleReject = async (approvalId: string, reason: string) => {
    if (!reason.trim()) {
      alert('請輸入駁回原因')
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const approval = approvals.find(a => a.id === approvalId)
      if (!approval) return

      // 更新審核記錄
      const { error } = await supabase
        .from('approval_records')
        .update({
          status: '已駁回',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          rejected_reason: reason,
        })
        .eq('id', approvalId)

      if (error) throw error

      // 根據實體類型更新對應表的狀態
      if (approval.entity_type === 'expense_voucher') {
        await supabase
          .from('expense_vouchers')
          .update({ status: '已駁回' })
          .eq('id', approval.entity_id)
      } else if (approval.entity_type === 'leave_request') {
        await supabase
          .from('leave_requests')
          .update({ status: '已駁回', approved_by: user.id, approved_at: new Date().toISOString(), rejected_reason: reason })
          .eq('id', approval.entity_id)
      }

      loadData()
      alert('已駁回')
    } catch (error) {
      console.error('Error rejecting:', error)
      alert('駁回失敗，請重試')
    }
  }

  const getEntityTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'expense_voucher': '支出憑單',
      'leave_request': '請假申請',
      'purchase_order': '採購單',
      'payment_request': '付款申請',
    }
    return labels[type] || type
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case '已核准':
        return 'bg-green-100 text-green-800 border-green-200'
      case '已駁回':
        return 'bg-red-100 text-red-800 border-red-200'
      case '待審核':
      case '審核中':
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

  const pendingApprovals = approvals.filter(a => a.status === '待審核' || a.status === '審核中')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">審核流程</h1>
          <p className="text-slate-600 mt-1">統一審核流程管理</p>
        </div>
      </div>

      {/* 待審核提醒 */}
      {isApprover && pendingApprovals.length > 0 && (
        <div className="card bg-yellow-50 border-yellow-200">
          <div className="flex items-center space-x-3">
            <Clock className="w-5 h-5 text-yellow-600" />
            <div>
              <p className="font-medium text-yellow-800">
                有 {pendingApprovals.length} 筆申請待審核
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 篩選條件 */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">狀態</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">全部狀態</option>
              <option value="待審核">待審核</option>
              <option value="審核中">審核中</option>
              <option value="已核准">已核准</option>
              <option value="已駁回">已駁回</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">申請類型</label>
            <select
              value={filterEntityType}
              onChange={(e) => setFilterEntityType(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">全部類型</option>
              <option value="expense_voucher">支出憑單</option>
              <option value="leave_request">請假申請</option>
              <option value="purchase_order">採購單</option>
              <option value="payment_request">付款申請</option>
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

      {/* 審核記錄列表 */}
      <div className="card">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">審核記錄</h2>
        <div className="space-y-4">
          {approvals.length === 0 ? (
            <p className="text-center text-slate-400 py-8">尚無審核記錄</p>
          ) : (
            approvals.map((approval) => (
              <div
                key={approval.id}
                className="p-4 border border-slate-200 rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(approval.status)}`}>
                        {approval.status}
                      </span>
                      <span className="text-sm text-slate-500">
                        {getEntityTypeLabel(approval.entity_type)}
                      </span>
                      <span className="text-sm text-slate-500">
                        申請日期: {format(new Date(approval.created_at), 'yyyy/MM/dd', { locale: zhTW })}
                      </span>
                    </div>

                    <div className="mt-3">
                      <p className="text-sm text-slate-500">申請編號</p>
                      <p className="font-medium text-slate-800">{approval.entity_id}</p>
                    </div>

                    {approval.rejected_reason && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm font-medium text-red-800">駁回原因</p>
                        <p className="text-sm text-red-700 mt-1">{approval.rejected_reason}</p>
                      </div>
                    )}

                    {approval.approved_at && (
                      <p className="text-sm text-slate-500 mt-2">
                        審核時間: {format(new Date(approval.approved_at), 'yyyy/MM/dd HH:mm', { locale: zhTW })}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => setSelectedApproval(approval)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    {isApprover && (approval.status === '待審核' || approval.status === '審核中') && (
                      <>
                        <button
                          onClick={() => handleApprove(approval.id)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>核准</span>
                        </button>
                        <RejectApprovalButton
                          approvalId={approval.id}
                          onReject={handleReject}
                        />
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 查看詳情模態框 */}
      {selectedApproval && (
        <ApprovalDetailModal
          approval={selectedApproval}
          onClose={() => setSelectedApproval(null)}
        />
      )}
    </div>
  )
}

// 駁回按鈕組件
function RejectApprovalButton({ approvalId, onReject }: { approvalId: string, onReject: (id: string, reason: string) => void }) {
  const [showModal, setShowModal] = useState(false)
  const [reason, setReason] = useState('')

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center space-x-2"
      >
        <XCircle className="w-4 h-4" />
        <span>駁回</span>
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-slate-800 mb-4">駁回申請</h2>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">駁回原因</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500"
                placeholder="請輸入駁回原因..."
              />
            </div>
            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowModal(false)
                  setReason('')
                }}
                className="px-4 py-2 text-slate-600 hover:text-slate-800"
              >
                取消
              </button>
              <button
                onClick={() => {
                  onReject(approvalId, reason)
                  setShowModal(false)
                  setReason('')
                }}
                className="btn bg-red-600 hover:bg-red-700 text-white"
                disabled={!reason.trim()}
              >
                確認駁回
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// 審核詳情模態框
function ApprovalDetailModal({ approval, onClose }: { approval: ApprovalRecord, onClose: () => void }) {
  const [steps, setSteps] = useState<ApprovalStepRecord[]>([])

  useEffect(() => {
    loadSteps()
  }, [approval.id])

  const loadSteps = async () => {
    try {
      const { data } = await supabase
        .from('approval_step_records')
        .select('*')
        .eq('approval_record_id', approval.id)
        .order('step_order')

      setSteps(data || [])
    } catch (error) {
      console.error('Error loading steps:', error)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-slate-800 mb-4">審核詳情</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-slate-500">申請類型</p>
              <p className="font-medium text-slate-800">{approval.entity_type}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">狀態</p>
              <p className="font-medium text-slate-800">{approval.status}</p>
            </div>
          </div>

          {steps.length > 0 && (
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">審核步驟</p>
              <div className="space-y-2">
                {steps.map((step) => (
                  <div key={step.id} className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-700">步驟 {step.step_order}</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        step.status === '已核准' ? 'bg-green-100 text-green-800' :
                        step.status === '已駁回' ? 'bg-red-100 text-red-800' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {step.status}
                      </span>
                    </div>
                    {step.comments && (
                      <p className="text-sm text-slate-600 mt-2">{step.comments}</p>
                    )}
                  </div>
                ))}
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
