import { useState } from 'react'
import type { FormEvent } from 'react'

type LoginPageProps = {
  onLogin: (email: string, password: string) => Promise<void>
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('admin@example.com')
  const [password, setPassword] = useState('admin123')
  const [loginError, setLoginError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    setLoginError('')
    try {
      await onLogin(email, password)
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Login gagal')
    }
  }

  return (
    <main className="login-page min-h-screen px-4">
      <div className="login-card w-full max-w-[410px]">
        <div className="brand-mark">L</div>
        <p className="eyebrow">LOBSTER FARM MONITOR</p>
        <h1>Selamat datang kembali</h1>
        <p className="muted">Masuk untuk memantau kesehatan lobster dan kualitas air kolam.</p>
        <form onSubmit={submit}>
          <label>
            Email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>
          {loginError && <p className="error">{loginError}</p>}
          <button className="primary-button w-full" type="submit">Masuk ke dashboard</button>
        </form>
        <p className="demo-hint">Demo: admin@example.com / admin123</p>
      </div>
    </main>
  )
}
