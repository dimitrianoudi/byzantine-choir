"use client";

import { FormEvent, useState } from "react";
import { Trash2, UserPlus, Users } from "lucide-react";
import type { ManagedMemberManifest } from "@/lib/members/types";

type Notice = {
  kind: "success" | "error";
  text: string;
} | null;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("el-GR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function MemberManager({
  initialManifest,
  configuredMemberEmails,
}: {
  initialManifest: ManagedMemberManifest;
  configuredMemberEmails: string[];
}) {
  const [manifest, setManifest] = useState(initialManifest);
  const [email, setEmail] = useState("");
  const [busyEmail, setBusyEmail] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const managedEmails = new Set(
    manifest.members.map((member) => member.email),
  );
  const serverMembers = configuredMemberEmails.filter(
    (configuredEmail) => !managedEmails.has(configuredEmail),
  );

  async function mutate(method: "POST" | "DELETE", targetEmail: string) {
    setBusyEmail(targetEmail);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/members", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: targetEmail,
          expectedRevision: manifest.revision,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        manifest?: ManagedMemberManifest;
        error?: string;
      };
      if (!response.ok || !payload.manifest) {
        throw new Error(
          payload.error || "Η ενέργεια δεν ολοκληρώθηκε. Δοκιμάστε ξανά.",
        );
      }

      setManifest(payload.manifest);
      if (method === "POST") {
        setEmail("");
        setNotice({
          kind: "success",
          text: `Το ${targetEmail.toLowerCase()} προστέθηκε ως μέλος.`,
        });
      } else {
        setNotice({
          kind: "success",
          text: `Η πρόσβαση του ${targetEmail} αφαιρέθηκε.`,
        });
      }
    } catch (error) {
      setNotice({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : "Παρουσιάστηκε απρόβλεπτο σφάλμα.",
      });
    } finally {
      setBusyEmail(null);
    }
  }

  async function addMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return;
    if (
      configuredMemberEmails.some(
        (configuredEmail) =>
          configuredEmail.toLowerCase() === normalizedEmail,
      )
    ) {
      setNotice({
        kind: "error",
        text: "Αυτό το email έχει ήδη πρόσβαση από τις ρυθμίσεις του server.",
      });
      return;
    }
    await mutate("POST", normalizedEmail);
  }

  async function removeMember(targetEmail: string) {
    if (
      !window.confirm(
        `Να αφαιρεθεί η πρόσβαση του ${targetEmail};`,
      )
    ) {
      return;
    }
    await mutate("DELETE", targetEmail);
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <Users size={28} className="text-blue" aria-hidden="true" />
          <h1 className="font-heading text-blue text-2xl font-bold">
            Διαχείριση Μελών
          </h1>
        </div>
        <p className="max-w-2xl text-sm text-muted">
          Προσθέστε το email του Google λογαριασμού του σπουδαστή.
        </p>
      </header>

      <section className="card p-4 sm:p-5">
        <form
          onSubmit={addMember}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <label className="min-w-0 flex-1">
            <span className="mb-1.5 block font-medium text-[var(--text)]">
              Email νέου μέλους
            </span>
            <input
              className="input input--full"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="student@gmail.com"
              autoComplete="email"
              inputMode="email"
              required
              disabled={busyEmail !== null}
            />
          </label>
          <button
            className="btn btn-gold shrink-0"
            type="submit"
            disabled={!email.trim() || busyEmail !== null}
          >
            <UserPlus size={18} aria-hidden="true" />
            {busyEmail && email.trim().toLowerCase() === busyEmail
              ? "Προσθήκη…"
              : "Προσθήκη μέλους"}
          </button>
        </form>

        {notice && (
          <p
            className={`mt-3 text-sm ${
              notice.kind === "error" ? "text-red" : "text-blue"
            }`}
            role={notice.kind === "error" ? "alert" : "status"}
            aria-live="polite"
          >
            {notice.text}
          </p>
        )}
      </section>

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-subtle px-4 py-3 sm:px-5">
          <h2 className="text-lg font-semibold">Μέλη</h2>
          <span className="badge">
            {manifest.members.length + serverMembers.length}
          </span>
        </div>

        {manifest.members.length === 0 && serverMembers.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted sm:px-5">
            Δεν έχουν προστεθεί μέλη ακόμη.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left text-muted">
                  <th className="px-4 py-3 font-medium sm:px-5">Email</th>
                  <th className="px-4 py-3 font-medium">Προστέθηκε</th>
                  <th className="px-4 py-3 font-medium">Από</th>
                  <th className="px-4 py-3 text-right font-medium sm:px-5">
                    Ενέργεια
                  </th>
                </tr>
              </thead>
              <tbody>
                {manifest.members.map((member) => (
                  <tr
                    key={member.email}
                    className="border-t border-subtle"
                  >
                    <td className="px-4 py-3 font-medium sm:px-5">
                      {member.email}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {formatDate(member.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {member.createdBy}
                    </td>
                    <td className="px-4 py-3 text-right sm:px-5">
                      <button
                        className="btn btn-outline btn-sm"
                        type="button"
                        onClick={() => removeMember(member.email)}
                        disabled={busyEmail !== null}
                        aria-label={`Αφαίρεση ${member.email}`}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                        {busyEmail === member.email
                          ? "Αφαίρεση…"
                          : "Αφαίρεση"}
                      </button>
                    </td>
                  </tr>
                ))}
                {serverMembers.map((serverEmail) => (
                  <tr
                    key={serverEmail}
                    className="border-t border-subtle"
                  >
                    <td className="px-4 py-3 font-medium sm:px-5">
                      {serverEmail}
                    </td>
                    <td className="px-4 py-3 text-muted">Ρύθμιση server</td>
                    <td className="px-4 py-3 text-muted">—</td>
                    <td className="px-4 py-3 text-right text-xs text-muted sm:px-5">
                      Διαχείριση μέσω environment variable
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
