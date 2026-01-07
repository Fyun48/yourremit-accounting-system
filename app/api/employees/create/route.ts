import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// 使用服務端 Supabase 客戶端（需要 Service Role Key）
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // 需要在環境變數中設定
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: NextRequest) {
  try {
    // 檢查環境變數
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: '伺服器配置錯誤：缺少 Supabase 環境變數' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { email, password, login_name, full_name, company_id, employee_id, id_number, phone, mobile, address, emergency_contact, emergency_phone, bank_name, bank_account, account_holder, hire_date, resignation_date, is_resigned, department_id, position_id, requires_attendance, two_factor_enabled, is_active, must_change_password } = body

    // 驗證必填欄位
    if (!email || !password || !login_name || !full_name) {
      return NextResponse.json(
        { error: '請填寫必填欄位（電子郵件、密碼、登入名稱、姓名）' },
        { status: 400 }
      )
    }

    // 驗證登入名稱格式（8位：部門層級代碼3位 + 公司代號2位 + 員工編號3位）
    if (!/^[A-Z]{3}[0-9]{2}[0-9]{3}$/.test(login_name.toUpperCase()) || login_name.length !== 8) {
      return NextResponse.json(
        { error: '登入名稱格式錯誤，應為8位：部門層級代碼(3位英文字母) + 公司代號(2位數字) + 員工編號(3位數字)，例如：UUI01001' },
        { status: 400 }
      )
    }

    // 驗證密碼強度
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return NextResponse.json(
        { error: '密碼不符合要求（至少8位數，包含大寫、小寫、數字、符號）' },
        { status: 400 }
      )
    }

    // 檢查登入名稱是否已存在
    const { data: existingProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('login_name', login_name)
      .single()

    if (existingProfile) {
      return NextResponse.json(
        { error: '此登入名稱已被使用' },
        { status: 400 }
      )
    }

    // 檢查 email 是否已存在（允許同一 email 用於多個員工帳號）
    // 為了符合 Supabase Auth 對 email 唯一性的要求，
    // 若 email 已存在，會為 Auth 用戶使用唯一的 email（加上登入名稱和時間戳），
    // 但仍然將登入資訊寄送到原始 email。
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers()
    const userExists = existingUser.users.some((u) => u.email === email)

    // 預設使用原始 email，若已存在則使用唯一 email
    let authEmail = email
    if (userExists) {
      const atIndex = email.indexOf('@')
      if (atIndex > 0) {
        const local = email.slice(0, atIndex)
        const domain = email.slice(atIndex + 1) // 移除 @ 符號
        // 使用登入名稱和時間戳生成唯一 email
        // 例如：test@example.com -> test.UUA01001.1234567890@example.com
        const timestamp = Date.now().toString().slice(-10) // 取後10位數字
        authEmail = `${local}.${login_name}.${timestamp}@${domain}`
      } else {
        // 萬一 email 格式不正確，使用登入名稱作為後綴
        authEmail = `${email}.${login_name}@temp.local`
      }
    }

    // 1. 創建 Auth 用戶（使用 authEmail，以符合 Supabase 唯一性要求）
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: authEmail,
      password,
      email_confirm: true, // 自動確認郵件
    })

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || '創建 Auth 用戶失敗' },
        { status: 500 }
      )
    }

    // 2. 創建 user_profiles 記錄
    const profileData: any = {
      id: authData.user.id,
      login_name: login_name.toUpperCase(),
      email: authEmail,
      full_name,
      company_id: company_id || null,
      employee_id: login_name.toUpperCase() || employee_id || null, // 員工編號與登入名稱一致
      id_number: id_number || null,
      phone: phone || null,
      mobile: mobile || null,
      address: address || null,
      emergency_contact: emergency_contact || null,
      emergency_phone: emergency_phone || null,
      bank_name: bank_name || null,
      bank_account: bank_account || null,
      account_holder: account_holder || null,
      hire_date: hire_date || null,
      resignation_date: resignation_date || null,
      is_resigned: is_resigned ?? false,
      department_id: department_id || null,
      position_id: position_id || null,
      requires_attendance: requires_attendance ?? true,
      two_factor_enabled: two_factor_enabled ?? false,
      is_active: is_active ?? true,
    }

    // 嘗試添加 must_change_password 欄位
    // 如果欄位不存在，第一次插入會失敗，我們會捕獲錯誤並重試
    profileData.must_change_password = must_change_password ?? true

    let { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert(profileData)

    // 如果錯誤是因為 must_change_password 欄位不存在，移除該欄位後重試
    if (profileError && (profileError.message?.includes('must_change_password') || profileError.code === '42703')) {
      console.warn('must_change_password 欄位不存在，移除該欄位後重試')
      delete profileData.must_change_password
      
      const retryResult = await supabaseAdmin
        .from('user_profiles')
        .insert(profileData)
      
      profileError = retryResult.error
      
      if (!profileError) {
        // 插入成功，但缺少 must_change_password 欄位
        console.warn('員工創建成功，但 must_change_password 欄位不存在。請執行 sqlbak/add-must-change-password.sql')
      }
    }

    if (profileError) {
      // 如果創建 profile 失敗，嘗試刪除已創建的 auth 用戶
      try {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      } catch (deleteError) {
        console.error('Failed to delete auth user:', deleteError)
      }
      
      // 檢查是否是欄位不存在的錯誤
      if (profileError.message?.includes('must_change_password') || profileError.code === '42703') {
        return NextResponse.json(
          { 
            error: '資料庫欄位缺失：請執行 sqlbak/add-must-change-password.sql 添加 must_change_password 欄位',
            details: profileError.message 
          },
          { status: 500 }
        )
      }
      
      return NextResponse.json(
        { 
          error: '創建員工資料失敗',
          details: profileError.message || profileError.code,
          hint: '請檢查資料庫結構是否正確'
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '員工創建成功',
      user_id: authData.user.id,
    })
  } catch (error: any) {
    console.error('Error creating employee:', error)
    
    // 確保返回 JSON 格式，而不是 HTML 錯誤頁面
    return NextResponse.json(
      { 
        error: error.message || '創建員工失敗',
        type: error.name || 'UnknownError',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
