import {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  type ListObjectsV2CommandOutput,
} from "@aws-sdk/client-s3";
import { BUCKET, s3 } from "@/lib/s3";

type AuditRole = "member" | "admin" | "unknown";
export type DeletionAuditKind = "library_file" | "gallery_image" | "gallery_video";

export type DeletionAuditInput = {
  email?: string;
  role?: AuditRole;
  kind: DeletionAuditKind;
  itemKey: string;
  itemName?: string;
};

export type DeletionAnalytics = {
  rangeDays: number;
  totals: {
    deletions: number;
    uniqueUsers: number;
  };
  recent: Array<{
    at: string;
    email: string;
    role: AuditRole;
    kind: DeletionAuditKind;
    itemKey: string;
    itemName: string;
  }>;
};

const AUDIT_PREFIX = "_audit/deletions/";

function safe(v?: string) {
  return String(v || "").trim();
}

function cleanEmail(v?: string) {
  return safe(v).toLowerCase() || "unknown";
}

function cleanRole(v?: string): AuditRole {
  if (v === "member" || v === "admin") return v;
  return "unknown";
}

function cleanKind(v?: string): DeletionAuditKind {
  if (v === "gallery_image" || v === "gallery_video") return v;
  return "library_file";
}

function prettyDeletedName(raw?: string) {
  const base = safe(raw).split("/").pop() || safe(raw);
  return base.replace(/^\d{13}[-_]/, "") || safe(raw) || "unknown";
}

function keyForAudit() {
  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const ts = now.getTime();
  const rnd = Math.random().toString(36).slice(2, 8);
  return `${AUDIT_PREFIX}${yyyy}/${mm}/${dd}/${ts}-${rnd}.json`;
}

export async function recordDeletionAudit(input: DeletionAuditInput) {
  if (!BUCKET) return;

  const payload = {
    at: new Date().toISOString(),
    email: cleanEmail(input.email),
    role: cleanRole(input.role),
    kind: cleanKind(input.kind),
    itemKey: safe(input.itemKey),
    itemName: prettyDeletedName(input.itemName || input.itemKey),
  };

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: keyForAudit(),
      ContentType: "application/json",
      Body: JSON.stringify(payload),
    })
  );
}

type StoredDeletionAudit = {
  at?: string;
  email?: string;
  role?: AuditRole;
  kind?: DeletionAuditKind;
  itemKey?: string;
  itemName?: string;
};

function parseTsFromKey(key: string) {
  const file = key.split("/").pop();
  if (!file) return 0;
  const ts = Number(file.replace(/\.json$/, "").split("-")[0]);
  return Number.isFinite(ts) ? ts : 0;
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

async function readAuditRecord(key: string) {
  try {
    const res = await s3.send(
      new GetObjectCommand({
        Bucket: BUCKET,
        Key: key,
      })
    );
    const text = await res.Body?.transformToString();
    if (!text) return null;

    const json = JSON.parse(text) as StoredDeletionAudit;
    const itemKey = safe(json.itemKey);
    if (!itemKey) return null;

    return {
      at: safe(json.at) || new Date(parseTsFromKey(key)).toISOString(),
      email: cleanEmail(json.email),
      role: cleanRole(json.role),
      kind: cleanKind(json.kind),
      itemKey,
      itemName: prettyDeletedName(json.itemName || itemKey),
    };
  } catch {
    return null;
  }
}

export async function getDeletionAnalytics(rangeDays = 30): Promise<DeletionAnalytics> {
  const days = Math.max(1, Math.min(90, Number(rangeDays) || 30));
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

  const keys = (await listAuditKeys()).filter((key) => parseTsFromKey(key) >= cutoff);
  const recent = (await Promise.all(keys.map(readAuditRecord)))
    .filter(
      (
        x
      ): x is {
        at: string;
        email: string;
        role: AuditRole;
        kind: DeletionAuditKind;
        itemKey: string;
        itemName: string;
      } => !!x
    )
    .sort((a, b) => +new Date(b.at) - +new Date(a.at));

  const uniqueUsers = new Set(recent.map((item) => item.email).filter((email) => email !== "unknown"));

  return {
    rangeDays: days,
    totals: {
      deletions: recent.length,
      uniqueUsers: uniqueUsers.size,
    },
    recent: recent.slice(0, 50),
  };
}
