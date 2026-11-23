import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { SITE_URL } from "@/lib/site";
import { isPublicationAdmin } from "@/lib/publications/access";
import type { PublicationRecord } from "@/lib/publications/types";

export async function requirePublicationAdmin() {
  const session = await getSession();
  if (!isPublicationAdmin(session)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }
  return null;
}

export function hasSafeMutationOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return process.env.NODE_ENV !== "production";

  const allowed = new Set([
    new URL(request.url).origin,
    SITE_URL,
  ]);
  return allowed.has(origin);
}

export function rejectUnsafeMutationOrigin(request: Request) {
  if (hasSafeMutationOrigin(request)) return null;
  return NextResponse.json(
    { error: "Invalid request origin" },
    { status: 403 },
  );
}

export function validatePublicationStorageReferences(
  publication: PublicationRecord,
  options: { allowLocalMedia: boolean },
) {
  for (const media of publication.media) {
    if (media.storage === "local") {
      if (!options.allowLocalMedia || !media.url.startsWith("/ekdoseis/")) {
        throw new Error("Μη έγκυρη τοπική εικόνα έκδοσης.");
      }
      continue;
    }

    const expectedPrefix = `publications/${publication.id}/`;
    if (
      !media.publicId?.startsWith(expectedPrefix) ||
      !media.url.startsWith("https://res.cloudinary.com/")
    ) {
      throw new Error("Μη έγκυρη εικόνα Cloudinary.");
    }
  }

  const expectedFilePrefix = `publications/${publication.id}/files/`;
  for (const file of publication.files) {
    if (!file.key.startsWith(expectedFilePrefix)) {
      throw new Error("Μη έγκυρο αρχείο έκδοσης.");
    }
  }
}

export function publicationApiError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : "Παρουσιάστηκε απρόβλεπτο σφάλμα.";
  const name = error instanceof Error ? error.name : "";

  if (name === "PublicationRevisionConflictError") {
    return NextResponse.json({ error: message }, { status: 409 });
  }
  if (name === "PublicationStorageUnavailableError") {
    return NextResponse.json({ error: message }, { status: 503 });
  }
  if (name === "ZodError") {
    return NextResponse.json(
      { error: "Τα στοιχεία της έκδοσης δεν είναι έγκυρα." },
      { status: 400 },
    );
  }

  console.error("PUBLICATION_ADMIN_ERROR", error);
  return NextResponse.json({ error: message }, { status: 500 });
}
