export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sendEmail } from '@/lib/email';

const REGISTRATION_EMAIL = process.env.REGISTRATION_EMAIL || 'stathisnikolaos@gmail.com';

const gradeOptions = ["Α'", "Β'", "Γ'", "Δ'", "Ε'", "ΣΤ'"] as const;
const yesNoOptions = ['Όχι', 'Ναι'] as const;
const preferredDayOptions = [
  'Δευτέρα',
  'Τετάρτη',
  'Χωρίς προτίμηση',
  'Μπορούμε και τις δύο ημέρες',
  'Δεν γνωρίζουμε ακόμη',
] as const;
const preferredTimeOptions = [
  '16:30 - 17:15',
  '17:30 - 18:15',
  'Χωρίς προτίμηση',
  'Μπορούμε και στις δύο ώρες',
  'Δεν γνωρίζουμε ακόμη',
] as const;
const childChantingExperienceOptions = [
  'Όχι',
  'Ναι, λίγη επαφή',
  'Ναι, συμμετέχει ήδη σε αναλόγιο ή χορωδία',
] as const;
const campParticipationOptions = ['Ναι', 'Όχι', 'Δεν γνωρίζω ακόμη'] as const;
const notificationPreferenceOptions = [
  'Ναι, μέσω τηλεφώνου',
  'Ναι, μέσω email',
  'Ναι, μέσω Viber / WhatsApp',
  'Όχι',
] as const;
const chantingExperienceOptions = [
  'Καμία εμπειρία',
  'Λίγη εμπειρία',
  'Μέτρια εμπειρία',
  'Προχωρημένη εμπειρία',
] as const;
const serviceInterestOptions = [
  'Εκμάθηση ψαλτικής',
  'Συμμετοχή στο αναλόγιο',
  'Θεωρία και πράξη',
  'Γνωριμία με τη βυζαντινή μουσική',
] as const;

const requiredText = z.string().trim().min(1).max(300);
const optionalText = z.string().trim().max(2000).optional().default('');
const optionalShortText = z.string().trim().max(300).optional().default('');

const baseSchema = z.object({
  contactPhone: requiredText,
  contactEmail: z.string().trim().email().max(300),
  preferredDay: z.enum(preferredDayOptions),
  preferredTime: z.enum(preferredTimeOptions),
  notes: optionalText,
  website: optionalShortText,
});

const kidsSchema = baseSchema.extend({
  kind: z.literal('kids'),
  childName: requiredText,
  childBirthDate: requiredText,
  childAge: requiredText,
  school: optionalShortText,
  grade: z.enum(gradeOptions),
  guardianName: requiredText,
  area: requiredText,
  chantingExperience: z.enum(childChantingExperienceOptions),
  chantingExperienceDetails: optionalText,
  campParticipation: z.enum(campParticipationOptions),
  notificationPreference: z.enum(notificationPreferenceOptions),
  consentAccuracy: z.literal('on'),
  consentDataUse: z.literal('on'),
  consentInterestOnly: z.literal('on'),
});

const adultsSchema = baseSchema.extend({
  kind: z.literal('adults'),
  fullName: requiredText,
  birthYear: optionalShortText,
  address: optionalShortText,
  area: optionalShortText,
  postalCode: optionalShortText,
  chantingExperience: z.enum(chantingExperienceOptions),
  musicBackground: z.enum(yesNoOptions),
  musicBackgroundDetails: optionalShortText,
  serviceInterest: z.enum(serviceInterestOptions),
});

const registrationSchema = z.discriminatedUnion('kind', [kidsSchema, adultsSchema]);

type RegistrationData = z.infer<typeof registrationSchema>;
type EmailRow = [label: string, value: string];

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function submittedAt() {
  return new Intl.DateTimeFormat('el-GR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Athens',
  }).format(new Date());
}

