'use client'

import { useEffect, useState } from 'react'
import supabase from '@/lib/supabase'
import { Plus, FileText, Check, X, Trash2, CheckCircle } from 'lucide-react'
import { JournalEntry, ChartOfAccount, JournalEntryLine } from '@/types'
import { format } from 'date-fns'

interface EntryLine {
  account_id: string
  description: string
  debit_amount: number
  credit_amount: number
  currency: string
}

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    entry_date: format(new Date(), 'yyyy-MM-dd'),
    description: '',
    lines: [{ account_id: '', description: '', debit_amount: 0, credit_amount: 0, currency: 'TWD' }] as EntryLine[]
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { data: entriesData } = await supabase
        .from('journal_entries')
        .select('*, lines:journal_entry_lines(*, account:chart_of_accounts(*))')
        .order('entry_date', { ascending: false })

      const { data: accountsData } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('is_active', true)
        .order('code')

      setEntries(entriesData || [])
      setAccounts(accountsData || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateEntryNumber = async () => {
    const today = format(new Date(), 'yyyyMMdd')
    const { data } = await supabase
      .from('journal_entries')
      .select('entry_number')
      .like('entry_number', `${today}%`)
      .order('entry_number', { ascending: false })
      .limit(1)

    if (data && data.length > 0) {
      const lastNumber = parseInt(data[0].entry_number.slice(-4))
      return `${today}-${String(lastNumber + 1).padStart(4, '0')}`
    }
    return `${today}-0001`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 驗證借貸平衡
    const totalDebit = formData.lines.reduce((sum, line) => sum + (parseFloat(String(line.debit_amount)) || 0), 0)
    const totalCredit = formData.lines.reduce((sum, line) => sum + (parseFloat(String(line.credit_amount)) || 0), 0)

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      alert(`借貸不平衡！借方總額：${totalDebit.toLocaleString()}，貸方總額：${totalCredit.toLocaleString()}`)
      return
    }

    if (formData.lines.length < 2) {
      alert('至少需要兩筆分錄')
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const entryNumber = await generateEntryNumber()

      // 創建會計分錄
      const { data: entry, error: entryError } = await supabase
        .from('journal_entries')
        .insert([{
          entry_number: entryNumber,
          entry_date: formData.entry_date,
          description: formData.description,
          status: '草稿',
          total_debit: totalDebit,
          total_credit: totalCredit,
          created_by: user?.id
        }])
        .select()
        .single()

      if (entryError) throw entryError

      // 創建分錄明細
      const lines = formData.lines.map((line, index) => ({
        journal_entry_id: entry.id,
        line_number: index + 1,
        account_id: line.account_id,
        description: line.description,
        debit_amount: parseFloat(String(line.debit_amount)) || 0,
        credit_amount: parseFloat(String(line.credit_amount)) || 0,
        currency: line.currency
      }))

      const { error: linesError } = await supabase
        .from('journal_entry_lines')
        .insert(lines)

      if (linesError) throw linesError

      setShowModal(false)
      resetForm()
      loadData()
      alert('分錄新增成功！')
    } catch (error: any) {
      console.error('Error creating entry:', error)
      alert('新增失敗: ' + error.message)
    }
  }

  const resetForm = () => {
    setFormData({
      entry_date: format(new Date(), 'yyyy-MM-dd'),
      description: '',
      lines: [{ account_id: '', description: '', debit_amount: 0, credit_amount: 0, currency: 'TWD' }]
    })
  }

  const addLine = () => {
    setFormData({
      ...formData,
      lines: [...formData.lines, { account_id: '', description: '', debit_amount: 0, credit_amount: 0, currency: 'TWD' }]
    })
  }

  const removeLine = (index: number) => {
    if (formData.lines.length > 1) {
      setFormData({
        ...formData,
        lines: formData.lines.filter((_, i) => i !== index)
      })
    }
  }

  const updateLine = (index: number, field: keyof EntryLine, value: any) => {
    const newLines = [...formData.lines]
    newLines[index] = { ...newLines[index], [field]: value }
    setFormData({ ...formData, lines: newLines })
  }

  const handlePostEntry = async (entryId: string) => {
    if (!confirm('確定要過帳此分錄嗎？過帳後將無法修改。')) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const { error } = await supabase
        .from('journal_entries')
        .update({
          status: '已過帳',
          posted_at: new Date().toISOString(),
          approved_by: user?.id
        })
        .eq('id', entryId)

      if (error) throw error

      loadData()
      alert('分錄過帳成功！')
    } catch (error: any) {
      alert('過帳失敗: ' + error.message)
    }
  }

  const handleVoidEntry = async (entryId: string) => {
    if (!confirm('確定要作廢此分錄嗎？')) return

    try {
      const { error } = await supabase
        .from('journal_entries')
        .update({
          status: '已作廢'
        })
        .eq('id', entryId)

      if (error) throw error

      loadData()
      alert('分錄已作廢！')
    } catch (error: any) {
      alert('作廢失敗: ' + error.message)
    }
  }

  if (loading) {
    return <div className="p-8 text-center">載入中...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">會計分錄</h1>
          <p className="text-slate-600 mt-1">管理所有會計分錄與傳票</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn btn-primary flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>新增分錄</span>
        </button>
      </div>

      <div className="grid gap-4">
        {entries.length > 0 ? (
          entries.map((entry) => (
            <div key={entry.id} className="card hover:shadow-xl transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 font-mono">{entry.entry_number}</h3>
                    <p className="text-sm text-slate-600">
                      {format(new Date(entry.entry_date), 'yyyy/MM/dd')}
                    </p>
                  </div>
                </div>
                <span className={`badge ${
                  entry.status === '已過帳' ? 'badge-success' :
                  entry.status === '草稿' ? 'badge-warning' :
                  'badge-danger'
                }`}>
                  {entry.status}
                </span>
              </div>

              <div className="flex items-center justify-between mb-4">
                <p className="text-slate-700">{entry.description || '無說明'}</p>
                <div className="flex items-center space-x-2">
                  {entry.status === '草稿' && (
                    <button
                      onClick={() => handlePostEntry(entry.id)}
                      className="btn btn-primary text-sm flex items-center space-x-1"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>過帳</span>
                    </button>
                  )}
                  {entry.status !== '已作廢' && (
                    <button
                      onClick={() => handleVoidEntry(entry.id)}
                      className="btn btn-danger text-sm"
                    >
                      作廢
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3">科目代號</th>
                      <th className="text-left py-2 px-3">科目名稱</th>
                      <th className="text-right py-2 px-3">借方</th>
                      <th className="text-right py-2 px-3">貸方</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entry.lines?.map((line) => (
                      <tr key={line.id} className="border-b">
                        <td className="py-2 px-3 font-mono">{line.account?.code}</td>
                        <td className="py-2 px-3">{line.account?.name}</td>
                        <td className="py-2 px-3 text-right font-mono">
                          {line.debit_amount > 0 ? Number(line.debit_amount).toLocaleString() : '-'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono">
                          {line.credit_amount > 0 ? Number(line.credit_amount).toLocaleString() : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-bold bg-slate-50">
                      <td colSpan={2} className="py-2 px-3">合計</td>
                      <td className="py-2 px-3 text-right font-mono">
                        {Number(entry.total_debit).toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right font-mono">
                        {Number(entry.total_credit).toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ))
        ) : (
          <div className="card text-center py-12">
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">尚無會計分錄</p>
          </div>
        )}
      </div>

      {/* 新增分錄 Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-fadeIn">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">新增會計分錄</h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">分錄日期</label>
                  <input
                    type="date"
                    className="input"
                    value={formData.entry_date}
                    onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="label">說明</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="分錄說明"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="label mb-0">分錄明細</label>
                  <button
                    type="button"
                    onClick={addLine}
                    className="btn btn-secondary text-sm flex items-center space-x-1"
                  >
                    <Plus className="w-4 h-4" />
                    <span>新增分錄行</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.lines.map((line, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-end p-3 bg-slate-50 rounded-lg">
                      <div className="col-span-4">
                        <label className="label text-xs mb-1">會計科目</label>
                        <select
                          className="input text-sm"
                          value={line.account_id}
                          onChange={(e) => updateLine(index, 'account_id', e.target.value)}
                          required
                        >
                          <option value="">請選擇科目</option>
                          {accounts.map((account) => (
                            <option key={account.id} value={account.id}>
                              {account.code} - {account.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-3">
                        <label className="label text-xs mb-1">說明</label>
                        <input
                          type="text"
                          className="input text-sm"
                          value={line.description}
                          onChange={(e) => updateLine(index, 'description', e.target.value)}
                          placeholder="分錄說明"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="label text-xs mb-1">借方</label>
                        <input
                          type="number"
                          step="0.01"
                          className="input text-sm font-mono"
                          value={line.debit_amount || ''}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0
                            updateLine(index, 'debit_amount', value)
                            if (value > 0) updateLine(index, 'credit_amount', 0)
                          }}
                          min="0"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="label text-xs mb-1">貸方</label>
                        <input
                          type="number"
                          step="0.01"
                          className="input text-sm font-mono"
                          value={line.credit_amount || ''}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0
                            updateLine(index, 'credit_amount', value)
                            if (value > 0) updateLine(index, 'debit_amount', 0)
                          }}
                          min="0"
                        />
                      </div>
                      <div className="col-span-1">
                        {formData.lines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeLine(index)}
                            className="btn btn-danger p-2"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium text-slate-700">借方總額：</span>
                    <span className="font-mono font-bold text-blue-700">
                      {formData.lines.reduce((sum, line) => sum + (parseFloat(String(line.debit_amount)) || 0), 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm mt-2">
                    <span className="font-medium text-slate-700">貸方總額：</span>
                    <span className="font-mono font-bold text-blue-700">
                      {formData.lines.reduce((sum, line) => sum + (parseFloat(String(line.credit_amount)) || 0), 0).toLocaleString()}
                    </span>
                  </div>
                  {Math.abs(
                    formData.lines.reduce((sum, line) => sum + (parseFloat(String(line.debit_amount)) || 0), 0) -
                    formData.lines.reduce((sum, line) => sum + (parseFloat(String(line.credit_amount)) || 0), 0)
                  ) > 0.01 && (
                    <div className="mt-2 text-xs text-red-600 font-medium">
                      ⚠️ 借貸不平衡
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="btn btn-secondary"
                >
                  取消
                </button>
                <button type="submit" className="btn btn-primary">
                  <Check className="w-4 h-4 mr-2" />
                  確認新增
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
