export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { BUCKET, s3 } from "@/lib/s3";
import { getPublicationCatalog } from "@/lib/publications";
import {
  canAccessPublication,
  canDownloadPublicationFile,
} from "@/lib/publications/access";
import { getSession } from "@/lib/session";

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string; fileId: string }>;
  },
) {
  const [{ id, fileId }, session, catalog] = await Promise.all([
    params,
    getSession(),
    getPublicationCatalog(),
  ]);
  const publication = catalog.publications.find(
    (item) => item.id === id,
  );
  if (
    !publication ||
    !canAccessPublication(publication, session)
  ) {
    return NextResponse.json(
      { error: "Not found" },
      { status: 404 },
    );
  }

  const file = publication.files.find((item) => item.id === fileId);
  if (!file || !canDownloadPublicationFile(file, session)) {
    return NextResponse.json(
      { error: "Not found" },
      { status: 404 },
    );
  }
  if (
    !BUCKET ||
    !file.key.startsWith(`publications/${publication.id}/files/`)
  ) {
    return NextResponse.json(
      { error: "File unavailable" },
      { status: 503 },
    );
  }

  const disposition = `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`;
  const url = await getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: file.key,
      ResponseContentType: file.mime,
      ResponseContentDisposition: disposition,
    }),
    { expiresIn: 5 * 60 },
  );
  return NextResponse.redirect(url, {
    status: 302,
    headers: { "Cache-Control": "private, no-store" },
  });
}
