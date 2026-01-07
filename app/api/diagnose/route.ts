import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    checks: [],
    errors: [],
    warnings: []
  }

  // 檢查 1: 環境變數
  const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
  const hasAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY

  diagnostics.checks.push({
    name: '環境變數檢查',
    status: hasSupabaseUrl && hasAnonKey && hasServiceKey ? 'pass' : 'fail',
    details: {
      NEXT_PUBLIC_SUPABASE_URL: hasSupabaseUrl ? '已設定' : '未設定',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: hasAnonKey ? '已設定' : '未設定',
      SUPABASE_SERVICE_ROLE_KEY: hasServiceKey ? '已設定' : '未設定'
    }
  })

  if (!hasSupabaseUrl || !hasAnonKey || !hasServiceKey) {
    diagnostics.errors.push('缺少必要的環境變數')
  }

  // 檢查 2: Supabase 連接
  if (hasSupabaseUrl && hasServiceKey) {
    try {
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

      // 檢查資料庫連接
      const { data, error } = await supabaseAdmin
        .from('user_profiles')
        .select('id')
        .limit(1)

      diagnostics.checks.push({
        name: '資料庫連接',
        status: error ? 'fail' : 'pass',
        details: error ? { error: error.message, code: error.code } : { connected: true }
      })

      if (error) {
        diagnostics.errors.push(`資料庫連接失敗: ${error.message}`)
      }

      // 檢查 3: must_change_password 欄位
      const { data: columnCheck, error: columnError } = await supabaseAdmin
        .from('user_profiles')
        .select('must_change_password')
        .limit(1)

      if (columnError && (columnError.code === '42703' || columnError.message?.includes('must_change_password'))) {
        diagnostics.checks.push({
          name: 'must_change_password 欄位',
          status: 'fail',
          details: { error: '欄位不存在，請執行 sqlbak/add-must-change-password.sql' }
        })
        diagnostics.errors.push('must_change_password 欄位不存在')
      } else {
        diagnostics.checks.push({
          name: 'must_change_password 欄位',
          status: 'pass',
          details: { exists: true }
        })
      }
    } catch (error: any) {
      diagnostics.checks.push({
        name: 'Supabase 初始化',
        status: 'fail',
        details: { error: error.message }
      })
      diagnostics.errors.push(`Supabase 初始化失敗: ${error.message}`)
    }
  }

  return NextResponse.json(diagnostics, {
    status: diagnostics.errors.length > 0 ? 500 : 200
  })
}
