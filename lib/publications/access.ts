import type { SessionData } from "@/lib/session";
import type {
  PublicationFileRecord,
  PublicationRecord,
} from "@/lib/publications/types";

export function isPublicationAdmin(
  session: Pick<SessionData, "isLoggedIn" | "user">,
) {
  return (
    session.isLoggedIn && session.user?.role === "admin"
  );
}

function visibilityAllows(
  visibility: "public" | "authenticated",
  session: Pick<SessionData, "isLoggedIn">,
) {
  return visibility === "public" || session.isLoggedIn;
}

export function canListPublication(
  publication: Pick<
    PublicationRecord,
    "status" | "catalogVisibility"
  >,
  session: Pick<SessionData, "isLoggedIn">,
) {
  return (
    publication.status === "published" &&
    visibilityAllows(publication.catalogVisibility, session)
  );
}

export function canAccessPublication(
  publication: Pick<
    PublicationRecord,
    "status" | "routeAccess"
  >,
  session: Pick<SessionData, "isLoggedIn">,
) {
  return (
    publication.status === "published" &&
    visibilityAllows(publication.routeAccess, session)
  );
}

export function canDownloadPublicationFile(
  file: PublicationFileRecord,
  session: Pick<SessionData, "isLoggedIn">,
) {
  if (file.access === "hidden") return false;
  return file.access === "public" || session.isLoggedIn;
}
