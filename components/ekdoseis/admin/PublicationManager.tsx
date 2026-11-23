"use client";

import { useMemo, useState } from "react";
import type {
  PublicationManifest,
  PublicationMediaRecord,
  PublicationRecord,
  PublicationSeriesRecord,
} from "@/lib/publications/types";

type Props = {
  initialManifest: PublicationManifest;
  initialSource: "s3" | "seed";
};

const inputClass =
  "mt-1 w-full rounded-xl border border-[#d8c9ad] bg-white px-3 py-2.5 text-sm text-[#2b2b2b] outline-none transition focus:border-[#8a6a2f] focus:ring-4 focus:ring-[#b8893a]/15";
const labelClass =
  "block text-xs font-bold uppercase tracking-[0.08em] text-[#6e665c]";

function newPublication(
  manifest: PublicationManifest,
): PublicationRecord {
  const now = new Date().toISOString();
  return {
    id: `pub-${crypto.randomUUID()}`,
    slug: "",
    order:
      Math.max(
        0,
        ...manifest.publications.map((item) => item.order),
      ) + 1,
    editionNumber: null,
    title: "",
    subtitle: "",
    audience: "adult",
    seriesId: manifest.series[0]?.id || "misc",
    pages: null,
    formats: ["Έντυπο"],
    description: "",
    status: "draft",
    catalogVisibility: "public",
    routeAccess: "public",
    landscapeCover: false,
    media: [],
    files: [],
    createdAt: now,
    updatedAt: now,
  };
}

function statusLabel(status: PublicationRecord["status"]) {
  if (status === "published") return "Δημοσιευμένη";
  if (status === "archived") return "Αρχειοθετημένη";
  return "Πρόχειρη";
}

async function readApiResponse(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Η ενέργεια απέτυχε.");
  }
  return data;
}

