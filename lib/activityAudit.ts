import { ListObjectsV2Command, PutObjectCommand, type ListObjectsV2CommandOutput } from "@aws-sdk/client-s3";
import { BUCKET, s3 } from "@/lib/s3";

type Role = "member" | "admin" | "unknown";
type ActivityEvent = "page_view" | "session_end";

export type ActivityAuditInput = {
  email?: string;
  role?: Role;
  sessionId: string;
  event: ActivityEvent;
  path?: string;
  durationMs?: number;
  ip?: string;
  country?: string;
  region?: string;
  city?: string;
  userAgent?: string;
};

export type ActivityAnalytics = {
  rangeDays: number;
  totals: {
    sessions: number;
    pageViews: number;
    avgSessionMinutes: number;
  };
  topPages: Array<{ path: string; views: number }>;
  topLocations: Array<{ location: string; sessions: number }>;
};
export type ActivityRoleFilter = "member" | "admin" | "all";

const PREFIX = "_audit/activity/";

function safe(v?: string) {
  return String(v || "").trim();
}

function cleanEmail(v?: string) {
  return safe(v).toLowerCase() || "unknown";
}

function cleanRole(v?: string): Role {
  if (v === "member" || v === "admin") return v;
  return "unknown";
}

function keyFor(input: ActivityAuditInput) {
  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const ts = now.getTime();
  const rnd = Math.random().toString(36).slice(2, 8);

  const email = encodeURIComponent(cleanEmail(input.email));
  const role = cleanRole(input.role);
  const sid = encodeURIComponent(safe(input.sessionId) || "unknown");
  const path = encodeURIComponent(safe(input.path) || "-");
  const country = encodeURIComponent(safe(input.country) || "unknown");
  const city = encodeURIComponent(safe(input.city) || "unknown");
  const duration = Math.max(0, Math.round(Number(input.durationMs) || 0));

  return `${PREFIX}${yyyy}/${mm}/${dd}/${ts}-${rnd}--${input.event}--${role}--${email}--${sid}--${path}--${country}--${city}--${duration}.json`;
}

export async function recordActivityAudit(input: ActivityAuditInput) {
  if (!BUCKET) return;
  const payload = {
    at: new Date().toISOString(),
    email: cleanEmail(input.email),
    role: cleanRole(input.role),
    sessionId: safe(input.sessionId),
    event: input.event,
    path: safe(input.path) || null,
    durationMs: Math.max(0, Math.round(Number(input.durationMs) || 0)),
    ip: safe(input.ip) || null,
    country: safe(input.country) || null,
    region: safe(input.region) || null,
    city: safe(input.city) || null,
    userAgent: safe(input.userAgent) || null,
  };

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: keyFor(input),
      ContentType: "application/json",
      Body: JSON.stringify(payload),
    })
  );
}

type Parsed = {
  atMs: number;
  event: ActivityEvent;
  role: Role;
  sessionId: string;
  path: string;
  country: string;
  city: string;
  durationMs: number;
};

function parseKey(key: string): Parsed | null {
  const file = key.split("/").pop();
  if (!file) return null;
  const main = file.replace(/\.json$/, "");
  const parts = main.split("--");
  if (parts.length < 8) return null;

  const [tsRand, eventRaw, roleRaw, _email, sidRaw, pathRaw, countryRaw, cityRaw, durationRaw] = parts;
  const atMs = Number(tsRand.split("-")[0]);
  if (!Number.isFinite(atMs)) return null;

  const event: ActivityEvent = eventRaw === "session_end" ? "session_end" : "page_view";
  const role = cleanRole(roleRaw);
  const sessionId = decodeURIComponent(sidRaw || "unknown");
  const path = decodeURIComponent(pathRaw || "-");
  const country = decodeURIComponent(countryRaw || "unknown");
  const city = decodeURIComponent(cityRaw || "unknown");
  const durationMs = Math.max(0, Number(durationRaw || 0));

  return { atMs, event, role, sessionId, path, country, city, durationMs };
}

async function listKeys() {
  let token: string | undefined = undefined;
  const out: string[] = [];
  do {
    const res: ListObjectsV2CommandOutput = await s3.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: PREFIX,
        ContinuationToken: token,
        MaxKeys: 1000,
      })
    );
    for (const c of res.Contents || []) {
      if (c.Key) out.push(c.Key);
    }
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return out;
}

export async function getActivityAnalytics(
  rangeDays = 30,
  roleFilter: ActivityRoleFilter = "member"
): Promise<ActivityAnalytics> {
  const days = Math.max(1, Math.min(90, Number(rangeDays) || 30));
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

  const parsed = (await listKeys())
    .map(parseKey)
    .filter((x): x is Parsed => !!x)
    .filter((x) => x.atMs >= cutoff)
    .filter((x) => {
      if (roleFilter === "all") return x.role === "member" || x.role === "admin";
      return x.role === roleFilter;
    });

  const pageMap = new Map<string, number>();
  const locationMap = new Map<string, Set<string>>();
  const sessions = new Map<string, { min: number; max: number; explicitMs: number }>();

  for (const e of parsed) {
    if (e.event === "page_view") {
      const p = e.path || "-";
      pageMap.set(p, (pageMap.get(p) || 0) + 1);
      const loc = e.city && e.city !== "unknown" ? `${e.country} • ${e.city}` : e.country;
      if (!locationMap.has(loc)) locationMap.set(loc, new Set());
      locationMap.get(loc)!.add(e.sessionId);
    }

    const cur = sessions.get(e.sessionId);
    if (!cur) {
      sessions.set(e.sessionId, { min: e.atMs, max: e.atMs, explicitMs: e.event === "session_end" ? e.durationMs : 0 });
    } else {
      cur.min = Math.min(cur.min, e.atMs);
      cur.max = Math.max(cur.max, e.atMs);
      if (e.event === "session_end") cur.explicitMs = Math.max(cur.explicitMs, e.durationMs);
    }
  }

  let totalMs = 0;
  for (const s of sessions.values()) {
    totalMs += s.explicitMs > 0 ? s.explicitMs : Math.max(0, s.max - s.min);
  }

  const topPages = [...pageMap.entries()]
    .map(([path, views]) => ({ path, views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 20);

  const topLocations = [...locationMap.entries()]
    .map(([location, set]) => ({ location, sessions: set.size }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 20);

  return {
    rangeDays: days,
    totals: {
      sessions: sessions.size,
      pageViews: [...pageMap.values()].reduce((a, b) => a + b, 0),
      avgSessionMinutes: sessions.size ? Number(((totalMs / sessions.size) / 60000).toFixed(1)) : 0,
    },
    topPages,
    topLocations,
  };
}
