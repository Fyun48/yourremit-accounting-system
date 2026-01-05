'use client'

import { useEffect, useState } from 'react'
import supabase from '@/lib/supabase'
import { Clock, Plus, Edit, Trash2, Settings } from 'lucide-react'
import { LateDeductionRule, LateDeductionRuleItem } from '@/types'

export default function LateDeductionPage() {
  const [rules, setRules] = useState<LateDeductionRule[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingRule, setEditingRule] = useState<LateDeductionRule | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    rule_type: '固定金額' as '固定金額' | '比例扣款' | '階梯式扣款',
    description: '',
    is_active: true,
  })
  const [ruleItems, setRuleItems] = useState<Array<{
    min_minutes: number
    max_minutes?: number
    deduction_type: '固定金額' | '比例' | '階梯'
    deduction_amount?: number
    max_deduction_amount?: number
  }>>([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { data } = await supabase
        .from('late_deduction_rules')
        .select('*, items:late_deduction_rule_items(*)')
        .order('created_at', { ascending: false })

      setRules(data || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!formData.name) {
      alert('請填寫規則名稱')
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      if (editingRule) {
        // 更新規則
        const { error: ruleError } = await supabase
          .from('late_deduction_rules')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingRule.id)

        if (ruleError) throw ruleError

        // 刪除舊的規則明細
        await supabase
          .from('late_deduction_rule_items')
          .delete()
          .eq('rule_id', editingRule.id)

        // 插入新的規則明細
        if (ruleItems.length > 0) {
          const itemsData = ruleItems.map((item, index) => ({
            rule_id: editingRule.id,
            min_minutes: item.min_minutes,
            max_minutes: item.max_minutes || null,
            deduction_type: item.deduction_type,
            deduction_amount: item.deduction_amount || null,
            max_deduction_amount: item.max_deduction_amount || null,
            sort_order: index + 1,
          }))

          const { error: itemsError } = await supabase
            .from('late_deduction_rule_items')
            .insert(itemsData)

          if (itemsError) throw itemsError
        }
      } else {
        // 創建新規則
        const { data: newRule, error: ruleError } = await supabase
          .from('late_deduction_rules')
          .insert({
            ...formData,
            created_by: user.id,
          })
          .select()
          .single()

        if (ruleError) throw ruleError

        // 插入規則明細
        if (ruleItems.length > 0 && newRule) {
          const itemsData = ruleItems.map((item, index) => ({
            rule_id: newRule.id,
            min_minutes: item.min_minutes,
            max_minutes: item.max_minutes || null,
            deduction_type: item.deduction_type,
            deduction_amount: item.deduction_amount || null,
            max_deduction_amount: item.max_deduction_amount || null,
            sort_order: index + 1,
          }))

          const { error: itemsError } = await supabase
            .from('late_deduction_rule_items')
            .insert(itemsData)

          if (itemsError) throw itemsError
        }
      }

      setShowModal(false)
      setEditingRule(null)
      resetForm()
      loadData()
    } catch (error: any) {
      console.error('Error saving rule:', error)
      alert(error.message || '儲存失敗，請重試')
    }
  }

  const handleEdit = (rule: LateDeductionRule) => {
    setEditingRule(rule)
    setFormData({
      name: rule.name,
      rule_type: rule.rule_type,
      description: rule.description || '',
      is_active: rule.is_active,
    })
    setRuleItems(
      rule.items?.map(item => ({
        min_minutes: item.min_minutes,
        max_minutes: item.max_minutes || undefined,
        deduction_type: item.deduction_type,
        deduction_amount: item.deduction_amount || undefined,
        max_deduction_amount: item.max_deduction_amount || undefined,
      })) || []
    )
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除此規則嗎？')) return

    try {
      const { error } = await supabase
        .from('late_deduction_rules')
        .delete()
        .eq('id', id)

      if (error) throw error

      loadData()
    } catch (error: any) {
      console.error('Error deleting rule:', error)
      alert('刪除失敗，請重試')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      rule_type: '固定金額',
      description: '',
      is_active: true,
    })
    setRuleItems([])
  }

  const addRuleItem = () => {
    setRuleItems([...ruleItems, {
      min_minutes: 1,
      max_minutes: undefined,
      deduction_type: '固定金額',
      deduction_amount: 0,
    }])
  }

  const removeRuleItem = (index: number) => {
    setRuleItems(ruleItems.filter((_, i) => i !== index))
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
          <h1 className="text-2xl font-bold text-slate-800">遲到扣款設定</h1>
          <p className="text-slate-600 mt-1">設定符合台灣勞基法的遲到扣款規則</p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setEditingRule(null)
            setShowModal(true)
          }}
          className="btn btn-primary flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>新增規則</span>
        </button>
      </div>

      {/* 規則列表 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {rules.map((rule) => (
          <div key={rule.id} className="card">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-slate-800">{rule.name}</h3>
                <p className="text-sm text-slate-500 mt-1">{rule.rule_type}</p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleEdit(rule)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(rule.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {rule.description && (
              <p className="text-sm text-slate-600 mb-3">{rule.description}</p>
            )}

            {rule.items && rule.items.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-500">扣款明細：</p>
                {rule.items.map((item, index) => (
                  <div key={index} className="text-xs text-slate-600 bg-slate-50 p-2 rounded">
                    {item.min_minutes}分鐘
                    {item.max_minutes ? ` - ${item.max_minutes}分鐘` : '以上'}：
                    {item.deduction_type === '固定金額' && `扣 ${item.deduction_amount} 元`}
                    {item.deduction_type === '比例' && `扣日薪的 ${((item.deduction_amount || 0) * 100).toFixed(1)}%`}
                    {item.deduction_type === '階梯' && `扣 ${item.deduction_amount} 元`}
                    {item.max_deduction_amount && `（最多 ${item.max_deduction_amount} 元）`}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-3">
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                rule.is_active 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-slate-100 text-slate-800'
              }`}>
                {rule.is_active ? '啟用' : '停用'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* 新增/編輯模態框 */}
      {showModal && (
        <LateDeductionModal
          formData={formData}
          setFormData={setFormData}
          ruleItems={ruleItems}
          setRuleItems={setRuleItems}
          onClose={() => {
            setShowModal(false)
            setEditingRule(null)
            resetForm()
          }}
          onSave={handleSubmit}
          addRuleItem={addRuleItem}
          removeRuleItem={removeRuleItem}
        />
      )}
    </div>
  )
}

