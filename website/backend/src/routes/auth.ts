import { Router } from 'express'
import { createToken, verifyPassword, verifyToken } from '../auth.js'
import { database } from '../database.js'
import type { UserDoc } from '../types.js'

export const authRouter = Router()

authRouter.get('/me', (request, response) => {
  const header = request.header('authorization')
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined
  if (!token) return response.status(401).json({ error: 'Token diperlukan' })

  try {
    return response.json({ email: verifyToken(token) })
  } catch {
    return response.status(401).json({ error: 'Token tidak valid atau kedaluwarsa' })
  }
})

authRouter.post('/login', async (request, response) => {
  const { email, password } = request.body as { email?: string; password?: string }
  if (!email || !password) return response.status(400).json({ error: 'Email dan password wajib diisi' })

  try {
    const user = await database.get(`user:${email === 'admin@example.com' ? 'admin' : email}`) as UserDoc
    if (!verifyPassword(password, user.passwordHash)) return response.status(401).json({ error: 'Email atau password salah' })
    return response.json({ token: createToken(user) })
  } catch (error) {
    if ((error as { status?: number }).status === 404) return response.status(401).json({ error: 'Email atau password salah' })
    throw error
  }
})
