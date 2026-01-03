'use client'

import { useEffect, useState } from 'react'
import supabase from '@/lib/supabase'
import { Plus, Search, Edit, Trash2, X, DollarSign, Users, FileText, TrendingUp, Calendar } from 'lucide-react'
import { Customer, SalesInvoice, InvoicePayment } from '@/types'
import { format } from 'date-fns'

export default function ReceivablesPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [invoices, setInvoices] = useState<SalesInvoice[]>([])
  const [payments, setPayments] = useState<InvoicePayment[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'customers' | 'invoices' | 'aging'>('invoices')
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoice | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | '未收款' | '部分收款' | '已收款'>('all')

  const [customerFormData, setCustomerFormData] = useState({
    code: '',
    name: '',
    tax_id: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    credit_limit: '0',
    payment_terms: '30'
  })

  const [invoiceFormData, setInvoiceFormData] = useState({
    invoice_number: '',
    invoice_date: format(new Date(), 'yyyy-MM-dd'),
    customer_id: '',
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
        loadCustomers(),
        loadInvoices(),
        loadPayments()
      ])
    } finally {
      setLoading(false)
    }
  }

  const loadCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('is_active', true)
        .order('code')

      if (error) throw error
      setCustomers(data || [])
    } catch (error: any) {
      console.error('Error loading customers:', error)
    }
  }

  const loadInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('sales_invoices')
        .select('*, customer:customers(*)')
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
        .from('invoice_payments')
        .select('*')
        .order('payment_date', { ascending: false })

      if (error) throw error
      setPayments(data || [])
    } catch (error: any) {
      console.error('Error loading payments:', error)
    }
  }

  const handleCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const data = {
        ...customerFormData,
        credit_limit: parseFloat(customerFormData.credit_limit),
        payment_terms: parseInt(customerFormData.payment_terms)
      }

      if (editingCustomer) {
        const { error } = await supabase
          .from('customers')
          .update(data)
          .eq('id', editingCustomer.id)

        if (error) throw error
        alert('客戶更新成功！')
      } else {
        const { error } = await supabase
          .from('customers')
          .insert([data])

        if (error) throw error
        alert('客戶新增成功！')
      }

      setShowCustomerModal(false)
      resetCustomerForm()
      loadCustomers()
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
        customer_id: invoiceFormData.customer_id,
        due_date: invoiceFormData.due_date,
        subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        paid_amount: 0,
        balance_amount: totalAmount,
        currency: invoiceFormData.currency,
        status: '未收款' as const,
        description: invoiceFormData.description
      }

      const { error } = await supabase
        .from('sales_invoices')
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
      const newStatus = newBalanceAmount <= 0 ? '已收款' : newPaidAmount > 0 ? '部分收款' : '未收款'

      // 新增付款記錄
      const { error: paymentError } = await supabase
        .from('invoice_payments')
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
        .from('sales_invoices')
        .update({
          paid_amount: newPaidAmount,
          balance_amount: newBalanceAmount,
          status: newStatus
        })
        .eq('id', selectedInvoice.id)

      if (invoiceError) throw invoiceError

      alert('收款記錄新增成功！')
      setShowPaymentModal(false)
      resetPaymentForm()
      loadInvoices()
      loadPayments()
    } catch (error: any) {
      alert('操作失敗: ' + error.message)
    }
  }

  const handleDeleteCustomer = async (id: string) => {
    if (!confirm('確定要刪除此客戶嗎？')) return

    try {
      const { error } = await supabase
        .from('customers')
        .update({ is_active: false })
        .eq('id', id)

      if (error) throw error
      alert('客戶已刪除！')
      loadCustomers()
    } catch (error: any) {
      alert('刪除失敗: ' + error.message)
    }
  }

  const resetCustomerForm = () => {
    setEditingCustomer(null)
    setCustomerFormData({
      code: '',
      name: '',
      tax_id: '',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
      credit_limit: '0',
      payment_terms: '30'
    })
  }

  const resetInvoiceForm = () => {
    setInvoiceFormData({
      invoice_number: '',
      invoice_date: format(new Date(), 'yyyy-MM-dd'),
      customer_id: '',
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

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer)
    setCustomerFormData({
      code: customer.code,
      name: customer.name,
      tax_id: customer.tax_id || '',
      contact_person: customer.contact_person || '',
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      credit_limit: customer.credit_limit.toString(),
      payment_terms: customer.payment_terms.toString()
    })
    setShowCustomerModal(true)
  }

  const handleRecordPayment = (invoice: SalesInvoice) => {
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

  // 計算帳齡分析
  const calculateAging = () => {
    const now = new Date()
    const aging = {
      current: 0, // 0-30天
      days31_60: 0, // 31-60天
      days61_90: 0, // 61-90天
      over90: 0 // 90天以上
    }

    invoices.forEach(invoice => {
      if (invoice.status === '已收款' || invoice.balance_amount <= 0) return

      const dueDate = new Date(invoice.due_date)
      const daysPastDue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))

      if (daysPastDue <= 30) {
        aging.current += invoice.balance_amount
      } else if (daysPastDue <= 60) {
        aging.days31_60 += invoice.balance_amount
      } else if (daysPastDue <= 90) {
        aging.days61_90 += invoice.balance_amount
      } else {
        aging.over90 += invoice.balance_amount
      }
    })

    return aging
  }

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (invoice.customer as Customer)?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || invoice.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const aging = calculateAging()
  const totalReceivables = invoices.reduce((sum, inv) => sum + inv.balance_amount, 0)
  const overdueInvoices = invoices.filter(inv => {
    if (inv.status === '已收款' || inv.balance_amount <= 0) return false
    const dueDate = new Date(inv.due_date)
    return dueDate < new Date()
  })

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
              <p className="text-sm text-slate-600">應收帳款總額</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">
                ${totalReceivables.toLocaleString()}
              </p>
            </div>
            <DollarSign className="w-10 h-10 text-blue-500" />
          </div>
        </div>
        <div className="glass p-6 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">客戶總數</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{customers.length}</p>
            </div>
            <Users className="w-10 h-10 text-green-500" />
          </div>
        </div>
        <div className="glass p-6 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">未收款發票</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">
                {invoices.filter(inv => inv.status !== '已收款').length}
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
          onClick={() => setActiveTab('customers')}
          className={`flex-1 px-4 py-2 rounded-lg transition-all ${
            activeTab === 'customers'
              ? 'bg-blue-500 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          客戶管理
        </button>
        <button
          onClick={() => setActiveTab('aging')}
          className={`flex-1 px-4 py-2 rounded-lg transition-all ${
            activeTab === 'aging'
              ? 'bg-blue-500 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          帳齡分析
        </button>
      </div>

      {/* 發票管理 */}
      {activeTab === 'invoices' && (
        <div className="glass rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-slate-800">銷貨發票</h2>
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
                placeholder="搜尋發票號碼或客戶名稱..."
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
              <option value="未收款">未收款</option>
              <option value="部分收款">部分收款</option>
              <option value="已收款">已收款</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left p-3 text-slate-600">發票號碼</th>
                  <th className="text-left p-3 text-slate-600">客戶</th>
                  <th className="text-left p-3 text-slate-600">發票日期</th>
                  <th className="text-left p-3 text-slate-600">到期日</th>
                  <th className="text-right p-3 text-slate-600">總金額</th>
                  <th className="text-right p-3 text-slate-600">已收款</th>
                  <th className="text-right p-3 text-slate-600">餘額</th>
                  <th className="text-left p-3 text-slate-600">狀態</th>
                  <th className="text-right p-3 text-slate-600">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice) => {
                  const customer = invoice.customer as Customer
                  const isOverdue = new Date(invoice.due_date) < new Date() && invoice.status !== '已收款'
                  return (
                    <tr key={invoice.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-3 font-medium">{invoice.invoice_number}</td>
                      <td className="p-3">{customer?.name || '-'}</td>
                      <td className="p-3">{format(new Date(invoice.invoice_date), 'yyyy-MM-dd')}</td>
                      <td className={`p-3 ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
                        {format(new Date(invoice.due_date), 'yyyy-MM-dd')}
                      </td>
                      <td className="p-3 text-right">${invoice.total_amount.toLocaleString()}</td>
                      <td className="p-3 text-right">${invoice.paid_amount.toLocaleString()}</td>
                      <td className="p-3 text-right font-medium">${invoice.balance_amount.toLocaleString()}</td>
                      <td className="p-3">
                        <span className={`badge ${
                          invoice.status === '已收款' ? 'badge-success' :
                          invoice.status === '部分收款' ? 'badge-warning' :
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
                            收款
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

      {/* 客戶管理 */}
      {activeTab === 'customers' && (
        <div className="glass rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-slate-800">客戶資料</h2>
            <button
              onClick={() => {
                resetCustomerForm()
                setShowCustomerModal(true)
              }}
              className="btn-primary flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>新增客戶</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customers.map((customer) => (
              <div key={customer.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-slate-800">{customer.name}</h3>
                    <p className="text-sm text-slate-500">{customer.code}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditCustomer(customer)}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteCustomer(customer.id)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {customer.contact_person && (
                  <p className="text-sm text-slate-600 mt-2">聯絡人: {customer.contact_person}</p>
                )}
                {customer.phone && (
                  <p className="text-sm text-slate-600">電話: {customer.phone}</p>
                )}
                <p className="text-sm text-slate-600 mt-2">
                  信用額度: ${customer.credit_limit.toLocaleString()}
                </p>
                <p className="text-sm text-slate-600">付款條件: {customer.payment_terms} 天</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 帳齡分析 */}
      {activeTab === 'aging' && (
        <div className="glass rounded-xl p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4">帳齡分析</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="border border-slate-200 rounded-lg p-4">
              <p className="text-sm text-slate-600">0-30天</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">
                ${aging.current.toLocaleString()}
              </p>
            </div>
            <div className="border border-slate-200 rounded-lg p-4">
              <p className="text-sm text-slate-600">31-60天</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">
                ${aging.days31_60.toLocaleString()}
              </p>
            </div>
            <div className="border border-slate-200 rounded-lg p-4">
              <p className="text-sm text-slate-600">61-90天</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                ${aging.days61_90.toLocaleString()}
              </p>
            </div>
            <div className="border border-slate-200 rounded-lg p-4">
              <p className="text-sm text-slate-600">90天以上</p>
              <p className="text-2xl font-bold text-red-700 mt-1">
                ${aging.over90.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left p-3 text-slate-600">發票號碼</th>
                  <th className="text-left p-3 text-slate-600">客戶</th>
                  <th className="text-left p-3 text-slate-600">到期日</th>
                  <th className="text-right p-3 text-slate-600">餘額</th>
                  <th className="text-left p-3 text-slate-600">逾期天數</th>
                </tr>
              </thead>
              <tbody>
                {overdueInvoices.map((invoice) => {
                  const customer = invoice.customer as Customer
                  const dueDate = new Date(invoice.due_date)
                  const daysPastDue = Math.floor((new Date().getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
                  return (
                    <tr key={invoice.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-3 font-medium">{invoice.invoice_number}</td>
                      <td className="p-3">{customer?.name || '-'}</td>
                      <td className="p-3 text-red-600">
                        {format(dueDate, 'yyyy-MM-dd')}
                      </td>
                      <td className="p-3 text-right font-medium">
                        ${invoice.balance_amount.toLocaleString()}
                      </td>
                      <td className="p-3 text-red-600 font-medium">{daysPastDue} 天</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 客戶表單模態框 */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-800">
                {editingCustomer ? '編輯客戶' : '新增客戶'}
              </h2>
              <button onClick={() => {
                setShowCustomerModal(false)
                resetCustomerForm()
              }} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleCustomerSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">客戶代碼 *</label>
                  <input
                    type="text"
                    required
                    value={customerFormData.code}
                    onChange={(e) => setCustomerFormData({ ...customerFormData, code: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">客戶名稱 *</label>
                  <input
                    type="text"
                    required
                    value={customerFormData.name}
                    onChange={(e) => setCustomerFormData({ ...customerFormData, name: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">統一編號</label>
                  <input
                    type="text"
                    value={customerFormData.tax_id}
                    onChange={(e) => setCustomerFormData({ ...customerFormData, tax_id: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">聯絡人</label>
                  <input
                    type="text"
                    value={customerFormData.contact_person}
                    onChange={(e) => setCustomerFormData({ ...customerFormData, contact_person: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">電話</label>
                  <input
                    type="text"
                    value={customerFormData.phone}
                    onChange={(e) => setCustomerFormData({ ...customerFormData, phone: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    value={customerFormData.email}
                    onChange={(e) => setCustomerFormData({ ...customerFormData, email: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">信用額度</label>
                  <input
                    type="number"
                    step="0.01"
                    value={customerFormData.credit_limit}
                    onChange={(e) => setCustomerFormData({ ...customerFormData, credit_limit: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">付款條件（天數）</label>
                  <input
                    type="number"
                    value={customerFormData.payment_terms}
                    onChange={(e) => setCustomerFormData({ ...customerFormData, payment_terms: e.target.value })}
                    className="input"
                  />
                </div>
              </div>
              <div>
                <label className="label">地址</label>
                <textarea
                  value={customerFormData.address}
                  onChange={(e) => setCustomerFormData({ ...customerFormData, address: e.target.value })}
                  className="input"
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button type="button" onClick={() => {
                  setShowCustomerModal(false)
                  resetCustomerForm()
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
                  <label className="label">客戶 *</label>
                  <select
                    required
                    value={invoiceFormData.customer_id}
                    onChange={(e) => setInvoiceFormData({ ...invoiceFormData, customer_id: e.target.value })}
                    className="input"
                  >
                    <option value="">請選擇客戶</option>
                    {customers.map(customer => (
                      <option key={customer.id} value={customer.id}>{customer.name}</option>
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

      {/* 收款表單模態框 */}
      {showPaymentModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass rounded-xl p-6 w-full max-w-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-800">記錄收款</h2>
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
              <p className="text-sm text-slate-600">已收款: ${selectedInvoice.paid_amount.toLocaleString()}</p>
              <p className="text-sm font-bold text-slate-800">餘額: ${selectedInvoice.balance_amount.toLocaleString()}</p>
            </div>
            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div>
                <label className="label">收款日期 *</label>
                <input
                  type="date"
                  required
                  value={paymentFormData.payment_date}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, payment_date: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">收款金額 *</label>
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

