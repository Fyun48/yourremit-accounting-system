import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

export async function GET() {
  try {
    // 1. 查詢所有管理員角色的用戶
    const { data: roles, error: roleError } = await supabase
      .from('user_roles')
      .select('id, name')
      .eq('name', '系統管理員')
      .single()

    if (roleError && roleError.code !== 'PGRST116') {
      return NextResponse.json({ 
        error: '查詢角色失敗', 
        details: roleError.message 
      }, { status: 500 })
    }

    const adminRoleId = roles?.id

    // 查詢管理員用戶
    let query = supabase
      .from('user_profiles')
      .select(`
        id,
        login_name,
        email,
        full_name,
        employee_id,
        is_active,
        is_resigned,
        created_at,
        updated_at,
        role_id,
        user_roles:role_id (
          name
        )
      `)

    if (adminRoleId) {
      query = query.or(`role_id.eq.${adminRoleId},login_name.eq.a000001,email.eq.jimmy@your-remit.com`)
    } else {
      query = query.or('login_name.eq.a000001,email.eq.jimmy@your-remit.com')
    }

    const { data: adminUsers, error: adminError } = await query

    if (adminError) {
      return NextResponse.json({ 
        error: '查詢管理員帳號失敗', 
        details: adminError.message 
      }, { status: 500 })
    }

    // 過濾並格式化結果
    const formattedAdmins = (adminUsers || []).map(user => {
      const loginName = user.login_name || ''
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

      return {
        id: user.id,
        登入名稱: user.login_name || '未設定',
        電子郵件: user.email || '未設定',
        姓名: user.full_name || '未設定',
        員工編號: user.employee_id || '未設定',
        角色: (user.user_roles as any)?.name || '未設定',
        是否啟用: user.is_active ? '是' : '否',
        是否離職: user.is_resigned ? '是' : '否',
        格式檢查: formatCheck,
        建立時間: user.created_at ? new Date(user.created_at).toLocaleString('zh-TW') : '未設定',
        更新時間: user.updated_at ? new Date(user.updated_at).toLocaleString('zh-TW') : '未設定'
      }
    })

    return NextResponse.json({
      success: true,
      message: '查詢成功',
      data: {
        管理員帳號: formattedAdmins,
        總數: formattedAdmins.length,
        注意事項: {
          密碼: '密碼無法直接查詢（儲存在 Supabase Auth 中，已加密）',
          預設密碼: 'Admin@1234',
          重置密碼: '如需重置密碼，請在 Supabase Dashboard > Authentication > Users 中操作'
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
