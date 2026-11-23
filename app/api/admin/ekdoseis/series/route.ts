export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { publicationSeriesSchema } from "@/lib/publications/schema";
import {
  readPublicationManifestFresh,
  savePublicationManifest,
} from "@/lib/publications/repository";
import {
  publicationApiError,
  rejectUnsafeMutationOrigin,
  requirePublicationAdmin,
} from "@/lib/publications/admin";

const seriesListSchema = z
  .array(publicationSeriesSchema)
  .min(1)
  .max(100);

export async function PUT(request: Request) {
  const unauthorized = await requirePublicationAdmin();
  if (unauthorized) return unauthorized;
  const unsafeOrigin = rejectUnsafeMutationOrigin(request);
  if (unsafeOrigin) return unsafeOrigin;

  try {
    const body = (await request.json()) as {
      expectedRevision?: unknown;
      series?: unknown;
    };
    const expectedRevision = Number(body.expectedRevision);
    if (!Number.isInteger(expectedRevision) || expectedRevision < 0) {
      return NextResponse.json(
        { error: "Invalid revision" },
        { status: 400 },
      );
    }

    const series = seriesListSchema
      .parse(body.series)
      .slice()
      .sort((left, right) => left.order - right.order)
      .map((item, index) => ({ ...item, order: index + 1 }));
    const stored = await readPublicationManifestFresh();
    const manifest = await savePublicationManifest(
      { ...stored.manifest, series },
      expectedRevision,
    );
    return NextResponse.json(
      { manifest },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return publicationApiError(error);
  }
}
