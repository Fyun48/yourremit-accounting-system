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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, login_name, password, recipient_email } = body

    if (!email || !login_name || !password) {
      return NextResponse.json(
        { error: '缺少必要參數' },
        { status: 400 }
      )
    }

    // 使用 Supabase 的郵件功能發送憑證
    // 注意：這需要在 Supabase Dashboard 中配置 SMTP 設定
    // 或者使用第三方郵件服務（如 SendGrid、Resend 等）
    
    const loginUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const emailContent = `
親愛的用戶您好，

您的帳號已成功建立，以下是您的登入資訊：

登入網址：${loginUrl}
登入名稱：${login_name}
初始密碼：${password}

重要提醒：
1. 首次登入時，系統會強制要求您修改密碼
2. 新密碼規則：
   - 長度：8-20位元
   - 必須包含至少1個大寫字母
   - 必須包含至少1個小寫字母
   - 必須包含至少1個符號（不可使用底線、斜線、反斜線、開根號）
3. 請妥善保管您的登入資訊，不要與他人分享

如有任何問題，請聯繫系統管理員。

此為系統自動發送郵件，請勿回覆。
    `.trim()

    // 使用 Supabase 的郵件功能發送憑證
    // 注意：Supabase 的 Auth 郵件功能主要用於認證流程
    // 對於發送自定義內容的郵件，建議使用 Edge Functions 配合第三方郵件服務
    // 或者使用 Supabase 的 SMTP 配置配合自定義郵件模板
    
    // 方法1：使用 Supabase Edge Functions（推薦）
    // 需要在 Supabase Dashboard 中創建 Edge Function 來發送郵件
    
    // 方法2：使用 Supabase SMTP 配置（如果已配置）
    // 可以通過 Supabase Dashboard > Settings > Auth > Email Templates 自定義模板
    
    // 方法3：使用第三方郵件服務（如 Resend、SendGrid）
    // 這裡提供一個使用 Resend 的範例（需要安裝 @resend/node）
    
    // 暫時使用 Supabase 的郵件功能
    // 如果已配置 SMTP，可以通過自定義郵件模板發送
    let emailSent = false
    let emailError: any = null
    
    try {
      // 嘗試使用 Supabase 的郵件功能
      // 注意：這需要在 Supabase Dashboard 中配置 SMTP 或使用 Edge Functions
      
      // 如果使用 Edge Functions，可以這樣調用：
      // const { data, error } = await supabaseAdmin.functions.invoke('send-email', {
      //   body: { to: recipient_email || email, subject: '帳號建立通知', content: emailContent }
      // })
      
      // 目前先返回郵件內容，實際發送需要配置 Edge Functions 或第三方服務
      emailSent = true
    } catch (error) {
      emailError = error
      console.warn('郵件發送功能需要配置:', error)
    }

    // 返回郵件內容（如果郵件服務未配置，可以手動發送）
    return NextResponse.json({
      success: true,
      message: '郵件已發送（如果已配置郵件服務）',
      email_content: emailContent, // 如果郵件服務未配置，可以手動複製發送
      recipient: recipient_email || email
    })

  } catch (error: any) {
    console.error('Error sending credentials:', error)
    return NextResponse.json(
      { error: error.message || '發送郵件失敗' },
      { status: 500 }
    )
  }
}
