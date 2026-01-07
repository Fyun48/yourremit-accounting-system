'use client'

import { useEffect, useState } from 'react'
import supabase from '@/lib/supabase'
import { Users, Plus, Edit, Search, Save } from 'lucide-react'
import { ExtendedUserProfile, Company, UserRole, Department, OrganizationPosition } from '@/types'
import { generateRandomPassword } from '@/lib/password-utils'

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<ExtendedUserProfile[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [roles, setRoles] = useState<UserRole[]>([])
  // 部門：
  // - allDepartments：所有公司啟用中的部門（用於列表顯示與搜尋）
  // - departments：目前表單選取公司底下的部門（用於編輯畫面下拉選單）
  const [departments, setDepartments] = useState<Department[]>([])
  const [allDepartments, setAllDepartments] = useState<Department[]>([])
  const [positions, setPositions] = useState<OrganizationPosition[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<ExtendedUserProfile | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [hasEmployeeManagePermission, setHasEmployeeManagePermission] = useState(false)
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
    is_resigned: false, // 新增：是否離職
    department_id: '', // 改為部門ID
    position_id: '', // 新增：職位ID（從組織圖表選擇）
    requires_attendance: true,
    two_factor_enabled: false,
    is_active: true,
  })

  useEffect(() => {
    loadData()
    checkPermission()
  }, [])

  // 當選擇公司時，載入該公司的部門和職位
  useEffect(() => {
    if (formData.company_id) {
      loadCompanyDepartmentsAndPositions(formData.company_id)
    } else {
      setDepartments([])
      setPositions([])
      setFormData(prev => ({ ...prev, department_id: '', position_id: '' }))
    }
  }, [formData.company_id])

  const loadCompanyDepartmentsAndPositions = async (companyId: string) => {
    try {
      // 載入部門
      const { data: deptData } = await supabase
        .from('departments')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('display_order, name')

      // 載入職位
      const { data: posData } = await supabase
        .from('organization_positions')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('display_order, position_name')

      setDepartments(deptData || [])
      setPositions(posData || [])
    } catch (error) {
      console.error('Error loading departments and positions:', error)
    }
  }

  const checkPermission = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 檢查用戶角色
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*, role:user_roles(*)')
        .eq('id', user.id)
        .single()

      // 系統管理員和財務經理有員工管理權限
      if (profile?.role?.name === '系統管理員' || profile?.role?.name === '財務經理') {
        setHasEmployeeManagePermission(true)
        return
      }

      // 檢查是否有「員工資料管理」功能權限
      const { data: permissions } = await supabase
        .from('user_feature_permissions')
        .select('*, feature:feature_permissions(*)')
        .eq('user_id', user.id)
        .eq('has_permission', true)

      if (permissions && permissions.some(p => p.feature?.feature_code === 'employee_manage')) {
        setHasEmployeeManagePermission(true)
      }
    } catch (error) {
      console.error('Error checking permission:', error)
    }
  }

  const loadData = async () => {
    try {
      // 載入員工資料（包含公司與角色關聯）
      // 部門暫時沿用現有欄位（字串），未使用關聯查詢以避免查詢錯誤導致整體失敗
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

      // 載入所有啟用中的部門（用於列表部門名稱顯示）
      const { data: allDepartmentsData } = await supabase
        .from('departments')
        .select('*')
        .eq('is_active', true)

      setEmployees(employeesData || [])
      setCompanies(companiesData || [])
      setRoles(rolesData || [])
      setAllDepartments(allDepartmentsData || [])
      
      // 如果已選擇公司，載入該公司的部門和職位
      if (formData.company_id) {
        await loadCompanyDepartmentsAndPositions(formData.company_id)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  // 生成登入名稱（部門層級代碼 + 公司代號 + 員工編號）
  // 格式：8位，例如：UUI01001（部門層級代碼3位 + 公司代號2位 + 員工編號3位）
  // 部門層級代碼：從上層到下層，最多3層，不足3層用U補齊
  const generateLoginName = async (): Promise<string> => {
    if (!formData.company_id || !formData.department_id) {
      alert('請先選擇公司和部門')
      return ''
    }

    try {
      // 獲取選中的部門
      const selectedDept = departments.find(d => d.id === formData.department_id)
      if (!selectedDept || !selectedDept.code) {
        alert('請先選擇部門')
        return ''
      }

      // 構建部門層級代碼（從上層到下層）
      const getDepartmentPath = (dept: Department): Department[] => {
        const path: Department[] = [dept]
        let current = dept
        
        // 向上查找所有父部門
        while (current.parent_department_id) {
          const parent = departments.find(d => d.id === current.parent_department_id)
          if (parent) {
            path.unshift(parent) // 插入到開頭
            current = parent
          } else {
            break
          }
        }
        
        return path
      }

      const deptPath = getDepartmentPath(selectedDept)
      
      // 構建3位部門代碼：從上層到下層，不足3層用U補齊
      let deptCodes = deptPath.map(d => d.code.toUpperCase()).join('')
      
      // 如果超過3層，只取最後3層
      if (deptCodes.length > 3) {
        deptCodes = deptCodes.slice(-3)
      }
      
      // 不足3層，用U補齊到3位
      deptCodes = deptCodes.padStart(3, 'U')

      // 獲取公司數字代號
      const selectedCompany = companies.find(c => c.id === formData.company_id)
      if (!selectedCompany || !selectedCompany.numeric_code) {
        alert('公司尚未設定數字代號，請先在公司管理中設定')
        return ''
      }
      const companyCode = selectedCompany.numeric_code.padStart(2, '0') // 確保是2位數字

      // 查詢該公司該部門組合下最新的員工編號
      // 使用部門層級代碼的前綴來查詢
      const { data: latestLoginNames } = await supabase
        .from('user_profiles')
        .select('login_name')
        .eq('company_id', formData.company_id)
        .not('login_name', 'is', null)
        .like('login_name', `${deptCodes}${companyCode}%`)
        .order('login_name', { ascending: false })
        .limit(100)

      // 找出最大的員工編號
      let maxEmployeeNum = 0
      
      if (latestLoginNames && latestLoginNames.length > 0) {
        latestLoginNames.forEach(emp => {
          if (emp.login_name && emp.login_name.startsWith(deptCodes + companyCode)) {
            // 提取後3位數字（員工序號）
            const numPart = emp.login_name.substring(5) // 跳過前5位（3位部門代碼 + 2位公司代號）
            const num = parseInt(numPart)
            if (!isNaN(num)) {
              maxEmployeeNum = Math.max(maxEmployeeNum, num)
            }
          }
        })
      }

      // 生成新的員工編號（最大編號 + 1，如果沒有則從000開始）
      const newEmployeeNum = maxEmployeeNum + 1
      const employeeNumStr = newEmployeeNum.toString().padStart(3, '0') // 3位數字，不足補0

      // 組合登入名稱：部門層級代碼(3位) + 公司代號(2位) + 員工編號(3位) = 8位
      const loginName = deptCodes + companyCode + employeeNumStr

      // 驗證長度為8位
      if (loginName.length !== 8) {
        alert(`生成的登入名稱長度錯誤（應為8位，實際為${loginName.length}位）`)
        return ''
      }

      return loginName
    } catch (error) {
      console.error('Error generating login name:', error)
      alert('生成登入名稱失敗：' + (error as any).message)
      return ''
    }
  }

  const handleSubmit = async () => {
    if (!formData.email || !formData.full_name) {
      alert('請填寫電子郵件和姓名')
      return
    }

    // 驗證登入名稱格式（8位：部門層級代碼3位 + 公司代號2位 + 員工編號3位）
    if (formData.login_name && !/^[A-Z]{3}[0-9]{2}[0-9]{3}$/.test(formData.login_name)) {
      alert('登入名稱格式錯誤，應為：3位部門代碼（大寫字母） + 2位公司代號（數字） + 3位員工編號（數字），共8位。例如：UUA01001')
      return
    }

    // 驗證登入名稱長度必須為8位
    if (formData.login_name && formData.login_name.length !== 8) {
      alert('登入名稱長度必須為8位：3位部門代碼 + 2位公司代號 + 3位員工編號')
      return
    }

    // 確保員工編號和登入名稱一致
    if (formData.login_name) {
      formData.employee_id = formData.login_name
    } else if (formData.employee_id) {
      formData.login_name = formData.employee_id
    }

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) return

      if (editingEmployee) {
        // 更新現有員工（透過後端 API 使用 Service Role，避免 RLS 限制）
        const response = await fetch('/api/employees/update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: editingEmployee.id,
            ...formData,
          }),
        })

        const contentType = response.headers.get('content-type')
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text()
          console.error('更新員工 API 返回非 JSON 格式:', text.substring(0, 200))
          throw new Error(`伺服器錯誤 (${response.status}): 請檢查伺服器日誌或確認資料庫欄位是否正確`)
        }

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || '更新員工資料失敗')
        }
      } else {
        // 創建新員工
        if (!formData.login_name) {
          alert('請填寫登入名稱')
          return
        }

        // 生成隨機8位元密碼
        const initialPassword = generateRandomPassword()
        const loginUrl = window.location.origin

        // 調用 API 創建員工
        const response = await fetch('/api/employees/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...formData,
            password: initialPassword,
            must_change_password: true, // 標記需要強制修改密碼
          }),
        })

        // 檢查響應類型
        const contentType = response.headers.get('content-type')
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text()
          console.error('API 返回非 JSON 格式:', text.substring(0, 200))
          throw new Error(`伺服器錯誤 (${response.status}): 請檢查伺服器日誌或確認資料庫欄位是否正確`)
        }

        const result = await response.json()

        if (!response.ok) {
          const errorMsg = result.error || '創建員工失敗'
          const details = result.details ? `\n詳細資訊：${result.details}` : ''
          const hint = result.hint ? `\n提示：${result.hint}` : ''
          throw new Error(errorMsg + details + hint)
        }

        // 如果有 email，自動發送郵件
        if (formData.email) {
          try {
            const emailResponse = await fetch('/api/send-credentials', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                email: formData.email,
                login_name: formData.login_name,
                password: initialPassword,
              }),
            })

            const emailResult = await emailResponse.json()
            
            if (emailResponse.ok) {
              alert(`員工創建成功！\n\n登入名稱：${formData.login_name}\n初始密碼：${initialPassword}\n\n登入資訊已發送至：${formData.email}`)
            } else {
              // 如果郵件發送失敗，顯示密碼
              const shouldShowPassword = confirm(
                `員工創建成功！\n\n郵件發送失敗：${emailResult.error || '未知錯誤'}\n\n是否顯示登入資訊？`
              )
              if (shouldShowPassword) {
                alert(`登入資訊：\n\n登入網址：${loginUrl}\n登入名稱：${formData.login_name}\n初始密碼：${initialPassword}\n\n請手動將此資訊告知員工。`)
              }
            }
          } catch (emailError) {
            // 如果郵件發送失敗，顯示密碼
            const shouldShowPassword = confirm(
              `員工創建成功！\n\n郵件發送失敗，是否顯示登入資訊？`
            )
            if (shouldShowPassword) {
              alert(`登入資訊：\n\n登入網址：${loginUrl}\n登入名稱：${formData.login_name}\n初始密碼：${initialPassword}\n\n請手動將此資訊告知員工。`)
            }
          }
        } else {
          // 如果沒有 email，顯示密碼並提供發送郵件的選項
          const message = `員工創建成功！\n\n登入名稱：${formData.login_name}\n初始密碼：${initialPassword}\n\n此員工未填寫 email 地址。\n\n是否要發送登入資訊至您的 email？`
          const sendEmail = confirm(message)
          
          if (sendEmail) {
            const adminEmail = prompt('請輸入您的 email 地址：')
            if (adminEmail) {
              try {
                const emailResponse = await fetch('/api/send-credentials', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    email: formData.email || '',
                    login_name: formData.login_name,
                    password: initialPassword,
                    recipient_email: adminEmail,
                  }),
                })

                const emailResult = await emailResponse.json()
                
                if (emailResponse.ok) {
                  alert(`登入資訊已發送至：${adminEmail}`)
                } else {
                  alert(`郵件發送失敗：${emailResult.error || '未知錯誤'}\n\n登入資訊：\n登入網址：${loginUrl}\n登入名稱：${formData.login_name}\n初始密碼：${initialPassword}`)
                }
              } catch (emailError) {
                alert(`郵件發送失敗\n\n登入資訊：\n登入網址：${loginUrl}\n登入名稱：${formData.login_name}\n初始密碼：${initialPassword}`)
              }
            }
          } else {
            alert(`登入資訊：\n\n登入網址：${loginUrl}\n登入名稱：${formData.login_name}\n初始密碼：${initialPassword}\n\n請手動將此資訊告知員工。`)
          }
        }
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
      is_resigned: employee.is_resigned ?? false,
      department_id: employee.department_id || '',
      position_id: employee.position_id || '',
      requires_attendance: employee.requires_attendance ?? true,
      two_factor_enabled: employee.two_factor_enabled ?? false,
      is_active: employee.is_active,
    })
    // 如果員工有公司，載入該公司的部門和職位
    if (employee.company_id) {
      loadCompanyDepartmentsAndPositions(employee.company_id)
    }
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
      is_resigned: false,
      department_id: '',
      position_id: '',
      requires_attendance: true,
      two_factor_enabled: false,
      is_active: true,
    })
  }

  // 取得員工部門名稱：
  // 1. 優先依 department_id 對應 departments 表的 name（即表單選到的部門）
  // 2. 找不到時才回退用舊的字串欄位 employee.department
  const getEmployeeDepartmentName = (employee: ExtendedUserProfile): string => {
    if (employee.department_id && allDepartments.length > 0) {
      const deptById = allDepartments.find(d => d.id === employee.department_id)
      if (deptById?.name) return deptById.name
    }

    const dept: any = (employee as any).department
    if (!dept) return ''
    if (typeof dept === 'string') return dept
    if (typeof dept === 'object' && 'name' in dept) {
      return (dept as any).name || ''
    }
    return ''
  }

  const filteredEmployees = employees.filter(employee => {
    const term = searchTerm.toLowerCase()
    const deptName = getEmployeeDepartmentName(employee).toLowerCase()

    return (
      employee.full_name?.toLowerCase().includes(term) ||
      employee.email?.toLowerCase().includes(term) ||
      employee.login_name?.toLowerCase().includes(term) ||
      employee.employee_id?.toLowerCase().includes(term) ||
      deptName.includes(term)
    )
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">員工資料管理</h1>
          <p className="text-slate-600 mt-1">管理員工完整個人資料</p>
        </div>
        {hasEmployeeManagePermission && (
          <button
            onClick={() => {
              resetForm()
              setEditingEmployee(null)
              setShowModal(true)
            }}
            className="btn btn-primary flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>新增員工</span>
          </button>
        )}
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
                    <td className="py-3 px-4 text-sm text-slate-600">{getEmployeeDepartmentName(employee) || '-'}</td>
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

      {/* 新增/編輯模態框 */}
      {showModal && (
        <EmployeeEditModal
          employee={editingEmployee}
          formData={formData}
          setFormData={setFormData}
          companies={companies}
          roles={roles}
          departments={departments}
          positions={positions}
          onClose={() => {
            setShowModal(false)
            setEditingEmployee(null)
            resetForm()
          }}
          onSave={handleSubmit}
          generateLoginName={generateLoginName}
          isNew={!editingEmployee}
        />
      )}
    </div>
  )
}

