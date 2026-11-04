import { Router } from 'express'
import { createToken, verifyPassword, verifyToken } from '../auth.js'
import { config } from '../config.js'

export const authRouter = Router()

authRouter.get('/me', (request, response) => {
  const header = request.header('authorization')
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined
  if (!token) return response.status(401).json({ error: 'Token diperlukan' })

  try {
    return response.json({ username: verifyToken(token) })
  } catch {
    return response.status(401).json({ error: 'Token tidak valid atau kedaluwarsa' })
  }
})

authRouter.post('/login', async (request, response) => {
  const { username, password } = request.body as { username?: string; password?: string }
  if (!username || !password) return response.status(400).json({ error: 'Username dan password wajib diisi' })
  if (!config.authUsername || !config.authPassword) {
    return response.status(503).json({ error: 'Login belum dikonfigurasi' })
  }
  if (username !== config.authUsername || password !== config.authPassword) {
    return response.status(401).json({ error: 'Username atau password salah' })
  }
  return response.json({ token: createToken(username) })
})
