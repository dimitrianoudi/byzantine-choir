import {
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { revalidateTag, unstable_cache } from "next/cache";
import { BUCKET, s3 } from "@/lib/s3";
import { publicationManifestSchema } from "@/lib/publications/schema";
import { buildSeedPublicationManifest } from "@/lib/publications/seed";
import type {
  PublicationManifest,
  StoredPublicationManifest,
} from "@/lib/publications/types";

export const PUBLICATION_MANIFEST_KEY =
  "_publications/catalog.json";
export const PUBLICATION_CACHE_TAG = "publication-catalog";

export class PublicationRevisionConflictError extends Error {
  constructor() {
    super(
      "Ο κατάλογος άλλαξε από άλλη συνεδρία. Ανανεώστε τη σελίδα και δοκιμάστε ξανά.",
    );
    this.name = "PublicationRevisionConflictError";
  }
}

export class PublicationStorageUnavailableError extends Error {
  constructor() {
    super(
      "Δεν έχει ρυθμιστεί η αποθήκευση S3 για τη διαχείριση εκδόσεων.",
    );
    this.name = "PublicationStorageUnavailableError";
  }
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

async function readRemoteManifest(): Promise<StoredPublicationManifest | null> {
  if (!BUCKET) return null;

  try {
    const response = await s3.send(
      new GetObjectCommand({
        Bucket: BUCKET,
        Key: PUBLICATION_MANIFEST_KEY,
      }),
    );
    const body = await response.Body?.transformToString();
    if (!body) return null;

    return {
      manifest: publicationManifestSchema.parse(JSON.parse(body)),
      etag: response.ETag || null,
      source: "s3",
    };
  } catch (error) {
    if (isMissingObject(error)) return null;
    throw error;
  }
}

export async function readPublicationManifestFresh(): Promise<StoredPublicationManifest> {
  const remote = await readRemoteManifest();
  if (remote) return remote;
  return {
    manifest: buildSeedPublicationManifest(),
    etag: null,
    source: "seed",
  };
}

const readCachedManifest = unstable_cache(
  async () => (await readPublicationManifestFresh()).manifest,
  ["publication-manifest-v1"],
  {
    revalidate: 300,
    tags: [PUBLICATION_CACHE_TAG],
  },
);

export async function getPublicationManifest() {
  return readCachedManifest();
}

function historyKey(revision: number) {
  return `_publications/history/${String(revision).padStart(8, "0")}-${Date.now()}.json`;
}

export async function savePublicationManifest(
  requestedManifest: PublicationManifest,
  expectedRevision: number,
) {
  if (!BUCKET) {
    throw new PublicationStorageUnavailableError();
  }

  const remote = await readRemoteManifest();
  const current =
    remote?.manifest || buildSeedPublicationManifest();
  if (current.revision !== expectedRevision) {
    throw new PublicationRevisionConflictError();
  }

  const now = new Date().toISOString();
  const next = publicationManifestSchema.parse({
    ...requestedManifest,
    schemaVersion: 1,
    revision: current.revision + 1,
    updatedAt: now,
  });

  if (remote) {
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: historyKey(current.revision),
        ContentType: "application/json; charset=utf-8",
        Body: JSON.stringify(current, null, 2),
      }),
    );
  }

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: PUBLICATION_MANIFEST_KEY,
        ContentType: "application/json; charset=utf-8",
        Body: JSON.stringify(next, null, 2),
        ...(remote?.etag
          ? { IfMatch: remote.etag }
          : { IfNoneMatch: "*" }),
      }),
    );
  } catch (error) {
    if (isPreconditionFailure(error)) {
      throw new PublicationRevisionConflictError();
    }
    throw error;
  }

  revalidateTag(PUBLICATION_CACHE_TAG);
  return next;
}

export async function materializeSeedPublicationManifest() {
  const current = await readPublicationManifestFresh();
  if (current.source === "s3") return current.manifest;
  return savePublicationManifest(current.manifest, 0);
}
