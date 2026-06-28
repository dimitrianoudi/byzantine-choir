'use client';

import { type FormEvent, type ReactNode, useState } from 'react';

type SubmitStatus = { type: 'idle' | 'success' | 'error'; message: string };

const satisfactionOptions = ['Καθόλου', 'Λίγο', 'Αρκετά', 'Πολύ', 'Πάρα πολύ'];

const radioQuestions = [
  {
    section: 'Α. Συμμετοχή στο Φροντιστήριο',
    questions: [
      {
        name: 'mainDepartment',
        label: '1. Σε ποιο τμήμα συμμετείχατε κυρίως;',
        options: [
          'Παιδικής φωνής / Μουσική Προπαιδεία',
          'Γυναικείας φωνής',
          'Ανδρικής φωνής',
          'Ακολουθίες Κυριακής / βοηθών αναλογίου',
          'Παρακολουθούσα περισσότερα από ένα τμήματα',
        ],
      },
      {
        name: 'attendanceFrequency',
        label: '2. Πόσο συχνά παρακολουθούσατε τα μαθήματα;',
        options: [
          'Σχεδόν κάθε εβδομάδα',
          'Συχνά, αλλά με κάποιες απουσίες',
          'Περιστασιακά',
          'Λίγες φορές μέσα στη χρονιά',
        ],
      },
      {
        name: 'chantStandParticipation',
        label: '3. Συμμετείχατε σε ακολουθίες ή στο αναλόγιο κατά τη διάρκεια της χρονιάς;',
        options: [
          'Ναι, συχνά',
          'Ναι, μερικές φορές',
          'Ναι, μόνο σε ειδικές περιόδους / εορτές',
          'Όχι, αλλά θα ήθελα στο μέλλον',
          'Όχι, δεν αισθάνομαι ακόμη έτοιμος/η',
        ],
      },
    ],
  },
  {
    section: 'Β. Ικανοποίηση από τα μαθήματα',
    note: 'Για τις παρακάτω ερωτήσεις, επιλέξτε μία απάντηση: Καθόλου - Λίγο - Αρκετά - Πολύ - Πάρα πολύ.',
    questions: [
      {
        name: 'overallSatisfaction',
        label: '4. Πόσο ικανοποιημένος/η μείνατε συνολικά από τη φετινή χρονιά;',
        options: satisfactionOptions,
      },
      {
        name: 'teachingClarity',
        label: '5. Πόσο κατανοητός ήταν ο τρόπος διδασκαλίας;',
        options: satisfactionOptions,
      },
      {
        name: 'byzantineMusicUnderstanding',
        label: '6. Πόσο σας βοήθησε το μάθημα να κατανοήσετε τη βυζαντινή μουσική;',
        options: satisfactionOptions,
      },
      {
        name: 'notationReadingHelp',
        label: '7. Πόσο σας βοήθησε το μάθημα στην παραλλαγή και στην ανάγνωση των σημαδιών;',
        options: satisfactionOptions,
      },
      {
        name: 'practicalChantingHelp',
        label: '8. Πόσο σας βοήθησε το μάθημα στην πρακτική ψαλμωδία;',
        options: satisfactionOptions,
      },
      {
        name: 'servicesConnectionHelp',
        label: '9. Πόσο σας βοήθησε η σύνδεση του μαθήματος με τις ακολουθίες της Εκκλησίας;',
        options: satisfactionOptions,
      },
      {
        name: 'communityClimate',
        label: '10. Πόσο θετικό ήταν το κλίμα μέσα στο Φροντιστήριο;',
        options: satisfactionOptions,
      },
      {
        name: 'churchLifeConnection',
        label: '11. Πόσο νιώσατε ότι το Φροντιστήριο σας έφερε πιο κοντά στην εκκλησιαστική ζωή;',
        options: satisfactionOptions,
      },
    ],
  },
  {
    section: 'Γ. Υλικό και οργάνωση',
    questions: [
      {
        name: 'printedDigitalMaterialUsefulness',
        label: '12. Πόσο χρήσιμο ήταν το έντυπο ή ψηφιακό υλικό που δόθηκε;',
        options: ['Καθόλου χρήσιμο', 'Λίγο χρήσιμο', 'Αρκετά χρήσιμο', 'Πολύ χρήσιμο', 'Πάρα πολύ χρήσιμο'],
      },
      {
        name: 'websiteAudioUsefulness',
        label: '13. Πόσο χρήσιμες ήταν οι ηχογραφήσεις / podcasts / υλικό της ιστοσελίδας;',
        options: ['Δεν τα χρησιμοποίησα', 'Λίγο χρήσιμες', 'Αρκετά χρήσιμες', 'Πολύ χρήσιμες', 'Πάρα πολύ χρήσιμες'],
      },
      {
        name: 'curriculumPace',
        label: '14. Ο ρυθμός της ύλης ήταν:',
        options: ['Πολύ αργός', 'Λίγο αργός', 'Κατάλληλος', 'Λίγο γρήγορος', 'Πολύ γρήγορος'],
      },
      {
        name: 'lessonDuration',
        label: '15. Η διάρκεια του μαθήματος ήταν:',
        options: ['Πολύ μικρή', 'Λίγο μικρή', 'Κατάλληλη', 'Λίγο μεγάλη', 'Πολύ μεγάλη'],
      },
      {
        name: 'mostHelpfulPart',
        label: '16. Ποιο μέρος του Φροντιστηρίου σας βοήθησε περισσότερο;',
        options: [
          'Η θεωρία',
          'Η παραλλαγή',
          'Η πρακτική ψαλμωδία',
          'Η συμμετοχή στο αναλόγιο',
          'Οι ηχογραφήσεις / podcasts',
          'Η ατμόσφαιρα της ομάδας',
          'Όλα μαζί',
        ],
      },
    ],
  },
] as const;