// 遲到扣款規則模態框
function LateDeductionModal({ formData, setFormData, ruleItems, setRuleItems, onClose, onSave, addRuleItem, removeRuleItem }: any) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-slate-800 mb-4">遲到扣款規則</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">規則名稱 *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">規則類型 *</label>
            <select
              value={formData.rule_type}
              onChange={(e) => setFormData({ ...formData, rule_type: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="固定金額">固定金額扣款</option>
              <option value="比例扣款">比例扣款</option>
              <option value="階梯式扣款">階梯式扣款</option>
            </select>
            <p className="text-xs text-slate-500 mt-1">
              {formData.rule_type === '固定金額' && '每遲到1分鐘扣固定金額'}
              {formData.rule_type === '比例扣款' && '按日薪比例扣款，遲到時間佔工作時間的比例'}
              {formData.rule_type === '階梯式扣款' && '根據遲到時間區間設定不同扣款金額'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">說明</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-700">扣款明細 *</label>
              <button
                type="button"
                onClick={addRuleItem}
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm"
              >
                + 新增項目
              </button>
            </div>
            <div className="space-y-2">
              {ruleItems.map((item: any, index: number) => (
                <div key={index} className="p-3 border border-slate-200 rounded-lg grid grid-cols-5 gap-2">
                  <input
                    type="number"
                    value={item.min_minutes || ''}
                    onChange={(e) => {
                      const newItems = [...ruleItems]
                      newItems[index].min_minutes = parseInt(e.target.value) || 0
                      setRuleItems(newItems)
                    }}
                    placeholder="起始分鐘"
                    className="px-2 py-1 border border-slate-300 rounded text-sm"
                  />
                  <input
                    type="number"
                    value={item.max_minutes || ''}
                    onChange={(e) => {
                      const newItems = [...ruleItems]
                      newItems[index].max_minutes = e.target.value ? parseInt(e.target.value) : undefined
                      setRuleItems(newItems)
                    }}
                    placeholder="結束分鐘（可留空）"
                    className="px-2 py-1 border border-slate-300 rounded text-sm"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={item.deduction_amount || ''}
                    onChange={(e) => {
                      const newItems = [...ruleItems]
                      newItems[index].deduction_amount = parseFloat(e.target.value) || 0
                      setRuleItems(newItems)
                    }}
                    placeholder="扣款金額/比例"
                    className="px-2 py-1 border border-slate-300 rounded text-sm"
                  />
                  {formData.rule_type === '比例扣款' && (
                    <input
                      type="number"
                      step="0.01"
                      value={item.max_deduction_amount || ''}
                      onChange={(e) => {
                        const newItems = [...ruleItems]
                        newItems[index].max_deduction_amount = parseFloat(e.target.value) || undefined
                        setRuleItems(newItems)
                      }}
                      placeholder="最大扣款"
                      className="px-2 py-1 border border-slate-300 rounded text-sm"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => removeRuleItem(index)}
                    className="px-2 py-1 bg-red-100 text-red-600 rounded text-sm hover:bg-red-200"
                  >
                    刪除
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="is_active" className="text-sm text-slate-700">
              啟用
            </label>
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
            onClick={onSave}
            className="btn btn-primary"
            disabled={ruleItems.length === 0}
          >
            儲存
          </button>
        </div>
      </div>
    </div>
  )
}
