export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { publicationRecordSchema } from "@/lib/publications/schema";
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

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function placeAtRequestedOrder(
  current: PublicationRecord[],
  candidate: PublicationRecord,
) {
  const sorted = current
    .filter((publication) => publication.id !== candidate.id)
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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauthorized = await requirePublicationAdmin();
  if (unauthorized) return unauthorized;
  const unsafeOrigin = rejectUnsafeMutationOrigin(request);
  if (unsafeOrigin) return unsafeOrigin;

  try {
    const { id } = await params;
    const body = (await request.json()) as {
      expectedRevision?: unknown;
      publication?: unknown;
    };
    const expectedRevision = Number(body.expectedRevision);
    if (!Number.isInteger(expectedRevision) || expectedRevision < 0) {
      return json({ error: "Invalid revision" }, 400);
    }

    const stored = await readPublicationManifestFresh();
    const current = stored.manifest;
    const index = current.publications.findIndex(
      (publication) => publication.id === id,
    );
    if (index < 0) {
      return json({ error: "Η έκδοση δεν βρέθηκε." }, 404);
    }

    const existing = current.publications[index];
    const requested =
      body.publication && typeof body.publication === "object"
        ? (body.publication as Record<string, unknown>)
        : {};
    if (
      requested.slug !== undefined &&
      requested.slug !== existing.slug
    ) {
      return json(
        {
          error:
            "Το URL μιας υπάρχουσας έκδοσης δεν μπορεί να αλλάξει.",
        },
        400,
      );
    }

    const candidate = publicationRecordSchema.parse({
      ...requested,
      id: existing.id,
      slug: existing.slug,
      comicReader: existing.comicReader,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    });
    validatePublicationStorageReferences(candidate, {
      allowLocalMedia: true,
    });

    const publications = placeAtRequestedOrder(
      current.publications,
      candidate,
    );
    const manifest = await savePublicationManifest(
      { ...current, publications },
      expectedRevision,
    );
    return json({ manifest, publication: candidate });
  } catch (error) {
    return publicationApiError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauthorized = await requirePublicationAdmin();
  if (unauthorized) return unauthorized;
  const unsafeOrigin = rejectUnsafeMutationOrigin(request);
  if (unsafeOrigin) return unsafeOrigin;

  try {
    const { id } = await params;
    const body = (await request.json()) as {
      expectedRevision?: unknown;
    };
    const expectedRevision = Number(body.expectedRevision);
    if (!Number.isInteger(expectedRevision) || expectedRevision < 0) {
      return json({ error: "Invalid revision" }, 400);
    }

    const stored = await readPublicationManifestFresh();
    const current = stored.manifest;
    const index = current.publications.findIndex(
      (publication) => publication.id === id,
    );
    if (index < 0) {
      return json({ error: "Η έκδοση δεν βρέθηκε." }, 404);
    }

    const publications = current.publications.slice();
    publications[index] = {
      ...publications[index],
      status: "archived",
      updatedAt: new Date().toISOString(),
    };
    const manifest = await savePublicationManifest(
      { ...current, publications },
      expectedRevision,
    );
    return json({ manifest });
  } catch (error) {
    return publicationApiError(error);
  }
}
