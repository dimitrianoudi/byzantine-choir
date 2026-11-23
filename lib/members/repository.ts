import {
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { revalidateTag, unstable_cache } from "next/cache";
import { managedMemberManifestSchema } from "@/lib/members/schema";
import type {
  ManagedMemberManifest,
  StoredManagedMemberManifest,
} from "@/lib/members/types";
import { BUCKET, s3 } from "@/lib/s3";

export const MANAGED_MEMBERS_KEY = "_users/members.json";
export const MANAGED_MEMBERS_CACHE_TAG = "managed-members";

export class ManagedMemberRevisionConflictError extends Error {
  constructor() {
    super(
      "Η λίστα μελών άλλαξε από άλλη συνεδρία. Ανανεώστε τη σελίδα και δοκιμάστε ξανά.",
    );
    this.name = "ManagedMemberRevisionConflictError";
  }
}

export class ManagedMemberStorageUnavailableError extends Error {
  constructor() {
    super("Δεν έχει ρυθμιστεί η αποθήκευση S3 για τη διαχείριση μελών.");
    this.name = "ManagedMemberStorageUnavailableError";
  }
}

function emptyManifest(): ManagedMemberManifest {
  return {
    schemaVersion: 1,
    revision: 0,
    updatedAt: new Date(0).toISOString(),
    members: [],
  };
}

function isMissingObject(error: unknown) {
  const candidate = error as {
    name?: string;
    Code?: string;
    code?: string;
    $metadata?: { httpStatusCode?: number };
  };
  return (
    candidate?.name === "NoSuchKey" ||
    candidate?.name === "NotFound" ||
    candidate?.Code === "NoSuchKey" ||
    candidate?.code === "NoSuchKey" ||
    candidate?.$metadata?.httpStatusCode === 404
  );
}

function isPreconditionFailure(error: unknown) {
  const candidate = error as {
    name?: string;
    Code?: string;
    code?: string;
    $metadata?: { httpStatusCode?: number };
  };
  return (
    candidate?.name === "PreconditionFailed" ||
    candidate?.Code === "PreconditionFailed" ||
    candidate?.code === "PreconditionFailed" ||
    candidate?.$metadata?.httpStatusCode === 412
  );
}

async function readRemoteManifest(): Promise<StoredManagedMemberManifest | null> {
  if (!BUCKET) return null;

  try {
    const response = await s3.send(
      new GetObjectCommand({
        Bucket: BUCKET,
        Key: MANAGED_MEMBERS_KEY,
      }),
    );
    const body = await response.Body?.transformToString();
    if (!body) return null;

    return {
      manifest: managedMemberManifestSchema.parse(JSON.parse(body)),
      etag: response.ETag || null,
      source: "s3",
    };
  } catch (error) {
    if (isMissingObject(error)) return null;
    throw error;
  }
}

export async function readManagedMemberManifestFresh(): Promise<StoredManagedMemberManifest> {
  const remote = await readRemoteManifest();
  if (remote) return remote;
  return {
    manifest: emptyManifest(),
    etag: null,
    source: "empty",
  };
}

const readCachedManifest = unstable_cache(
  readManagedMemberManifestFresh,
  ["managed-member-manifest-v1"],
  {
    revalidate: 300,
    tags: [MANAGED_MEMBERS_CACHE_TAG],
  },
);

export async function getManagedMemberManifest() {
  return readCachedManifest();
}

export async function saveManagedMemberManifest(
  requestedManifest: ManagedMemberManifest,
  expectedRevision: number,
) {
  if (!BUCKET) {
    throw new ManagedMemberStorageUnavailableError();
  }

  const remote = await readRemoteManifest();
  const current = remote?.manifest || emptyManifest();
  if (current.revision !== expectedRevision) {
    throw new ManagedMemberRevisionConflictError();
  }

  const next = managedMemberManifestSchema.parse({
    ...requestedManifest,
    schemaVersion: 1,
    revision: current.revision + 1,
    updatedAt: new Date().toISOString(),
    members: requestedManifest.members
      .slice()
      .sort((left, right) => left.email.localeCompare(right.email)),
  });

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: MANAGED_MEMBERS_KEY,
        ContentType: "application/json; charset=utf-8",
        Body: JSON.stringify(next, null, 2),
        ...(remote?.etag
          ? { IfMatch: remote.etag }
          : { IfNoneMatch: "*" }),
      }),
    );
  } catch (error) {
    if (isPreconditionFailure(error)) {
      throw new ManagedMemberRevisionConflictError();
    }
    throw error;
  }

  revalidateTag(MANAGED_MEMBERS_CACHE_TAG);
  return next;
}
