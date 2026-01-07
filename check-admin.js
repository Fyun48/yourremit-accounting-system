// 檢查系統管理員帳號資訊
// 執行方式：node check-admin.js

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 讀取 .env.local 檔案
function loadEnv() {
  const envPath = path.join(__dirname, '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=:#]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        process.env[key] = value;
      }
    });
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('錯誤：請確認環境變數中有設定：');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  console.error('  - NEXT_PUBLIC_SUPABASE_ANON_KEY 或 SUPABASE_SERVICE_ROLE_KEY');
  console.error('\n目前讀取到的環境變數：');
  console.error(`  NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl || '未設定'}`);
  console.error(`  NEXT_PUBLIC_SUPABASE_ANON_KEY: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '已設定' : '未設定'}`);
  console.error(`  SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '已設定' : '未設定'}`);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAdminAccount() {
  console.log('正在查詢管理員帳號資訊...\n');

  try {
    // 1. 查詢所有管理員角色的用戶
    console.log('=== 1. 管理員角色用戶 ===');
    const { data: adminUsers, error: adminError } = await supabase
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
      .or('login_name.eq.a000001,email.eq.jimmy@your-remit.com');

    if (adminError) {
      console.error('查詢錯誤（嘗試查詢所有用戶）:', adminError.message);
      
      // 嘗試直接查詢 user_profiles
      const { data: allUsers, error: allError } = await supabase
        .from('user_profiles')
        .select('login_name, email, full_name, employee_id, is_active, is_resigned')
        .limit(10);
      
      if (allError) {
        console.error('無法查詢 user_profiles:', allError.message);
        return;
      }
      
      console.log('找到的用戶（前10筆）:');
      console.table(allUsers);
      return;
    }

    // 過濾管理員角色
    const { data: roles } = await supabase
      .from('user_roles')
      .select('id, name')
      .eq('name', '系統管理員');

    const adminRoleId = roles?.[0]?.id;
    const filteredAdmins = adminUsers?.filter(user => 
      user.role_id === adminRoleId || 
      user.login_name === 'a000001' || 
      user.email === 'jimmy@your-remit.com'
    ) || [];

    if (filteredAdmins.length === 0) {
      console.log('未找到管理員帳號');
    } else {
      console.table(filteredAdmins.map(user => ({
        '登入名稱': user.login_name || '未設定',
        '電子郵件': user.email || '未設定',
        '姓名': user.full_name || '未設定',
        '員工編號': user.employee_id || '未設定',
        '角色': user.user_roles?.name || '未設定',
        '是否啟用': user.is_active ? '是' : '否',
        '是否離職': user.is_resigned ? '是' : '否',
        '建立時間': user.created_at ? new Date(user.created_at).toLocaleString('zh-TW') : '未設定'
      })));
    }

    // 2. 檢查登入名稱格式
    console.log('\n=== 2. 登入名稱格式檢查 ===');
    filteredAdmins.forEach(user => {
      const loginName = user.login_name;
      let status = '';
      
      if (!loginName) {
        status = '✗ 未設定登入名稱';
      } else if (loginName.length !== 8) {
        status = `✗ 登入名稱長度錯誤（目前：${loginName.length}位，應為8位）`;
      } else if (!/^[A-Z]{3}[0-9]{2}[0-9]{3}$/.test(loginName)) {
        status = '✗ 登入名稱格式不符合規則（應為：3位部門代碼 + 2位公司代號 + 3位員工編號）';
      } else {
        status = '✓ 登入名稱格式正確';
      }
      
      console.log(`${user.email || user.login_name}: ${status}`);
    });

    // 3. 總結
    console.log('\n=== 3. 管理員帳號資訊總結 ===');
    if (filteredAdmins.length > 0) {
      const admin = filteredAdmins[0];
      console.log(`登入名稱: ${admin.login_name || '未設定'}`);
      console.log(`電子郵件: ${admin.email || '未設定'}`);
      console.log(`姓名: ${admin.full_name || '未設定'}`);
      console.log(`員工編號: ${admin.employee_id || '未設定'}`);
      console.log(`是否啟用: ${admin.is_active ? '是' : '否'}`);
      console.log(`是否離職: ${admin.is_resigned ? '是' : '否'}`);
      console.log('\n注意：密碼無法直接查詢（儲存在 Supabase Auth 中，已加密）');
      console.log('預設密碼通常是：Admin@1234');
      console.log('如需重置密碼，請在 Supabase Dashboard > Authentication > Users 中操作');
    } else {
      console.log('未找到管理員帳號');
      console.log('建議執行 sqlbak/quick-fix-admin.sql 或 sqlbak/fix-admin-account.sql 來創建管理員帳號');
    }

  } catch (error) {
    console.error('執行錯誤:', error.message);
    console.error('\n提示：此腳本需要資料庫讀取權限');
    console.error('如果遇到權限問題，請直接在 Supabase SQL Editor 中執行 check-admin-account.sql');
  }
}

checkAdminAccount();
