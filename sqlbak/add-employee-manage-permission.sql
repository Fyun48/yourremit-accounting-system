-- 添加「員工資料管理」功能權限
-- 請在 Supabase SQL Editor 中執行此腳本

-- 插入員工資料管理功能權限
INSERT INTO feature_permissions (feature_code, feature_name, description) VALUES
  ('employee_manage', '員工資料管理', '新增、編輯、管理員工完整個人資料')
ON CONFLICT (feature_code) DO NOTHING;

-- 驗證
SELECT * FROM feature_permissions WHERE feature_code = 'employee_manage';
