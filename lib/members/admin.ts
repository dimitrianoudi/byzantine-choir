import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { SITE_URL } from "@/lib/site";

export async function requireMemberAdmin() {
  const session = await getSession();
  if (!session.isLoggedIn || session.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export function rejectUnsafeMemberMutationOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin && process.env.NODE_ENV !== "production") return null;

  const allowedOrigins = new Set([
    new URL(request.url).origin,
    SITE_URL,
  ]);
  if (origin && allowedOrigins.has(origin)) return null;
  return NextResponse.json(
    { error: "Invalid request origin" },
    { status: 403 },
  );
}

export function memberApiError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : "Παρουσιάστηκε απρόβλεπτο σφάλμα.";
  const name = error instanceof Error ? error.name : "";

  if (name === "ManagedMemberRevisionConflictError") {
    return NextResponse.json({ error: message }, { status: 409 });
  }
  if (name === "ManagedMemberStorageUnavailableError") {
    return NextResponse.json({ error: message }, { status: 503 });
  }
  if (name === "ZodError") {
    return NextResponse.json(
      { error: "Το email δεν είναι έγκυρο." },
      { status: 400 },
    );
  }

  console.error("MEMBER_ADMIN_ERROR", error);
  return NextResponse.json({ error: message }, { status: 500 });
}
