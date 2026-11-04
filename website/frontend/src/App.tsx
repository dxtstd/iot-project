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
  const [notifications, setNotifications] = useState<NotificationSettings>({ enabled: false, chatId: '' })
  const [showSettings, setShowSettings] = useState(false)
  const [saving, setSaving] = useState(false)
  const latest = readings[readings.length - 1]

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

        const response = await fetch(`${API_URL}/readings?hours=168`, { headers: { Authorization: `Bearer ${token}` } })
        if (response.ok) setReadings(await response.json())
        const settingsResponse = await fetch(`${API_URL}/notifications`, { headers: { Authorization: `Bearer ${token}` } })
        if (settingsResponse.ok) setNotifications(await settingsResponse.json())
        setCheckingToken(false)
      } catch {
        setCheckingToken(false)
      }
    }
    void load()
  }, [token])

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
    const response = await fetch(`${API_URL}/readings?hours=${hours}`, { headers: { Authorization: `Bearer ${token}` } })
    if (!response.ok) throw new Error('Gagal memuat histori sensor')
    setReadings(await response.json())
  }

  const dashboardProps = {
    readings,
    notifications,
    status,
    saving,
    showSettings,
    onToggleSettings: () => setShowSettings(!showSettings),
    onNotificationsChange: setNotifications,
    onToggleNotifications: () => void toggleNotifications(),
    onReadingsChange: setReadings,
    onTimeRangeChange: changeTimeRange,
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
