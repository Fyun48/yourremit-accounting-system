import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// 使用服務端 Supabase 客戶端（需要 Service Role Key）
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // 需要在環境變數中設定
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

export async function POST(request: NextRequest) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: '伺服器配置錯誤：缺少 Supabase 環境變數' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const {
      id,
      login_name,
      email,
      full_name,
      company_id,
      employee_id,
      id_number,
      phone,
      mobile,
      address,
      emergency_contact,
      emergency_phone,
      bank_name,
      bank_account,
      account_holder,
      hire_date,
      resignation_date,
      is_resigned,
      department_id,
      position_id,
      requires_attendance,
      two_factor_enabled,
      is_active,
    } = body

    if (!id) {
      return NextResponse.json(
        { error: '缺少員工 ID，無法更新資料' },
        { status: 400 }
      )
    }

    if (!email || !full_name) {
      return NextResponse.json(
        { error: '請填寫必填欄位（電子郵件、姓名）' },
        { status: 400 }
      )
    }

    // 準備更新資料（只更新允許的欄位）
    const updateData: any = {
      login_name: login_name || null,
      email,
      full_name,
      company_id: company_id || null,
      employee_id: login_name || employee_id || null,
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
      updated_at: new Date().toISOString(),
    }

    const { error: updateError } = await supabaseAdmin
      .from('user_profiles')
      .update(updateData)
      .eq('id', id)

    if (updateError) {
      return NextResponse.json(
        {
          error: '更新員工資料失敗',
          details: updateError.message || updateError.code,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '員工資料更新成功',
    })
  } catch (error: any) {
    console.error('Error updating employee:', error)
    return NextResponse.json(
      {
        error: error.message || '更新員工失敗',
        type: error.name || 'UnknownError',
      },
      { status: 500 }
    )
  }
}

