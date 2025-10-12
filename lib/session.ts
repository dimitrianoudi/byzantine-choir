import { cookies } from "next/headers"
import { getIronSession, type IronSession, type IronSessionOptions } from "iron-session"

export type Role = "member" | "admin"
export type SessionData = {
  user?: { role: Role }
  isLoggedIn: boolean
}

const sessionOptions: IronSessionOptions = {
  password: process.env.IRON_SESSION_PASSWORD!,
  cookieName: process.env.IRON_SESSION_COOKIE_NAME || "choir_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production"
  }
}

export async function getSession(): Promise<IronSession<SessionData>> {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions)
  // default values
  session.isLoggedIn = Boolean(session.user)
  return session
}