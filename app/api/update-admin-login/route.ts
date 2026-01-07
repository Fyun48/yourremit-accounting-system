import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

export async function POST() {
  try {
    // 查找管理員帳號
    const { data: adminUser, error: findError } = await supabase
      .from('user_profiles')
      .select('id, login_name, email')
      .or('login_name.eq.a000001,email.eq.jimmy@your-remit.com')
      .single()

    if (findError || !adminUser) {
      return NextResponse.json({ 
        error: '找不到管理員帳號',
        details: findError?.message 
      }, { status: 404 })
    }

    // 更新登入名稱和員工編號
    const { data: updatedUser, error: updateError } = await supabase
      .from('user_profiles')
      .update({
        login_name: 'UUA01001',
        employee_id: 'UUA01001',
        updated_at: new Date().toISOString()
      })
      .eq('id', adminUser.id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ 
        error: '更新失敗',
        details: updateError.message 
      }, { status: 500 })
    }

    // 驗證更新結果
    const loginName = updatedUser.login_name || ''
    let formatCheck = ''
    
    if (!loginName) {
      formatCheck = '✗ 未設定登入名稱'
    } else if (loginName.length !== 8) {
      formatCheck = `✗ 登入名稱長度錯誤（目前：${loginName.length}位，應為8位）`
    } else if (!/^[A-Z]{3}[0-9]{2}[0-9]{3}$/.test(loginName)) {
      formatCheck = '✗ 登入名稱格式不符合規則（應為：3位部門代碼 + 2位公司代號 + 3位員工編號）'
    } else {
      formatCheck = '✓ 登入名稱格式正確'
    }

    return NextResponse.json({
      success: true,
      message: '更新成功',
      data: {
        舊登入名稱: adminUser.login_name,
        新登入名稱: 'UUA01001',
        員工編號: 'UUA01001',
        電子郵件: updatedUser.email,
        格式檢查: formatCheck,
        登入資訊: {
          登入名稱: 'UUA01001',
          密碼: 'Admin@1234（如果沒有修改過）',
          電子郵件: updatedUser.email
        }
      }
    })

  } catch (error: any) {
    return NextResponse.json({ 
      error: '執行錯誤', 
      details: error.message 
    }, { status: 500 })
  }
}
