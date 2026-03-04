import { ListObjectsV2Command, PutObjectCommand, type ListObjectsV2CommandOutput } from "@aws-sdk/client-s3";
import { BUCKET, s3 } from "@/lib/s3";

type AuditRole = "member" | "admin" | "unknown";
type AuditStatus = "success" | "failure";

export type LoginAuditEvent = {
  email?: string;
  role?: AuditRole;
  status: AuditStatus;
  reason?: string;
  method?: "google";
  ip?: string;
  userAgent?: string;
};

export type LoginAnalytics = {
  rangeDays: number;
  totals: {
    success: number;
    failure: number;
    uniqueMembers: number;
    uniqueAdmins: number;
  };
  memberStats: Array<{
    email: string;
    successCount: number;
    failureCount: number;
    lastSuccessAt: string | null;
    lastAttemptAt: string;
  }>;
  topMembers: Array<{ email: string; count: number; lastLoginAt: string }>;
  recent: Array<{
    email: string;
    role: AuditRole;
    status: AuditStatus;
    at: string;
  }>;
};

const AUDIT_PREFIX = "_audit/logins/";

function cleanEmail(email?: string) {
  return String(email || "").trim().toLowerCase() || "unknown";
}

function cleanRole(role?: string): AuditRole {
  if (role === "member" || role === "admin") return role;
  return "unknown";
}

function keyForEvent(ev: LoginAuditEvent) {
  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const ts = now.getTime();
  const rnd = Math.random().toString(36).slice(2, 8);
  const status = ev.status === "success" ? "success" : "failure";
  const role = cleanRole(ev.role);
  const email = encodeURIComponent(cleanEmail(ev.email));

  return `${AUDIT_PREFIX}${yyyy}/${mm}/${dd}/${ts}-${rnd}--${status}--${role}--${email}.json`;
}

export async function recordLoginAudit(ev: LoginAuditEvent) {
  if (!BUCKET) return;
  const payload = {
    at: new Date().toISOString(),
    email: cleanEmail(ev.email),
    role: cleanRole(ev.role),
    status: ev.status,
    reason: ev.reason || null,
    method: ev.method || "google",
    ip: ev.ip || null,
    userAgent: ev.userAgent || null,
  };

  const key = keyForEvent(ev);
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: "application/json",
      Body: JSON.stringify(payload),
    })
  );
}

type ParsedKey = {
  email: string;
  role: AuditRole;
  status: AuditStatus;
  at: string;
};

function parseAuditKey(key: string): ParsedKey | null {
  const file = key.split("/").pop();
  if (!file) return null;
  const main = file.replace(/\.json$/, "");
  const [tsRand, statusRaw, roleRaw, emailRaw] = main.split("--");
  if (!tsRand || !statusRaw || !roleRaw || !emailRaw) return null;

  const ts = Number(tsRand.split("-")[0]);
  if (!Number.isFinite(ts)) return null;
  const at = new Date(ts).toISOString();

  const status: AuditStatus = statusRaw === "success" ? "success" : "failure";
  const role = cleanRole(roleRaw);
  const email = decodeURIComponent(emailRaw || "unknown");

  return { email, role, status, at };
}

async function listAuditKeys() {
  let token: string | undefined = undefined;
  const keys: string[] = [];

  do {
    const res: ListObjectsV2CommandOutput = await s3.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: AUDIT_PREFIX,
        ContinuationToken: token,
        MaxKeys: 1000,
      })
    );
    for (const c of res.Contents || []) {
      if (c.Key) keys.push(c.Key);
    }
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);

  return keys;
}

export async function getLoginAnalytics(rangeDays = 30): Promise<LoginAnalytics> {
  const days = Math.max(1, Math.min(90, Number(rangeDays) || 30));
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

  const keys = await listAuditKeys();
  const parsed = keys
    .map(parseAuditKey)
    .filter((x): x is ParsedKey => !!x)
    .filter((x) => new Date(x.at).getTime() >= cutoff)
    .sort((a, b) => +new Date(b.at) - +new Date(a.at));

  let success = 0;
  let failure = 0;
  const memberSet = new Set<string>();
  const adminSet = new Set<string>();
  const memberMap = new Map<string, { count: number; lastLoginAt: string }>();
  const memberStatsMap = new Map<
    string,
    { successCount: number; failureCount: number; lastSuccessAt: string | null; lastAttemptAt: string }
  >();

  for (const e of parsed) {
    if (e.role === "member" && e.email !== "unknown") {
      const prev = memberStatsMap.get(e.email);
      if (!prev) {
        memberStatsMap.set(e.email, {
          successCount: e.status === "success" ? 1 : 0,
          failureCount: e.status === "failure" ? 1 : 0,
          lastSuccessAt: e.status === "success" ? e.at : null,
          lastAttemptAt: e.at,
        });
      } else {
        if (e.status === "success") {
          prev.successCount += 1;
          if (!prev.lastSuccessAt || new Date(e.at) > new Date(prev.lastSuccessAt)) {
            prev.lastSuccessAt = e.at;
          }
        } else {
          prev.failureCount += 1;
        }
        if (new Date(e.at) > new Date(prev.lastAttemptAt)) prev.lastAttemptAt = e.at;
      }
    }

    if (e.status === "success") {
      success++;
      if (e.role === "member") {
        memberSet.add(e.email);
        const prev = memberMap.get(e.email);
        if (!prev) {
          memberMap.set(e.email, { count: 1, lastLoginAt: e.at });
        } else {
          prev.count += 1;
          if (new Date(e.at) > new Date(prev.lastLoginAt)) prev.lastLoginAt = e.at;
        }
      }
      if (e.role === "admin") adminSet.add(e.email);
    } else {
      failure++;
    }
  }

  const topMembers = [...memberMap.entries()]
    .map(([email, value]) => ({ email, count: value.count, lastLoginAt: value.lastLoginAt }))
    .sort((a, b) => b.count - a.count || +new Date(b.lastLoginAt) - +new Date(a.lastLoginAt))
    .slice(0, 20);

  const memberStats = [...memberStatsMap.entries()]
    .map(([email, value]) => ({
      email,
      successCount: value.successCount,
      failureCount: value.failureCount,
      lastSuccessAt: value.lastSuccessAt,
      lastAttemptAt: value.lastAttemptAt,
    }))
    .sort((a, b) => +new Date(b.lastAttemptAt) - +new Date(a.lastAttemptAt));

  return {
    rangeDays: days,
    totals: {
      success,
      failure,
      uniqueMembers: memberSet.size,
      uniqueAdmins: adminSet.size,
    },
    memberStats,
    topMembers,
    recent: parsed.slice(0, 50),
  };
}
