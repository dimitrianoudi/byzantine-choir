'use client';

import { type FormEvent, type HTMLAttributes, type ReactNode, useState } from 'react';
import Link from 'next/link';

type RegistrationKind = 'kids' | 'adults';
type SubmitStatus = { type: 'idle' | 'success' | 'error'; message: string };

const preferredDays = ['Δευτέρα', 'Τετάρτη', 'Χωρίς προτίμηση'];
const preferredTimes = ['16:30 - 17:15', '17:30 - 18:15', 'Χωρίς προτίμηση'];

export default function RegistrationForm({ kind }: { kind: RegistrationKind }) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<SubmitStatus>({ type: 'idle', message: '' });
  const isKids = kind === 'kids';

  const copy = isKids
    ? {
        title: 'Δήλωση ενδιαφέροντος για παιδί',
        eyebrow: 'Παιδικό Φροντιστήριο Ψαλτικής',
        description:
          'Συμπληρώστε τα στοιχεία του παιδιού και του γονέα/κηδεμόνα. Οι ομάδες θα οργανωθούν ανά ηλικία, ώστε το μάθημα να είναι προσαρμοσμένο στα παιδιά.',
        submit: 'Αποστολή δήλωσης παιδιού',
        accent: 'from-amber-50 via-white to-sky-50',
        pill: 'bg-amber-100 text-amber-900 border-amber-200',
      }
    : {
        title: 'Δήλωση ενδιαφέροντος για ενήλικα',
        eyebrow: 'Φροντιστήριο Ψαλτικής ενηλίκων',
        description:
          'Συμπληρώστε τα στοιχεία επικοινωνίας και την εμπειρία σας, για να προτείνουμε το κατάλληλο τμήμα και πρόγραμμα.',
        submit: 'Αποστολή δήλωσης ενηλίκου',
        accent: 'from-slate-50 via-white to-blue-50',
        pill: 'bg-blue-50 text-blue border-blue-100',
      };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload: Record<string, string> = { kind };

    formData.forEach((value, key) => {
      if (typeof value === 'string') {
        payload[key] = value.trim();
      }
    });

    setBusy(true);
    setStatus({ type: 'idle', message: '' });

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || 'Δεν ήταν δυνατή η αποστολή της φόρμας.');
      }

      form.reset();
      setStatus({
        type: 'success',
        message: data.message || 'Η δήλωσή σας στάλθηκε με επιτυχία.',
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
      <Link href="/register" className="btn btn-outline btn-sm">
        Πίσω στην επιλογή
      </Link>

      <section className={`card overflow-hidden bg-gradient-to-br ${copy.accent}`}>
        <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
          <aside className="relative overflow-hidden border-b border-subtle p-6 sm:p-8 lg:border-b-0 lg:border-r">
            <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-white/70" aria-hidden="true" />
            <div className="absolute bottom-8 right-8 h-16 w-16 rounded-full border border-white/80" aria-hidden="true" />
            <div className="relative space-y-4">
              <span className={`badge border ${copy.pill}`}>{copy.eyebrow}</span>
              <h1 className="font-heading text-red" style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 800 }}>
                {copy.title}
              </h1>
              <p className="max-w-prose text-[15px] leading-relaxed text-muted">{copy.description}</p>
              <div className="rounded-2xl border border-white/80 bg-white/70 p-4 text-sm leading-relaxed text-muted">
                <strong className="text-black">Σχολικό έτος 2026-2027</strong>
                <br />
                Θα επικοινωνήσουμε μαζί σας για την τελική ένταξη και το πρόγραμμα.
              </div>
            </div>
          </aside>

          <form onSubmit={handleSubmit} className="space-y-6 p-6 sm:p-8">
            <div className="hidden" aria-hidden="true">
              <label>
                Ιστοσελίδα
                <input name="website" tabIndex={-1} autoComplete="off" />
              </label>
            </div>

            {isKids ? <KidsFields /> : <AdultFields />}

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
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" className="btn btn-gold btn-lg" disabled={busy} aria-disabled={busy}>
                {busy ? 'Αποστολή...' : copy.submit}
              </button>
              <span className="text-sm text-muted">Τα στοιχεία θα σταλούν με email στο Φροντιστήριο.</span>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}

