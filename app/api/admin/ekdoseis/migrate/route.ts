export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  publicationApiError,
  rejectUnsafeMutationOrigin,
  requirePublicationAdmin,
} from "@/lib/publications/admin";
import { materializeSeedPublicationManifest } from "@/lib/publications/repository";

export async function POST(request: Request) {
  const unauthorized = await requirePublicationAdmin();
  if (unauthorized) return unauthorized;
  const unsafeOrigin = rejectUnsafeMutationOrigin(request);
  if (unsafeOrigin) return unsafeOrigin;

  try {
    const manifest = await materializeSeedPublicationManifest();
    return NextResponse.json(
      { manifest, migrated: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return publicationApiError(error);
  }
}
