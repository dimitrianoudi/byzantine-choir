import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  publicationManifestSchema,
  publicationRecordSchema,
} from "../lib/publications/schema.ts";
import {
  canAccessPublication,
  canDownloadPublicationFile,
  canListPublication,
} from "../lib/publications/access.ts";

const timestamp = "2026-01-01T00:00:00.000Z";

function publication(overrides = {}) {
  return {
    id: "pub-test",
    slug: "01-test-publication",
    order: 1,
    editionNumber: 1,
    title: "Test publication",
    subtitle: "",
    audience: "adult",
    seriesId: "test-series",
    pages: 10,
    formats: ["PDF"],
    description: "A complete publication description.",
    status: "published",
    catalogVisibility: "public",
    routeAccess: "public",
    landscapeCover: false,
    media: [
      {
        id: "cover",
        label: "Εξώφυλλο",
        url: "/ekdoseis/images/test.jpg",
        storage: "local",
      },
    ],
    files: [],
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

function manifest(publications = [publication()]) {
  return {
    schemaVersion: 1,
    revision: 0,
    audiences: {
      adult: { title: "Adults", subtitle: "" },
      kids: { title: "Children", subtitle: "" },
    },
    series: [
      {
        id: "test-series",
        name: "Test series",
        color: "#5A1E2E",
        order: 1,
      },
    ],
    publications,
    updatedAt: timestamp,
  };
}

test("publication manifest accepts valid dynamic data", () => {
  assert.equal(
    publicationManifestSchema.parse(manifest()).publications.length,
    1,
  );
});

test("publication schema requires cover media", () => {
  assert.throws(() =>
    publicationRecordSchema.parse(publication({ media: [] })),
  );
});

test("manifest rejects duplicate slugs and unknown series", () => {
  assert.throws(() =>
    publicationManifestSchema.parse(
      manifest([
        publication(),
        publication({
          id: "pub-test-2",
          order: 2,
          seriesId: "missing-series",
        }),
      ]),
    ),
  );
});

test("catalog and route visibility honor authentication", () => {
  const restricted = publication({
    catalogVisibility: "authenticated",
    routeAccess: "authenticated",
  });
  assert.equal(
    canListPublication(restricted, { isLoggedIn: false }),
    false,
  );
  assert.equal(
    canAccessPublication(restricted, { isLoggedIn: false }),
    false,
  );
  assert.equal(
    canListPublication(restricted, { isLoggedIn: true }),
    true,
  );
  assert.equal(
    canAccessPublication(restricted, { isLoggedIn: true }),
    true,
  );
  assert.equal(
    canListPublication(
      { ...restricted, status: "draft" },
      { isLoggedIn: true },
    ),
    false,
  );
});

test("file access supports public, member-only and hidden files", () => {
  const base = {
    id: "file-test",
    name: "test.pdf",
    format: "PDF",
    mime: "application/pdf",
    key: "publications/pub-test/files/test.pdf",
  };
  assert.equal(
    canDownloadPublicationFile(
      { ...base, access: "public" },
      { isLoggedIn: false },
    ),
    true,
  );
  assert.equal(
    canDownloadPublicationFile(
      { ...base, access: "authenticated" },
      { isLoggedIn: false },
    ),
    false,
  );
  assert.equal(
    canDownloadPublicationFile(
      { ...base, access: "authenticated" },
      { isLoggedIn: true },
    ),
    true,
  );
  assert.equal(
    canDownloadPublicationFile(
      { ...base, access: "hidden" },
      { isLoggedIn: true },
    ),
    false,
  );
});

test("checked-in migration source retains 35 books and 7 readers", async () => {
  const [books, readers] = await Promise.all([
    readFile(
      new URL("../data/ekdoseis/books.json", import.meta.url),
      "utf8",
    ).then(JSON.parse),
    readFile(
      new URL(
        "../data/ekdoseis/comics-frames.json",
        import.meta.url,
      ),
      "utf8",
    ).then(JSON.parse),
  ]);

  assert.equal(books.books.length, 35);
  assert.equal(Object.keys(readers).length, 7);
  assert.equal(
    new Set(books.books.map((book) => book.id)).size,
    35,
  );
  assert.equal(
    new Set(books.books.map((book) => book.order)).size,
    35,
  );
});
