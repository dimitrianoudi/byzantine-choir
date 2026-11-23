export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import {
  isEmailInDomain,
  normalizeEmail,
  splitEmailList,
} from "@/lib/members/access";
import {
  memberApiError,
  rejectUnsafeMemberMutationOrigin,
  requireMemberAdmin,
} from "@/lib/members/admin";
import {
  readManagedMemberManifestFresh,
  saveManagedMemberManifest,
} from "@/lib/members/repository";

const mutationSchema = z.object({
  email: z.string().trim().email(),
  expectedRevision: z.number().int().nonnegative(),
});

export async function GET() {
  const unauthorized = await requireMemberAdmin();
  if (unauthorized) return unauthorized;

  try {
    const stored = await readManagedMemberManifestFresh();
    return NextResponse.json(
      { manifest: stored.manifest, source: stored.source },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return memberApiError(error);
  }
}

export async function POST(request: Request) {
  const unauthorized = await requireMemberAdmin();
  if (unauthorized) return unauthorized;
  const unsafeOrigin = rejectUnsafeMemberMutationOrigin(request);
  if (unsafeOrigin) return unsafeOrigin;

  try {
    const input = mutationSchema.parse(await request.json());
    const email = normalizeEmail(input.email);
    if (!isEmailInDomain(email, process.env.ALLOWED_GOOGLE_DOMAIN)) {
      return NextResponse.json(
        {
          error: `Το email πρέπει να ανήκει στον τομέα ${process.env.ALLOWED_GOOGLE_DOMAIN}.`,
        },
        { status: 400 },
      );
    }

    if (splitEmailList(process.env.ADMIN_GOOGLE_EMAILS).includes(email)) {
      return NextResponse.json(
        { error: "Αυτό το email είναι ήδη διαχειριστής." },
        { status: 409 },
      );
    }
    if (splitEmailList(process.env.ALLOWED_GOOGLE_EMAILS).includes(email)) {
      return NextResponse.json(
        { error: "Αυτό το email έχει ήδη πρόσβαση από τις ρυθμίσεις του server." },
        { status: 409 },
      );
    }

    const session = await getSession();
    const createdBy = session.user?.email;
    if (!createdBy) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stored = await readManagedMemberManifestFresh();
    if (stored.manifest.members.some((member) => member.email === email)) {
      return NextResponse.json(
        { error: "Αυτό το email είναι ήδη μέλος." },
        { status: 409 },
      );
    }

    const manifest = await saveManagedMemberManifest(
      {
        ...stored.manifest,
        members: [
          ...stored.manifest.members,
          {
            email,
            createdAt: new Date().toISOString(),
            createdBy: normalizeEmail(createdBy),
          },
        ],
      },
      input.expectedRevision,
    );
    return NextResponse.json(
      { manifest },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return memberApiError(error);
  }
}

export async function DELETE(request: Request) {
  const unauthorized = await requireMemberAdmin();
  if (unauthorized) return unauthorized;
  const unsafeOrigin = rejectUnsafeMemberMutationOrigin(request);
  if (unsafeOrigin) return unsafeOrigin;

  try {
    const input = mutationSchema.parse(await request.json());
    const email = normalizeEmail(input.email);
    const stored = await readManagedMemberManifestFresh();
    if (!stored.manifest.members.some((member) => member.email === email)) {
      return NextResponse.json(
        { error: "Το μέλος δεν βρέθηκε." },
        { status: 404 },
      );
    }

    const manifest = await saveManagedMemberManifest(
      {
        ...stored.manifest,
        members: stored.manifest.members.filter(
          (member) => member.email !== email,
        ),
      },
      input.expectedRevision,
    );
    return NextResponse.json(
      { manifest },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return memberApiError(error);
  }
}
