'use client'

import { useEffect, useState } from 'react'
import supabase from '@/lib/supabase'
import { Plus, Search, Edit, Trash2, X, DollarSign, Building2, FileText, TrendingUp, Calendar, Clock } from 'lucide-react'
import { Vendor, PurchaseInvoice, VendorPayment, PaymentSchedule } from '@/types'
import { format } from 'date-fns'

export default function PayablesPage() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([])
  const [payments, setPayments] = useState<VendorPayment[]>([])
  const [schedules, setSchedules] = useState<PaymentSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'invoices' | 'vendors' | 'schedules'>('invoices')
  const [showVendorModal, setShowVendorModal] = useState(false)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null)
  const [selectedInvoice, setSelectedInvoice] = useState<PurchaseInvoice | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | '未付款' | '部分付款' | '已付款'>('all')

  const [vendorFormData, setVendorFormData] = useState({
    code: '',
    name: '',
    tax_id: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    payment_terms: '30'
  })

  const [invoiceFormData, setInvoiceFormData] = useState({
    invoice_number: '',
    invoice_date: format(new Date(), 'yyyy-MM-dd'),
    vendor_id: '',
    due_date: '',
    subtotal: '0',
    tax_amount: '0',
    total_amount: '0',
    currency: 'TWD',
    description: ''
  })

  const [paymentFormData, setPaymentFormData] = useState({
    payment_date: format(new Date(), 'yyyy-MM-dd'),
    payment_amount: '0',
    payment_method: '轉帳',
    bank_account: '',
    reference_number: '',
    notes: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        loadVendors(),
        loadInvoices(),
        loadPayments(),
        loadSchedules()
      ])
    } finally {
      setLoading(false)
    }
  }

  const loadVendors = async () => {
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('is_active', true)
        .order('code')

      if (error) throw error
      setVendors(data || [])
    } catch (error: any) {
      console.error('Error loading vendors:', error)
    }
  }

  const loadInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('purchase_invoices')
        .select('*, vendor:vendors(*)')
        .order('invoice_date', { ascending: false })

      if (error) throw error
      setInvoices(data || [])
    } catch (error: any) {
      console.error('Error loading invoices:', error)
    }
  }

  const loadPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('vendor_payments')
        .select('*')
        .order('payment_date', { ascending: false })

      if (error) throw error
      setPayments(data || [])
    } catch (error: any) {
      console.error('Error loading payments:', error)
    }
  }

  const loadSchedules = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_schedules')
        .select('*, vendor:vendors(*), invoice:purchase_invoices(*)')
        .order('scheduled_date', { ascending: true })

      if (error) throw error
      setSchedules(data || [])
    } catch (error: any) {
      console.error('Error loading schedules:', error)
    }
  }

  const handleVendorSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const data = {
        ...vendorFormData,
        payment_terms: parseInt(vendorFormData.payment_terms)
      }

      if (editingVendor) {
        const { error } = await supabase
          .from('vendors')
          .update(data)
          .eq('id', editingVendor.id)

        if (error) throw error
        alert('廠商更新成功！')
      } else {
        const { error } = await supabase
          .from('vendors')
          .insert([data])

        if (error) throw error
        alert('廠商新增成功！')
      }

      setShowVendorModal(false)
      resetVendorForm()
      loadVendors()
    } catch (error: any) {
      alert('操作失敗: ' + error.message)
    }
  }

  const handleInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const subtotal = parseFloat(invoiceFormData.subtotal)
      const taxAmount = parseFloat(invoiceFormData.tax_amount)
      const totalAmount = subtotal + taxAmount

      const data = {
        invoice_number: invoiceFormData.invoice_number,
        invoice_date: invoiceFormData.invoice_date,
        vendor_id: invoiceFormData.vendor_id,
        due_date: invoiceFormData.due_date,
        subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        paid_amount: 0,
        balance_amount: totalAmount,
        currency: invoiceFormData.currency,
        status: '未付款' as const,
        description: invoiceFormData.description
      }

      const { error } = await supabase
        .from('purchase_invoices')
        .insert([data])

      if (error) throw error
      alert('發票新增成功！')
      setShowInvoiceModal(false)
      resetInvoiceForm()
      loadInvoices()
    } catch (error: any) {
      alert('操作失敗: ' + error.message)
    }
  }

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedInvoice) return

    try {
      const paymentAmount = parseFloat(paymentFormData.payment_amount)
      const newPaidAmount = selectedInvoice.paid_amount + paymentAmount
      const newBalanceAmount = selectedInvoice.total_amount - newPaidAmount
      const newStatus = newBalanceAmount <= 0 ? '已付款' : newPaidAmount > 0 ? '部分付款' : '未付款'

      // 新增付款記錄
      const { error: paymentError } = await supabase
        .from('vendor_payments')
        .insert([{
          invoice_id: selectedInvoice.id,
          payment_date: paymentFormData.payment_date,
          payment_amount: paymentAmount,
          payment_method: paymentFormData.payment_method,
          bank_account: paymentFormData.bank_account,
          reference_number: paymentFormData.reference_number,
          notes: paymentFormData.notes
        }])

      if (paymentError) throw paymentError

      // 更新發票狀態
      const { error: invoiceError } = await supabase
        .from('purchase_invoices')
        .update({
          paid_amount: newPaidAmount,
          balance_amount: newBalanceAmount,
          status: newStatus
        })
        .eq('id', selectedInvoice.id)

      if (invoiceError) throw invoiceError

      // 更新付款排程狀態
      const { error: scheduleError } = await supabase
        .from('payment_schedules')
        .update({ status: '已付款' })
        .eq('invoice_id', selectedInvoice.id)
        .eq('status', '待付款')

      if (scheduleError) console.error('Schedule update error:', scheduleError)

      alert('付款記錄新增成功！')
      setShowPaymentModal(false)
      resetPaymentForm()
      loadInvoices()
      loadPayments()
      loadSchedules()
    } catch (error: any) {
      alert('操作失敗: ' + error.message)
    }
  }

  const handleDeleteVendor = async (id: string) => {
    if (!confirm('確定要刪除此廠商嗎？')) return

    try {
      const { error } = await supabase
        .from('vendors')
        .update({ is_active: false })
        .eq('id', id)

      if (error) throw error
      alert('廠商已刪除！')
      loadVendors()
    } catch (error: any) {
      alert('刪除失敗: ' + error.message)
    }
  }

  const resetVendorForm = () => {
    setEditingVendor(null)
    setVendorFormData({
      code: '',
      name: '',
      tax_id: '',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
      payment_terms: '30'
    })
  }

  const resetInvoiceForm = () => {
    setInvoiceFormData({
      invoice_number: '',
      invoice_date: format(new Date(), 'yyyy-MM-dd'),
      vendor_id: '',
      due_date: '',
      subtotal: '0',
      tax_amount: '0',
      total_amount: '0',
      currency: 'TWD',
      description: ''
    })
  }

  const resetPaymentForm = () => {
    setSelectedInvoice(null)
    setPaymentFormData({
      payment_date: format(new Date(), 'yyyy-MM-dd'),
      payment_amount: '0',
      payment_method: '轉帳',
      bank_account: '',
      reference_number: '',
      notes: ''
    })
  }

  const handleEditVendor = (vendor: Vendor) => {
    setEditingVendor(vendor)
    setVendorFormData({
      code: vendor.code,
      name: vendor.name,
      tax_id: vendor.tax_id || '',
      contact_person: vendor.contact_person || '',
      phone: vendor.phone || '',
      email: vendor.email || '',
      address: vendor.address || '',
      payment_terms: vendor.payment_terms.toString()
    })
    setShowVendorModal(true)
  }

  const handleRecordPayment = (invoice: PurchaseInvoice) => {
    setSelectedInvoice(invoice)
    setPaymentFormData({
      payment_date: format(new Date(), 'yyyy-MM-dd'),
      payment_amount: invoice.balance_amount.toString(),
      payment_method: '轉帳',
      bank_account: '',
      reference_number: '',
      notes: ''
    })
    setShowPaymentModal(true)
  }

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (invoice.vendor as Vendor)?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || invoice.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const totalPayables = invoices.reduce((sum, inv) => sum + inv.balance_amount, 0)
  const overdueInvoices = invoices.filter(inv => {
    if (inv.status === '已付款' || inv.balance_amount <= 0) return false
    const dueDate = new Date(inv.due_date)
    return dueDate < new Date()
  })
  const upcomingPayments = schedules.filter(s => s.status === '待付款' && new Date(s.scheduled_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass p-6 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">應付帳款總額</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">
                ${totalPayables.toLocaleString()}
              </p>
            </div>
            <DollarSign className="w-10 h-10 text-red-500" />
          </div>
        </div>
        <div className="glass p-6 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">廠商總數</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{vendors.length}</p>
            </div>
            <Building2 className="w-10 h-10 text-blue-500" />
          </div>
        </div>
        <div className="glass p-6 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">未付款發票</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">
                {invoices.filter(inv => inv.status !== '已付款').length}
              </p>
            </div>
            <FileText className="w-10 h-10 text-orange-500" />
          </div>
        </div>
        <div className="glass p-6 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">逾期發票</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{overdueInvoices.length}</p>
            </div>
            <TrendingUp className="w-10 h-10 text-red-500" />
          </div>
        </div>
      </div>

      {/* 標籤頁 */}
      <div className="glass rounded-xl p-1 flex space-x-1">
        <button
          onClick={() => setActiveTab('invoices')}
          className={`flex-1 px-4 py-2 rounded-lg transition-all ${
            activeTab === 'invoices'
              ? 'bg-blue-500 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          發票管理
        </button>
        <button
          onClick={() => setActiveTab('vendors')}
          className={`flex-1 px-4 py-2 rounded-lg transition-all ${
            activeTab === 'vendors'
              ? 'bg-blue-500 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          廠商管理
        </button>
        <button
          onClick={() => setActiveTab('schedules')}
          className={`flex-1 px-4 py-2 rounded-lg transition-all ${
            activeTab === 'schedules'
              ? 'bg-blue-500 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          付款排程
        </button>
      </div>

      {/* 發票管理 */}
      {activeTab === 'invoices' && (
        <div className="glass rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-slate-800">進貨發票</h2>
            <button
              onClick={() => {
                resetInvoiceForm()
                setShowInvoiceModal(true)
              }}
              className="btn-primary flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>新增發票</span>
            </button>
          </div>

          <div className="flex space-x-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="搜尋發票號碼或廠商名稱..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10 w-full"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="input"
            >
              <option value="all">全部狀態</option>
              <option value="未付款">未付款</option>
              <option value="部分付款">部分付款</option>
              <option value="已付款">已付款</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left p-3 text-slate-600">發票號碼</th>
                  <th className="text-left p-3 text-slate-600">廠商</th>
                  <th className="text-left p-3 text-slate-600">發票日期</th>
                  <th className="text-left p-3 text-slate-600">到期日</th>
                  <th className="text-right p-3 text-slate-600">總金額</th>
                  <th className="text-right p-3 text-slate-600">已付款</th>
                  <th className="text-right p-3 text-slate-600">餘額</th>
                  <th className="text-left p-3 text-slate-600">狀態</th>
                  <th className="text-right p-3 text-slate-600">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice) => {
                  const vendor = invoice.vendor as Vendor
                  const isOverdue = new Date(invoice.due_date) < new Date() && invoice.status !== '已付款'
                  return (
                    <tr key={invoice.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-3 font-medium">{invoice.invoice_number}</td>
                      <td className="p-3">{vendor?.name || '-'}</td>
                      <td className="p-3">{format(new Date(invoice.invoice_date), 'yyyy-MM-dd')}</td>
                      <td className={`p-3 ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
                        {format(new Date(invoice.due_date), 'yyyy-MM-dd')}
                      </td>
                      <td className="p-3 text-right">${invoice.total_amount.toLocaleString()}</td>
                      <td className="p-3 text-right">${invoice.paid_amount.toLocaleString()}</td>
                      <td className="p-3 text-right font-medium">${invoice.balance_amount.toLocaleString()}</td>
                      <td className="p-3">
                        <span className={`badge ${
                          invoice.status === '已付款' ? 'badge-success' :
                          invoice.status === '部分付款' ? 'badge-warning' :
                          'badge-danger'
                        }`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {invoice.balance_amount > 0 && (
                          <button
                            onClick={() => handleRecordPayment(invoice)}
                            className="btn-sm btn-primary"
                          >
                            付款
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 廠商管理 */}
      {activeTab === 'vendors' && (
        <div className="glass rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-slate-800">廠商資料</h2>
            <button
              onClick={() => {
                resetVendorForm()
                setShowVendorModal(true)
              }}
              className="btn-primary flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>新增廠商</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vendors.map((vendor) => (
              <div key={vendor.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-slate-800">{vendor.name}</h3>
                    <p className="text-sm text-slate-500">{vendor.code}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditVendor(vendor)}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteVendor(vendor.id)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {vendor.contact_person && (
                  <p className="text-sm text-slate-600 mt-2">聯絡人: {vendor.contact_person}</p>
                )}
                {vendor.phone && (
                  <p className="text-sm text-slate-600">電話: {vendor.phone}</p>
                )}
                <p className="text-sm text-slate-600 mt-2">
                  付款條件: {vendor.payment_terms} 天
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 付款排程 */}
      {activeTab === 'schedules' && (
        <div className="glass rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-slate-800">付款排程</h2>
            <div className="flex items-center space-x-2 text-sm text-slate-600">
              <Clock className="w-4 h-4" />
              <span>7天內到期: {upcomingPayments.length} 筆</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left p-3 text-slate-600">排程日期</th>
                  <th className="text-left p-3 text-slate-600">廠商</th>
                  <th className="text-left p-3 text-slate-600">發票號碼</th>
                  <th className="text-right p-3 text-slate-600">排程金額</th>
                  <th className="text-left p-3 text-slate-600">狀態</th>
                  <th className="text-left p-3 text-slate-600">備註</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((schedule) => {
                  const vendor = schedule.vendor as Vendor
                  const invoice = schedule.invoice as PurchaseInvoice
                  const isUpcoming = new Date(schedule.scheduled_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) && schedule.status === '待付款'
                  return (
                    <tr key={schedule.id} className={`border-b border-slate-100 hover:bg-slate-50 ${isUpcoming ? 'bg-yellow-50' : ''}`}>
                      <td className={`p-3 ${isUpcoming ? 'font-medium text-orange-600' : ''}`}>
                        {format(new Date(schedule.scheduled_date), 'yyyy-MM-dd')}
                      </td>
                      <td className="p-3">{vendor?.name || '-'}</td>
                      <td className="p-3">{invoice?.invoice_number || '-'}</td>
                      <td className="p-3 text-right">${schedule.scheduled_amount.toLocaleString()}</td>
                      <td className="p-3">
                        <span className={`badge ${
                          schedule.status === '已付款' ? 'badge-success' :
                          schedule.status === '已取消' ? 'badge-danger' :
                          'badge-warning'
                        }`}>
                          {schedule.status}
                        </span>
                      </td>
                      <td className="p-3 text-sm text-slate-600">{schedule.notes || '-'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 廠商表單模態框 */}
      {showVendorModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-800">
                {editingVendor ? '編輯廠商' : '新增廠商'}
              </h2>
              <button onClick={() => {
                setShowVendorModal(false)
                resetVendorForm()
              }} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleVendorSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">廠商代碼 *</label>
                  <input
                    type="text"
                    required
                    value={vendorFormData.code}
                    onChange={(e) => setVendorFormData({ ...vendorFormData, code: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">廠商名稱 *</label>
                  <input
                    type="text"
                    required
                    value={vendorFormData.name}
                    onChange={(e) => setVendorFormData({ ...vendorFormData, name: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">統一編號</label>
                  <input
                    type="text"
                    value={vendorFormData.tax_id}
                    onChange={(e) => setVendorFormData({ ...vendorFormData, tax_id: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">聯絡人</label>
                  <input
                    type="text"
                    value={vendorFormData.contact_person}
                    onChange={(e) => setVendorFormData({ ...vendorFormData, contact_person: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">電話</label>
                  <input
                    type="text"
                    value={vendorFormData.phone}
                    onChange={(e) => setVendorFormData({ ...vendorFormData, phone: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    value={vendorFormData.email}
                    onChange={(e) => setVendorFormData({ ...vendorFormData, email: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">付款條件（天數）</label>
                  <input
                    type="number"
                    value={vendorFormData.payment_terms}
                    onChange={(e) => setVendorFormData({ ...vendorFormData, payment_terms: e.target.value })}
                    className="input"
                  />
                </div>
              </div>
              <div>
                <label className="label">地址</label>
                <textarea
                  value={vendorFormData.address}
                  onChange={(e) => setVendorFormData({ ...vendorFormData, address: e.target.value })}
                  className="input"
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button type="button" onClick={() => {
                  setShowVendorModal(false)
                  resetVendorForm()
                }} className="btn-secondary">
                  取消
                </button>
                <button type="submit" className="btn-primary">
                  儲存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 發票表單模態框 */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-800">新增發票</h2>
              <button onClick={() => {
                setShowInvoiceModal(false)
                resetInvoiceForm()
              }} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleInvoiceSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">發票號碼 *</label>
                  <input
                    type="text"
                    required
                    value={invoiceFormData.invoice_number}
                    onChange={(e) => setInvoiceFormData({ ...invoiceFormData, invoice_number: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">廠商 *</label>
                  <select
                    required
                    value={invoiceFormData.vendor_id}
                    onChange={(e) => setInvoiceFormData({ ...invoiceFormData, vendor_id: e.target.value })}
                    className="input"
                  >
                    <option value="">請選擇廠商</option>
                    {vendors.map(vendor => (
                      <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">發票日期 *</label>
                  <input
                    type="date"
                    required
                    value={invoiceFormData.invoice_date}
                    onChange={(e) => setInvoiceFormData({ ...invoiceFormData, invoice_date: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">到期日 *</label>
                  <input
                    type="date"
                    required
                    value={invoiceFormData.due_date}
                    onChange={(e) => setInvoiceFormData({ ...invoiceFormData, due_date: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">未稅金額 *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={invoiceFormData.subtotal}
                    onChange={(e) => {
                      const subtotal = parseFloat(e.target.value) || 0
                      const taxAmount = subtotal * 0.05
                      setInvoiceFormData({
                        ...invoiceFormData,
                        subtotal: e.target.value,
                        tax_amount: taxAmount.toFixed(2),
                        total_amount: (subtotal + taxAmount).toFixed(2)
                      })
                    }}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">稅額（5%）</label>
                  <input
                    type="number"
                    step="0.01"
                    value={invoiceFormData.tax_amount}
                    readOnly
                    className="input bg-slate-50"
                  />
                </div>
                <div>
                  <label className="label">總金額</label>
                  <input
                    type="number"
                    step="0.01"
                    value={invoiceFormData.total_amount}
                    readOnly
                    className="input bg-slate-50 font-bold"
                  />
                </div>
                <div>
                  <label className="label">幣別</label>
                  <select
                    value={invoiceFormData.currency}
                    onChange={(e) => setInvoiceFormData({ ...invoiceFormData, currency: e.target.value })}
                    className="input"
                  >
                    <option value="TWD">TWD</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">備註</label>
                <textarea
                  value={invoiceFormData.description}
                  onChange={(e) => setInvoiceFormData({ ...invoiceFormData, description: e.target.value })}
                  className="input"
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button type="button" onClick={() => {
                  setShowInvoiceModal(false)
                  resetInvoiceForm()
                }} className="btn-secondary">
                  取消
                </button>
                <button type="submit" className="btn-primary">
                  儲存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 付款表單模態框 */}
      {showPaymentModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass rounded-xl p-6 w-full max-w-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-800">記錄付款</h2>
              <button onClick={() => {
                setShowPaymentModal(false)
                resetPaymentForm()
              }} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="mb-4 p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600">發票號碼: {selectedInvoice.invoice_number}</p>
              <p className="text-sm text-slate-600">總金額: ${selectedInvoice.total_amount.toLocaleString()}</p>
              <p className="text-sm text-slate-600">已付款: ${selectedInvoice.paid_amount.toLocaleString()}</p>
              <p className="text-sm font-bold text-slate-800">餘額: ${selectedInvoice.balance_amount.toLocaleString()}</p>
            </div>
            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div>
                <label className="label">付款日期 *</label>
                <input
                  type="date"
                  required
                  value={paymentFormData.payment_date}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, payment_date: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">付款金額 *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  max={selectedInvoice.balance_amount}
                  value={paymentFormData.payment_amount}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, payment_amount: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">付款方式</label>
                <select
                  value={paymentFormData.payment_method}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, payment_method: e.target.value })}
                  className="input"
                >
                  <option value="轉帳">轉帳</option>
                  <option value="現金">現金</option>
                  <option value="支票">支票</option>
                  <option value="其他">其他</option>
                </select>
              </div>
              <div>
                <label className="label">銀行帳戶</label>
                <input
                  type="text"
                  value={paymentFormData.bank_account}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, bank_account: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">參考號碼</label>
                <input
                  type="text"
                  value={paymentFormData.reference_number}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, reference_number: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">備註</label>
                <textarea
                  value={paymentFormData.notes}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
                  className="input"
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button type="button" onClick={() => {
                  setShowPaymentModal(false)
                  resetPaymentForm()
                }} className="btn-secondary">
                  取消
                </button>
                <button type="submit" className="btn-primary">
                  儲存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

