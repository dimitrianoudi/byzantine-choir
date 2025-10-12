import { cookies } from "next/headers";
import {
  getIronSession,
  type IronSession,
  type SessionOptions,
} from "iron-session";

export type Role = "member" | "admin";

export type SessionData = {
  user?: { role: Role };
  isLoggedIn: boolean;
};

const sessionOptions: SessionOptions = {
  password: process.env.IRON_SESSION_PASSWORD!,
  cookieName: process.env.IRON_SESSION_COOKIE_NAME ?? "choir_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
  },
};

export async function getSession(): Promise<IronSession<SessionData>> {
  // Next 15+: cookies() returns a Promise
  const cookieStore = await cookies();

  // iron-session expects a CookieStore-like interface.
  // In Next 15.5 the type is ReadonlyRequestCookies; cast is harmless here.
  const session = await getIronSession<SessionData>(
    cookieStore as unknown as any,
    sessionOptions
  );

  session.isLoggedIn = Boolean(session.user);
  return session;
}
