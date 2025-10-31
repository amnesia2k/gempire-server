import jwt from 'jsonwebtoken'
import { env } from '../utils/env'

// use user._id to generate token
export function generateToken(userId: string) {
  return jwt.sign({ _id: userId }, env.JWT_SECRET, {
    expiresIn: '7d',
  })
}
