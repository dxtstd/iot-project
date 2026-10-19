import type { NextFunction, Response } from 'express'
import { verifyToken } from '../auth.js'
import type { AuthRequest } from '../types.js'

export function authenticate(request: AuthRequest, response: Response, next: NextFunction) {
  const header = request.header('authorization')
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined
  if (!token) return response.status(401).json({ error: 'Token diperlukan' })
  try {
    request.userEmail = verifyToken(token)
    return next()
  } catch {
    return response.status(401).json({ error: 'Token tidak valid atau kedaluwarsa' })
  }
}
