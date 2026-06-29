export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sendEmail } from '@/lib/email';
import { getFormRecipientEmails } from '@/lib/formRecipients';

const satisfactionOptions = ['Καθόλου', 'Λίγο', 'Αρκετά', 'Πολύ', 'Πάρα πολύ'] as const;
const nextYearWishOption = z.enum([
  'Περισσότερη θεωρία',
  'Περισσότερη παραλλαγή',
  'Περισσότερη πρακτική ψαλμωδία',
  'Περισσότερες πρόβες χορού',
  'Περισσότερη συμμετοχή στο αναλόγιο',
  'Περισσότερες ηχογραφήσεις για μελέτη',
  'Περισσότερο έντυπο υλικό',
  'Περισσότερα παιδικά / εισαγωγικά τεύχη',
  'Περισσότερη οργάνωση ανά επίπεδο',
  'Περισσότερες ακολουθίες με συμμετοχή μαθητών',
]);

const feedbackSchema = z.object({
  website: z.string().trim().max(300).optional().default(''),
  contactEmail: z.string().trim().email().max(300),
  mainDepartment: z.enum([
    'Παιδικής φωνής / Μουσική Προπαιδεία',
    'Γυναικείας φωνής',
    'Ανδρικής φωνής',
    'Ακολουθίες Κυριακής / βοηθών αναλογίου',
    'Παρακολουθούσα περισσότερα από ένα τμήματα',
  ]),
  attendanceFrequency: z.enum([
    'Σχεδόν κάθε εβδομάδα',
    'Συχνά, αλλά με κάποιες απουσίες',
    'Περιστασιακά',
    'Λίγες φορές μέσα στη χρονιά',
  ]),
  chantStandParticipation: z.enum([
    'Ναι, συχνά',
    'Ναι, μερικές φορές',
    'Ναι, μόνο σε ειδικές περιόδους / εορτές',
    'Όχι, αλλά θα ήθελα στο μέλλον',
    'Όχι, δεν αισθάνομαι ακόμη έτοιμος/η',
  ]),
  overallSatisfaction: z.enum(satisfactionOptions),
  teachingClarity: z.enum(satisfactionOptions),
  byzantineMusicUnderstanding: z.enum(satisfactionOptions),
  notationReadingHelp: z.enum(satisfactionOptions),
  practicalChantingHelp: z.enum(satisfactionOptions),
  servicesConnectionHelp: z.enum(satisfactionOptions),
  communityClimate: z.enum(satisfactionOptions),
  churchLifeConnection: z.enum(satisfactionOptions),
  printedDigitalMaterialUsefulness: z.enum([
    'Καθόλου χρήσιμο',
    'Λίγο χρήσιμο',
    'Αρκετά χρήσιμο',
    'Πολύ χρήσιμο',
    'Πάρα πολύ χρήσιμο',
  ]),
  websiteAudioUsefulness: z.enum([
    'Δεν τα χρησιμοποίησα',
    'Λίγο χρήσιμες',
    'Αρκετά χρήσιμες',
    'Πολύ χρήσιμες',
    'Πάρα πολύ χρήσιμες',
  ]),
  curriculumPace: z.enum(['Πολύ αργός', 'Λίγο αργός', 'Κατάλληλος', 'Λίγο γρήγορος', 'Πολύ γρήγορος']),
  lessonDuration: z.enum(['Πολύ μικρή', 'Λίγο μικρή', 'Κατάλληλη', 'Λίγο μεγάλη', 'Πολύ μεγάλη']),
  mostHelpfulPart: z.enum([
    'Η θεωρία',
    'Η παραλλαγή',
    'Η πρακτική ψαλμωδία',
    'Η συμμετοχή στο αναλόγιο',
    'Οι ηχογραφήσεις / podcasts',
    'Η ατμόσφαιρα της ομάδας',
    'Όλα μαζί',
  ]),
  continueNextYear: z.enum(['Ναι, σίγουρα', 'Μάλλον ναι', 'Δεν είμαι ακόμη βέβαιος/η', 'Μάλλον όχι', 'Όχι']),
  nextYearWishes: z.preprocess(
    (value) => (typeof value === 'string' ? [value] : value),
    z.array(nextYearWishOption).min(1),
  ),
  preferredSchedule: z.enum([
    'Τετάρτη, όπως φέτος',
    'Δευτέρα',
    'Παρασκευή',
    'Κυριακή μετά τη Θεία Λειτουργία',
    'Συνδυασμός δύο ημερών',
    'Διαδικτυακή υποστήριξη μαζί με τα δια ζώσης μαθήματα',
    'Δεν γνωρίζω ακόμη',
  ]),
  freeResponse: z.string().trim().min(1).max(4000),
});

