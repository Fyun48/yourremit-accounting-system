import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// 測試郵件發送功能的 API
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { test_email } = body

    if (!test_email) {
      return NextResponse.json(
        { error: '請提供測試 email 地址' },
        { status: 400 }
      )
    }

    const loginUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const testLoginName = 'TEST001'
    const testPassword = 'Test1234'

    // 測試郵件內容
    const emailContent = `
這是一封測試郵件，用於驗證郵件發送功能是否正常運作。

登入網址：${loginUrl}
測試登入名稱：${testLoginName}
測試密碼：${testPassword}

如果您收到這封郵件，表示郵件發送功能運作正常。

此為系統測試郵件，請勿回覆。
    `.trim()

    // 嘗試發送測試郵件
    // 注意：這需要配置 Supabase SMTP 或使用 Edge Functions
    try {
      // 方法1：使用 Supabase Edge Functions（如果已創建）
      // const { data, error } = await supabaseAdmin.functions.invoke('send-email', {
      //   body: {
      //     to: test_email,
      //     subject: '郵件發送功能測試',
      //     content: emailContent
      //   }
      // })

      // 方法2：使用 Supabase 的郵件功能（需要配置 SMTP）
      // 目前 Supabase 的 Auth API 主要用於認證流程，不適合發送自定義郵件
      // 建議使用 Edge Functions 或第三方郵件服務

      return NextResponse.json({
        success: true,
        message: '測試郵件已準備',
        note: '實際發送需要配置 Supabase Edge Functions 或第三方郵件服務',
        email_content: emailContent,
        recipient: test_email,
        instructions: [
          '1. 確認 Supabase SMTP 已配置',
          '2. 創建 Edge Function 來發送郵件',
          '3. 或使用第三方郵件服務（如 Resend、SendGrid）',
          '4. 修改 app/api/send-credentials/route.ts 來實際發送郵件'
        ]
      })
    } catch (error: any) {
      return NextResponse.json({
        success: false,
        error: error.message || '郵件發送功能需要配置',
        email_content: emailContent,
        recipient: test_email
      })
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '測試失敗' },
      { status: 500 }
    )
  }
}
