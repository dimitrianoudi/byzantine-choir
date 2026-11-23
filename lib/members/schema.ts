import { z } from "zod";

export const managedMemberSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  createdAt: z.string().datetime(),
  createdBy: z.string().trim().email().transform((value) => value.toLowerCase()),
});

export const managedMemberManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    revision: z.number().int().nonnegative(),
    updatedAt: z.string().datetime(),
    members: z.array(managedMemberSchema).max(10_000),
  })
  .superRefine((manifest, context) => {
    const emails = new Set<string>();
    for (const member of manifest.members) {
      if (emails.has(member.email)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate member email: ${member.email}`,
          path: ["members"],
        });
      }
      emails.add(member.email);
    }
  });
