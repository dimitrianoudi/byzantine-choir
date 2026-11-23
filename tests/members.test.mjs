import assert from "node:assert/strict";
import test from "node:test";
import {
  decideGoogleLoginAccess,
  splitEmailList,
} from "../lib/members/access.ts";
import { managedMemberManifestSchema } from "../lib/members/schema.ts";

const baseAccess = {
  allowedDomain: "",
  configuredMemberEmails: [],
  managedMemberEmails: [],
  adminEmails: ["admin@example.com"],
  managedAllowlistExists: true,
};

test("configured and managed emails receive member access", () => {
  assert.deepEqual(
    decideGoogleLoginAccess({
      ...baseAccess,
      email: "legacy@example.com",
      configuredMemberEmails: ["legacy@example.com"],
    }),
    { allowed: true, role: "member" },
  );
  assert.deepEqual(
    decideGoogleLoginAccess({
      ...baseAccess,
      email: "STUDENT@EXAMPLE.COM",
      managedMemberEmails: ["student@example.com"],
    }),
    { allowed: true, role: "member" },
  );
});

test("unknown emails are denied when a managed allowlist exists", () => {
  assert.deepEqual(
    decideGoogleLoginAccess({
      ...baseAccess,
      email: "unknown@example.com",
    }),
    { allowed: false, role: "member" },
  );
});

test("configured administrators retain the admin role", () => {
  assert.deepEqual(
    decideGoogleLoginAccess({
      ...baseAccess,
      email: "admin@example.com",
    }),
    { allowed: true, role: "admin" },
  );
});

test("the optional domain restriction applies to members and admins", () => {
  assert.equal(
    decideGoogleLoginAccess({
      ...baseAccess,
      email: "admin@example.com",
      allowedDomain: "school.example",
    }).allowed,
    false,
  );
  assert.equal(
    decideGoogleLoginAccess({
      ...baseAccess,
      email: "student@school.example",
      allowedDomain: "school.example",
      managedMemberEmails: ["student@school.example"],
    }).allowed,
    true,
  );
});

test("legacy open access remains when no allowlist exists", () => {
  assert.equal(
    decideGoogleLoginAccess({
      ...baseAccess,
      email: "anyone@example.com",
      managedAllowlistExists: false,
    }).allowed,
    true,
  );
});

test("email configuration and manifests normalize addresses", () => {
  assert.deepEqual(
    splitEmailList(" One@Example.com, two@example.com ,, "),
    ["one@example.com", "two@example.com"],
  );

  const parsed = managedMemberManifestSchema.parse({
    schemaVersion: 1,
    revision: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    members: [
      {
        email: " Student@Example.com ",
        createdAt: "2026-01-01T00:00:00.000Z",
        createdBy: " ADMIN@Example.com ",
      },
    ],
  });
  assert.equal(parsed.members[0].email, "student@example.com");
  assert.equal(parsed.members[0].createdBy, "admin@example.com");
});

test("member manifests reject duplicate email addresses", () => {
  assert.throws(() =>
    managedMemberManifestSchema.parse({
      schemaVersion: 1,
      revision: 1,
      updatedAt: "2026-01-01T00:00:00.000Z",
      members: [
        {
          email: "student@example.com",
          createdAt: "2026-01-01T00:00:00.000Z",
          createdBy: "admin@example.com",
        },
        {
          email: "STUDENT@example.com",
          createdAt: "2026-01-02T00:00:00.000Z",
          createdBy: "admin@example.com",
        },
      ],
    }),
  );
});
