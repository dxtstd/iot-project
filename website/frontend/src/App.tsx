import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import './App.css'

type SensorReading = {
  _id?: string
  timestamp: string
  temperature: number
  turbidity: number
  ph: number
}

type NotificationSettings = {
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short' }).format(new Date(value))
}

function Chart({ title, unit, data, labels, color, domain, ticks }: { title: string; unit: string; data: number[]; labels: string[]; color: string; domain: [number, number]; ticks: number[] }) {
  const chartData = data.map((value, index) => ({ value, label: labels[index] }))
  return (
    <div className="chart-card">
      <div className="chart-heading"><h3>{title}</h3><span>Last 7 days</span></div>
      <div className="chart" role="img" aria-label={`${title} history`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 3, left: 0, bottom: 2 }}>
            <CartesianGrid vertical={false} stroke="#e9eef0" strokeDasharray="5 6" />
            <XAxis dataKey="label" tickFormatter={formatDate} tick={{ fill: '#99a6ab', fontSize: 9 }} tickLine={false} axisLine={false} interval={0} />
            <YAxis domain={domain} ticks={ticks} tick={{ fill: '#99a6ab', fontSize: 9 }} tickLine={false} axisLine={false} width={25} />
            <Tooltip labelFormatter={(label) => formatDate(String(label))} formatter={(value) => [`${value} ${unit}`, title]} contentStyle={{ border: '1px solid #e6ecef', borderRadius: 8, fontSize: 11 }} />
            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ r: 3.5, fill: '#fff', stroke: color, strokeWidth: 1.5 }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-unit">{unit}</div>
    </div>
  )
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('iot-token'))
  const [email, setEmail] = useState('admin@example.com')
  const [password, setPassword] = useState('admin123')
  const [loginError, setLoginError] = useState('')
  const [readings, setReadings] = useState(sampleReadings)
  const [notifications, setNotifications] = useState<NotificationSettings>({ enabled: false, chatId: '' })
  const [showSettings, setShowSettings] = useState(false)
  const [saving, setSaving] = useState(false)
  const latest = readings[readings.length - 1]

  useEffect(() => {
    if (!token) return
    const load = async () => {
      try {
        const response = await fetch(`${API_URL}/readings`, { headers: { Authorization: `Bearer ${token}` } })
        if (response.ok) setReadings(await response.json())
        const settingsResponse = await fetch(`${API_URL}/notifications`, { headers: { Authorization: `Bearer ${token}` } })
        if (settingsResponse.ok) setNotifications(await settingsResponse.json())
      } catch {
        // The seeded view remains usable while the API is offline.
      }
    }
    void load()
  }, [token])

  const status = useMemo(() => {
    const abnormal = latest.temperature > 35 || latest.turbidity > 40 || latest.ph < 6.5 || latest.ph > 8.5
    return abnormal ? 'Perlu perhatian' : 'Ideal'
  }, [latest])

  async function login(event: FormEvent) {
    event.preventDefault()
    setLoginError('')
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }),
      })
      if (!response.ok) throw new Error('Email atau password salah')
      const result = await response.json()
      localStorage.setItem('iot-token', result.token)
      setToken(result.token)
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Login gagal')
    }
  }

  async function toggleNotifications() {
    const next = { ...notifications, enabled: !notifications.enabled }
    setNotifications(next)
    if (!token) return
    setSaving(true)
    try {
      await fetch(`${API_URL}/notifications`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(next),
      })
    } finally {
      setSaving(false)
    }
  }

  if (!token) {
    return <main className="login-page min-h-screen px-4"><div className="login-card w-full max-w-[410px]"><div className="brand-mark">L</div><p className="eyebrow">LOBSTER FARM MONITOR</p><h1>Selamat datang kembali</h1><p className="muted">Masuk untuk memantau kesehatan lobster dan kualitas air kolam.</p><form onSubmit={login}><label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>{loginError && <p className="error">{loginError}</p>}<button className="primary-button w-full" type="submit">Masuk ke dashboard</button></form><p className="demo-hint">Demo: admin@example.com / admin123</p></div></main>
  }

  return <main className="app-shell min-h-screen overflow-x-hidden">
    <header className="topbar"><div className="brand"><div className="brand-mark small">L</div><div><strong>Lobster Farm Monitor</strong><span>Smart lobster farming system</span></div></div><div className="top-actions"><span className="connection"><i /> Perangkat terhubung</span><button className="icon-button" onClick={() => setShowSettings(!showSettings)} aria-label="Pengaturan">⚙</button><button className="avatar" onClick={() => { localStorage.removeItem('iot-token'); setToken(null) }}>AD</button></div></header>
    <section className="content"><div className="page-heading"><div><p className="eyebrow">RINGKASAN TAMBAK LOBSTER</p><h1>Dashboard monitoring</h1><p className="muted">Pantau kesehatan lobster dan kualitas air secara real-time.</p></div><span className="updated">● Diperbarui barusan</span></div>
      {showSettings && <div className="notification-panel"><div><strong>Notifikasi Telegram</strong><p className="muted">Dapatkan peringatan saat sensor mendeteksi kondisi abnormal.</p></div><div className="telegram-controls"><input placeholder="Telegram chat ID" value={notifications.chatId} onChange={(event) => setNotifications({ ...notifications, chatId: event.target.value })} /><button className={`switch ${notifications.enabled ? 'on' : ''}`} onClick={() => void toggleNotifications()} aria-label="Toggle Telegram notifications"><span /></button><span>{saving ? 'Menyimpan...' : notifications.enabled ? 'Aktif' : 'Nonaktif'}</span></div></div>}
      <div className="summary-grid"><div className={`summary-card status-${status === 'Ideal' ? 'good' : 'warning'}`}><span>Status lobster</span><strong>{status}</strong><small>{status === 'Ideal' ? 'Kondisi kolam normal' : 'Periksa parameter kolam'}</small></div><div className="summary-card"><span>Suhu air</span><strong>{latest.temperature}°C</strong><small>Normal lobster: 24–35°C</small></div><div className="summary-card"><span>Kekeruhan</span><strong>{latest.turbidity}%</strong><small>Normal: di bawah 40%</small></div><div className="summary-card"><span>Keasaman (pH)</span><strong>{latest.ph} pH</strong><small>Ideal lobster: 6.5–8.5 pH</small></div></div>
      <div className="section-title"><div><h2>Riwayat sensor</h2><p className="muted">Data tersimpan dari pembacaan perangkat terakhir.</p></div><button className="outline-button" onClick={() => setReadings([...readings, { timestamp: new Date().toISOString(), temperature: 30, turbidity: 12, ph: 7.2 }])}>＋ Simulasi pembacaan</button></div>
      <div className="charts-grid"><Chart title="Suhu kolam lobster" unit="°C" data={readings.slice(-7).map((reading) => reading.temperature)} labels={readings.slice(-7).map((reading) => reading.timestamp)} domain={[0, 60]} ticks={[0, 30, 60]} color="#0ea5a5" /><Chart title="Kekeruhan kolam" unit="%" data={readings.slice(-7).map((reading) => reading.turbidity)} labels={readings.slice(-7).map((reading) => reading.timestamp)} domain={[0, 60]} ticks={[0, 30, 60]} color="#f59e0b" /><Chart title="pH kolam lobster" unit="pH" data={readings.slice(-7).map((reading) => reading.ph)} labels={readings.slice(-7).map((reading) => reading.timestamp)} domain={[6, 9]} ticks={[6, 7.5, 9]} color="#6366f1" /></div>
    </section>
  </main>
}

export default App
