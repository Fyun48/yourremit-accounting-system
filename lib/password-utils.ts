// 密碼相關工具函數

/**
 * 生成隨機8位元密碼
 * - 必須包含：至少1個大寫、1個小寫、1個數字、1個允許的符號
 * - 不可使用：底線(_)、斜線(/)、反斜線(\\)、開根號(√)
 */
export function generateRandomPassword(): string {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lower = 'abcdefghijklmnopqrstuvwxyz'
  const digits = '0123456789'
  // 允許的符號（排除底線、斜線、反斜線、開根號）
  const symbols = '!@#$%^&*()+-=[]{}|;:\'",.<>?'

  // 先確保各類型至少一個
  let password = ''
  password += upper.charAt(Math.floor(Math.random() * upper.length))
  password += lower.charAt(Math.floor(Math.random() * lower.length))
  password += digits.charAt(Math.floor(Math.random() * digits.length))
  password += symbols.charAt(Math.floor(Math.random() * symbols.length))

  const allChars = upper + lower + digits + symbols

  // 填充剩餘位數（總長度 8）
  while (password.length < 8) {
    password += allChars.charAt(Math.floor(Math.random() * allChars.length))
  }

  // 打亂順序
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

/**
 * 驗證新密碼規則
 * 規則：8-20位元，必須包含至少1個符號、1個大寫、1個小寫，不可使用底線、斜線、反斜線、開根號字符
 */
export function validateNewPassword(password: string): { valid: boolean; message: string } {
  if (password.length < 8) {
    return { valid: false, message: '密碼至少需要8位數' }
  }
  
  if (password.length > 20) {
    return { valid: false, message: '密碼最多20位數' }
  }
  
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: '密碼必須包含至少1個大寫字母' }
  }
  
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: '密碼必須包含至少1個小寫字母' }
  }
  
  // 允許的符號（排除底線、斜線、反斜線、開根號）
  // 符號：!@#$%^&*()+-=[]{}|;:'",.<>?
  const allowedSymbols = /[!@#$%^&*()+\-=\[\]{}|;:'",.<>?]/
  if (!allowedSymbols.test(password)) {
    return { valid: false, message: '密碼必須包含至少1個符號（不可使用底線、斜線、反斜線、開根號）' }
  }
  
  // 檢查是否包含禁止的字符
  if (/[_\/\\√]/.test(password)) {
    return { valid: false, message: '密碼不可包含底線(_)、斜線(/)、反斜線(\\)或開根號(√)字符' }
  }
  
  return { valid: true, message: '' }
}
