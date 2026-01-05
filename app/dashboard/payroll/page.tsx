'use client'

import { useEffect, useState } from 'react'
import supabase from '@/lib/supabase'
import { DollarSign, Plus, Edit, Download, Eye, Calculator } from 'lucide-react'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import * as XLSX from 'xlsx'
import { EmployeeSalaryStructure, SalaryItem, InsuranceConfig, PayrollCalculation, UserProfile } from '@/types'

export default function PayrollPage() {
  const [salaryStructures, setSalaryStructures] = useState<EmployeeSalaryStructure[]>([])
  const [payrollCalculations, setPayrollCalculations] = useState<PayrollCalculation[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [showStructureModal, setShowStructureModal] = useState(false)
  const [showCalculationModal, setShowCalculationModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<string>('')
  const [selectedPeriod, setSelectedPeriod] = useState(format(new Date(), 'yyyy-MM'))
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    loadData()
    checkAdminPermission()
  }, [])

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

      // 載入薪資結構
      const { data: structuresData } = await supabase
        .from('employee_salary_structures')
        .select('*, items:salary_items(*)')
        .eq('is_active', true)
        .order('effective_date', { ascending: false })

      // 載入薪資計算記錄
      const { data: calculationsData } = await supabase
        .from('payroll_calculations')
        .select('*')
        .eq('payroll_period', selectedPeriod)
        .order('created_at', { ascending: false })

      setUsers(usersData || [])
      setSalaryStructures(structuresData || [])
      setPayrollCalculations(calculationsData || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCalculatePayroll = async (userId: string) => {
    try {
      // 獲取員工薪資結構
      const structure = salaryStructures.find(s => s.user_id === userId && s.is_active)
      if (!structure) {
        alert('該員工尚未設定薪資結構')
        return
      }

      // 獲取勞健保設定
      const { data: insurance } = await supabase
        .from('insurance_configs')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single()

      // 獲取當月出缺勤記錄
      const startDate = `${selectedPeriod}-01`
      const endDate = format(new Date(new Date(startDate).getFullYear(), new Date(startDate).getMonth() + 1, 0), 'yyyy-MM-dd')

      const { data: attendance } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('user_id', userId)
        .gte('record_date', startDate)
        .lte('record_date', endDate)

      const { data: leaveRequests } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('user_id', userId)
        .eq('status', '已核准')
        .gte('start_date', startDate)
        .lte('end_date', endDate)

      // 計算薪資
      const workDays = attendance?.filter(a => a.status !== '缺勤' && a.status !== '請假').length || 0
      const leaveDays = leaveRequests?.reduce((sum, l) => sum + l.total_days, 0) || 0
      const overtimeHours = attendance?.reduce((sum, a) => sum + (a.overtime_hours || 0), 0) || 0

      // 計算加項和減項
      const additions = structure.items?.filter(i => i.item_type === '加項').reduce((sum, i) => sum + i.amount, 0) || 0
      const deductions = structure.items?.filter(i => i.item_type === '減項').reduce((sum, i) => sum + i.amount, 0) || 0

      // 計算勞健保
      const laborInsurance = insurance ? (insurance.labor_insurance_base * insurance.labor_insurance_rate) : 0
      const healthInsurance = insurance ? (insurance.health_insurance_base * insurance.health_insurance_rate) : 0
      const employmentInsurance = insurance && insurance.employment_insurance_base ? (insurance.employment_insurance_base * (insurance.employment_insurance_rate || 0.01)) : 0
      const pensionContribution = insurance ? (insurance.labor_insurance_base * insurance.pension_rate) : 0

      // 計算應發薪資
      const baseSalary = structure.base_salary
      const totalAdditions = additions + (overtimeHours * (structure.hourly_rate || 0))
      const totalDeductions = deductions + laborInsurance + healthInsurance + employmentInsurance + pensionContribution
      const netSalary = baseSalary + totalAdditions - totalDeductions

      // 儲存計算結果
      const { error } = await supabase
        .from('payroll_calculations')
        .upsert({
          payroll_period: selectedPeriod,
          user_id: userId,
          base_salary: baseSalary,
          total_additions: totalAdditions,
          total_deductions: totalDeductions,
          labor_insurance: laborInsurance,
          health_insurance: healthInsurance,
          employment_insurance: employmentInsurance,
          pension_contribution: pensionContribution,
          net_salary: netSalary,
          work_days: workDays,
          actual_work_days: workDays,
          leave_days: leaveDays,
          overtime_hours: overtimeHours,
          status: '草稿',
        }, {
          onConflict: 'payroll_period,user_id'
        })

      if (error) throw error

      loadData()
      alert('薪資計算完成')
    } catch (error) {
      console.error('Error calculating payroll:', error)
      alert('計算失敗，請重試')
    }
  }

  const handleExportReport = () => {
    const fileName = `人事費用成本報表_${selectedPeriod}.xlsx`

    // 準備數據
    const exportData = payrollCalculations.map(calc => {
      const user = users.find(u => u.id === calc.user_id)
      return {
        '員工姓名': user?.full_name || '未知',
        '基本薪資': calc.base_salary,
        '加項總額': calc.total_additions,
        '減項總額': calc.total_deductions,
        '勞保': calc.labor_insurance,
        '健保': calc.health_insurance,
        '就保': calc.employment_insurance,
        '勞退': calc.pension_contribution,
        '應發薪資': calc.net_salary,
        '工作天數': calc.work_days,
        '請假天數': calc.leave_days,
        '加班時數': calc.overtime_hours,
      }
    })

    // 創建工作表
    const ws = XLSX.utils.json_to_sheet(exportData)

    // 添加總計行
    const totals = {
      '員工姓名': '總計',
      '基本薪資': payrollCalculations.reduce((sum, c) => sum + c.base_salary, 0),
      '加項總額': payrollCalculations.reduce((sum, c) => sum + c.total_additions, 0),
      '減項總額': payrollCalculations.reduce((sum, c) => sum + c.total_deductions, 0),
      '勞保': payrollCalculations.reduce((sum, c) => sum + c.labor_insurance, 0),
      '健保': payrollCalculations.reduce((sum, c) => sum + c.health_insurance, 0),
      '就保': payrollCalculations.reduce((sum, c) => sum + c.employment_insurance, 0),
      '勞退': payrollCalculations.reduce((sum, c) => sum + c.pension_contribution, 0),
      '應發薪資': payrollCalculations.reduce((sum, c) => sum + c.net_salary, 0),
      '工作天數': payrollCalculations.reduce((sum, c) => sum + c.work_days, 0),
      '請假天數': payrollCalculations.reduce((sum, c) => sum + c.leave_days, 0),
      '加班時數': payrollCalculations.reduce((sum, c) => sum + c.overtime_hours, 0),
    }

    XLSX.utils.sheet_add_json(ws, [totals], { origin: -1, skipHeader: true })

    // 設置列寬
    ws['!cols'] = [
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
      { wch: 10 }, { wch: 10 }, { wch: 10 },
    ]

    // 創建工作簿
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '人事費用成本報表')

    // 導出
    XLSX.writeFile(wb, fileName)
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
          <h1 className="text-2xl font-bold text-slate-800">薪資管理</h1>
          <p className="text-slate-600 mt-1">員工薪資結構與人事費用成本報表</p>
        </div>
        <div className="flex items-center space-x-2">
          <input
            type="month"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          {isAdmin && (
            <>
              <button
                onClick={() => setShowStructureModal(true)}
                className="btn btn-secondary flex items-center space-x-2"
              >
                <Plus className="w-5 h-5" />
                <span>新增薪資結構</span>
              </button>
              <button
                onClick={handleExportReport}
                className="btn btn-primary flex items-center space-x-2"
                disabled={payrollCalculations.length === 0}
              >
                <Download className="w-5 h-5" />
                <span>匯出報表</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* 薪資計算列表 */}
      <div className="card">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">
          {format(new Date(selectedPeriod + '-01'), 'yyyy年MM月', { locale: zhTW })} 薪資計算
        </h2>
        <div className="space-y-4">
          {users.map((user) => {
            const calculation = payrollCalculations.find(c => c.user_id === user.id)
            const structure = salaryStructures.find(s => s.user_id === user.id && s.is_active)

            return (
              <div
                key={user.id}
                className="p-4 border border-slate-200 rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-medium">
                        {user.full_name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div>
                        <h3 className="font-medium text-slate-800">{user.full_name || '未命名用戶'}</h3>
                        <p className="text-sm text-slate-500">{user.email}</p>
                      </div>
                    </div>

                    {calculation ? (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-slate-500">基本薪資</p>
                          <p className="font-medium text-slate-800">TWD {calculation.base_salary.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-500">加項總額</p>
                          <p className="font-medium text-green-600">+ {calculation.total_additions.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-500">減項總額</p>
                          <p className="font-medium text-red-600">- {calculation.total_deductions.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-500">應發薪資</p>
                          <p className="font-bold text-blue-600 text-lg">TWD {calculation.net_salary.toLocaleString()}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-slate-400">尚未計算</p>
                    )}
                  </div>

                  {isAdmin && (
                    <div className="flex items-center space-x-2 ml-4">
                      {!calculation && structure && (
                        <button
                          onClick={() => handleCalculatePayroll(user.id)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                        >
                          <Calculator className="w-4 h-4" />
                          <span>計算薪資</span>
                        </button>
                      )}
                      {calculation && (
                        <button className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                          <Eye className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 新增薪資結構模態框 */}
      {showStructureModal && (
        <SalaryStructureModal
          users={users}
          onClose={() => setShowStructureModal(false)}
          onSave={loadData}
        />
      )}
    </div>
  )
}

// 薪資結構模態框
function SalaryStructureModal({ users, onClose, onSave }: {
  users: UserProfile[]
  onClose: () => void
  onSave: () => void
}) {
  const [userId, setUserId] = useState('')
  const [baseSalary, setBaseSalary] = useState(0)
  const [hourlyRate, setHourlyRate] = useState(0)
  const [effectiveDate, setEffectiveDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [items, setItems] = useState<Array<{ item_type: '加項' | '減項', item_code: string, item_name: string, amount: number, is_taxable: boolean, is_insurance_base: boolean }>>([])

  const handleAddItem = () => {
    setItems([...items, { item_type: '加項', item_code: '', item_name: '', amount: 0, is_taxable: true, is_insurance_base: false }])
  }

  const handleSubmit = async () => {
    if (!userId || baseSalary <= 0) {
      alert('請填寫完整資訊')
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 創建薪資結構
      const { data: structure, error: structureError } = await supabase
        .from('employee_salary_structures')
        .insert({
          user_id: userId,
          effective_date: effectiveDate,
          base_salary: baseSalary,
          hourly_rate: hourlyRate || null,
          currency: 'TWD',
          is_active: true,
          created_by: user.id,
        })
        .select()
        .single()

      if (structureError) throw structureError

      // 創建薪資項目
      if (items.length > 0) {
        const itemsData = items
          .filter(item => item.item_name.trim() && item.amount > 0)
          .map((item, index) => ({
            salary_structure_id: structure.id,
            item_type: item.item_type,
            item_code: item.item_code || `ITEM${index + 1}`,
            item_name: item.item_name,
            amount: item.amount,
            calculation_type: '固定',
            is_taxable: item.is_taxable,
            is_insurance_base: item.is_insurance_base,
            sort_order: index + 1,
          }))

        if (itemsData.length > 0) {
          const { error: itemsError } = await supabase
            .from('salary_items')
            .insert(itemsData)

          if (itemsError) throw itemsError
        }
      }

      onSave()
      onClose()
    } catch (error) {
      console.error('Error creating salary structure:', error)
      alert('創建失敗，請重試')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-slate-800 mb-4">新增薪資結構</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">選擇員工 *</label>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">請選擇員工</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name || user.email}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">基本薪資 *</label>
              <input
                type="number"
                value={baseSalary || ''}
                onChange={(e) => setBaseSalary(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">時薪（選填）</label>
              <input
                type="number"
                value={hourlyRate || ''}
                onChange={(e) => setHourlyRate(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">生效日期 *</label>
            <input
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">薪資項目（選填）</label>
            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={index} className="p-3 border border-slate-200 rounded-lg grid grid-cols-5 gap-2">
                  <select
                    value={item.item_type}
                    onChange={(e) => {
                      const newItems = [...items]
                      newItems[index].item_type = e.target.value as '加項' | '減項'
                      setItems(newItems)
                    }}
                    className="px-2 py-1 border border-slate-300 rounded text-sm"
                  >
                    <option value="加項">加項</option>
                    <option value="減項">減項</option>
                  </select>
                  <input
                    type="text"
                    value={item.item_name}
                    onChange={(e) => {
                      const newItems = [...items]
                      newItems[index].item_name = e.target.value
                      setItems(newItems)
                    }}
                    placeholder="項目名稱"
                    className="px-2 py-1 border border-slate-300 rounded text-sm"
                  />
                  <input
                    type="number"
                    value={item.amount || ''}
                    onChange={(e) => {
                      const newItems = [...items]
                      newItems[index].amount = parseFloat(e.target.value) || 0
                      setItems(newItems)
                    }}
                    placeholder="金額"
                    className="px-2 py-1 border border-slate-300 rounded text-sm"
                  />
                  <div className="flex items-center space-x-1">
                    <input
                      type="checkbox"
                      checked={item.is_taxable}
                      onChange={(e) => {
                        const newItems = [...items]
                        newItems[index].is_taxable = e.target.checked
                        setItems(newItems)
                      }}
                      className="w-4 h-4"
                    />
                    <span className="text-xs text-slate-600">課稅</span>
                  </div>
                  <button
                    onClick={() => setItems(items.filter((_, i) => i !== index))}
                    className="px-2 py-1 bg-red-100 text-red-600 rounded text-sm hover:bg-red-200"
                  >
                    刪除
                  </button>
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
        </div>

        <div className="flex items-center justify-end space-x-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:text-slate-800">
            取消
          </button>
          <button onClick={handleSubmit} className="btn btn-primary">
            儲存
          </button>
        </div>
      </div>
    </div>
  )
}
