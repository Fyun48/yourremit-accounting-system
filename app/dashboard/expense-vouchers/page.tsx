'use client'

import { useEffect, useState } from 'react'
import supabase from '@/lib/supabase'
import { FileCheck, Plus, CheckCircle, XCircle, DollarSign, Eye } from 'lucide-react'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { ExpenseVoucher, ExpenseVoucherItem, ChartOfAccount } from '@/types'

export default function ExpenseVouchersPage() {
  const [vouchers, setVouchers] = useState<ExpenseVoucher[]>([])
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedVoucher, setSelectedVoucher] = useState<ExpenseVoucher | null>(null)
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

      // 載入會計科目
      const { data: accountsData } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('is_active', true)
        .order('code')

      // 載入支出憑單
      let query = supabase
        .from('expense_vouchers')
        .select('*, items:expense_voucher_items(*)')
        .order('created_at', { ascending: false })

      if (!isApprover) {
        query = query.eq('requested_by', user.id)
      } else {
        query = query.in('status', ['待審核', '審核中', '已核准', '已駁回'])
      }

      const { data: vouchersData } = await query

      setAccounts(accountsData || [])
      setVouchers(vouchersData || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (voucherId: string) => {
    if (!confirm('確定要核准此支出憑單嗎？')) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 創建審核記錄
      const { data: approvalRecord } = await supabase
        .from('approval_records')
        .insert({
          entity_type: 'expense_voucher',
          entity_id: voucherId,
          status: '已核准',
          submitted_by: user.id,
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .select()
        .single()

      const { error } = await supabase
        .from('expense_vouchers')
        .update({
          status: '已核准',
          approval_record_id: approvalRecord?.id,
        })
        .eq('id', voucherId)

      if (error) throw error

      loadData()
    } catch (error) {
      console.error('Error approving voucher:', error)
      alert('核准失敗，請重試')
    }
  }

  const handleReject = async (voucherId: string, reason: string) => {
    if (!reason.trim()) {
      alert('請輸入駁回原因')
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('expense_vouchers')
        .update({
          status: '已駁回',
        })
        .eq('id', voucherId)

      if (error) throw error

      loadData()
    } catch (error) {
      console.error('Error rejecting voucher:', error)
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
      case '審核中':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case '已付款':
        return 'bg-blue-100 text-blue-800 border-blue-200'
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
          <h1 className="text-2xl font-bold text-slate-800">支出憑單</h1>
          <p className="text-slate-600 mt-1">支出憑單申請與審核</p>
        </div>
        {!isApprover && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>新增支出憑單</span>
          </button>
        )}
      </div>

      {/* 支出憑單列表 */}
      <div className="card">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">支出憑單列表</h2>
        <div className="space-y-4">
          {vouchers.length === 0 ? (
            <p className="text-center text-slate-400 py-8">尚無支出憑單</p>
          ) : (
            vouchers.map((voucher) => (
              <div
                key={voucher.id}
                className="p-4 border border-slate-200 rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(voucher.status)}`}>
                        {voucher.status}
                      </span>
                      <span className="text-sm text-slate-500">憑單編號: {voucher.voucher_number}</span>
                      <span className="text-sm text-slate-500">
                        申請日期: {format(new Date(voucher.request_date), 'yyyy/MM/dd', { locale: zhTW })}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      <div>
                        <p className="text-sm text-slate-500">申請部門</p>
                        <p className="font-medium text-slate-800">{voucher.department || '未設定'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">總金額</p>
                        <p className="font-medium text-slate-800 text-lg">
                          {voucher.currency} {voucher.total_amount.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">用途</p>
                        <p className="font-medium text-slate-800">{voucher.purpose}</p>
                      </div>
                    </div>

                    {voucher.items && voucher.items.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-slate-600 mb-2">明細項目</p>
                        <div className="space-y-2">
                          {voucher.items.map((item, index) => (
                            <div key={item.id} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                              <span className="text-sm text-slate-700">
                                {index + 1}. {item.description}
                              </span>
                              <span className="text-sm font-medium text-slate-800">
                                {voucher.currency} {item.amount.toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {voucher.notes && (
                      <div className="mt-3">
                        <p className="text-sm text-slate-500">備註</p>
                        <p className="text-slate-800 mt-1">{voucher.notes}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => setSelectedVoucher(voucher)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    {isApprover && (voucher.status === '待審核' || voucher.status === '審核中') && (
                      <>
                        <button
                          onClick={() => handleApprove(voucher.id)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>核准</span>
                        </button>
                        <RejectVoucherButton
                          voucherId={voucher.id}
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

      {/* 新增支出憑單模態框 */}
      {showCreateModal && (
        <CreateVoucherModal
          accounts={accounts}
          onClose={() => setShowCreateModal(false)}
          onSave={loadData}
        />
      )}

      {/* 查看詳情模態框 */}
      {selectedVoucher && (
        <VoucherDetailModal
          voucher={selectedVoucher}
          onClose={() => setSelectedVoucher(null)}
        />
      )}
    </div>
  )
}

// 駁回按鈕組件
function RejectVoucherButton({ voucherId, onReject }: { voucherId: string, onReject: (id: string, reason: string) => void }) {
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
            <h2 className="text-xl font-bold text-slate-800 mb-4">駁回支出憑單</h2>
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
                  onReject(voucherId, reason)
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

// 新增支出憑單模態框
function CreateVoucherModal({ accounts, onClose, onSave }: {
  accounts: ChartOfAccount[]
  onClose: () => void
  onSave: () => void
}) {
  const [requestDate, setRequestDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [department, setDepartment] = useState('')
  const [purpose, setPurpose] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<Array<{ description: string; amount: number; account_id: string; receipt_number: string }>>([
    { description: '', amount: 0, account_id: '', receipt_number: '' }
  ])

  const totalAmount = items.reduce((sum, item) => sum + (item.amount || 0), 0)

  const handleAddItem = () => {
    setItems([...items, { description: '', amount: 0, account_id: '', receipt_number: '' }])
  }

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const handleSubmit = async () => {
    if (!purpose.trim() || items.some(item => !item.description.trim() || item.amount <= 0)) {
      alert('請填寫完整資訊')
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 生成憑單編號
      const voucherNumber = `EV${format(new Date(), 'yyyyMMdd')}${Math.random().toString(36).substr(2, 6).toUpperCase()}`

      // 創建支出憑單
      const { data: voucher, error: voucherError } = await supabase
        .from('expense_vouchers')
        .insert({
          voucher_number: voucherNumber,
          request_date: requestDate,
          requested_by: user.id,
          department,
          total_amount: totalAmount,
          currency: 'TWD',
          purpose,
          notes: notes || null,
          status: '待審核',
        })
        .select()
        .single()

      if (voucherError) throw voucherError

      // 創建明細項目
      const itemsData = items.map((item, index) => ({
        voucher_id: voucher.id,
        item_number: index + 1,
        description: item.description,
        amount: item.amount,
        account_id: item.account_id || null,
        receipt_number: item.receipt_number || null,
      }))

      const { error: itemsError } = await supabase
        .from('expense_voucher_items')
        .insert(itemsData)

      if (itemsError) throw itemsError

      onSave()
      onClose()
    } catch (error) {
      console.error('Error creating voucher:', error)
      alert('創建失敗，請重試')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-slate-800 mb-4">新增支出憑單</h2>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">申請日期 *</label>
              <input
                type="date"
                value={requestDate}
                onChange={(e) => setRequestDate(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">申請部門</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">用途說明 *</label>
            <input
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="請輸入用途說明..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">支出明細 *</label>
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="p-3 border border-slate-200 rounded-lg">
                  <div className="grid grid-cols-2 gap-3 mb-2">
                    <div>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        placeholder="項目說明"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        value={item.amount || ''}
                        onChange={(e) => handleItemChange(index, 'amount', parseFloat(e.target.value) || 0)}
                        placeholder="金額"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <select
                        value={item.account_id}
                        onChange={(e) => handleItemChange(index, 'account_id', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      >
                        <option value="">選擇會計科目</option>
                        {accounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.code} - {acc.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={item.receipt_number}
                        onChange={(e) => handleItemChange(index, 'receipt_number', e.target.value)}
                        placeholder="發票號碼"
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      />
                      {items.length > 1 && (
                        <button
                          onClick={() => handleRemoveItem(index)}
                          className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 text-sm"
                        >
                          刪除
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <button
                onClick={handleAddItem}
                className="w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-blue-500 hover:text-blue-600"
              >
                + 新增項目
              </button>
            </div>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="font-medium text-blue-800">總金額</span>
              <span className="text-xl font-bold text-blue-900">TWD {totalAmount.toLocaleString()}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">備註</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
          >
            提交申請
          </button>
        </div>
      </div>
    </div>
  )
}

// 查看詳情模態框
function VoucherDetailModal({ voucher, onClose }: { voucher: ExpenseVoucher, onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-slate-800 mb-4">支出憑單詳情</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-slate-500">憑單編號</p>
              <p className="font-medium text-slate-800">{voucher.voucher_number}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">申請日期</p>
              <p className="font-medium text-slate-800">
                {format(new Date(voucher.request_date), 'yyyy/MM/dd', { locale: zhTW })}
              </p>
            </div>
          </div>
          {voucher.items && voucher.items.length > 0 && (
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">明細項目</p>
              <div className="space-y-2">
                {voucher.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded">
                    <span className="text-slate-700">{item.description}</span>
                    <span className="font-medium text-slate-800">
                      {voucher.currency} {item.amount.toLocaleString()}
                    </span>
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