function KidsFields() {
  return (
    <>
      <SectionCard title="1. Στοιχεία παιδιού">
        <TextField name="childName" label="Ονοματεπώνυμο παιδιού" autoComplete="name" />
        <TextField name="childBirthDate" label="Ημερομηνία γέννησης" type="date" />
        <TextField name="school" label="Σχολείο" />
        <SelectField
          name="grade"
          label="Τάξη Δημοτικού για το 2026-2027"
          options={["Α'", "Β'", "Γ'", "Δ'", "Ε'", "ΣΤ'"]}
        />
        <RadioGroup name="childGender" label="Φύλο" options={['Αγόρι', 'Κορίτσι']} />
      </SectionCard>

      <SectionCard title="2. Στοιχεία γονέα / κηδεμόνα">
        <TextField name="guardianName" label="Ονοματεπώνυμο" autoComplete="name" />
        <RadioGroup name="guardianRelation" label="Ιδιότητα" options={['Πατέρας', 'Μητέρα', 'Κηδεμόνας']} />
        <TextField name="address" label="Διεύθυνση" autoComplete="street-address" />
        <TextField name="area" label="Περιοχή" autoComplete="address-level2" />
        <TextField name="postalCode" label="Τ.Κ." autoComplete="postal-code" required={false} />
        <TextField name="contactPhone" label="Τηλέφωνο επικοινωνίας" type="tel" autoComplete="tel" />
        <TextField name="contactEmail" label="E-mail" type="email" autoComplete="email" />
      </SectionCard>

      <SectionCard title="3. Επιπλέον πληροφορίες">
        <RadioGroup name="hasExperience" label="Έχει ξαναέρθει σε επαφή με ψαλτική;" options={['Όχι', 'Ναι']} />
        <RadioGroup name="knowsNeumes" label="Έχει γνωρίσει νεύματα;" options={['Όχι', 'Ναι']} />
        <RadioGroup name="attendsLessons" label="Παρακολουθεί ήδη μαθήματα μουσικής;" options={['Όχι', 'Ναι']} />
        <RadioGroup name="playsInstrument" label="Παίζει κάποιο μουσικό όργανο;" options={['Όχι', 'Ναι']} />
        <TextField name="instrumentDetails" label="Αν ναι, ποιο;" required={false} />
        <TextArea name="notes" label="Ιδιαίτερες πληροφορίες που θα θέλατε να γνωρίζουμε" required={false} />
      </SectionCard>

      <SectionCard title="4. Προτιμήσεις">
        <SelectField name="preferredDay" label="Προτιμώμενη ημέρα" options={preferredDays} />
        <SelectField name="preferredTime" label="Προτιμώμενη ώρα" options={preferredTimes} />
      </SectionCard>
    </>
  );
}

function AdultFields() {
  return (
    <>
      <SectionCard title="1. Στοιχεία ενδιαφερόμενου">
        <TextField name="fullName" label="Ονοματεπώνυμο" autoComplete="name" />
        <TextField name="birthYear" label="Έτος γέννησης" inputMode="numeric" placeholder="π.χ. 1985" required={false} />
        <TextField name="contactPhone" label="Τηλέφωνο επικοινωνίας" type="tel" autoComplete="tel" />
        <TextField name="contactEmail" label="E-mail" type="email" autoComplete="email" />
        <TextField name="address" label="Διεύθυνση" autoComplete="street-address" required={false} />
        <TextField name="area" label="Περιοχή" autoComplete="address-level2" required={false} />
        <TextField name="postalCode" label="Τ.Κ." autoComplete="postal-code" required={false} />
      </SectionCard>

      <SectionCard title="2. Μουσική εμπειρία">
        <SelectField
          name="chantingExperience"
          label="Εμπειρία στην ψαλτική"
          options={['Καμία εμπειρία', 'Λίγη εμπειρία', 'Μέτρια εμπειρία', 'Προχωρημένη εμπειρία']}
        />
        <RadioGroup name="musicBackground" label="Υπάρχει προηγούμενη μουσική εκπαίδευση;" options={['Όχι', 'Ναι']} />
        <TextField name="musicBackgroundDetails" label="Αν ναι, ποια;" required={false} />
        <SelectField
          name="serviceInterest"
          label="Κύριο ενδιαφέρον"
          options={[
            'Εκμάθηση ψαλτικής',
            'Συμμετοχή στο αναλόγιο',
            'Θεωρία και πράξη',
            'Γνωριμία με τη βυζαντινή μουσική',
          ]}
        />
      </SectionCard>

      <SectionCard title="3. Προτιμήσεις">
        <SelectField name="preferredDay" label="Προτιμώμενη ημέρα" options={preferredDays} />
        <SelectField name="preferredTime" label="Προτιμώμενη ώρα" options={preferredTimes} />
        <TextArea name="notes" label="Σχόλια ή άλλες πληροφορίες" required={false} />
      </SectionCard>
    </>
  );
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="rounded-2xl border border-subtle bg-white/75 p-4">
      <legend className="px-2 font-heading text-lg font-semibold text-red">{title}</legend>
      <div className="grid gap-4 pt-2 md:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function TextField({
  name,
  label,
  type = 'text',
  required = true,
  autoComplete,
  placeholder,
  inputMode,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  placeholder?: string;
  inputMode?: HTMLAttributes<HTMLInputElement>['inputMode'];
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-muted">
      <span>
        {label}
        {required && <span className="text-red"> *</span>}
      </span>
      <input
        className="input input--full"
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        inputMode={inputMode}
      />
    </label>
  );
}

function SelectField({
  name,
  label,
  options,
  required = true,
}: {
  name: string;
  label: string;
  options: string[];
  required?: boolean;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-muted">
      <span>
        {label}
        {required && <span className="text-red"> *</span>}
      </span>
      <select className="input input--full" name={name} required={required} defaultValue="">
        <option value="" disabled>
          Επιλέξτε
        </option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function RadioGroup({
  name,
  label,
  options,
}: {
  name: string;
  label: string;
  options: string[];
}) {
  return (
    <fieldset className="grid gap-2 rounded-xl border border-subtle bg-white/70 p-3">
      <legend className="px-1 text-sm font-medium text-muted">
        {label}
        <span className="text-red"> *</span>
      </legend>
      <div className="flex flex-wrap gap-2">
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

function TextArea({
  name,
  label,
  required = true,
}: {
  name: string;
  label: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-muted md:col-span-2">
      <span>
        {label}
        {required && <span className="text-red"> *</span>}
      </span>
      <textarea className="input input--full min-h-28 resize-y" name={name} required={required} maxLength={2000} />
    </label>
  );
}
