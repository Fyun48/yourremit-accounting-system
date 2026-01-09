'use client'

import { useEffect, useState } from 'react'
import supabase from '@/lib/supabase'
import { Building2, Plus, Edit, Trash2, Search, Users, Network, ChevronRight, X } from 'lucide-react'
import { Company, Department, OrganizationPosition, ExtendedUserProfile } from '@/types'

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [positions, setPositions] = useState<OrganizationPosition[]>([])
  const [employees, setEmployees] = useState<ExtendedUserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showDeptModal, setShowDeptModal] = useState(false)
  const [showOrgChartModal, setShowOrgChartModal] = useState(false)
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null)
  const [editingPosition, setEditingPosition] = useState<OrganizationPosition | null>(null)
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    name_en: '',
    numeric_code: '', // 公司數字代號（2位數字，同時作為公司代碼）
    tax_id: '',
    registration_number: '',
    company_type: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
    is_active: true,
  })
  const [deptFormData, setDeptFormData] = useState({
    code: '',
    name: '',
    name_en: '',
    parent_department_id: '',
    description: '',
    level: 1,
    display_order: 0,
    is_active: true,
  })

  // 預設部門代號映射
  const defaultDepartmentCodes: Record<string, string> = {
    'I': '資訊部',
    'F': '財務部',
    'C': '管理部',
    'A': '行政部',
    'B': '董事會',
    'S': '業務部',
    'P': '產品部',
    'M': '行銷部',
  }
  const [positionFormData, setPositionFormData] = useState({
    position_code: '',
    position_name: '',
    position_name_en: '',
    job_description: '',
    level: 1,
    display_order: 0,
    is_active: true,
  })

  useEffect(() => {
    loadData()
    loadEmployees()
  }, [])

  useEffect(() => {
    if (selectedCompany) {
      loadDepartments()
      loadPositions()
    }
  }, [selectedCompany])

  const loadData = async () => {
    try {
      const { data } = await supabase
        .from('companies')
        .select('*')
        .order('name')

      setCompanies(data || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadEmployees = async () => {
    try {
      const { data } = await supabase
        .from('user_profiles')
        .select('id, full_name, email, is_active, created_at, updated_at')
        .eq('is_active', true)
        .order('full_name')

      setEmployees(data || [])
    } catch (error) {
      console.error('Error loading employees:', error)
    }
  }

  const loadDepartments = async () => {
    if (!selectedCompany) return

    try {
      const { data, error } = await supabase
        .from('departments')
        .select(`
          *,
          manager:user_profiles(id, full_name),
          parent_department:departments(id, name)
        `)
        .eq('company_id', selectedCompany.id)
        .order('display_order', { ascending: true })
        .order('name', { ascending: true })

      if (error) {
        console.error('Error loading departments:', error)
        // 如果關聯查詢失敗，嘗試簡單查詢
        const { data: simpleData, error: simpleError } = await supabase
          .from('departments')
          .select('*')
          .eq('company_id', selectedCompany.id)
          .order('display_order', { ascending: true })
          .order('name', { ascending: true })

        if (simpleError) {
          throw simpleError
        }

        // 手動載入關聯資料
        if (simpleData) {
          const deptIds = simpleData.map(d => d.manager_id).filter(Boolean)
          const parentIds = simpleData.map(d => d.parent_department_id).filter(Boolean)
          
          const [managers, parents] = await Promise.all([
            deptIds.length > 0 ? supabase.from('user_profiles').select('id, full_name').in('id', deptIds) : { data: [] },
            parentIds.length > 0 ? supabase.from('departments').select('id, name').in('id', parentIds) : { data: [] }
          ])

          const enrichedData = simpleData.map(dept => ({
            ...dept,
            manager: managers.data?.find(m => m.id === dept.manager_id),
            parent_department: parents.data?.find(p => p.id === dept.parent_department_id)
          }))

          setDepartments(enrichedData || [])
        }
      } else {
        setDepartments(data || [])
      }
    } catch (error) {
      console.error('Error loading departments:', error)
      alert('載入部門資料失敗：' + (error as any).message)
    }
  }

  const loadPositions = async () => {
    if (!selectedCompany) return

    try {
      const { data, error } = await supabase
        .from('organization_positions')
        .select('*')
        .eq('company_id', selectedCompany.id)
        .order('display_order', { ascending: true })
        .order('position_name', { ascending: true })

      if (error) {
        console.error('Error loading positions:', error)
        throw error
      }

      setPositions(data || [])
    } catch (error) {
      console.error('Error loading positions:', error)
      alert('載入職位資料失敗：' + (error as any).message)
    }
  }

  const handleSubmit = async () => {
    if (!formData.name) {
      alert('請填寫公司名稱')
      return
    }

    // 驗證公司數字代號（編輯時允許為空，因為可能是舊資料）
    if (!editingCompany && (!formData.numeric_code || !/^\d{2}$/.test(formData.numeric_code))) {
      alert('請填寫正確的公司數字代號（2位數字，例如：01, 02）')
      return
    }

    // 如果是編輯且 numeric_code 存在，驗證格式
    if (editingCompany && formData.numeric_code && !/^\d{2}$/.test(formData.numeric_code)) {
      alert('公司數字代號格式錯誤（應為2位數字，例如：01, 02）')
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 準備更新資料，code 欄位自動使用 numeric_code 的值
      const updateData: any = {
        code: formData.numeric_code || formData.name.substring(0, 50), // 使用 numeric_code 作為 code，如果沒有則使用公司名稱前50字符
        name: formData.name,
        name_en: formData.name_en || null,
        tax_id: formData.tax_id || null,
        registration_number: formData.registration_number || null,
        company_type: formData.company_type || null,
        contact_person: formData.contact_person || null,
        phone: formData.phone || null,
        email: formData.email || null,
        address: formData.address || null,
        notes: formData.notes || null,
        is_active: formData.is_active,
        updated_at: new Date().toISOString(),
      }

      // 只有在有值時才添加 numeric_code
      if (formData.numeric_code) {
        updateData.numeric_code = formData.numeric_code
        updateData.code = formData.numeric_code // code 使用 numeric_code 的值
      }

      if (editingCompany) {
        const { error } = await supabase
          .from('companies')
          .update(updateData)
          .eq('id', editingCompany.id)

        if (error) {
          console.error('Update error details:', error)
          if (error.message.includes('numeric_code')) {
            alert('儲存失敗：資料庫中尚未添加「公司數字代號」欄位。請先執行 add-company-code.sql 腳本。')
          } else {
            throw error
          }
          return
        }
      } else {
        const insertData = {
          ...updateData,
          numeric_code: formData.numeric_code, // 新增時必須有值
          created_by: user.id,
        }
        delete insertData.updated_at

        const { data: newCompany, error } = await supabase
          .from('companies')
          .insert(insertData)
          .select()
          .single()

        if (error) {
          console.error('Insert error details:', error)
          if (error.message.includes('numeric_code')) {
            alert('儲存失敗：資料庫中尚未添加「公司數字代號」欄位。請先執行 add-company-code.sql 腳本。')
          } else {
            throw error
          }
          return
        }

        // 新增公司成功後，自動創建預設部門和職位
        if (newCompany) {
          // 1. 創建預設部門
          const defaultDepartments = [
            { code: 'I', name: '資訊部', name_en: 'IT Department', display_order: 1 },
            { code: 'F', name: '財務部', name_en: 'Finance Department', display_order: 2 },
            { code: 'C', name: '管理部', name_en: 'Management Department', display_order: 3 },
            { code: 'A', name: '行政部', name_en: 'Administration Department', display_order: 4 },
            { code: 'B', name: '董事會', name_en: 'Board of Directors', display_order: 5 },
            { code: 'S', name: '業務部', name_en: 'Sales Department', display_order: 6 },
            { code: 'P', name: '產品部', name_en: 'Product Department', display_order: 7 },
            { code: 'M', name: '行銷部', name_en: 'Marketing Department', display_order: 8 },
          ]

          const departmentsToInsert = defaultDepartments.map(dept => ({
            code: dept.code,
            name: dept.name,
            name_en: dept.name_en,
            company_id: newCompany.id,
            parent_department_id: null,
            level: 1,
            display_order: dept.display_order,
            is_active: true,
            created_by: user.id,
          }))

          // 使用 upsert，避免已存在相同 company_id + code 時產生重複鍵錯誤
          const { error: deptError } = await supabase
            .from('departments')
            .upsert(departmentsToInsert, {
              onConflict: 'company_id,code',
              ignoreDuplicates: true,
            })

          if (deptError) {
            console.error('Error creating default departments:', deptError)
            alert('公司新增成功，但創建預設部門時發生錯誤：' + deptError.message)
          }

          // 2. 創建預設職位（不關聯部門，作為通用職位）
          const defaultPositions = [
            // 經營管理層 (Level 5, E-Level)
            { code: 'E1', name: '董事長', name_en: 'Chairman', level: 5, display_order: 1 },
            { code: 'E2', name: '執行長', name_en: 'CEO', level: 5, display_order: 2 },
            { code: 'E3', name: '總經理', name_en: 'General Manager', level: 5, display_order: 3 },
            { code: 'E4', name: '副總經理', name_en: 'Vice President', level: 5, display_order: 4 },
            
            // 高階管理層 (Level 4, D-Level)
            { code: 'D1', name: '協理', name_en: 'Assistant Vice President', level: 4, display_order: 5 },
            { code: 'D2', name: '總監', name_en: 'Director', level: 4, display_order: 6 },
            { code: 'D3', name: '處長', name_en: 'Department Head', level: 4, display_order: 7 },
            
            // 中階管理層 (Level 3, M-Level)
            { code: 'M1', name: '經理', name_en: 'Manager', level: 3, display_order: 8 },
            { code: 'M2', name: '副理', name_en: 'Deputy Manager', level: 3, display_order: 9 },
            { code: 'M3', name: '襄理', name_en: 'Assistant Manager', level: 3, display_order: 10 },
            
            // 基層管理層 (Level 2, S-Level)
            { code: 'S1', name: '課長', name_en: 'Section Manager', level: 2, display_order: 11 },
            { code: 'S2', name: '科長', name_en: 'Section Chief', level: 2, display_order: 12 },
            { code: 'S3', name: '主任', name_en: 'Supervisor', level: 2, display_order: 13 },
            { code: 'S4', name: '組長', name_en: 'Team Lead', level: 2, display_order: 14 },
            
            // 一般職員 (Level 1, P-Level)
            { code: 'P1', name: '資深專員', name_en: 'Senior Specialist', level: 1, display_order: 15 },
            { code: 'P2', name: '資深工程師', name_en: 'Senior Engineer', level: 1, display_order: 16 },
            { code: 'P3', name: '專員', name_en: 'Specialist', level: 1, display_order: 17 },
            { code: 'P4', name: '工程師', name_en: 'Engineer', level: 1, display_order: 18 },
            { code: 'P5', name: '助理', name_en: 'Assistant', level: 1, display_order: 19 },
          ]

          const positionsToInsert = defaultPositions.map(pos => ({
            position_code: pos.code,
            position_name: pos.name,
            position_name_en: pos.name_en,
            company_id: newCompany.id,
            department_id: null, // 不關聯特定部門，作為通用職位
            parent_position_id: null,
            employee_id: null,
            level: pos.level,
            display_order: pos.display_order,
            is_active: true,
            created_by: user.id,
          }))

          const { error: posError } = await supabase
            .from('organization_positions')
            .insert(positionsToInsert)

          if (posError) {
            console.error('Error creating default positions:', posError)
            alert('公司新增成功，但創建預設職位時發生錯誤：' + posError.message)
          }
        }
      }

      setShowModal(false)
      setEditingCompany(null)
      resetForm()
      loadData()
      alert(editingCompany ? '公司資料更新成功！' : '公司新增成功！已自動創建預設部門和職位。')
    } catch (error: any) {
      console.error('Error saving company:', error)
      alert(error.message || '儲存失敗，請重試')
    }
  }

  const handleDeptSubmit = async () => {
    // 驗證部門代碼：只能是一個英文字母或一個數字
    if (!deptFormData.code || !/^[A-Za-z0-9]$/.test(deptFormData.code)) {
      alert('部門代碼只能是一個英文字母或一個數字（例如：I, F, 1, 2）')
      return
    }

    if (!deptFormData.name || !selectedCompany) {
      alert('請填寫部門名稱')
      return
    }

    // 轉換為大寫
    const deptCode = deptFormData.code.toUpperCase()

    // 檢查是否為預設部門代號，且沒有選擇上層部門
    if (defaultDepartmentCodes[deptCode] && !deptFormData.parent_department_id) {
      // 檢查該公司是否已有此代號的部門
      const existingDept = departments.find(d => d.code === deptCode && d.company_id === selectedCompany.id)
      if (!existingDept) {
        // 允許創建預設部門（頂層）
      } else {
        alert(`此部門代號 "${deptCode}" 是預設代號（${defaultDepartmentCodes[deptCode]}），且該公司已有此代號的部門。如需新增相同代號的部門，請選擇上層部門。`)
        return
      }
    } else if (defaultDepartmentCodes[deptCode] && deptFormData.parent_department_id) {
      // 預設代號但選擇了上層部門，允許創建
    } else if (defaultDepartmentCodes[deptCode] && !editingDepartment) {
      // 非編輯模式，預設代號且沒有上層部門，檢查是否已存在
      const existingDept = departments.find(d => d.code === deptCode && d.company_id === selectedCompany.id && !d.parent_department_id)
      if (existingDept) {
        alert(`此部門代號 "${deptCode}" 是預設代號（${defaultDepartmentCodes[deptCode]}），且該公司已有此代號的頂層部門。如需新增相同代號的部門，請選擇上層部門。`)
        return
      }
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const parentDept = deptFormData.parent_department_id 
        ? departments.find(d => d.id === deptFormData.parent_department_id)
        : null

      // 檢查層級：最多3層
      const newLevel = parentDept ? parentDept.level + 1 : 1
      if (newLevel > 3) {
        alert('部門層級最多只能有3層，無法再新增下層部門')
        return
      }

      if (editingDepartment) {
        // 編輯時也要檢查層級
        if (newLevel > 3) {
          alert('部門層級最多只能有3層')
          return
        }

        const { error } = await supabase
          .from('departments')
          .update({
            code: deptCode,
            name: deptFormData.name,
            name_en: deptFormData.name_en || null,
            parent_department_id: deptFormData.parent_department_id || null,
            description: deptFormData.description || null,
            level: newLevel,
            display_order: deptFormData.display_order,
            is_active: deptFormData.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingDepartment.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('departments')
          .insert({
            code: deptCode,
            name: deptFormData.name,
            name_en: deptFormData.name_en || null,
            company_id: selectedCompany.id,
            parent_department_id: deptFormData.parent_department_id || null,
            description: deptFormData.description || null,
            level: newLevel,
            display_order: deptFormData.display_order,
            is_active: deptFormData.is_active,
            created_by: user.id,
          })

        if (error) throw error
      }

      // 重新載入部門資料
      await loadDepartments()
      setEditingDepartment(null)
      resetDeptForm()
      // 不關閉模態框，讓用戶看到更新後的資料
    } catch (error: any) {
      console.error('Error saving department:', error)
      alert(error.message || '儲存失敗，請重試')
    }
  }

  const handlePositionSubmit = async () => {
    if (!positionFormData.position_code || !positionFormData.position_name || !selectedCompany) {
      alert('請填寫職位代碼和名稱')
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      if (editingPosition) {
        const { error } = await supabase
          .from('organization_positions')
          .update({
            position_code: positionFormData.position_code,
            position_name: positionFormData.position_name,
            position_name_en: positionFormData.position_name_en || null,
            company_id: selectedCompany.id,
            job_description: positionFormData.job_description || null,
            level: positionFormData.level,
            display_order: positionFormData.display_order,
            is_active: positionFormData.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingPosition.id)

        if (error) throw error
      } else {
        // 新增職位時，實作插入模式：如果順序號碼與現有職位相同，將現有職位順序往後移
        const newDisplayOrder = positionFormData.display_order

        // 查詢所有 display_order >= 新職位順序的現有職位
        const { data: existingPositions, error: queryError } = await supabase
          .from('organization_positions')
          .select('id, display_order')
          .eq('company_id', selectedCompany.id)
          .gte('display_order', newDisplayOrder)
          .order('display_order', { ascending: true })

        if (queryError) throw queryError

        // 如果有現有職位使用了相同或更大的順序號碼，將它們的順序都 +1
        if (existingPositions && existingPositions.length > 0) {
          const updatePromises = existingPositions.map(pos => 
            supabase
              .from('organization_positions')
              .update({ 
                display_order: pos.display_order + 1,
                updated_at: new Date().toISOString()
              })
              .eq('id', pos.id)
          )

          const updateResults = await Promise.all(updatePromises)
          const hasError = updateResults.some(result => result.error)
          
          if (hasError) {
            const firstError = updateResults.find(result => result.error)?.error
            throw firstError || new Error('更新現有職位順序時發生錯誤')
          }
        }

        // 插入新職位
        const { error } = await supabase
          .from('organization_positions')
          .insert({
            position_code: positionFormData.position_code,
            position_name: positionFormData.position_name,
            position_name_en: positionFormData.position_name_en || null,
            company_id: selectedCompany.id,
            job_description: positionFormData.job_description || null,
            level: positionFormData.level,
            display_order: newDisplayOrder,
            is_active: positionFormData.is_active,
            created_by: user.id,
          })

        if (error) throw error
      }

      // 重新載入職位資料
      await loadPositions()
      setEditingPosition(null)
      resetPositionForm()
      // 不關閉模態框，讓用戶看到更新後的資料
    } catch (error: any) {
      console.error('Error saving position:', error)
      alert(error.message || '儲存失敗，請重試')
    }
  }

  const handleEdit = (company: Company) => {
    setEditingCompany(company)
    setFormData({
      name: company.name,
      name_en: company.name_en || '',
      numeric_code: company.numeric_code || company.code || '', // 優先使用 numeric_code，如果沒有則使用 code
      tax_id: company.tax_id || '',
      registration_number: company.registration_number || '',
      company_type: company.company_type || '',
      contact_person: company.contact_person || '',
      phone: company.phone || '',
      email: company.email || '',
      address: company.address || '',
      notes: company.notes || '',
      is_active: company.is_active,
    })
    setShowModal(true)
  }

  const handleManageDepartments = (company: Company) => {
    setSelectedCompany(company)
    setShowDeptModal(true)
  }

  const handleManageOrgChart = (company: Company) => {
    setSelectedCompany(company)
    setShowOrgChartModal(true)
  }

  const handleEditDept = (dept: Department) => {
    setEditingDepartment(dept)
    setDeptFormData({
      code: dept.code,
      name: dept.name,
      name_en: dept.name_en || '',
      parent_department_id: dept.parent_department_id || '',
      description: dept.description || '',
      level: dept.level,
      display_order: dept.display_order,
      is_active: dept.is_active,
    })
  }

  const handleEditPosition = (pos: OrganizationPosition) => {
    setEditingPosition(pos)
    setPositionFormData({
      position_code: pos.position_code,
      position_name: pos.position_name,
      position_name_en: pos.position_name_en || '',
      job_description: pos.job_description || '',
      level: pos.level,
      display_order: pos.display_order,
      is_active: pos.is_active,
    })
  }

  const handleDeleteDept = async (id: string) => {
    if (!confirm('確定要刪除此部門嗎？')) return

    try {
      const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', id)

      if (error) throw error

      await loadDepartments()
      alert('部門刪除成功！')
    } catch (error: any) {
      console.error('Error deleting department:', error)
      alert(error.message || '刪除失敗，請重試')
    }
  }

  const handleDeletePosition = async (id: string) => {
    if (!confirm('確定要刪除此職位嗎？')) return

    try {
      const { error } = await supabase
        .from('organization_positions')
        .delete()
        .eq('id', id)

      if (error) throw error

      await loadPositions()
      alert('職位刪除成功！')
    } catch (error: any) {
      console.error('Error deleting position:', error)
      alert(error.message || '刪除失敗，請重試')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      // 先檢查是否有員工關聯到此公司
      const { data: employees, error: empError } = await supabase
        .from('user_profiles')
        .select('id, full_name, login_name')
        .eq('company_id', id)

      if (empError) {
        console.error('Error checking employees:', empError)
      }

      const employeeCount = employees?.length || 0
      
      if (employeeCount > 0) {
        const confirmMessage = `此公司下還有 ${employeeCount} 位員工。\n\n` +
          `選擇「確定」將清除這些員工的公司關聯後刪除公司（不會刪除員工資料）。\n` +
          `選擇「取消」則取消刪除操作。\n\n` +
          `確定要繼續嗎？`
        
        if (!confirm(confirmMessage)) {
          return
        }

        // 清除員工的公司關聯
        const { error: clearError } = await supabase
          .from('user_profiles')
          .update({ company_id: null })
          .eq('company_id', id)

        if (clearError) {
          console.error('Error clearing employee company associations:', clearError)
          alert(`清除員工公司關聯失敗：${clearError.message}`)
          return
        }
      } else {
        if (!confirm('確定要刪除此公司嗎？此操作將同時刪除該公司下的所有部門和職位資料。')) {
          return
        }
      }

      // 刪除公司（部門和職位會因為 CASCADE 自動刪除）
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Delete error details:', error)
        // 提供更詳細的錯誤訊息
        if (error.code === '42501') {
          alert('刪除失敗：您沒有權限刪除公司。請確認您是系統管理員。')
        } else if (error.code === '23503') {
          alert('刪除失敗：此公司仍有其他關聯資料，無法刪除。')
        } else {
          alert(`刪除失敗：${error.message || '請重試'}`)
        }
        return
      }

      alert(employeeCount > 0 
        ? `公司刪除成功！已清除 ${employeeCount} 位員工的公司關聯。` 
        : '公司刪除成功！')
      loadData()
    } catch (error: any) {
      console.error('Error deleting company:', error)
      alert(`刪除失敗：${error.message || '請重試'}`)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      name_en: '',
      numeric_code: '',
      tax_id: '',
      registration_number: '',
      company_type: '',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
      notes: '',
      is_active: true,
    })
  }

  const resetDeptForm = () => {
    setDeptFormData({
      code: '',
      name: '',
      name_en: '',
      parent_department_id: '',
      description: '',
      level: 1,
      display_order: 0,
      is_active: true,
    })
  }

  const resetPositionForm = () => {
    setPositionFormData({
      position_code: '',
      position_name: '',
      position_name_en: '',
      job_description: '',
      level: 1,
      display_order: 0,
      is_active: true,
    })
  }

    const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.numeric_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.tax_id?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // 部門樹狀結構節點型別（在 Department 基礎上加入 children）
  type DepartmentTreeNode = Department & { children?: DepartmentTreeNode[] }

  // 構建部門樹狀結構
  const buildDeptTree = (depts: Department[]): DepartmentTreeNode[] => {
    const deptMap = new Map(depts.map(d => [d.id, { ...d, children: [] as DepartmentTreeNode[] }]))
    const roots: DepartmentTreeNode[] = []

    depts.forEach(dept => {
      const node = deptMap.get(dept.id)!
      if (dept.parent_department_id && deptMap.has(dept.parent_department_id)) {
        const parent = deptMap.get(dept.parent_department_id)!
        parent.children.push(node)
      } else {
        roots.push(node)
      }
    })

    return roots
  }

  // 職位樹狀結構節點型別（在 OrganizationPosition 基礎上加入 children）
  type PositionTreeNode = OrganizationPosition & { children?: PositionTreeNode[] }

  // 構建職位樹狀結構
  const buildPositionTree = (positions: OrganizationPosition[]): PositionTreeNode[] => {
    const posMap = new Map(positions.map(p => [p.id, { ...p, children: [] as PositionTreeNode[] }]))
    const roots: PositionTreeNode[] = []

    positions.forEach(pos => {
      const node = posMap.get(pos.id)!
      if (pos.parent_position_id && posMap.has(pos.parent_position_id)) {
        const parent = posMap.get(pos.parent_position_id)!
        parent.children.push(node)
      } else {
        roots.push(node)
      }
    })

    return roots
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
          <h1 className="text-2xl font-bold text-slate-800">公司管理</h1>
          <p className="text-slate-600 mt-1">管理公司行號資料、部門與組織圖表</p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setEditingCompany(null)
            setShowModal(true)
          }}
          className="btn btn-primary flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>新增公司</span>
        </button>
      </div>

      {/* 搜尋 */}
      <div className="card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="搜尋公司名稱、代碼或統一編號..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* 公司列表 */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">公司代號</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">公司名稱</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">統一編號</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">聯絡人</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">電話</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-slate-700">狀態</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-slate-700">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredCompanies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    尚無公司資料
                  </td>
                </tr>
              ) : (
                filteredCompanies.map((company) => (
                  <tr key={company.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 text-sm text-slate-800 font-mono">{company.numeric_code || company.code}</td>
                    <td className="py-3 px-4 text-sm text-slate-800">{company.name}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{company.tax_id || '-'}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{company.contact_person || '-'}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{company.phone || '-'}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        company.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-slate-100 text-slate-800'
                      }`}>
                        {company.is_active ? '啟用' : '停用'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => handleEdit(company)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="編輯"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleManageDepartments(company)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                          title="管理部門"
                        >
                          <Users className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleManageOrgChart(company)}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg"
                          title="組織圖表"
                        >
                          <Network className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(company.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="刪除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 新增/編輯公司模態框 */}
      {showModal && (
        <CompanyModal
          editingCompany={editingCompany}
          formData={formData}
          setFormData={setFormData}
          onClose={() => {
            setShowModal(false)
            setEditingCompany(null)
            resetForm()
          }}
          onSave={handleSubmit}
        />
      )}

      {/* 部門管理模態框 */}
      {showDeptModal && selectedCompany && (
        <DepartmentModal
          company={selectedCompany}
          departments={departments}
          editingDepartment={editingDepartment}
          deptFormData={deptFormData}
          setDeptFormData={setDeptFormData}
          onClose={() => {
            setShowDeptModal(false)
            setSelectedCompany(null)
            setEditingDepartment(null)
            resetDeptForm()
          }}
          onSave={handleDeptSubmit}
          onEdit={handleEditDept}
          onDelete={handleDeleteDept}
          onNew={() => {
            setEditingDepartment(null)
            resetDeptForm()
          }}
        />
      )}

      {/* 組織圖表模態框 */}
      {showOrgChartModal && selectedCompany && (
        <OrgChartModal
          company={selectedCompany}
          departments={departments}
          positions={positions}
          employees={employees}
          editingPosition={editingPosition}
          positionFormData={positionFormData}
          setPositionFormData={setPositionFormData}
          onClose={() => {
            setShowOrgChartModal(false)
            setSelectedCompany(null)
            setEditingPosition(null)
            resetPositionForm()
          }}
          onSave={handlePositionSubmit}
          onEdit={handleEditPosition}
          onDelete={handleDeletePosition}
          onNew={() => {
            setEditingPosition(null)
            resetPositionForm()
          }}
        />
      )}
    </div>
  )
}

// 公司模態框組件
function CompanyModal({ editingCompany, formData, setFormData, onClose, onSave }: any) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-slate-800 mb-4">
          {editingCompany ? '編輯公司' : '新增公司'}
        </h2>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">公司名稱 *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">公司代號 *</label>
              <input
                type="text"
                value={formData.numeric_code}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 2) // 只允許數字，最多2位
                  setFormData({ ...formData, numeric_code: value })
                }}
                placeholder="01, 02, 03..."
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="text-xs text-slate-500 mt-1">2位數字，用於生成員工登入名稱（例如：01, 02）</p>
            </div>
          </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">英文名稱</label>
                  <input
                    type="text"
                    value={formData.name_en}
                    onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">統一編號</label>
                  <input
                    type="text"
                    value={formData.tax_id}
                    onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">登記字號</label>
              <input
                type="text"
                value={formData.registration_number}
                onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">公司類型</label>
              <select
                value={formData.company_type}
                onChange={(e) => setFormData({ ...formData, company_type: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">請選擇</option>
                <option value="有限公司">有限公司</option>
                <option value="股份有限公司">股份有限公司</option>
                <option value="無限公司">無限公司</option>
                <option value="兩合公司">兩合公司</option>
                <option value="其他">其他</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">聯絡人</label>
              <input
                type="text"
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">電話</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">電子郵件</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">地址</label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">備註</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
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
          >
            儲存
          </button>
        </div>
      </div>
    </div>
  )
}

// 部門管理模態框組件
function DepartmentModal({ company, departments, editingDepartment, deptFormData, setDeptFormData, onClose, onSave, onEdit, onDelete, onNew }: any) {
  type DepartmentTreeNode = Department & { children?: DepartmentTreeNode[] }

  const renderDeptTree = (depts: DepartmentTreeNode[], level = 0) => {
    if (!depts || depts.length === 0) return null
    
    return depts.map(dept => (
      <div key={dept.id} className={level > 0 ? 'ml-6 mt-1' : 'mt-1'}>
        <div className={`flex items-center justify-between p-2 rounded ${level === 0 ? 'bg-blue-50' : 'bg-slate-50'}`}>
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            {level > 0 && <ChevronRight className="w-4 h-4 text-slate-400" />}
            <span className="font-medium text-slate-800">{dept.name}</span>
            <span className="text-xs text-slate-500">({dept.code})</span>
            <span className="text-xs text-slate-400">層級 {dept.level}</span>
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0">
            <button
              onClick={() => onEdit(dept)}
              className="p-1 text-blue-600 hover:bg-blue-100 rounded"
              title="編輯"
            >
              <Edit className="w-3 h-3" />
            </button>
            <button
              onClick={() => onDelete(dept.id)}
              className="p-1 text-red-600 hover:bg-red-100 rounded"
              title="刪除"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
        {dept.children && dept.children.length > 0 && (
          <div className="ml-2">
            {renderDeptTree(dept.children, level + 1)}
          </div>
        )}
      </div>
    ))
  }

  const buildDeptTree = (depts: Department[]): DepartmentTreeNode[] => {
    const deptMap = new Map(depts.map(d => [d.id, { ...d, children: [] as DepartmentTreeNode[] }]))
    const roots: DepartmentTreeNode[] = []

    depts.forEach(dept => {
      const node = deptMap.get(dept.id)!
      if (dept.parent_department_id && deptMap.has(dept.parent_department_id)) {
        const parent = deptMap.get(dept.parent_department_id)!
        parent.children.push(node)
      } else {
        roots.push(node)
      }
    })

    return roots
  }

  const deptTree = buildDeptTree(departments)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-800">
            {company.name} - 部門管理
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* 部門列表 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-slate-800">部門列表</h3>
              <button
                onClick={onNew}
                className="btn btn-primary text-sm flex items-center space-x-1"
              >
                <Plus className="w-4 h-4" />
                <span>新增部門</span>
              </button>
            </div>
            <div className="border border-slate-200 rounded-lg p-4 max-h-96 overflow-y-auto">
              {departments.length === 0 ? (
                <p className="text-slate-400 text-center py-8">尚無部門資料</p>
              ) : (
                <div className="space-y-1">
                  {renderDeptTree(deptTree)}
                </div>
              )}
            </div>
          </div>

          {/* 部門表單 */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-3">
              {editingDepartment ? '編輯部門' : '新增部門'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">部門代碼 *</label>
                <input
                  type="text"
                  value={deptFormData.code}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 1) // 只允許一個英文字母或數字
                    setDeptFormData({ ...deptFormData, code: value })
                  }}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="例如：I, F, A"
                  maxLength={1}
                  required
                />
                <p className="text-xs text-slate-500 mt-1">只能輸入一個英文字母或一個數字</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">部門名稱 *</label>
                <input
                  type="text"
                  value={deptFormData.name}
                  onChange={(e) => setDeptFormData({ ...deptFormData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">英文名稱</label>
                <input
                  type="text"
                  value={deptFormData.name_en}
                  onChange={(e) => setDeptFormData({ ...deptFormData, name_en: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">上級部門</label>
                <select
                  value={deptFormData.parent_department_id}
                  onChange={(e) => setDeptFormData({ ...deptFormData, parent_department_id: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">無（頂層部門）</option>
                  {departments
                    .filter((d: Department) => {
                      // 過濾掉自己（編輯時）
                      if (editingDepartment && d.id === editingDepartment.id) return false
                      // 過濾掉層級已達3層的部門（不能再有下層）
                      if (d.level >= 3) return false
                      return true
                    })
                    .map((dept: Department) => (
                      <option key={dept.id} value={dept.id}>
                        {'  '.repeat(dept.level - 1)}{dept.name} ({dept.code}) - 層級 {dept.level}
                      </option>
                    ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">最多只能有3層部門結構</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">顯示順序</label>
                <input
                  type="number"
                  value={deptFormData.display_order}
                  onChange={(e) => setDeptFormData({ ...deptFormData, display_order: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">部門描述</label>
                <textarea
                  value={deptFormData.description}
                  onChange={(e) => setDeptFormData({ ...deptFormData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="dept_is_active"
                  checked={deptFormData.is_active}
                  onChange={(e) => setDeptFormData({ ...deptFormData, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="dept_is_active" className="text-sm text-slate-700">
                  啟用
                </label>
              </div>
              <div className="flex items-center justify-end space-x-3 mt-4">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800"
                >
                  關閉
                </button>
                <button
                  onClick={onSave}
                  className="btn btn-primary"
                >
                  儲存
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// 組織圖表模態框組件
function OrgChartModal({ company, departments, positions, employees, editingPosition, positionFormData, setPositionFormData, onClose, onSave, onEdit, onDelete, onNew }: any) {
  type PositionTreeNode = OrganizationPosition & { children?: PositionTreeNode[] }

  const renderPositionTree = (positions: PositionTreeNode[], level = 0) => {
    if (!positions || positions.length === 0) return null
    
    return positions.map(pos => (
      <div key={pos.id} className={level > 0 ? 'ml-6 mt-1' : 'mt-1'}>
        <div className={`flex items-center justify-between p-2 rounded ${level === 0 ? 'bg-purple-50' : 'bg-slate-50'}`}>
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            {level > 0 && <ChevronRight className="w-4 h-4 text-slate-400" />}
            <span className="font-medium text-slate-800">{pos.position_name}</span>
            <span className="text-xs text-slate-500">({pos.position_code})</span>
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0">
            <button
              onClick={() => onEdit(pos)}
              className="p-1 text-blue-600 hover:bg-blue-100 rounded"
              title="編輯"
            >
              <Edit className="w-3 h-3" />
            </button>
            <button
              onClick={() => onDelete(pos.id)}
              className="p-1 text-red-600 hover:bg-red-100 rounded"
              title="刪除"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
        {pos.children && pos.children.length > 0 && (
          <div className="ml-2">
            {renderPositionTree(pos.children, level + 1)}
          </div>
        )}
      </div>
    ))
  }

  const buildPositionTree = (positions: OrganizationPosition[]): PositionTreeNode[] => {
    const posMap = new Map(positions.map(p => [p.id, { ...p, children: [] as PositionTreeNode[] }]))
    const roots: PositionTreeNode[] = []

    positions.forEach(pos => {
      const node = posMap.get(pos.id)!
      if (pos.parent_position_id && posMap.has(pos.parent_position_id)) {
        const parent = posMap.get(pos.parent_position_id)!
        parent.children.push(node)
      } else {
        roots.push(node)
      }
    })

    return roots
  }

  const positionTree = buildPositionTree(positions)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-800">
            {company.name} - 組織圖表
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* 職位列表 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-slate-800">職位列表</h3>
              <button
                onClick={onNew}
                className="btn btn-primary text-sm flex items-center space-x-1"
              >
                <Plus className="w-4 h-4" />
                <span>新增職位</span>
              </button>
            </div>
            <div className="border border-slate-200 rounded-lg p-4 max-h-96 overflow-y-auto">
              {positions.length === 0 ? (
                <p className="text-slate-400 text-center py-8">尚無職位資料</p>
              ) : (
                <div className="space-y-1">
                  {renderPositionTree(positionTree)}
                </div>
              )}
            </div>
          </div>

          {/* 職位表單 */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-3">
              {editingPosition ? '編輯職位' : '新增職位'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">職位代碼 *</label>
                <input
                  type="text"
                  value={positionFormData.position_code}
                  onChange={(e) => setPositionFormData({ ...positionFormData, position_code: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">職位名稱 *</label>
                <input
                  type="text"
                  value={positionFormData.position_name}
                  onChange={(e) => setPositionFormData({ ...positionFormData, position_name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">英文名稱</label>
                <input
                  type="text"
                  value={positionFormData.position_name_en}
                  onChange={(e) => setPositionFormData({ ...positionFormData, position_name_en: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">所屬部門</label>
                <select
                  value={positionFormData.department_id}
                  onChange={(e) => setPositionFormData({ ...positionFormData, department_id: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">請選擇</option>
                  {departments.map((dept: Department) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name} ({dept.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">在職員工</label>
                <select
                  value={positionFormData.employee_id}
                  onChange={(e) => setPositionFormData({ ...positionFormData, employee_id: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">請選擇</option>
                  {employees.map((emp: ExtendedUserProfile) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">顯示順序</label>
                <input
                  type="number"
                  value={positionFormData.display_order}
                  onChange={(e) => setPositionFormData({ ...positionFormData, display_order: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">職位描述</label>
                <textarea
                  value={positionFormData.job_description}
                  onChange={(e) => setPositionFormData({ ...positionFormData, job_description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="pos_is_active"
                  checked={positionFormData.is_active}
                  onChange={(e) => setPositionFormData({ ...positionFormData, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="pos_is_active" className="text-sm text-slate-700">
                  啟用
                </label>
              </div>
              <div className="flex items-center justify-end space-x-3 mt-4">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800"
                >
                  關閉
                </button>
                <button
                  onClick={onSave}
                  className="btn btn-primary"
                >
                  儲存
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
