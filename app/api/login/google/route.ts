import { NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { getSession } from "@/lib/session";
import { recordLoginAudit } from "@/lib/loginAudit";
import {
  decideGoogleLoginAccess,
  normalizeEmail,
  splitEmailList,
} from "@/lib/members/access";
import { getManagedMemberManifest } from "@/lib/members/repository";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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
    const email = normalizeEmail(payload?.email || "");
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

    const adminEmails = splitEmailList(process.env.ADMIN_GOOGLE_EMAILS);
    const isConfiguredAdmin = adminEmails.includes(email);
    const storedMembers = isConfiguredAdmin
      ? null
      : await getManagedMemberManifest();
    const access = decideGoogleLoginAccess({
      email,
      allowedDomain: process.env.ALLOWED_GOOGLE_DOMAIN,
      configuredMemberEmails: splitEmailList(
        process.env.ALLOWED_GOOGLE_EMAILS,
      ),
      managedMemberEmails:
        storedMembers?.manifest.members.map((member) => member.email) || [],
      adminEmails,
      managedAllowlistExists: storedMembers?.source === "s3",
    });

    if (!access.allowed) {
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

    // Create same iron-session you already use
    const session = await getSession();
    session.isLoggedIn = true;
    session.user = { email, role: access.role };
    await session.save();
    void recordLoginAudit({
      email,
      role: access.role,
      status: "success",
      method: "google",
      ip,
      userAgent,
    });

    return NextResponse.json({ ok: true, role: access.role });
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
