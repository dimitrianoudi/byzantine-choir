export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { publicationRecordSchema } from "@/lib/publications/schema";
import { publicationSlug } from "@/lib/publications/seed";
import type { PublicationRecord } from "@/lib/publications/types";
import {
  readPublicationManifestFresh,
  savePublicationManifest,
} from "@/lib/publications/repository";
import {
  publicationApiError,
  rejectUnsafeMutationOrigin,
  requirePublicationAdmin,
  validatePublicationStorageReferences,
} from "@/lib/publications/admin";

function noStore(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function insertAtRequestedOrder(
  current: PublicationRecord[],
  candidate: PublicationRecord,
) {
  const sorted = current
    .slice()
    .sort((left, right) => left.order - right.order);
  const index = Math.max(
    0,
    Math.min(sorted.length, candidate.order - 1),
  );
  sorted.splice(index, 0, candidate);
  return sorted.map((publication, orderIndex) => ({
    ...publication,
    order: orderIndex + 1,
  }));
}

export async function GET() {
  const unauthorized = await requirePublicationAdmin();
  if (unauthorized) return unauthorized;

  try {
    const stored = await readPublicationManifestFresh();
    return noStore({
      manifest: stored.manifest,
      source: stored.source,
    });
  } catch (error) {
    return publicationApiError(error);
  }
}

export async function POST(request: Request) {
  const unauthorized = await requirePublicationAdmin();
  if (unauthorized) return unauthorized;
  const unsafeOrigin = rejectUnsafeMutationOrigin(request);
  if (unsafeOrigin) return unsafeOrigin;

  try {
    const body = (await request.json()) as {
      expectedRevision?: unknown;
      publication?: unknown;
    };
    const expectedRevision = Number(body.expectedRevision);
    if (!Number.isInteger(expectedRevision) || expectedRevision < 0) {
      return noStore({ error: "Invalid revision" }, 400);
    }

    const stored = await readPublicationManifestFresh();
    const current = stored.manifest;
    const requested =
      body.publication && typeof body.publication === "object"
        ? (body.publication as Record<string, unknown>)
        : {};
    const title = String(requested.title || "").trim();
    const editionNumber =
      requested.editionNumber === null ||
      requested.editionNumber === undefined ||
      requested.editionNumber === ""
        ? null
        : Number(requested.editionNumber);
    const now = new Date().toISOString();
    const candidate = publicationRecordSchema.parse({
      ...requested,
      slug:
        String(requested.slug || "").trim() ||
        publicationSlug(title, editionNumber),
      editionNumber,
      order:
        requested.order === undefined
          ? Math.max(
              0,
              ...current.publications.map((item) => item.order),
            ) + 1
          : Number(requested.order),
      comicReader: undefined,
      createdAt: now,
      updatedAt: now,
    });

    if (
      current.publications.some(
        (publication) => publication.id === candidate.id,
      )
    ) {
      return noStore(
        { error: "Υπάρχει ήδη έκδοση με αυτό το ID." },
        409,
      );
    }
    if (
      current.publications.some(
        (publication) => publication.slug === candidate.slug,
      )
    ) {
      return noStore(
        { error: "Υπάρχει ήδη έκδοση με αυτό το URL." },
        409,
      );
    }

    validatePublicationStorageReferences(candidate, {
      allowLocalMedia: false,
    });
    const manifest = await savePublicationManifest(
      {
        ...current,
        publications: insertAtRequestedOrder(
          current.publications,
          candidate,
        ),
      },
      expectedRevision,
    );

    return noStore({ manifest, publication: candidate }, 201);
  } catch (error) {
    return publicationApiError(error);
  }
}
