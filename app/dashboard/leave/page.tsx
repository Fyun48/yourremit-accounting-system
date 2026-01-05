'use client'

import { useEffect, useState } from 'react'
import supabase from '@/lib/supabase'
import { CalendarDays, Plus, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { format, differenceInDays, parseISO } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { LeaveRequest, LeaveType } from '@/types'

export default function LeavePage() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])
  const [loading, setLoading] = useState(true)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [isApprover, setIsApprover] = useState(false)

  useEffect(() => {
    loadData()
    checkApproverPermission()
  }, [])

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

      // 載入請假類型
      const { data: types } = await supabase
        .from('leave_types')
        .select('*')
        .eq('is_active', true)
        .order('name')

      // 載入請假申請（如果是審核者，載入所有待審核的；否則只載入自己的）
      let query = supabase
        .from('leave_requests')
        .select('*, leave_type:leave_types(*)')
        .order('created_at', { ascending: false })

      if (!isApprover) {
        query = query.eq('user_id', user.id)
      } else {
        query = query.in('status', ['待審核', '已核准', '已駁回'])
      }

      const { data: requests } = await query

      setLeaveTypes(types || [])
      setLeaveRequests(requests || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (requestId: string) => {
    if (!confirm('確定要核准此請假申請嗎？')) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('leave_requests')
        .update({
          status: '已核准',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', requestId)

      if (error) throw error

      loadData()
    } catch (error) {
      console.error('Error approving leave:', error)
      alert('核准失敗，請重試')
    }
  }

  const handleReject = async (requestId: string, reason: string) => {
    if (!reason.trim()) {
      alert('請輸入駁回原因')
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('leave_requests')
        .update({
          status: '已駁回',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          rejected_reason: reason,
        })
        .eq('id', requestId)

      if (error) throw error

      loadData()
    } catch (error) {
      console.error('Error rejecting leave:', error)
      alert('駁回失敗，請重試')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case '已核准':
        return 'bg-green-100 text-green-800 border-green-200'
      case '已駁回':
        return 'bg-red-100 text-red-800 border-red-200'
      case '待審核':
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

  const pendingRequests = leaveRequests.filter(r => r.status === '待審核')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">請假管理</h1>
          <p className="text-slate-600 mt-1">請假申請與審核</p>
        </div>
        {!isApprover && (
          <button
            onClick={() => setShowRequestModal(true)}
            className="btn btn-primary flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>申請請假</span>
          </button>
        )}
      </div>

      {/* 待審核提醒（審核者） */}
      {isApprover && pendingRequests.length > 0 && (
        <div className="card bg-yellow-50 border-yellow-200">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <div>
              <p className="font-medium text-yellow-800">
                有 {pendingRequests.length} 筆請假申請待審核
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 請假申請列表 */}
      <div className="card">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">請假記錄</h2>
        <div className="space-y-4">
          {leaveRequests.length === 0 ? (
            <p className="text-center text-slate-400 py-8">尚無請假記錄</p>
          ) : (
            leaveRequests.map((request) => (
              <div
                key={request.id}
                className="p-4 border border-slate-200 rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(request.status)}`}>
                        {request.status}
                      </span>
                      <span className="text-sm text-slate-500">申請編號: {request.request_number}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      <div>
                        <p className="text-sm text-slate-500">請假類型</p>
                        <p className="font-medium text-slate-800">{request.leave_type?.name || '未知'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">請假日期</p>
                        <p className="font-medium text-slate-800">
                          {format(parseISO(request.start_date), 'yyyy/MM/dd', { locale: zhTW })} - {format(parseISO(request.end_date), 'yyyy/MM/dd', { locale: zhTW })}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">請假天數</p>
                        <p className="font-medium text-slate-800">{request.total_days} 天</p>
                      </div>
                    </div>

                    <div className="mt-3">
                      <p className="text-sm text-slate-500">請假事由</p>
                      <p className="text-slate-800 mt-1">{request.reason}</p>
                    </div>

                    {request.rejected_reason && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm font-medium text-red-800">駁回原因</p>
                        <p className="text-sm text-red-700 mt-1">{request.rejected_reason}</p>
                      </div>
                    )}
                  </div>

                  {isApprover && request.status === '待審核' && (
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleApprove(request.id)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>核准</span>
                      </button>
                      <RejectButton
                        requestId={request.id}
                        onReject={handleReject}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 申請請假模態框 */}
      {showRequestModal && (
        <LeaveRequestModal
          leaveTypes={leaveTypes}
          onClose={() => setShowRequestModal(false)}
          onSave={loadData}
        />
      )}
    </div>
  )
}

// 駁回按鈕組件
function RejectButton({ requestId, onReject }: { requestId: string, onReject: (id: string, reason: string) => void }) {
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
            <h2 className="text-xl font-bold text-slate-800 mb-4">駁回請假申請</h2>
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
                  onReject(requestId, reason)
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

// 請假申請模態框
function LeaveRequestModal({ leaveTypes, onClose, onSave }: {
  leaveTypes: LeaveType[]
  onClose: () => void
  onSave: () => void
}) {
  const [leaveTypeId, setLeaveTypeId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [reason, setReason] = useState('')

  const calculateDays = () => {
    if (!startDate || !endDate) return 0
    const start = parseISO(startDate)
    const end = parseISO(endDate)
    return differenceInDays(end, start) + 1
  }

  const handleSubmit = async () => {
    if (!leaveTypeId || !startDate || !endDate || !reason.trim()) {
      alert('請填寫完整資訊')
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 生成申請編號
      const requestNumber = `LV${format(new Date(), 'yyyyMMdd')}${Math.random().toString(36).substr(2, 6).toUpperCase()}`

      const totalDays = calculateDays()

      const { error } = await supabase
        .from('leave_requests')
        .insert({
          request_number: requestNumber,
          user_id: user.id,
          leave_type_id: leaveTypeId,
          start_date: startDate,
          end_date: endDate,
          start_time: startTime || null,
          end_time: endTime || null,
          total_days: totalDays,
          reason,
          status: '待審核',
        })

      if (error) throw error

      onSave()
      onClose()
    } catch (error) {
      console.error('Error submitting leave request:', error)
      alert('申請失敗，請重試')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-slate-800 mb-4">申請請假</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">請假類型 *</label>
            <select
              value={leaveTypeId}
              onChange={(e) => setLeaveTypeId(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">請選擇請假類型</option>
              {leaveTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name} {type.is_paid ? '(有薪)' : '(無薪)'}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">開始日期 *</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">結束日期 *</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">開始時間（選填）</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">結束時間（選填）</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {startDate && endDate && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                請假天數: <span className="font-bold">{calculateDays()} 天</span>
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">請假事由 *</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="請輸入請假事由..."
            />
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:text-slate-800"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="btn btn-primary"
            disabled={!leaveTypeId || !startDate || !endDate || !reason.trim()}
          >
            提交申請
          </button>
        </div>
      </div>
    </div>
  )
}