// 員工新增/編輯模態框組件
function EmployeeEditModal({ employee, formData, setFormData, companies, roles, departments, positions, onClose, onSave, generateLoginName, isNew }: {
  employee: ExtendedUserProfile | null
  formData: any
  setFormData: (data: any) => void
  companies: Company[]
  roles: UserRole[]
  departments: Department[]
  positions: OrganizationPosition[]
  onClose: () => void
  onSave: () => void
  generateLoginName: () => Promise<string>
  isNew: boolean
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-slate-800 mb-4">
          {isNew ? '新增員工' : '編輯員工資料'}
        </h2>

        <div className="space-y-4">
          {/* 任職資訊（公司 / 部門 / 職位） */}
          <div className="border-b border-slate-200 pb-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-3">任職資訊</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">所屬公司</label>
                <select
                  value={formData.company_id}
                  onChange={async (e) => {
                    const company_id = e.target.value
                    const updated = {
                      ...formData,
                      company_id,
                      department_id: '',
                      position_id: '',
                      ...(isNew ? { login_name: '', employee_id: '' } : {}),
                    }
                    setFormData(updated)
                  }}
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
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">部門</label>
                <select
                  value={formData.department_id}
                  onChange={async (e) => {
                    const department_id = e.target.value
                    const updated = { ...formData, department_id }
                    setFormData(updated)

                    if (isNew && updated.company_id && updated.department_id && updated.position_id) {
                      const loginName = await generateLoginName()
                      if (loginName) {
                        setFormData({
                          ...updated,
                          login_name: loginName,
                          employee_id: loginName,
                        })
                      }
                    }
                  }}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled={!formData.company_id}
                >
                  <option value="">{formData.company_id ? '請選擇部門' : '請先選擇公司'}</option>
                  {(departments || []).map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name} ({dept.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">職位（組織圖表）</label>
                <select
                  value={formData.position_id}
                  onChange={async (e) => {
                    const position_id = e.target.value
                    const updated = { ...formData, position_id }
                    setFormData(updated)

                    if (isNew && updated.company_id && updated.department_id && updated.position_id) {
                      const loginName = await generateLoginName()
                      if (loginName) {
                        setFormData({
                          ...updated,
                          login_name: loginName,
                          employee_id: loginName,
                        })
                      }
                    }
                  }}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled={!formData.company_id}
                >
                  <option value="">{formData.company_id ? '請選擇職位' : '請先選擇公司'}</option>
                  {(positions || []).map((pos) => (
                    <option key={pos.id} value={pos.id}>
                      {pos.position_name} ({pos.position_code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

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
                    onChange={(e) => {
                      const value = e.target.value.toUpperCase().slice(0, 8) // 轉大寫，最多8位
                      setFormData({ ...formData, login_name: value, employee_id: value })
                    }}
                    pattern="[A-Z]{3}[0-9]{2}[0-9]{3}"
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="UUI01001"
                    required={isNew}
                    disabled={!isNew}
                    maxLength={8}
                  />
                  {isNew && (
                    <button
                      type="button"
                      onClick={async () => {
                        const loginName = await generateLoginName()
                        if (loginName) {
                          setFormData({ ...formData, login_name: loginName, employee_id: loginName })
                        }
                      }}
                      className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm"
                      disabled={!formData.company_id || !formData.department_id}
                    >
                      自動生成
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  格式：部門層級代碼(3位英文，例如 UUI) + 公司代號(2位數字，例如 01) + 員工序號(3位數字，例如 001)，共8位。
                  例如：UUI01001
                  {!isNew && '（編輯模式下不可修改）'}
                </p>
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
                  value={formData.employee_id || formData.login_name}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase()
                    setFormData({ ...formData, employee_id: value, login_name: value })
                  }}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled={!isNew} // 編輯模式下禁用，因為員工編號與登入名稱一致
                />
                <p className="text-xs text-slate-500 mt-1">員工編號與登入名稱一致</p>
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
                  disabled={!formData.is_resigned}
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_resigned"
                  checked={formData.is_resigned}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    is_resigned: e.target.checked,
                    resignation_date: e.target.checked ? formData.resignation_date : ''
                  })}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="is_resigned" className="text-sm text-slate-700">
                  已離職
                </label>
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
