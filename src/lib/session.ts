import { getIronSession, SessionOptions } from 'iron-session'
import { cookies } from 'next/headers'
import { SessionData } from './types'

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: 'sis-carrinho-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 10, // 10 horas
  },
}

export async function getSession() {
  const cookieStore = cookies()
  return getIronSession<SessionData>(cookieStore as Parameters<typeof getIronSession>[0], sessionOptions)
}
