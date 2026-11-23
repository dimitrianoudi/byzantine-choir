import type { Role } from "@/lib/session";

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function splitEmailList(value?: string | null) {
  return (value ?? "")
    .split(",")
    .map(normalizeEmail)
    .filter(Boolean);
}

export function isEmailInDomain(email: string, domain?: string | null) {
  const normalizedDomain = (domain ?? "")
    .trim()
    .toLowerCase()
    .replace(/^@/, "");
  return !normalizedDomain || email.endsWith(`@${normalizedDomain}`);
}

export type GoogleLoginAccessInput = {
  email: string;
  allowedDomain?: string | null;
  configuredMemberEmails: string[];
  managedMemberEmails: string[];
  adminEmails: string[];
  managedAllowlistExists: boolean;
};

export type GoogleLoginAccessDecision = {
  allowed: boolean;
  role: Role;
};

export function decideGoogleLoginAccess({
  email: rawEmail,
  allowedDomain,
  configuredMemberEmails,
  managedMemberEmails,
  adminEmails,
  managedAllowlistExists,
}: GoogleLoginAccessInput): GoogleLoginAccessDecision {
  const email = normalizeEmail(rawEmail);
  const configured = new Set(configuredMemberEmails.map(normalizeEmail));
  const managed = new Set(managedMemberEmails.map(normalizeEmail));
  const admins = new Set(adminEmails.map(normalizeEmail));
  const isAdmin = admins.has(email);
  const hasExplicitAllowlist =
    configured.size > 0 || managedAllowlistExists;

  return {
    allowed:
      isEmailInDomain(email, allowedDomain) &&
      (isAdmin ||
        !hasExplicitAllowlist ||
        configured.has(email) ||
        managed.has(email)),
    role: isAdmin ? "admin" : "member",
  };
}
