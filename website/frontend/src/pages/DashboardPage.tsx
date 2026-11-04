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
    <div className="relative min-h-[310px] rounded-[14px] border border-[#e6ecef] bg-white px-[21px] pb-[17px] pt-[21px]">
      <div className="flex items-center justify-between"><h3 className="m-0 font-['Space_Grotesk',sans-serif] text-sm font-semibold">{title}</h3><span className="text-[10px] text-[#a2afb4]">Last 7 days</span></div>
      <div className="mt-[19px] h-[198px] min-w-0" role="img" aria-label={`${title} history`}>
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
      <div className="absolute bottom-4 left-[21px] text-[10px] text-[#a4b0b5]">{unit}</div>
    </div>
  )
}

export function DashboardPage({ readings, notifications, status, saving, showSettings, onToggleSettings, onNotificationsChange, onToggleNotifications, onReadingsChange, onLogout }: DashboardPageProps) {
  const latest = readings[readings.length - 1]
  const recentReadings = readings.slice(-7)

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f7fafb] font-['DM_Sans',sans-serif] text-[#172b3a]">
      <header className="flex h-[76px] items-center justify-between border-b border-[#e6ecef] bg-white px-5 md:px-[clamp(24px,7vw,110px)]"><div className="flex items-center gap-[11px]"><div className="grid h-[34px] w-[34px] place-items-center rounded-[10px] bg-gradient-to-br from-[#0ea5a5] to-[#087f85] font-['Space_Grotesk',sans-serif] text-[17px] font-bold text-white shadow-[0_8px_16px_#0ea5a533]">L</div><div><strong className="block font-['Space_Grotesk',sans-serif] text-base">Lobster Farm Monitor</strong><span className="text-[11px] text-[#74838e]">Smart lobster farming system</span></div></div><div className="flex items-center gap-[18px]"><span className="hidden text-xs text-[#5f727d] sm:inline"><i className="mr-[5px] inline-block h-[7px] w-[7px] rounded-full bg-[#20c997]" /> Perangkat terhubung</span><button className="cursor-pointer border-0 bg-transparent text-[19px] text-[#71808a]" onClick={onToggleSettings} aria-label="Pengaturan">⚙</button><button className="h-[34px] w-[34px] cursor-pointer rounded-full border-0 bg-[#d9f1ef] text-[11px] font-bold text-[#0b8183]" onClick={onLogout}>AD</button></div></header>
      <section className="mx-auto w-[calc(100%-32px)] max-w-[1100px] py-8 md:w-[calc(100%-48px)] md:py-12"><div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center"><div><p className="mb-[7px] text-[10px] font-bold tracking-[1.4px] text-[#0ea5a5]">RINGKASAN TAMBAK LOBSTER</p><h1 className="mb-[7px] font-['Space_Grotesk',sans-serif] text-[32px] font-bold tracking-[-1px]">Dashboard monitoring</h1><p className="m-0 text-[13px] text-[#74838e]">Pantau kesehatan lobster dan kualitas air secara real-time.</p></div><span className="text-[11px] text-[#798991]">● Diperbarui barusan</span></div>
        {showSettings && <div className="mb-[25px] flex flex-col items-start justify-between gap-4 rounded-[13px] border border-[#c9e8e5] bg-[#effaf9] px-[21px] py-[17px] md:flex-row md:items-center"><div><strong className="text-sm">Notifikasi Telegram</strong><p className="m-0 text-[13px] text-[#74838e]">Dapatkan peringatan saat sensor mendeteksi kondisi abnormal.</p></div><div className="flex items-center gap-2 text-xs text-[#5c727a]"><input className="w-40 rounded-[7px] border border-[#c6d9dc] px-2.5 py-2 text-xs outline-[#0ea5a5]" placeholder="Telegram chat ID" value={notifications.chatId} onChange={(event) => onNotificationsChange({ ...notifications, chatId: event.target.value })} /><button className={`h-[22px] w-[39px] cursor-pointer rounded-[15px] border-0 p-[3px] ${notifications.enabled ? 'bg-[#0ea5a5]' : 'bg-[#b7c5c9]'}`} onClick={onToggleNotifications} aria-label="Toggle Telegram notifications"><span className={`block h-4 w-4 rounded-full bg-white transition-transform ${notifications.enabled ? 'translate-x-[17px]' : ''}`} /></button><span>{saving ? 'Menyimpan...' : notifications.enabled ? 'Aktif' : 'Nonaktif'}</span></div></div>}
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-4"><div className={`min-h-[126px] rounded-[14px] border border-[#e6ecef] bg-white p-4 shadow-[0_5px_18px_#213b4d08] md:min-h-[142px] md:p-[23px] ${status === 'Ideal' ? '[&>strong]:text-[#10a879]' : '[&>strong]:text-[#e78a19]'}`}><span className="block text-xs text-[#768790]">Status lobster</span><strong className="my-2 block font-['Space_Grotesk',sans-serif] text-[22px] font-bold text-[#172b3a] md:my-[14px] md:text-[28px]">{status}</strong><small className="text-[11px] text-[#94a1a8]">{status === 'Ideal' ? 'Kondisi kolam normal' : 'Periksa parameter kolam'}</small></div>{[['Suhu air', `${latest.temperature}°C`, 'Normal lobster: 24–35°C'], ['Kekeruhan', `${latest.turbidity}%`, 'Normal: di bawah 40%'], ['Keasaman (pH)', `${latest.ph} pH`, 'Ideal lobster: 6.5–8.5 pH']].map(([label, value, note]) => <div key={label} className="min-h-[126px] rounded-[14px] border border-[#e6ecef] bg-white p-4 shadow-[0_5px_18px_#213b4d08] md:min-h-[142px] md:p-[23px]"><span className="block text-xs text-[#768790]">{label}</span><strong className="my-2 block font-['Space_Grotesk',sans-serif] text-[22px] font-bold text-[#172b3a] md:my-[14px] md:text-[28px]">{value}</strong><small className="text-[11px] text-[#94a1a8]">{note}</small></div>)}</div>
        <div className="my-[38px] flex flex-col items-start justify-between gap-4 md:my-[49px] md:flex-row md:items-center"><div><h2 className="m-0 mb-[5px] font-['Space_Grotesk',sans-serif] text-xl font-semibold">Riwayat sensor</h2><p className="m-0 text-[13px] text-[#74838e]">Data tersimpan dari pembacaan perangkat terakhir.</p></div><button className="cursor-pointer rounded-[7px] border border-[#d4e0e3] bg-white px-[13px] py-[9px] text-xs font-semibold text-[#087f85]" onClick={() => onReadingsChange([...readings, { timestamp: new Date().toISOString(), temperature: 30, turbidity: 12, ph: 7.2 }])}>＋ Simulasi pembacaan</button></div>
        <div className="grid grid-cols-1 gap-[18px] md:grid-cols-2 [&>div:last-child]:md:col-span-2 [&>div:last-child]:md:mx-auto [&>div:last-child]:md:w-[calc(50%-9px)]"><Chart title="Suhu kolam lobster" unit="°C" data={recentReadings.map((reading) => reading.temperature)} labels={recentReadings.map((reading) => reading.timestamp)} domain={[0, 60]} ticks={[0, 30, 60]} color="#0ea5a5" /><Chart title="Kekeruhan kolam" unit="%" data={recentReadings.map((reading) => reading.turbidity)} labels={recentReadings.map((reading) => reading.timestamp)} domain={[0, 60]} ticks={[0, 30, 60]} color="#f59e0b" /><Chart title="pH kolam lobster" unit="pH" data={recentReadings.map((reading) => reading.ph)} labels={recentReadings.map((reading) => reading.timestamp)} domain={[6, 9]} ticks={[6, 7.5, 9]} color="#6366f1" /></div>
      </section>
    </main>
  )
}
