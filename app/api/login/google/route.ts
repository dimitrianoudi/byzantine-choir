import { NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { getSession } from "@/lib/session";
import { recordLoginAudit } from "@/lib/loginAudit";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function splitCSV(val?: string | null) {
  return (val ?? "")
    .split(",")
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
}

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    undefined;
  const userAgent = req.headers.get("user-agent") || undefined;
  try {
    const { credential } = await req.json().catch(() => ({}));
    if (!credential) {
      void recordLoginAudit({
        status: "failure",
        reason: "missing_credential",
        method: "google",
        ip,
        userAgent,
      });
      return NextResponse.json({ error: "Missing credential" }, { status: 400 });
    }

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const email = (payload?.email || "").toLowerCase();
    const verified = !!payload?.email_verified;

    if (!email || !verified) {
      void recordLoginAudit({
        email,
        status: "failure",
        reason: "unverified_google_account",
        method: "google",
        ip,
        userAgent,
      });
      return NextResponse.json({ error: "Unverified Google account" }, { status: 401 });
    }

    // Access policy
    const allowedDomain = (process.env.ALLOWED_GOOGLE_DOMAIN || "").toLowerCase();
    const allowedEmails = splitCSV(process.env.ALLOWED_GOOGLE_EMAILS);

    const domainOK = allowedDomain ? email.endsWith(`@${allowedDomain}`) : true;
    const emailOK = allowedEmails.length ? allowedEmails.includes(email) : true;

    if (!(domainOK && emailOK)) {
      void recordLoginAudit({
        email,
        status: "failure",
        reason: "not_allowed",
        method: "google",
        ip,
        userAgent,
      });
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }

    // Role
    const adminEmails = splitCSV(process.env.ADMIN_GOOGLE_EMAILS);
    const role: "member" | "admin" = adminEmails.includes(email) ? "admin" : "member";

    // Create same iron-session you already use
    const session = await getSession();
    session.isLoggedIn = true;
    session.user = { email, role };
    await session.save();
    void recordLoginAudit({
      email,
      role,
      status: "success",
      method: "google",
      ip,
      userAgent,
    });

    return NextResponse.json({ ok: true, role });
  } catch (err: any) {
    void recordLoginAudit({
      status: "failure",
      reason: "server_error",
      method: "google",
      ip,
      userAgent,
    });
    console.error("GOOGLE_LOGIN_ERROR:", err);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
