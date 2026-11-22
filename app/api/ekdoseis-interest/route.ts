export const runtime = "nodejs";

import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { sendEmail } from "@/lib/email";
import { publications } from "@/lib/publications";

const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 5;
const MAX_BODY_BYTES = 16_000;

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimits = new Map<string, RateLimitEntry>();

const interestSchema = z
  .object({
    fullName: z.string().trim().min(2).max(200),
    phone: z.string().trim().max(80).optional().default(""),
    email: z
      .union([z.literal(""), z.string().trim().email().max(320)])
      .optional()
      .default(""),
    publicationId: z.string().trim().max(80).optional().default(""),
    message: z.string().trim().max(2000).optional().default(""),
    website: z.string().trim().max(300).optional().default(""),
    privacyAccepted: z.literal(true),
  })
  .superRefine((data, context) => {
    if (!data.phone && !data.email) {
      context.addIssue({
        code: "custom",
        path: ["phone"],
        message: "Απαιτείται τηλέφωνο ή email.",
      });
    }
  });

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function requestFingerprint(req: Request) {
  const forwardedFor = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address =
    forwardedFor || req.headers.get("x-real-ip") || "unknown-address";
  return createHash("sha256").update(address).digest("hex");
}

function checkRateLimit(fingerprint: string) {
  const now = Date.now();

  if (rateLimits.size > 1000) {
    for (const [key, entry] of rateLimits) {
      if (entry.resetAt <= now) rateLimits.delete(key);
    }
  }

  const current = rateLimits.get(fingerprint);
  if (!current || current.resetAt <= now) {
    rateLimits.set(fingerprint, {
      count: 1,
      resetAt: now + WINDOW_MS,
    });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (current.count >= MAX_REQUESTS_PER_WINDOW) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

function noStoreJson(
  body: Record<string, unknown>,
  init?: { status?: number; headers?: HeadersInit },
) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      "Cache-Control": "no-store",
      ...init?.headers,
    },
  });
}

export async function POST(req: Request) {
  const contentLength = Number(req.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return noStoreJson(
      { error: "Το μήνυμα είναι πολύ μεγάλο." },
      { status: 413 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return noStoreJson(
      { error: "Μη έγκυρα στοιχεία φόρμας." },
      { status: 400 },
    );
  }

  if (
    body &&
    typeof body === "object" &&
    "website" in body &&
    typeof body.website === "string" &&
    body.website.trim()
  ) {
    return noStoreJson({
      ok: true,
      message: "Ευχαριστούμε. Θα επικοινωνήσουμε μαζί σας σύντομα.",
    });
  }

  const rateLimit = checkRateLimit(requestFingerprint(req));
  if (!rateLimit.allowed) {
    return noStoreJson(
      {
        error:
          "Έχουν σταλεί πολλά μηνύματα σε σύντομο χρόνο. Παρακαλώ δοκιμάστε ξανά αργότερα.",
      },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      },
    );
  }

  const parsed = interestSchema.safeParse(body);
  if (!parsed.success) {
    return noStoreJson(
      {
        error:
          "Παρακαλώ συμπληρώστε ονοματεπώνυμο και τουλάχιστον τηλέφωνο ή email.",
      },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const publication = data.publicationId
    ? publications.find((item) => item.id === data.publicationId)
    : null;

  if (data.publicationId && !publication) {
    return noStoreJson(
      { error: "Η επιλεγμένη έκδοση δεν βρέθηκε." },
      { status: 400 },
    );
  }

  const publicationTitle = publication?.title || "Γενικά για τις εκδόσεις";
  const subject = publication
    ? `Εκδήλωση ενδιαφέροντος: ${publication.title}`
    : "Εκδήλωση ενδιαφέροντος για τις Εκδόσεις Ψαλτικής Παιδείας";
  const submittedAt = new Intl.DateTimeFormat("el-GR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Athens",
  }).format(new Date());

  const rows = [
    ["Ονοματεπώνυμο", data.fullName],
    ["Τηλέφωνο", data.phone || "—"],
    ["Email", data.email || "—"],
    ["Έκδοση", publicationTitle],
    ["Μήνυμα", data.message || "—"],
    ["Ημερομηνία", submittedAt],
  ] as const;

  const text = rows.map(([label, value]) => `${label}: ${value}`).join("\n");
  const htmlRows = rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:8px 10px;border-bottom:1px solid #e7ddc8;color:#6e665c;width:34%">${escapeHtml(label)}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #e7ddc8;color:#2b2b2b"><strong>${escapeHtml(value)}</strong></td>
        </tr>
      `,
    )
    .join("");

  const result = await sendEmail({
    to:
      process.env.PUBLICATIONS_INTEREST_EMAIL ||
      "psaltikievosmou@gmail.com",
    subject,
    text: `${subject}\n\n${text}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#2b2b2b">
        <h2 style="margin:0 0 12px;color:#5a1e2e">${escapeHtml(subject)}</h2>
        <p style="margin:0 0 18px;color:#6e665c">Νέα εκδήλωση ενδιαφέροντος από την ιστοσελίδα.</p>
        <table style="border-collapse:collapse;width:100%;max-width:720px;border:1px solid #e7ddc8">
          <tbody>${htmlRows}</tbody>
        </table>
      </div>
    `,
    replyTo: data.email || undefined,
  });

  if (!result.ok) {
    console.warn("PUBLICATION_INTEREST_EMAIL_FAILED", result.reason);
    return noStoreJson(
      {
        error:
          "Δεν ήταν δυνατή η αποστολή. Παρακαλώ δοκιμάστε ξανά ή επικοινωνήστε μέσω email.",
      },
      { status: 500 },
    );
  }

  return noStoreJson({
    ok: true,
    message: "Ευχαριστούμε. Θα επικοινωνήσουμε μαζί σας σύντομα.",
  });
}

