'use client'

import { useEffect, useState } from 'react'
import supabase from '@/lib/supabase'
import { Clock, Calendar, Settings, Plus, CheckCircle, XCircle, MapPin } from 'lucide-react'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { AttendanceRecord, WorkScheduleConfig, EmployeeWorkSchedule } from '@/types'

export default function AttendancePage() {
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null)
  const [scheduleConfigs, setScheduleConfigs] = useState<WorkScheduleConfig[]>([])
  const [userSchedule, setUserSchedule] = useState<EmployeeWorkSchedule | null>(null)
  const [loading, setLoading] = useState(true)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    loadData()
    checkAdminPermission()
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const checkAdminPermission = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*, role:user_roles(*)')
        .eq('id', user.id)
        .single()

      if (profile?.role?.name === '系統管理員' || profile?.role?.name === '財務經理') {
        setIsAdmin(true)
      }
    } catch (error) {
      console.error('Error checking admin permission:', error)
    }
  }

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const today = format(new Date(), 'yyyy-MM-dd')

      // 載入今日打卡記錄
      const { data: record } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('user_id', user.id)
        .eq('record_date', today)
        .single()

      // 載入工作時間設定
      const { data: configs } = await supabase
        .from('work_schedule_configs')
        .select('*')
        .eq('is_active', true)
        .order('is_default', { ascending: false })

      // 載入用戶工作時間設定
      const { data: schedule } = await supabase
        .from('employee_work_schedules')
        .select('*, schedule_config:work_schedule_configs(*)')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .gte('effective_date', today)
        .order('effective_date', { ascending: false })
        .limit(1)
        .single()

      setTodayRecord(record || null)
      setScheduleConfigs(configs || [])
      setUserSchedule(schedule || null)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateLateDeduction = async (userId: string, lateMinutes: number): Promise<{ amount: number, ruleId?: string }> => {
    if (lateMinutes <= 0) return { amount: 0 }

    try {
      // 獲取員工的遲到扣款規則
      const { data: employeeRule } = await supabase
        .from('employee_late_deduction_rules')
        .select('*, rule:late_deduction_rules(*, items:late_deduction_rule_items(*))')
        .eq('user_id', userId)
        .eq('is_active', true)
        .gte('effective_date', format(new Date(), 'yyyy-MM-dd'))
        .order('effective_date', { ascending: false })
        .limit(1)
        .single()

      if (!employeeRule?.rule) return { amount: 0 }

      const rule = employeeRule.rule
      let deductionAmount = 0

      // 根據規則類型計算扣款
      if (rule.rule_type === '固定金額' && rule.items && rule.items.length > 0) {
        const item = rule.items[0]
        if (item.deduction_amount) {
          deductionAmount = lateMinutes * item.deduction_amount
          if (item.max_deduction_amount) {
            deductionAmount = Math.min(deductionAmount, item.max_deduction_amount)
          }
        }
      } else if (rule.rule_type === '比例扣款' && rule.items && rule.items.length > 0) {
        // 需要獲取員工日薪來計算
        const { data: salaryStructure } = await supabase
          .from('employee_salary_structures')
          .select('base_salary')
          .eq('user_id', userId)
          .eq('is_active', true)
          .order('effective_date', { ascending: false })
          .limit(1)
          .single()

        if (salaryStructure) {
          const dailySalary = salaryStructure.base_salary / 30 // 假設月薪/30為日薪
          const item = rule.items[0]
          if (item.deduction_amount) {
            deductionAmount = dailySalary * item.deduction_amount * lateMinutes
            if (item.max_deduction_amount) {
              deductionAmount = Math.min(deductionAmount, item.max_deduction_amount)
            }
          }
        }
      } else if (rule.rule_type === '階梯式扣款' && rule.items && rule.items.length > 0) {
        // 找到符合的階梯
        const matchingItem = rule.items.find((item: any) => {
          return lateMinutes >= item.min_minutes &&
                 (!item.max_minutes || lateMinutes <= item.max_minutes)
        })
        if (matchingItem && matchingItem.deduction_amount) {
          deductionAmount = matchingItem.deduction_amount
        }
      }

      return { amount: Math.round(deductionAmount * 100) / 100, ruleId: rule.id }
    } catch (error) {
      console.error('Error calculating late deduction:', error)
      return { amount: 0 }
    }
  }

  const handleClockIn = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 檢查是否需要打卡
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('requires_attendance')
        .eq('id', user.id)
        .single()

      if (profile && !profile.requires_attendance) {
        alert('您不需要打卡')
        return
      }

      const today = format(new Date(), 'yyyy-MM-dd')
      const now = new Date()

      // 獲取工作時間設定
      const schedule = userSchedule?.schedule_config || scheduleConfigs.find(c => c.is_default)
      const startTime = schedule?.start_time || '09:00:00'
      const [startHour, startMinute] = startTime.split(':').map(Number)

      // 計算是否遲到
      const scheduleStart = new Date(now)
      scheduleStart.setHours(startHour, startMinute, 0, 0)
      const lateMinutes = now > scheduleStart ? Math.floor((now.getTime() - scheduleStart.getTime()) / 60000) : 0

      // 計算遲到扣款
      const deduction = await calculateLateDeduction(user.id, lateMinutes)

      const { error } = await supabase
        .from('attendance_records')
        .upsert({
          user_id: user.id,
          record_date: today,
          clock_in_time: now.toISOString(),
          status: lateMinutes > 0 ? '遲到' : '正常',
          late_minutes: lateMinutes,
          late_deduction_amount: deduction.amount,
          late_deduction_rule_id: deduction.ruleId || null,
        }, {
          onConflict: 'user_id,record_date'
        })

      if (error) throw error

      if (lateMinutes > 0 && deduction.amount > 0) {
        alert(`您遲到了 ${lateMinutes} 分鐘，扣款金額：${deduction.amount} 元`)
      }

      loadData()
    } catch (error) {
      console.error('Error clocking in:', error)
      alert('打卡失敗，請重試')
    }
  }

  const handleClockOut = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      if (!todayRecord?.clock_in_time) {
        alert('請先完成上班打卡')
        return
      }

      const today = format(new Date(), 'yyyy-MM-dd')
      const now = new Date()
      const clockIn = new Date(todayRecord.clock_in_time)

      // 獲取工作時間設定
      const schedule = userSchedule?.schedule_config || scheduleConfigs.find(c => c.is_default)
      const endTime = schedule?.end_time || '18:00:00'
      const [endHour, endMinute] = endTime.split(':').map(Number)

      // 計算工作時數
      const workMs = now.getTime() - clockIn.getTime()
      const workHours = workMs / (1000 * 60 * 60)

      // 計算是否早退
      const scheduleEnd = new Date(now)
      scheduleEnd.setHours(endHour, endMinute, 0, 0)
      const earlyLeaveMinutes = now < scheduleEnd ? Math.floor((scheduleEnd.getTime() - now.getTime()) / 60000) : 0

      // 計算加班時數（超過標準工作時間的部分）
      const standardHours = 8 // 標準工作時數
      const overtimeHours = workHours > standardHours ? workHours - standardHours : 0

      let status = todayRecord.status
      if (earlyLeaveMinutes > 0 && status === '正常') {
        status = '早退'
      }

      const { error } = await supabase
        .from('attendance_records')
        .update({
          clock_out_time: now.toISOString(),
          work_hours: Math.round(workHours * 100) / 100,
          overtime_hours: Math.round(overtimeHours * 100) / 100,
          early_leave_minutes: earlyLeaveMinutes,
          status,
        })
        .eq('id', todayRecord.id)

      if (error) throw error

      loadData()
    } catch (error) {
      console.error('Error clocking out:', error)
      alert('下班打卡失敗，請重試')
    }
  }

  const getCurrentSchedule = () => {
    return userSchedule?.schedule_config || scheduleConfigs.find(c => c.is_default)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const schedule = getCurrentSchedule()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">打卡管理</h1>
          <p className="text-slate-600 mt-1">員工打卡與出勤記錄</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowScheduleModal(true)}
            className="btn btn-secondary flex items-center space-x-2"
          >
            <Settings className="w-5 h-5" />
            <span>工作時間設定</span>
          </button>
        )}
      </div>

      {/* 打卡卡片 */}
      <div className="card">
        <div className="text-center">
          <div className="mb-6">
            <p className="text-sm text-slate-500 mb-2">今天是</p>
            <p className="text-2xl font-bold text-slate-800">
              {format(new Date(), 'yyyy年MM月dd日 EEEE', { locale: zhTW })}
            </p>
            <p className="text-3xl font-bold text-blue-600 mt-2">
              {format(currentTime, 'HH:mm:ss')}
            </p>
          </div>

          {schedule && (
            <div className="mb-6 p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600 mb-2">工作時間</p>
              <div className="flex items-center justify-center space-x-4 text-lg">
                <span className="font-medium">上班: {schedule.start_time}</span>
                {schedule.lunch_start_time && schedule.lunch_end_time && (
                  <span className="text-slate-400">|</span>
                )}
                {schedule.lunch_start_time && schedule.lunch_end_time && (
                  <span className="font-medium">
                    午休: {schedule.lunch_start_time} - {schedule.lunch_end_time}
                  </span>
                )}
                <span className="text-slate-400">|</span>
                <span className="font-medium">下班: {schedule.end_time}</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-center space-x-4">
            {!todayRecord?.clock_in_time ? (
              <button
                onClick={handleClockIn}
                className="btn btn-primary flex items-center space-x-2 px-8 py-4 text-lg"
              >
                <CheckCircle className="w-6 h-6" />
                <span>上班打卡</span>
              </button>
            ) : (
              <div className="flex items-center space-x-2 px-6 py-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-green-800 font-medium">
                  已打卡: {format(new Date(todayRecord.clock_in_time), 'HH:mm')}
                </span>
                {todayRecord.late_minutes > 0 && (
                  <span className="text-red-600 text-sm">
                    (遲到 {todayRecord.late_minutes} 分鐘)
                  </span>
                )}
              </div>
            )}

            {todayRecord?.clock_in_time && !todayRecord?.clock_out_time && (
              <button
                onClick={handleClockOut}
                className="btn btn-secondary flex items-center space-x-2 px-8 py-4 text-lg"
              >
                <XCircle className="w-6 h-6" />
                <span>下班打卡</span>
              </button>
            )}

            {todayRecord?.clock_out_time && (
              <div className="flex items-center space-x-2 px-6 py-3 bg-blue-50 border border-blue-200 rounded-lg">
                <XCircle className="w-5 h-5 text-blue-600" />
                <span className="text-blue-800 font-medium">
                  已下班: {format(new Date(todayRecord.clock_out_time), 'HH:mm')}
                </span>
              </div>
            )}
          </div>

          {todayRecord && (
            <div className="mt-6 p-4 bg-slate-50 rounded-lg">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-sm text-slate-500">工作時數</p>
                  <p className="text-xl font-bold text-slate-800">
                    {todayRecord.work_hours.toFixed(1)} 小時
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">加班時數</p>
                  <p className="text-xl font-bold text-orange-600">
                    {todayRecord.overtime_hours.toFixed(1)} 小時
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">狀態</p>
                  <p className="text-xl font-bold text-slate-800">{todayRecord.status}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">出勤日期</p>
                  <p className="text-xl font-bold text-slate-800">
                    {format(new Date(todayRecord.record_date), 'MM/dd')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 工作時間設定模態框（管理員） */}
      {showScheduleModal && isAdmin && (
        <ScheduleConfigModal
          configs={scheduleConfigs}
          onClose={() => setShowScheduleModal(false)}
          onSave={loadData}
        />
      )}
    </div>
  )
}

// 工作時間設定模態框組件
function ScheduleConfigModal({ configs, onClose, onSave }: {
  configs: WorkScheduleConfig[]
  onClose: () => void
  onSave: () => void
}) {
  const [name, setName] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [lunchStartTime, setLunchStartTime] = useState('12:00')
  const [lunchEndTime, setLunchEndTime] = useState('13:00')
  const [endTime, setEndTime] = useState('18:00')
  const [isDefault, setIsDefault] = useState(false)

  const handleSave = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('work_schedule_configs')
        .insert({
          name,
          start_time: `${startTime}:00`,
          lunch_start_time: `${lunchStartTime}:00`,
          lunch_end_time: `${lunchEndTime}:00`,
          end_time: `${endTime}:00`,
          is_default: isDefault,
          created_by: user.id,
        })

      if (error) throw error

      onSave()
      onClose()
    } catch (error) {
      console.error('Error saving schedule config:', error)
      alert('儲存失敗，請重試')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-slate-800 mb-4">新增工作時間設定</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">名稱</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：標準工作時間"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">上班時間</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">午休開始</label>
              <input
                type="time"
                value={lunchStartTime}
                onChange={(e) => setLunchStartTime(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">午休結束</label>
              <input
                type="time"
                value={lunchEndTime}
                onChange={(e) => setLunchEndTime(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">下班時間</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isDefault"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="isDefault" className="text-sm text-slate-700">
              設為預設
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:text-slate-800"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="btn btn-primary"
            disabled={!name}
          >
            儲存
          </button>
        </div>
      </div>
    </div>
  )
}
