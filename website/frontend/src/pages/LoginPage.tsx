import { useState } from 'react'
import type { FormEvent } from 'react'

type LoginPageProps = {
  onLogin: (username: string, password: string) => Promise<void>
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    setLoginError('')
    try {
      await onLogin(username, password)
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Login gagal')
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_20%_20%,#e2faf7,transparent_35%),#f6fafb] px-4 font-['DM_Sans',sans-serif] text-[#172b3a]">
      <div className="w-full max-w-[410px] rounded-[20px] border border-[#e6ecef] bg-white p-6 shadow-[0_20px_60px_#153a4d12] sm:p-[42px]">
        <div className="mb-[27px] grid h-[45px] w-[45px] place-items-center rounded-[13px] bg-gradient-to-br from-[#0ea5a5] to-[#087f85] font-['Space_Grotesk',sans-serif] text-[23px] font-bold text-white shadow-[0_8px_16px_#0ea5a533]">L</div>
        <p className="mb-[7px] text-[10px] font-bold tracking-[1.4px] text-[#0ea5a5]">LOBSTER FARM MONITOR</p>
        <h1 className="mb-[9px] font-['Space_Grotesk',sans-serif] text-[27px] font-bold">Selamat datang kembali</h1>
        <p className="m-0 text-[13px] text-[#74838e]">Masuk untuk memantau kesehatan lobster dan kualitas air kolam.</p>
        <form className="mt-7" onSubmit={submit}>
          <label className="my-4 block text-xs font-semibold text-[#536873]">
            Username
            <input className="mt-[7px] block w-full rounded-lg border border-[#d8e4e6] px-[13px] py-3 text-sm outline-[#0ea5a5]" type="text" value={username} onChange={(event) => setUsername(event.target.value)} required />
          </label>
          <label className="my-4 block text-xs font-semibold text-[#536873]">
            Password
            <input className="mt-[7px] block w-full rounded-lg border border-[#d8e4e6] px-[13px] py-3 text-sm outline-[#0ea5a5]" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>
          {loginError && <p className="text-xs text-[#dc554d]">{loginError}</p>}
          <button className="mt-[9px] w-full cursor-pointer rounded-[7px] border-0 bg-[#0ea5a5] px-3 py-[13px] font-semibold text-white hover:bg-[#087f85]" type="submit">Masuk ke dashboard</button>
        </form>
      </div>
    </main>
  )
}
