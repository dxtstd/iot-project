import jwt from 'jsonwebtoken'
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { config } from './config.js'

export function hashPassword(password: string, salt = randomBytes(16).toString('hex')) {
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`
}

export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const candidate = scryptSync(password, salt, 64)
  return timingSafeEqual(new Uint8Array(candidate), new Uint8Array(Buffer.from(hash, 'hex')))
}

export function createToken(username: string) {
  return jwt.sign({ username }, config.jwtSecret, { expiresIn: '8h' })
}

export function verifyToken(token: string) {
  const payload = jwt.verify(token, config.jwtSecret)
  if (typeof payload !== 'object' || typeof payload.username !== 'string') throw new Error('Invalid token')
  return payload.username
}