const continueNextYearOptions = ['Ναι, σίγουρα', 'Μάλλον ναι', 'Δεν είμαι ακόμη βέβαιος/η', 'Μάλλον όχι', 'Όχι'] as const;

const nextYearWishOptions = [
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
] as const;

const preferredScheduleOptions = [
  'Τετάρτη, όπως φέτος',
  'Δευτέρα',
  'Παρασκευή',
  'Κυριακή μετά τη Θεία Λειτουργία',
  'Συνδυασμός δύο ημερών',
  'Διαδικτυακή υποστήριξη μαζί με τα δια ζώσης μαθήματα',
  'Δεν γνωρίζω ακόμη',
] as const;

export default function FeedbackForm({ initialEmail = '' }: { initialEmail?: string }) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<SubmitStatus>({ type: 'idle', message: '' });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload: Record<string, string | string[]> = {};

    formData.forEach((value, key) => {
      if (typeof value !== 'string') return;
      const cleanValue = value.trim();
      const existing = payload[key];

      if (Array.isArray(existing)) {
        existing.push(cleanValue);
      } else if (typeof existing === 'string') {
        payload[key] = [existing, cleanValue];
      } else {
        payload[key] = cleanValue;
      }
    });

    setBusy(true);
    setStatus({ type: 'idle', message: '' });

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string; message?: string };

      if (!response.ok) {
        throw new Error(data.error || 'Δεν ήταν δυνατή η αποστολή του ερωτηματολογίου.');
      }

      form.reset();
      setStatus({
        type: 'success',
        message:
          data.message ||
          'Σας ευχαριστούμε θερμά για τη συμμετοχή, την εμπιστοσύνη και την ειλικρινή σας απάντηση.',
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Παρουσιάστηκε πρόβλημα. Παρακαλώ δοκιμάστε ξανά.',
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="text-center">
        <h1 className="font-heading text-red" style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800 }}>
          Ερωτηματολόγιο Ανατροφοδότησης
        </h1>
        <p className="mt-2 font-heading text-xl text-blue">Φροντιστήριο Ψαλτικής 2025-2026</p>
      </section>

      <section className="card p-5 sm:p-7">
        <div className="mx-auto max-w-3xl space-y-4 text-[15px] leading-relaxed text-muted">
          <p>Αγαπητοί μαθητές και μαθήτριες,</p>
          <p>
            με τη λήξη της πρώτης χρονιάς του Φροντιστηρίου Ψαλτικής, θα θέλαμε τη γνώμη σας για όσα ζήσαμε, μάθαμε και προσπαθήσαμε μαζί.
          </p>
          <p>
            Το ερωτηματολόγιο είναι σύντομο. Οι απαντήσεις σας θα μας βοηθήσουν να οργανώσουμε καλύτερα τη νέα χρονιά, τα τμήματα, το υλικό, τα μαθήματα και τη συμμετοχή στο αναλόγιο.
          </p>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="hidden" aria-hidden="true">
          <label>
            Ιστοσελίδα
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>

        <SectionCard title="Στοιχεία επικοινωνίας">
          <label className="grid gap-2 rounded-2xl border border-subtle bg-white/75 p-4 text-sm font-medium text-muted">
            <span className="text-black">Email επικοινωνίας *</span>
            <input
              className="input input--full"
              name="contactEmail"
              type="email"
              autoComplete="email"
              defaultValue={initialEmail}
              required
            />
          </label>
        </SectionCard>

        {radioQuestions.map((section) => (
          <SectionCard key={section.section} title={section.section} note={'note' in section ? section.note : undefined}>
            {section.questions.map((question) => (
              <RadioQuestion
                key={question.name}
                name={question.name}
                label={question.label}
                options={[...question.options]}
              />
            ))}
          </SectionCard>
        ))}

        <SectionCard title="Δ. Νέα χρονιά">
          <RadioQuestion
            name="continueNextYear"
            label="17. Θα θέλατε να συνεχίσετε στο Φροντιστήριο την επόμενη χρονιά;"
            options={[...continueNextYearOptions]}
          />
          <CheckboxQuestion
            name="nextYearWishes"
            label="18. Τι θα θέλατε να υπάρχει περισσότερο του χρόνου;"
            note="Μπορείτε να επιλέξετε περισσότερα από ένα."
            options={[...nextYearWishOptions]}
          />
          <RadioQuestion
            name="preferredSchedule"
            label="19. Ποια ημέρα ή μορφή μαθημάτων θα σας βόλευε περισσότερο τη νέα χρονιά;"
            options={[...preferredScheduleOptions]}
          />
        </SectionCard>

        <SectionCard title="Ε. Αναπτυγμένη απάντηση">
          <TextArea
            name="freeResponse"
            label="20. Γράψτε ελεύθερα τη γνώμη σας για τη φετινή χρονιά."
            helper="Μπορείτε να αναφέρετε τι σας βοήθησε περισσότερο, τι σας συγκίνησε, τι σας δυσκόλεψε, τι θα θέλατε να αλλάξει, και τι θα θέλατε να κρατήσουμε για τη νέα χρονιά."
          />
        </SectionCard>

        {status.type !== 'idle' && (
          <div
            className={`rounded-xl border p-4 text-sm ${
              status.type === 'success'
                ? 'border-green-200 bg-green-50 text-green-800'
                : 'border-red-200 bg-red-50 text-red-800'
            }`}
            role="status"
          >
            {status.message}
            {status.type === 'success' && (
              <p className="mt-2">
                Η γνώμη σας είναι πολύτιμη για να συνεχιστεί το Φροντιστήριο Ψαλτικής με περισσότερη τάξη, καλύτερη οργάνωση και μεγαλύτερο καρπό μέσα στην ενορία και στο αναλόγιο.
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="btn btn-gold btn-lg" disabled={busy} aria-disabled={busy}>
            {busy ? 'Αποστολή...' : 'Αποστολή ερωτηματολογίου'}
          </button>
          <span className="text-sm text-muted">Οι απαντήσεις θα σταλούν στο Φροντιστήριο μέσω email.</span>
        </div>
      </form>
    </div>
  );
}

function SectionCard({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <fieldset className="card p-5 sm:p-6">
      <legend className="px-2 font-heading text-xl font-semibold text-red">{title}</legend>
      {note && <p className="mb-4 text-sm leading-relaxed text-muted">{note}</p>}
      <div className="grid gap-4">{children}</div>
    </fieldset>
  );
}

function RadioQuestion({ name, label, options }: { name: string; label: string; options: string[] }) {
  return (
    <fieldset className="rounded-2xl border border-subtle bg-white/75 p-4">
      <legend className="px-1 text-sm font-semibold text-black">{label}</legend>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option, index) => {
          const id = `${name}-${index}`;
          return (
            <label
              key={option}
              htmlFor={id}
              className="inline-flex items-center gap-2 rounded-full border border-subtle bg-white px-3 py-2 text-sm text-black"
            >
              <input id={id} type="radio" name={name} value={option} required />
              {option}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function CheckboxQuestion({
  name,
  label,
  note,
  options,
}: {
  name: string;
  label: string;
  note?: string;
  options: string[];
}) {
  return (
    <fieldset className="rounded-2xl border border-subtle bg-white/75 p-4">
      <legend className="px-1 text-sm font-semibold text-black">{label}</legend>
      {note && <p className="mt-2 text-sm text-muted">{note}</p>}
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {options.map((option, index) => {
          const id = `${name}-${index}`;
          return (
            <label
              key={option}
              htmlFor={id}
              className="flex items-start gap-2 rounded-xl border border-subtle bg-white px-3 py-2 text-sm text-black"
            >
              <input id={id} className="mt-1" type="checkbox" name={name} value={option} />
              {option}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function TextArea({ name, label, helper }: { name: string; label: string; helper?: string }) {
  return (
    <label className="grid gap-2 rounded-2xl border border-subtle bg-white/75 p-4 text-sm font-medium text-muted">
      <span className="text-black">{label}</span>
      {helper && <span className="text-sm font-normal leading-relaxed text-muted">{helper}</span>}
      <textarea className="input input--full min-h-44 resize-y" name={name} required maxLength={4000} />
    </label>
  );
}