type FeedbackData = z.infer<typeof feedbackSchema>;
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

function rowsForFeedback(data: FeedbackData): EmailRow[] {
  return [
    ['Email αποστολέα', data.contactEmail],
    ['Τμήμα συμμετοχής', data.mainDepartment],
    ['Συχνότητα παρακολούθησης', data.attendanceFrequency],
    ['Συμμετοχή σε ακολουθίες / αναλόγιο', data.chantStandParticipation],
    ['Συνολική ικανοποίηση', data.overallSatisfaction],
    ['Κατανόηση τρόπου διδασκαλίας', data.teachingClarity],
    ['Κατανόηση βυζαντινής μουσικής', data.byzantineMusicUnderstanding],
    ['Βοήθεια στην παραλλαγή / ανάγνωση σημαδιών', data.notationReadingHelp],
    ['Βοήθεια στην πρακτική ψαλμωδία', data.practicalChantingHelp],
    ['Σύνδεση με τις ακολουθίες της Εκκλησίας', data.servicesConnectionHelp],
    ['Κλίμα μέσα στο Φροντιστήριο', data.communityClimate],
    ['Σύνδεση με την εκκλησιαστική ζωή', data.churchLifeConnection],
    ['Χρησιμότητα έντυπου / ψηφιακού υλικού', data.printedDigitalMaterialUsefulness],
    ['Χρησιμότητα ηχογραφήσεων / podcasts / ιστοσελίδας', data.websiteAudioUsefulness],
    ['Ρυθμός ύλης', data.curriculumPace],
    ['Διάρκεια μαθήματος', data.lessonDuration],
    ['Πιο βοηθητικό μέρος', data.mostHelpfulPart],
    ['Συνέχεια την επόμενη χρονιά', data.continueNextYear],
    ['Τι θα ήθελε περισσότερο του χρόνου', data.nextYearWishes.join(', ')],
    ['Προτιμώμενη ημέρα / μορφή μαθημάτων', data.preferredSchedule],
    ['Ελεύθερη γνώμη', data.freeResponse],
    ['Ημερομηνία υποβολής', submittedAt()],
  ];
}

function buildEmail(data: FeedbackData) {
  const subject = 'Νέο ερωτηματολόγιο ανατροφοδότησης 2025-2026';
  const rows = rowsForFeedback(data);
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
    subject,
    text: `${subject}\n\n${text}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
        <h2 style="margin: 0 0 12px; color: #b4233d;">${escapeHtml(subject)}</h2>
        <p style="margin: 0 0 18px; color: #475569;">Υποβλήθηκε νέο ερωτηματολόγιο ανατροφοδότησης από την ιστοσελίδα του Φροντιστηρίου Ψαλτικής.</p>
        <table style="border-collapse: collapse; width: 100%; max-width: 820px; border: 1px solid #e5e7eb;">
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
    return NextResponse.json({ ok: true, message: 'Το ερωτηματολόγιο στάλθηκε με επιτυχία.' });
  }

  const parsed = feedbackSchema.safeParse(body);

  if (!parsed.success) {
    console.warn('FEEDBACK_VALIDATION_FAILED', parsed.error.flatten().fieldErrors);
    return NextResponse.json(
      { error: 'Παρακαλώ ελέγξτε τα υποχρεωτικά πεδία και δοκιμάστε ξανά.' },
      { status: 400 },
    );
  }

  const email = buildEmail(parsed.data);
  const result = await sendEmail({
    to: getFormRecipientEmails(),
    subject: email.subject,
    text: email.text,
    html: email.html,
    replyTo: parsed.data.contactEmail,
  });

  if (!result.ok) {
    console.warn('FEEDBACK_EMAIL_FAILED', result.reason);
    return NextResponse.json(
      { error: 'Το ερωτηματολόγιο καταχωρήθηκε, αλλά δεν ήταν δυνατή η αποστολή email. Παρακαλώ δοκιμάστε ξανά.' },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    message: 'Σας ευχαριστούμε θερμά για τη συμμετοχή, την εμπιστοσύνη και την ειλικρινή σας απάντηση.',
  });
}
