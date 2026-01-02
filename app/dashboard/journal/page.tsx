'use client'

import { useEffect, useState } from 'react'
import supabase from '@/lib/supabase'
import { Plus, FileText, Check, X } from 'lucide-react'
import { JournalEntry, ChartOfAccount } from '@/types'
import { format } from 'date-fns'

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

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

              <p className="text-slate-700 mb-4">{entry.description}</p>

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
    </div>
  )
}
