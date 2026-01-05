'use client'

import { useEffect, useState } from 'react'
import supabase from '@/lib/supabase'
import { Users, Plus, Edit, Search, Save } from 'lucide-react'
import { ExtendedUserProfile, Company, UserRole } from '@/types'

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<ExtendedUserProfile[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [roles, setRoles] = useState<UserRole[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<ExtendedUserProfile | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({
    login_name: '',
    email: '',
    full_name: '',
    company_id: '',
    employee_id: '',
    id_number: '',
    phone: '',
    mobile: '',
    address: '',
    emergency_contact: '',
    emergency_phone: '',
    bank_name: '',
    bank_account: '',
    account_holder: '',
    hire_date: '',
    resignation_date: '',
    department: '',
    role_id: '',
    requires_attendance: true,
    two_factor_enabled: false,
    is_active: true,
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // 載入員工資料
      const { data: employeesData } = await supabase
        .from('user_profiles')
        .select('*, company:companies(*), role:user_roles(*)')
        .order('full_name')

      // 載入公司列表
      const { data: companiesData } = await supabase
        .from('companies')
        .select('*')
        .eq('is_active', true)
        .order('name')

      // 載入角色列表
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('*')
        .order('name')

      setEmployees(employeesData || [])
      setCompanies(companiesData || [])
      setRoles(rolesData || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  // 生成登入名稱（小寫字母+6位數字）
  const generateLoginName = (): string => {
    const letter = String.fromCharCode(97 + Math.floor(Math.random() * 26)) // 隨機小寫字母
    const numbers = Math.floor(100000 + Math.random() * 900000).toString() // 6位數字
    return letter + numbers
  }

  const handleSubmit = async () => {
    if (!formData.email || !formData.full_name) {
      alert('請填寫電子郵件和姓名')
      return
    }

    // 驗證登入名稱格式
    if (formData.login_name && !/^[a-z][0-9]{6}$/.test(formData.login_name)) {
      alert('登入名稱格式錯誤，應為小寫字母+6位數字（例如：a123456）')
      return
    }

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) return

      if (editingEmployee) {
        // 更新現有員工
        const { error } = await supabase
          .from('user_profiles')
          .update({
            login_name: formData.login_name || null,
            email: formData.email,
            full_name: formData.full_name,
            company_id: formData.company_id || null,
            employee_id: formData.employee_id || null,
            id_number: formData.id_number || null,
            phone: formData.phone || null,
            mobile: formData.mobile || null,
            address: formData.address || null,
            emergency_contact: formData.emergency_contact || null,
            emergency_phone: formData.emergency_phone || null,
            bank_name: formData.bank_name || null,
            bank_account: formData.bank_account || null,
            account_holder: formData.account_holder || null,
            hire_date: formData.hire_date || null,
            resignation_date: formData.resignation_date || null,
            department: formData.department || null,
            role_id: formData.role_id || null,
            requires_attendance: formData.requires_attendance,
            two_factor_enabled: formData.two_factor_enabled,
            is_active: formData.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingEmployee.id)

        if (error) throw error
      } else {
        // 創建新員工（需要先創建 auth 用戶）
        // 注意：這裡需要管理員手動創建 auth 用戶，或使用管理 API
        alert('新員工創建功能需要管理員權限，請聯繫系統管理員')
        return
      }

      setShowModal(false)
      setEditingEmployee(null)
      resetForm()
      loadData()
    } catch (error: any) {
      console.error('Error saving employee:', error)
      alert(error.message || '儲存失敗，請重試')
    }
  }

  const handleEdit = (employee: ExtendedUserProfile) => {
    setEditingEmployee(employee)
    setFormData({
      login_name: employee.login_name || '',
      email: employee.email || '',
      full_name: employee.full_name || '',
      company_id: employee.company_id || '',
      employee_id: employee.employee_id || '',
      id_number: employee.id_number || '',
      phone: employee.phone || '',
      mobile: employee.mobile || '',
      address: employee.address || '',
      emergency_contact: employee.emergency_contact || '',
      emergency_phone: employee.emergency_phone || '',
      bank_name: employee.bank_name || '',
      bank_account: employee.bank_account || '',
      account_holder: employee.account_holder || '',
      hire_date: employee.hire_date || '',
      resignation_date: employee.resignation_date || '',
      department: employee.department || '',
      role_id: employee.role_id || '',
      requires_attendance: employee.requires_attendance ?? true,
      two_factor_enabled: employee.two_factor_enabled ?? false,
      is_active: employee.is_active,
    })
    setShowModal(true)
  }

  const resetForm = () => {
    setFormData({
      login_name: '',
      email: '',
      full_name: '',
      company_id: '',
      employee_id: '',
      id_number: '',
      phone: '',
      mobile: '',
      address: '',
      emergency_contact: '',
      emergency_phone: '',
      bank_name: '',
      bank_account: '',
      account_holder: '',
      hire_date: '',
      resignation_date: '',
      department: '',
      role_id: '',
      requires_attendance: true,
      two_factor_enabled: false,
      is_active: true,
    })
  }

  const filteredEmployees = employees.filter(employee =>
    employee.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.login_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.employee_id?.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
          <h1 className="text-2xl font-bold text-slate-800">員工資料管理</h1>
          <p className="text-slate-600 mt-1">管理員工完整個人資料</p>
        </div>
      </div>

      {/* 搜尋 */}
      <div className="card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="搜尋員工姓名、登入名稱、員工編號或電子郵件..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* 員工列表 */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">登入名稱</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">姓名</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">員工編號</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">公司</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">部門</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">角色</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-slate-700">需打卡</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-slate-700">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-400">
                    尚無員工資料
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((employee) => (
                  <tr key={employee.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 text-sm text-slate-800 font-mono">{employee.login_name || '-'}</td>
                    <td className="py-3 px-4 text-sm text-slate-800">{employee.full_name || '-'}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{employee.employee_id || '-'}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{employee.company?.name || '-'}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{employee.department || '-'}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{employee.role?.name || '-'}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        employee.requires_attendance 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-slate-100 text-slate-800'
                      }`}>
                        {employee.requires_attendance ? '是' : '否'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleEdit(employee)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 編輯模態框 */}
      {showModal && editingEmployee && (
        <EmployeeEditModal
          employee={editingEmployee}
          formData={formData}
          setFormData={setFormData}
          companies={companies}
          roles={roles}
          onClose={() => {
            setShowModal(false)
            setEditingEmployee(null)
            resetForm()
          }}
          onSave={handleSubmit}
          generateLoginName={generateLoginName}
        />
      )}
    </div>
  )
}

// 員工編輯模態框組件
function EmployeeEditModal({ employee, formData, setFormData, companies, roles, onClose, onSave, generateLoginName }: {
  employee: ExtendedUserProfile
  formData: any
  setFormData: (data: any) => void
  companies: Company[]
  roles: UserRole[]
  onClose: () => void
  onSave: () => void
  generateLoginName: () => string
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-slate-800 mb-4">編輯員工資料</h2>

        <div className="space-y-4">
          {/* 基本資料 */}
          <div className="border-b border-slate-200 pb-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-3">基本資料</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  登入名稱 <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={formData.login_name}
                    onChange={(e) => setFormData({ ...formData, login_name: e.target.value.toLowerCase() })}
                    pattern="[a-z][0-9]{6}"
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="a123456"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, login_name: generateLoginName() })}
                    className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm"
                  >
                    自動生成
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1">格式：小寫字母+6位數字</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  電子郵件 <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  姓名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">員工編號</label>
                <input
                  type="text"
                  value={formData.employee_id}
                  onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">身分證字號</label>
                <input
                  type="text"
                  value={formData.id_number}
                  onChange={(e) => setFormData({ ...formData, id_number: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">所屬公司</label>
                <select
                  value={formData.company_id}
                  onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">請選擇</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 聯絡資料 */}
          <div className="border-b border-slate-200 pb-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-3">聯絡資料</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">電話</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">手機</label>
                <input
                  type="text"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">地址</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">緊急聯絡人</label>
                <input
                  type="text"
                  value={formData.emergency_contact}
                  onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">緊急聯絡電話</label>
                <input
                  type="text"
                  value={formData.emergency_phone}
                  onChange={(e) => setFormData({ ...formData, emergency_phone: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* 銀行資料 */}
          <div className="border-b border-slate-200 pb-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-3">銀行資料</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">銀行名稱</label>
                <input
                  type="text"
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">銀行帳號</label>
                <input
                  type="text"
                  value={formData.bank_account}
                  onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">戶名</label>
                <input
                  type="text"
                  value={formData.account_holder}
                  onChange={(e) => setFormData({ ...formData, account_holder: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* 工作資料 */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-3">工作資料</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">部門</label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">角色</label>
                <select
                  value={formData.role_id}
                  onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">請選擇</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">到職日期</label>
                <input
                  type="date"
                  value={formData.hire_date}
                  onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">離職日期</label>
                <input
                  type="date"
                  value={formData.resignation_date}
                  onChange={(e) => setFormData({ ...formData, resignation_date: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="requires_attendance"
                  checked={formData.requires_attendance}
                  onChange={(e) => setFormData({ ...formData, requires_attendance: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="requires_attendance" className="text-sm text-slate-700">
                  需要打卡
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="two_factor_enabled"
                  checked={formData.two_factor_enabled}
                  onChange={(e) => setFormData({ ...formData, two_factor_enabled: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="two_factor_enabled" className="text-sm text-slate-700">
                  啟用2段式驗證
                </label>
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
            className="btn btn-primary flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>儲存</span>
          </button>
        </div>
      </div>
    </div>
  )
}
