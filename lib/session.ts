import { cookies } from "next/headers";
import { getIronSession, type SessionOptions } from "iron-session";

export type Role = "member" | "admin";

export type SessionUser = {
  role: Role;
  email?: string;        // ← add this
};

export type SessionData = {
  isLoggedIn: boolean;
  user?: SessionUser;    // ← use the new type
};

export const sessionOptions: SessionOptions = {
  password: process.env.IRON_SESSION_PASSWORD!,
  cookieName: process.env.IRON_SESSION_COOKIE_NAME || "choir_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    httpOnly: true,
  },
};

export async function getSession() {
  // Next 15: cookies() returns a CookieStore-like object
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore as any, sessionOptions);
}