function rowsForSubmission(data: RegistrationData): EmailRow[] {
  const commonRows: EmailRow[] = [
    ['Τηλέφωνο επικοινωνίας', data.contactPhone],
    ['E-mail', data.contactEmail],
    ['Προτιμώμενη ημέρα', data.preferredDay],
    ['Προτιμώμενη ώρα', data.preferredTime],
    ['Σχόλια / σημειώσεις', data.notes],
    ['Ημερομηνία υποβολής', submittedAt()],
  ];

  if (data.kind === 'kids') {
    return [
      ['Τύπος δήλωσης', 'Παιδικό Φροντιστήριο Ψαλτικής'],
      ['Ονοματεπώνυμο παιδιού', data.childName],
      ['Ημερομηνία γέννησης', data.childBirthDate],
      ['Ηλικία', data.childAge],
      ['Τάξη Δημοτικού 2026-2027', data.grade],
      ['Σχολείο', data.school],
      ['Ονοματεπώνυμο γονέα / κηδεμόνα', data.guardianName],
      ['Περιοχή κατοικίας', data.area],
      ...commonRows,
      ['Προηγούμενη επαφή με ψαλτική / αναλόγιο / χορωδία', data.chantingExperience],
      ['Λεπτομέρειες προηγούμενης επαφής', data.chantingExperienceDetails],
      ['Συμμετοχή στην κατασκήνωση «Άξιον Εστί»', data.campParticipation],
      ['Προτίμηση ενημέρωσης', data.notificationPreference],
      ['Συγκατάθεση: ακριβή στοιχεία', 'Ναι'],
      ['Συγκατάθεση: χρήση στοιχείων για οργάνωση/ενημέρωση', 'Ναι'],
      ['Συγκατάθεση: δήλωση ενδιαφέροντος, όχι οριστική εγγραφή', 'Ναι'],
    ];
  }

  return [
    ['Τύπος δήλωσης', 'Φροντιστήριο Ψαλτικής ενηλίκων'],
    ['Ονοματεπώνυμο', data.fullName],
    ['Έτος γέννησης', data.birthYear],
    ['Διεύθυνση', data.address],
    ['Περιοχή', data.area],
    ['Τ.Κ.', data.postalCode],
    ...commonRows,
    ['Εμπειρία στην ψαλτική', data.chantingExperience],
    ['Προηγούμενη μουσική εκπαίδευση', data.musicBackground],
    ['Στοιχεία μουσικής εκπαίδευσης', data.musicBackgroundDetails],
    ['Κύριο ενδιαφέρον', data.serviceInterest],
  ];
}

function buildEmail(data: RegistrationData) {
  const title =
    data.kind === 'kids'
      ? `Νέα δήλωση παιδιού: ${data.childName}`
      : `Νέα δήλωση ενηλίκου: ${data.fullName}`;
  const rows = rowsForSubmission(data);
  const text = rows.map(([label, value]) => `${label}: ${value || '-'}`).join('\n');
  const htmlRows = rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e5e7eb; color: #475569; width: 38%;">${escapeHtml(label)}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e5e7eb; color: #111827;"><strong>${escapeHtml(value || '-')}</strong></td>
        </tr>
      `,
    )
    .join('');

  return {
    subject: title,
    text: `${title}\n\n${text}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
        <h2 style="margin: 0 0 12px; color: #b4233d;">${escapeHtml(title)}</h2>
        <p style="margin: 0 0 18px; color: #475569;">Υποβλήθηκε νέα δήλωση ενδιαφέροντος από την ιστοσελίδα του Φροντιστηρίου Ψαλτικής.</p>
        <table style="border-collapse: collapse; width: 100%; max-width: 760px; border: 1px solid #e5e7eb;">
          <tbody>${htmlRows}</tbody>
        </table>
      </div>
    `,
  };
}

export async function POST(req: Request) {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Μη έγκυρα στοιχεία φόρμας.' }, { status: 400 });
  }

  if (body && typeof body === 'object' && 'website' in body && typeof body.website === 'string' && body.website) {
    return NextResponse.json({ ok: true, message: 'Η δήλωσή σας στάλθηκε με επιτυχία.' });
  }

  const parsed = registrationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Παρακαλώ ελέγξτε τα υποχρεωτικά πεδία και δοκιμάστε ξανά.' },
      { status: 400 },
    );
  }

  const email = buildEmail(parsed.data);
  const result = await sendEmail({
    to: REGISTRATION_EMAIL,
    subject: email.subject,
    text: email.text,
    html: email.html,
    replyTo: parsed.data.contactEmail,
  });

  if (!result.ok) {
    console.warn('REGISTRATION_EMAIL_FAILED', result.reason);
    return NextResponse.json(
      { error: 'Η φόρμα καταχωρήθηκε, αλλά δεν ήταν δυνατή η αποστολή email. Παρακαλώ δοκιμάστε ξανά.' },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    message: 'Η δήλωσή σας στάλθηκε με επιτυχία. Θα επικοινωνήσουμε μαζί σας σύντομα.',
  });
}
