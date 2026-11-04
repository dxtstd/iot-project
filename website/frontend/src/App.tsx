import { useEffect, useMemo, useState } from 'react'
import type { ComponentProps } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'

export type SensorReading = {
  _id?: string
  timestamp: string
  temperature: number
  turbidity: number
  ph: number
}

export type NotificationSettings = {
  enabled: boolean
  chatId: string
}

export type DeviceStatus = {
  connected: boolean
  lastSeen: string | null
  ageSeconds: number | null
}

export type FeedingSchedule = {
  _id: string
  time: string
  enabled: boolean
  timezone: 'Asia/Singapore'
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

const sampleReadings: SensorReading[] = [
  { timestamp: '2026-09-07', temperature: 28, turbidity: 20, ph: 7.1 },
  { timestamp: '2026-09-08', temperature: 36, turbidity: 38, ph: 7.8 },
  { timestamp: '2026-09-09', temperature: 31, turbidity: 29, ph: 7.4 },
  { timestamp: '2026-09-10', temperature: 22, turbidity: 20, ph: 7.0 },
  { timestamp: '2026-09-11', temperature: 24, turbidity: 24, ph: 7.1 },
  { timestamp: '2026-09-12', temperature: 34, turbidity: 35, ph: 7.7 },
  { timestamp: '2026-09-13', temperature: 45, turbidity: 44, ph: 8.5 },
]

function LoginRoute({ onLogin }: { onLogin: (username: string, password: string) => Promise<void> }) {
  const navigate = useNavigate()

  async function login(username: string, password: string) {
    await onLogin(username, password)
    navigate('/dashboard', { replace: true })
  }

  return <LoginPage onLogin={login} />
}

function DashboardRoute(props: ComponentProps<typeof DashboardPage>) {
  return <DashboardPage {...props} />
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('iot-token'))
  const [checkingToken, setCheckingToken] = useState(Boolean(token))
  const [readings, setReadings] = useState(sampleReadings)
  const [latestReading, setLatestReading] = useState(sampleReadings[sampleReadings.length - 1])
  const [readingHours, setReadingHours] = useState(168)
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>({ connected: false, lastSeen: null, ageSeconds: null })
  const [notifications, setNotifications] = useState<NotificationSettings>({ enabled: false, chatId: '' })
  const [feedingSchedules, setFeedingSchedules] = useState<FeedingSchedule[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const [saving, setSaving] = useState(false)
  const latest = latestReading

  useEffect(() => {
    if (!token) return
    const load = async () => {
      try {
        const authResponse = await fetch(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
        if (!authResponse.ok) {
          localStorage.removeItem('iot-token')
          setToken(null)
          setCheckingToken(false)
          return
        }

        const settingsResponse = await fetch(`${API_URL}/notifications`, { headers: { Authorization: `Bearer ${token}` } })
        if (settingsResponse.ok) setNotifications(await settingsResponse.json())
        const schedulesResponse = await fetch(`${API_URL}/feeding-schedules`, { headers: { Authorization: `Bearer ${token}` } })
        if (schedulesResponse.ok) setFeedingSchedules(await schedulesResponse.json())
        setCheckingToken(false)
      } catch {
        setCheckingToken(false)
      }
    }
    void load()
  }, [token])

  useEffect(() => {
    if (!token) return
    let active = true
    const refresh = async () => {
      const headers = { Authorization: `Bearer ${token}` }
      const [readingsResponse, currentResponse, statusResponse] = await Promise.all([
        fetch(`${API_URL}/readings/range?hours=${readingHours}`, { headers }),
        fetch(`${API_URL}/readings/current`, { headers }),
        fetch(`${API_URL}/readings/status`, { headers }),
      ])
      if (!readingsResponse.ok || !currentResponse.ok || !statusResponse.ok) throw new Error('Gagal memperbarui data sensor')
      if (active) {
        setReadings(await readingsResponse.json())
        setLatestReading(await currentResponse.json())
        setDeviceStatus(await statusResponse.json())
      }
    }
    void refresh().catch((error: unknown) => console.error(error))
    const interval = window.setInterval(() => {
      void refresh().catch((error: unknown) => console.error(error))
    }, 30000)
    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [token, readingHours])

  const status = useMemo(() => {
    const abnormal = latest.temperature > 35 || latest.turbidity > 40 || latest.ph < 6.5 || latest.ph > 8.5
    return abnormal ? 'Perlu perhatian' : 'Ideal'
  }, [latest])

  async function login(username: string, password: string) {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      if (!response.ok) throw new Error('Username atau password salah')
      const result = await response.json()
      localStorage.setItem('iot-token', result.token)
      setToken(result.token)
      setCheckingToken(false)
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Login gagal', { cause: error })
    }
  }

  async function toggleNotifications() {
    const next = { ...notifications, enabled: !notifications.enabled }
    setNotifications(next)
    if (!token) return
    setSaving(true)
    try {
      await fetch(`${API_URL}/notifications`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(next),
      })
    } finally {
      setSaving(false)
    }

  }

  async function changeTimeRange(hours: number) {
    if (!token) return
    setReadingHours(hours)
    const response = await fetch(`${API_URL}/readings/range?hours=${hours}`, { headers: { Authorization: `Bearer ${token}` } })
    if (!response.ok) throw new Error('Gagal memuat histori sensor')
    setReadings(await response.json())
  }

  async function resetReadings() {
    if (!token) return
    const response = await fetch(`${API_URL}/readings/reset`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok) throw new Error('Gagal mereset data sensor')
    const resetReading = await response.json() as SensorReading
    setReadings([resetReading])
    setLatestReading(resetReading)
  }

  async function addFeedingSchedule(time: string) {
    if (!token) return
    const response = await fetch(`${API_URL}/feeding-schedules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ time, enabled: true }),
    })
    if (!response.ok) throw new Error((await response.json() as { error?: string }).error ?? 'Gagal menambahkan jadwal')
    const created = await response.json() as FeedingSchedule
    setFeedingSchedules((current) => [...current, created].sort((a, b) => a.time.localeCompare(b.time)))
  }

  async function updateFeedingSchedule(schedule: FeedingSchedule) {
    if (!token) return
    const response = await fetch(`${API_URL}/feeding-schedules/${encodeURIComponent(schedule._id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ time: schedule.time, enabled: schedule.enabled }),
    })
    if (!response.ok) throw new Error((await response.json() as { error?: string }).error ?? 'Gagal mengubah jadwal')
    const updated = await response.json() as FeedingSchedule
    setFeedingSchedules((current) => current.map((item) => item._id === updated._id ? updated : item).sort((a, b) => a.time.localeCompare(b.time)))
  }

  async function deleteFeedingSchedule(id: string) {
    if (!token) return
    const response = await fetch(`${API_URL}/feeding-schedules/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok) throw new Error('Gagal menghapus jadwal')
    setFeedingSchedules((current) => current.filter((item) => item._id !== id))
  }

  const dashboardProps = {
    readings,
    notifications,
    feedingSchedules,
    status,
    saving,
    showSettings,
    onToggleSettings: () => setShowSettings(!showSettings),
    onNotificationsChange: setNotifications,
    onToggleNotifications: () => void toggleNotifications(),
    onReadingsChange: setReadings,
    latestReading,
    onTimeRangeChange: changeTimeRange,
    onResetReadings: resetReadings,
    onAddFeedingSchedule: addFeedingSchedule,
    onUpdateFeedingSchedule: updateFeedingSchedule,
    onDeleteFeedingSchedule: deleteFeedingSchedule,
    deviceStatus,
    onLogout: () => {
      localStorage.removeItem('iot-token')
      setToken(null)
      setCheckingToken(false)
    },
  }

  if (checkingToken) return <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_20%_20%,#e2faf7,transparent_35%),#f6fafb] px-4 font-['DM_Sans',sans-serif] text-[#172b3a]" aria-busy="true" />

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={token ? <Navigate to="/dashboard" replace /> : <LoginRoute onLogin={login} />} />
        <Route path="/dashboard" element={token ? <DashboardRoute {...dashboardProps} /> : <Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to={token ? '/dashboard' : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