export default function PublicationManager({
  initialManifest,
  initialSource,
}: Props) {
  const [manifest, setManifest] =
    useState<PublicationManifest>(initialManifest);
  const [source, setSource] = useState(initialSource);
  const [selectedId, setSelectedId] = useState<string | null>(
    null,
  );
  const [draft, setDraft] = useState<PublicationRecord | null>(
    null,
  );
  const [isNew, setIsNew] = useState(false);
  const [search, setSearch] = useState("");
  const [seriesMode, setSeriesMode] = useState(false);
  const [seriesDraft, setSeriesDraft] = useState(
    initialManifest.series,
  );
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("el-GR");
    return manifest.publications
      .slice()
      .sort((left, right) => left.order - right.order)
      .filter(
        (publication) =>
          !query ||
          publication.title
            .toLocaleLowerCase("el-GR")
            .includes(query) ||
          publication.subtitle
            .toLocaleLowerCase("el-GR")
            .includes(query),
      );
  }, [manifest.publications, search]);

  const selectPublication = (publication: PublicationRecord) => {
    setSelectedId(publication.id);
    setDraft(structuredClone(publication));
    setIsNew(false);
    setSeriesMode(false);
    setMessage(null);
  };

  const beginNew = () => {
    const publication = newPublication(manifest);
    setSelectedId(publication.id);
    setDraft(publication);
    setIsNew(true);
    setSeriesMode(false);
    setMessage(null);
  };

  const replaceManifest = (next: PublicationManifest) => {
    setManifest(next);
    setSource("s3");
    if (selectedId) {
      const selected = next.publications.find(
        (item) => item.id === selectedId,
      );
      if (selected) setDraft(structuredClone(selected));
    }
  };

  const savePublication = async () => {
    if (!draft) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(
        isNew
          ? "/api/admin/ekdoseis"
          : `/api/admin/ekdoseis/${encodeURIComponent(draft.id)}`,
        {
          method: isNew ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            expectedRevision: manifest.revision,
            publication: draft,
          }),
        },
      );
      const data = await readApiResponse(response);
      setSelectedId(data.publication.id);
      setDraft(structuredClone(data.publication));
      setIsNew(false);
      replaceManifest(data.manifest);
      setMessage("Η έκδοση αποθηκεύτηκε.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Η αποθήκευση απέτυχε.",
      );
    } finally {
      setBusy(false);
    }
  };

  const archivePublication = async () => {
    if (!draft || isNew) return;
    if (
      !window.confirm(
        "Η έκδοση θα αρχειοθετηθεί και θα αφαιρεθεί από το δημόσιο site. Συνέχεια;",
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(
        `/api/admin/ekdoseis/${encodeURIComponent(draft.id)}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            expectedRevision: manifest.revision,
          }),
        },
      );
      const data = await readApiResponse(response);
      replaceManifest(data.manifest);
      setMessage("Η έκδοση αρχειοθετήθηκε.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Η ενέργεια απέτυχε.",
      );
    } finally {
      setBusy(false);
    }
  };

  const uploadImage = async (
    file: File,
    kind: "cover" | "gallery",
  ) => {
    if (!draft) return;
    setUploading(true);
    setMessage(null);
    try {
      const signResponse = await fetch(
        "/api/admin/ekdoseis/media/sign",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            publicationId: draft.id,
            filename: file.name,
            mime: file.type,
            size: file.size,
          }),
        },
      );
      const signed = await readApiResponse(signResponse);
      const form = new FormData();
      form.append("file", file);
      form.append("api_key", signed.apiKey);
      form.append("timestamp", String(signed.timestamp));
      form.append("signature", signed.signature);
      form.append("public_id", signed.publicId);
      const uploadResponse = await fetch(signed.uploadUrl, {
        method: "POST",
        body: form,
      });
      const uploaded = await readApiResponse(uploadResponse);
      const media: PublicationMediaRecord = {
        id:
          kind === "cover"
            ? "cover"
            : `image-${crypto.randomUUID()}`,
        label: kind === "cover" ? "Εξώφυλλο" : "Δείγμα",
        url: uploaded.secure_url,
        storage: "cloudinary",
        publicId: uploaded.public_id,
        width: uploaded.width,
        height: uploaded.height,
      };
      setDraft((current) => {
        if (!current) return current;
        const withoutCover =
          kind === "cover"
            ? current.media.filter((item) => item.id !== "cover")
            : current.media;
        return {
          ...current,
          media:
            kind === "cover"
              ? [media, ...withoutCover]
              : [...withoutCover, media],
        };
      });
      setMessage("Η εικόνα ανέβηκε. Πατήστε Αποθήκευση.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Το ανέβασμα απέτυχε.",
      );
    } finally {
      setUploading(false);
    }
  };

  const uploadFile = async (file: File) => {
    if (!draft) return;
    setUploading(true);
    setMessage(null);
    try {
      const mime = file.name.toLowerCase().endsWith(".epub")
        ? "application/epub+zip"
        : file.type || "application/pdf";
      const signResponse = await fetch(
        "/api/admin/ekdoseis/files",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            publicationId: draft.id,
            filename: file.name,
            mime,
            size: file.size,
          }),
        },
      );
      const signed = await readApiResponse(signResponse);
      const uploadResponse = await fetch(signed.url, {
        method: "PUT",
        headers: { "Content-Type": signed.contentType },
        body: file,
      });
      if (!uploadResponse.ok) {
        throw new Error("Η μεταφόρτωση του αρχείου απέτυχε.");
      }
      setDraft((current) =>
        current
          ? {
              ...current,
              files: [
                ...current.files,
                {
                  id: `file-${crypto.randomUUID()}`,
                  name: file.name,
                  format:
                    mime === "application/pdf" ? "PDF" : "EPUB",
                  mime,
                  key: signed.key,
                  size: file.size,
                  access: "hidden",
                },
              ],
            }
          : current,
      );
      setMessage(
        "Το αρχείο ανέβηκε ως κρυφό. Επιλέξτε πρόσβαση και αποθηκεύστε.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Το ανέβασμα απέτυχε.",
      );
    } finally {
      setUploading(false);
    }
  };

  const moveMedia = (index: number, direction: -1 | 1) => {
    if (!draft) return;
    const target = index + direction;
    if (target < 0 || target >= draft.media.length) return;
    const media = draft.media.slice();
    [media[index], media[target]] = [media[target], media[index]];
    setDraft({ ...draft, media });
  };

  const saveSeries = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(
        "/api/admin/ekdoseis/series",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            expectedRevision: manifest.revision,
            series: seriesDraft,
          }),
        },
      );
      const data = await readApiResponse(response);
      replaceManifest(data.manifest);
      setSeriesDraft(data.manifest.series);
      setMessage("Οι σειρές αποθηκεύτηκαν.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Η αποθήκευση απέτυχε.",
      );
    } finally {
      setBusy(false);
    }
  };

  const addSeries = () => {
    setSeriesDraft((current) => [
      ...current,
      {
        id: `series-${crypto.randomUUID().slice(0, 8)}`,
        name: "Νέα σειρά",
        color: "#5A1E2E",
        order: Math.max(0, ...current.map((item) => item.order)) + 1,
      },
    ]);
  };

  const initializeCatalog = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(
        "/api/admin/ekdoseis/migrate",
        { method: "POST" },
      );
      const data = await readApiResponse(response);
      replaceManifest(data.manifest);
      setMessage("Ο δυναμικός κατάλογος ενεργοποιήθηκε στο S3.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Η ενεργοποίηση απέτυχε.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <header className="rounded-[1.4rem] border border-[#e3d5bc] bg-[#f6f1e7] p-5 shadow-[0_12px_32px_rgba(67,45,26,0.08)] sm:p-7">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8a6a2f]">
          Διαχείριση
        </p>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-heading text-3xl font-bold text-[#5a1e2e] sm:text-4xl">
              Εκδόσεις
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6e665c]">
              Δημιουργία, επεξεργασία και δημοσίευση βιβλίων χωρίς
              αλλαγές στον κώδικα.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setSeriesMode(true);
                setSeriesDraft(manifest.series);
                setDraft(null);
              }}
              className="rounded-xl border border-[#cdbb98] bg-white px-4 py-2.5 text-sm font-semibold text-[#5a1e2e]"
            >
              Διαχείριση σειρών
            </button>
            <button
              type="button"
              onClick={beginNew}
              className="rounded-xl bg-[#5a1e2e] px-4 py-2.5 text-sm font-semibold text-white"
            >
              Νέα έκδοση
            </button>
          </div>
        </div>
        {source === "seed" && (
          <div className="mt-4 flex flex-col gap-3 rounded-xl border border-[#e0c78f] bg-[#fff8e8] px-4 py-3 text-sm text-[#6d511b] sm:flex-row sm:items-center sm:justify-between">
            <p>
              Προβάλλονται τα αρχικά δεδομένα. Ενεργοποιήστε τον
              δυναμικό κατάλογο πριν από την πρώτη αλλαγή.
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={initializeCatalog}
              className="shrink-0 rounded-lg bg-[#8a6a2f] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              Ενεργοποίηση
            </button>
          </div>
        )}
      </header>

      {message && (
        <div
          role="status"
          className="rounded-xl border border-[#d8c9ad] bg-white px-4 py-3 text-sm text-[#5a1e2e]"
        >
          {message}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[310px_minmax(0,1fr)]">
        <aside className="self-start rounded-[1.2rem] border border-[#e7ddc8] bg-white p-4 shadow-[0_8px_24px_rgba(67,45,26,0.07)] lg:sticky lg:top-4">
          <label className={labelClass}>
            Αναζήτηση
            <input
              className={inputClass}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Τίτλος έκδοσης"
            />
          </label>
          <p className="mt-3 text-xs text-[#6e665c]">
            {filtered.length} εκδόσεις · revision {manifest.revision}
          </p>
          <div className="mt-4 max-h-[65vh] space-y-2 overflow-y-auto pr-1">
            {filtered.map((publication) => (
              <button
                key={publication.id}
                type="button"
                onClick={() => selectPublication(publication)}
                className={`w-full rounded-xl border p-3 text-left transition ${
                  selectedId === publication.id
                    ? "border-[#8a6a2f] bg-[#fbf6ea]"
                    : "border-[#eadfcb] bg-white hover:border-[#c9ad78]"
                }`}
              >
                <span className="block text-xs font-semibold text-[#8a6a2f]">
                  #{publication.order} · {statusLabel(publication.status)}
                </span>
                <span className="mt-1 block text-sm font-semibold leading-5 text-[#2b2b2b]">
                  {publication.title}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <main>
          {seriesMode ? (
            <SeriesEditor
              series={seriesDraft}
              publications={manifest.publications}
              busy={busy}
              onChange={setSeriesDraft}
              onAdd={addSeries}
              onSave={saveSeries}
            />
          ) : draft ? (
            <PublicationEditor
              draft={draft}
              series={manifest.series}
              isNew={isNew}
              busy={busy}
              uploading={uploading}
              onChange={setDraft}
              onSave={savePublication}
              onArchive={archivePublication}
              onUploadImage={uploadImage}
              onUploadFile={uploadFile}
              onMoveMedia={moveMedia}
            />
          ) : (
            <div className="rounded-[1.2rem] border border-dashed border-[#d8c9ad] bg-[#fbf8f1] p-10 text-center text-[#6e665c]">
              Επιλέξτε μία έκδοση ή δημιουργήστε καινούργια.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function PublicationEditor({
  draft,
  series,
  isNew,
  busy,
  uploading,
  onChange,
  onSave,
  onArchive,
  onUploadImage,
  onUploadFile,
  onMoveMedia,
}: {
  draft: PublicationRecord;
  series: PublicationSeriesRecord[];
  isNew: boolean;
  busy: boolean;
  uploading: boolean;
  onChange: (publication: PublicationRecord) => void;
  onSave: () => void;
  onArchive: () => void;
  onUploadImage: (file: File, kind: "cover" | "gallery") => void;
  onUploadFile: (file: File) => void;
  onMoveMedia: (index: number, direction: -1 | 1) => void;
}) {
  const cover = draft.media.find((item) => item.id === "cover");
  const update = <Key extends keyof PublicationRecord>(
    key: Key,
    value: PublicationRecord[Key],
  ) => onChange({ ...draft, [key]: value });

  return (
    <div className="space-y-6">
      <section className="rounded-[1.2rem] border border-[#e7ddc8] bg-white p-5 shadow-[0_8px_24px_rgba(67,45,26,0.07)] sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#8a6a2f]">
              {isNew ? "Νέα έκδοση" : `ID: ${draft.id}`}
            </p>
            <h2 className="mt-1 font-heading text-2xl font-bold text-[#5a1e2e]">
              {draft.title || "Χωρίς τίτλο"}
            </h2>
            {!isNew && (
              <p className="mt-1 break-all text-xs text-[#6e665c]">
                /ekdoseis/{draft.slug}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {!isNew && draft.status !== "archived" && (
              <button
                type="button"
                onClick={onArchive}
                disabled={busy}
                className="rounded-xl border border-[#b95b5b] bg-white px-4 py-2 text-sm font-semibold text-[#8b1a1a] disabled:opacity-50"
              >
                Αρχειοθέτηση
              </button>
            )}
            <button
              type="button"
              onClick={onSave}
              disabled={busy || uploading}
              className="rounded-xl bg-[#5a1e2e] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? "Αποθήκευση…" : "Αποθήκευση"}
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className={`${labelClass} sm:col-span-2`}>
            Τίτλος *
            <input
              className={inputClass}
              value={draft.title}
              onChange={(event) => update("title", event.target.value)}
            />
          </label>
          <label className={`${labelClass} sm:col-span-2`}>
            Υπότιτλος
            <input
              className={inputClass}
              value={draft.subtitle}
              onChange={(event) =>
                update("subtitle", event.target.value)
              }
            />
          </label>
          <label className={labelClass}>
            Κοινό
            <select
              className={inputClass}
              value={draft.audience}
              onChange={(event) =>
                update(
                  "audience",
                  event.target.value as PublicationRecord["audience"],
                )
              }
            >
              <option value="adult">Ενήλικες</option>
              <option value="kids">Παιδιά</option>
            </select>
          </label>
          <label className={labelClass}>
            Σειρά
            <select
              className={inputClass}
              value={draft.seriesId}
              onChange={(event) =>
                update("seriesId", event.target.value)
              }
            >
              {series
                .slice()
                .sort((left, right) => left.order - right.order)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
            </select>
          </label>
          <label className={labelClass}>
            Αριθμός έκδοσης
            <input
              className={inputClass}
              type="number"
              min={1}
              value={draft.editionNumber ?? ""}
              onChange={(event) =>
                update(
                  "editionNumber",
                  event.target.value
                    ? Number(event.target.value)
                    : null,
                )
              }
            />
          </label>
          <label className={labelClass}>
            Σειρά εμφάνισης
            <input
              className={inputClass}
              type="number"
              min={0}
              value={draft.order}
              onChange={(event) =>
                update("order", Number(event.target.value))
              }
            />
          </label>
          <label className={labelClass}>
            Σελίδες
            <input
              className={inputClass}
              type="number"
              min={1}
              value={draft.pages ?? ""}
              onChange={(event) =>
                update(
                  "pages",
                  event.target.value ? Number(event.target.value) : null,
                )
              }
            />
          </label>
          <label className={labelClass}>
            Μορφές, χωρισμένες με κόμμα
            <input
              className={inputClass}
              value={draft.formats.join(", ")}
              onChange={(event) =>
                update(
                  "formats",
                  event.target.value
                    .split(",")
                    .map((value) => value.trim())
                    .filter(Boolean),
                )
              }
            />
          </label>
          <label className={`${labelClass} sm:col-span-2`}>
            Περιγραφή *
            <textarea
              className={`${inputClass} min-h-36 resize-y`}
              value={draft.description}
              onChange={(event) =>
                update("description", event.target.value)
              }
            />
          </label>
        </div>
      </section>

      <section className="grid gap-6 rounded-[1.2rem] border border-[#e7ddc8] bg-[#fbf8f1] p-5 sm:grid-cols-2 sm:p-6">
        <div>
          <h3 className="font-heading text-xl font-bold text-[#5a1e2e]">
            Δημοσίευση
          </h3>
          <div className="mt-4 space-y-4">
            <label className={labelClass}>
              Κατάσταση
              <select
                className={inputClass}
                value={draft.status}
                onChange={(event) =>
                  update(
                    "status",
                    event.target.value as PublicationRecord["status"],
                  )
                }
              >
                <option value="draft">Πρόχειρη</option>
                <option value="published">Δημοσιευμένη</option>
                <option value="archived">Αρχειοθετημένη</option>
              </select>
            </label>
            <label className={labelClass}>
              Εμφάνιση στον κατάλογο
              <select
                className={inputClass}
                value={draft.catalogVisibility}
                onChange={(event) =>
                  update(
                    "catalogVisibility",
                    event.target
                      .value as PublicationRecord["catalogVisibility"],
                  )
                }
              >
                <option value="public">Σε όλους</option>
                <option value="authenticated">
                  Μόνο σε συνδεδεμένους
                </option>
              </select>
            </label>
            <label className={labelClass}>
              Πρόσβαση στη σελίδα
              <select
                className={inputClass}
                value={draft.routeAccess}
                onChange={(event) =>
                  update(
                    "routeAccess",
                    event.target
                      .value as PublicationRecord["routeAccess"],
                  )
                }
              >
                <option value="public">Σε όλους</option>
                <option value="authenticated">
                  Μόνο σε συνδεδεμένους
                </option>
              </select>
            </label>
            <label className="flex items-center gap-3 text-sm text-[#45413b]">
              <input
                type="checkbox"
                checked={draft.landscapeCover}
                onChange={(event) =>
                  update("landscapeCover", event.target.checked)
                }
              />
              Οριζόντιο εξώφυλλο
            </label>
          </div>
        </div>
        <div>
          <h3 className="font-heading text-xl font-bold text-[#5a1e2e]">
            Προεπισκόπηση κάρτας
          </h3>
          <div className="mt-4 max-w-56 rounded-2xl border border-[#e7ddc8] bg-white p-3 shadow-sm">
            <div className="aspect-[3/4] overflow-hidden rounded-xl bg-[#eee8dc]">
              {cover ? (
                <img
                  src={cover.url}
                  alt=""
                  className={`h-full w-full ${
                    draft.landscapeCover
                      ? "object-contain p-3"
                      : "object-cover"
                  }`}
                />
              ) : (
                <div className="flex h-full items-center justify-center px-4 text-center text-xs text-[#8b8276]">
                  Ανεβάστε εξώφυλλο
                </div>
              )}
            </div>
            <p className="mt-3 font-heading text-lg font-bold leading-5 text-[#5a1e2e]">
              {draft.title || "Τίτλος έκδοσης"}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[1.2rem] border border-[#e7ddc8] bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-heading text-xl font-bold text-[#5a1e2e]">
              Εικόνες
            </h3>
            <p className="mt-1 text-sm text-[#6e665c]">
              Απαιτείται εξώφυλλο. Οι υπόλοιπες εικόνες εμφανίζονται
              με τη σειρά που ορίζετε.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <UploadButton
              label={cover ? "Αλλαγή εξωφύλλου" : "Εξώφυλλο"}
              accept="image/jpeg,image/png,image/webp"
              disabled={uploading}
              onFile={(file) => onUploadImage(file, "cover")}
            />
            <UploadButton
              label="Προσθήκη εικόνας"
              accept="image/jpeg,image/png,image/webp"
              disabled={uploading}
              onFile={(file) => onUploadImage(file, "gallery")}
            />
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {draft.media.map((media, index) => (
            <div
              key={media.id}
              className="flex gap-3 rounded-xl border border-[#eadfcb] p-3"
            >
              <img
                src={media.url}
                alt=""
                className="h-24 w-20 rounded-lg bg-[#f6f1e7] object-contain"
              />
              <div className="min-w-0 flex-1">
                <input
                  className={inputClass}
                  value={media.label}
                  onChange={(event) =>
                    update(
                      "media",
                      draft.media.map((item) =>
                        item.id === media.id
                          ? { ...item, label: event.target.value }
                          : item,
                      ),
                    )
                  }
                />
                <div className="mt-2 flex flex-wrap gap-1">
                  <button
                    type="button"
                    className="rounded-lg border px-2 py-1 text-xs"
                    onClick={() => onMoveMedia(index, -1)}
                    disabled={index === 0}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border px-2 py-1 text-xs"
                    onClick={() => onMoveMedia(index, 1)}
                    disabled={index === draft.media.length - 1}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-[#d6a6a6] px-2 py-1 text-xs text-[#8b1a1a]"
                    onClick={() =>
                      update(
                        "media",
                        draft.media.filter(
                          (item) => item.id !== media.id,
                        ),
                      )
                    }
                  >
                    Αφαίρεση
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[1.2rem] border border-[#e7ddc8] bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-heading text-xl font-bold text-[#5a1e2e]">
              PDF και EPUB
            </h3>
            <p className="mt-1 text-sm text-[#6e665c]">
              Κάθε αρχείο μπορεί να είναι δημόσιο, μόνο για
              συνδεδεμένους ή κρυφό.
            </p>
          </div>
          <UploadButton
            label="Ανέβασμα αρχείου"
            accept=".pdf,.epub,application/pdf,application/epub+zip"
            disabled={uploading}
            onFile={onUploadFile}
          />
        </div>
        <div className="mt-5 space-y-3">
          {draft.files.length === 0 && (
            <p className="text-sm text-[#8b8276]">
              Δεν έχουν προστεθεί αρχεία.
            </p>
          )}
          {draft.files.map((file) => (
            <div
              key={file.id}
              className="grid gap-3 rounded-xl border border-[#eadfcb] p-3 sm:grid-cols-[1fr_190px_auto] sm:items-center"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#2b2b2b]">
                  {file.name}
                </p>
                <p className="text-xs text-[#6e665c]">
                  {file.format}
                  {file.size
                    ? ` · ${(file.size / 1024 / 1024).toFixed(1)} MB`
                    : ""}
                </p>
              </div>
              <select
                className={inputClass}
                value={file.access}
                onChange={(event) =>
                  update(
                    "files",
                    draft.files.map((item) =>
                      item.id === file.id
                        ? {
                            ...item,
                            access: event.target
                              .value as typeof item.access,
                          }
                        : item,
                    ),
                  )
                }
              >
                <option value="hidden">Κρυφό</option>
                <option value="public">Δημόσιο</option>
                <option value="authenticated">
                  Μόνο συνδεδεμένοι
                </option>
              </select>
              <button
                type="button"
                className="rounded-lg border border-[#d6a6a6] px-3 py-2 text-xs font-semibold text-[#8b1a1a]"
                onClick={() =>
                  update(
                    "files",
                    draft.files.filter((item) => item.id !== file.id),
                  )
                }
              >
                Αφαίρεση
              </button>
            </div>
          ))}
        </div>
      </section>

      {draft.comicReader && (
        <section className="rounded-[1.2rem] border border-[#d8c9ad] bg-[#fff8e8] p-5 text-sm text-[#6d511b]">
          Ο υπάρχων διαδραστικός reader διατηρείται με{" "}
          {draft.comicReader.pages.length} σελίδες. Η επεξεργασία
          καρέ δεν είναι διαθέσιμη από αυτόν τον editor.
        </section>
      )}
    </div>
  );
}

function UploadButton({
  label,
  accept,
  disabled,
  onFile,
}: {
  label: string;
  accept: string;
  disabled: boolean;
  onFile: (file: File) => void;
}) {
  return (
    <label className="cursor-pointer rounded-xl border border-[#cdbb98] bg-white px-4 py-2 text-sm font-semibold text-[#5a1e2e] has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50">
      {disabled ? "Ανέβασμα…" : label}
      <input
        type="file"
        className="sr-only"
        accept={accept}
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          event.target.value = "";
        }}
      />
    </label>
  );
}

function SeriesEditor({
  series,
  publications,
  busy,
  onChange,
  onAdd,
  onSave,
}: {
  series: PublicationSeriesRecord[];
  publications: PublicationRecord[];
  busy: boolean;
  onChange: (series: PublicationSeriesRecord[]) => void;
  onAdd: () => void;
  onSave: () => void;
}) {
  const updateSeries = (
    id: string,
    patch: Partial<PublicationSeriesRecord>,
  ) =>
    onChange(
      series.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    );

  return (
    <section className="rounded-[1.2rem] border border-[#e7ddc8] bg-white p-5 shadow-[0_8px_24px_rgba(67,45,26,0.07)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl font-bold text-[#5a1e2e]">
            Σειρές εκδόσεων
          </h2>
          <p className="mt-1 text-sm text-[#6e665c]">
            Αλλάξτε όνομα, χρώμα και σειρά ή προσθέστε νέα σειρά.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onAdd}
            className="rounded-xl border border-[#cdbb98] bg-white px-4 py-2 text-sm font-semibold text-[#5a1e2e]"
          >
            Νέα σειρά
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={busy}
            className="rounded-xl bg-[#5a1e2e] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Αποθήκευση
          </button>
        </div>
      </div>
      <div className="mt-6 space-y-3">
        {series
          .slice()
          .sort((left, right) => left.order - right.order)
          .map((item) => {
            const inUse = publications.some(
              (publication) => publication.seriesId === item.id,
            );
            return (
              <div
                key={item.id}
                className="grid gap-3 rounded-xl border border-[#eadfcb] p-3 sm:grid-cols-[1fr_110px_90px_auto] sm:items-end"
              >
                <label className={labelClass}>
                  Όνομα
                  <input
                    className={inputClass}
                    value={item.name}
                    onChange={(event) =>
                      updateSeries(item.id, {
                        name: event.target.value,
                      })
                    }
                  />
                </label>
                <label className={labelClass}>
                  Χρώμα
                  <input
                    className={`${inputClass} h-11`}
                    type="color"
                    value={item.color}
                    onChange={(event) =>
                      updateSeries(item.id, {
                        color: event.target.value,
                      })
                    }
                  />
                </label>
                <label className={labelClass}>
                  Σειρά
                  <input
                    className={inputClass}
                    type="number"
                    min={0}
                    value={item.order}
                    onChange={(event) =>
                      updateSeries(item.id, {
                        order: Number(event.target.value),
                      })
                    }
                  />
                </label>
                <button
                  type="button"
                  disabled={inUse}
                  title={
                    inUse
                      ? "Η σειρά χρησιμοποιείται από εκδόσεις"
                      : "Διαγραφή σειράς"
                  }
                  className="rounded-lg border border-[#d6a6a6] px-3 py-2 text-xs font-semibold text-[#8b1a1a] disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={() =>
                    onChange(
                      series.filter((seriesItem) => seriesItem.id !== item.id),
                    )
                  }
                >
                  Διαγραφή
                </button>
              </div>
            );
          })}
      </div>
    </section>
  );
}
