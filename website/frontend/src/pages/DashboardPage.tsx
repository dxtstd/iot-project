import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { NotificationSettings, SensorReading } from '../App'

type DashboardPageProps = {
  readings: SensorReading[]
  notifications: NotificationSettings
  status: string
  saving: boolean
  showSettings: boolean
  onToggleSettings: () => void
  onNotificationsChange: (settings: NotificationSettings) => void
  onToggleNotifications: () => void
  onReadingsChange: (readings: SensorReading[]) => void
  onLogout: () => void
}

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

export function DashboardPage({ readings, notifications, status, saving, showSettings, onToggleSettings, onNotificationsChange, onToggleNotifications, onReadingsChange, onLogout }: DashboardPageProps) {
  const latest = readings[readings.length - 1]
  const recentReadings = readings.slice(-7)

  return (
    <main className="app-shell min-h-screen overflow-x-hidden">
      <header className="topbar"><div className="brand"><div className="brand-mark small">L</div><div><strong>Lobster Farm Monitor</strong><span>Smart lobster farming system</span></div></div><div className="top-actions"><span className="connection"><i /> Perangkat terhubung</span><button className="icon-button" onClick={onToggleSettings} aria-label="Pengaturan">⚙</button><button className="avatar" onClick={onLogout}>AD</button></div></header>
      <section className="content"><div className="page-heading"><div><p className="eyebrow">RINGKASAN TAMBAK LOBSTER</p><h1>Dashboard monitoring</h1><p className="muted">Pantau kesehatan lobster dan kualitas air secara real-time.</p></div><span className="updated">● Diperbarui barusan</span></div>
        {showSettings && <div className="notification-panel"><div><strong>Notifikasi Telegram</strong><p className="muted">Dapatkan peringatan saat sensor mendeteksi kondisi abnormal.</p></div><div className="telegram-controls"><input placeholder="Telegram chat ID" value={notifications.chatId} onChange={(event) => onNotificationsChange({ ...notifications, chatId: event.target.value })} /><button className={`switch ${notifications.enabled ? 'on' : ''}`} onClick={onToggleNotifications} aria-label="Toggle Telegram notifications"><span /></button><span>{saving ? 'Menyimpan...' : notifications.enabled ? 'Aktif' : 'Nonaktif'}</span></div></div>}
        <div className="summary-grid"><div className={`summary-card status-${status === 'Ideal' ? 'good' : 'warning'}`}><span>Status lobster</span><strong>{status}</strong><small>{status === 'Ideal' ? 'Kondisi kolam normal' : 'Periksa parameter kolam'}</small></div><div className="summary-card"><span>Suhu air</span><strong>{latest.temperature}°C</strong><small>Normal lobster: 24–35°C</small></div><div className="summary-card"><span>Kekeruhan</span><strong>{latest.turbidity}%</strong><small>Normal: di bawah 40%</small></div><div className="summary-card"><span>Keasaman (pH)</span><strong>{latest.ph} pH</strong><small>Ideal lobster: 6.5–8.5 pH</small></div></div>
        <div className="section-title"><div><h2>Riwayat sensor</h2><p className="muted">Data tersimpan dari pembacaan perangkat terakhir.</p></div><button className="outline-button" onClick={() => onReadingsChange([...readings, { timestamp: new Date().toISOString(), temperature: 30, turbidity: 12, ph: 7.2 }])}>＋ Simulasi pembacaan</button></div>
        <div className="charts-grid"><Chart title="Suhu kolam lobster" unit="°C" data={recentReadings.map((reading) => reading.temperature)} labels={recentReadings.map((reading) => reading.timestamp)} domain={[0, 60]} ticks={[0, 30, 60]} color="#0ea5a5" /><Chart title="Kekeruhan kolam" unit="%" data={recentReadings.map((reading) => reading.turbidity)} labels={recentReadings.map((reading) => reading.timestamp)} domain={[0, 60]} ticks={[0, 30, 60]} color="#f59e0b" /><Chart title="pH kolam lobster" unit="pH" data={recentReadings.map((reading) => reading.ph)} labels={recentReadings.map((reading) => reading.timestamp)} domain={[6, 9]} ticks={[6, 7.5, 9]} color="#6366f1" /></div>
      </section>
    </main>
  )
}
