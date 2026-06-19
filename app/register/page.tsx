import Link from 'next/link';
import { type ReactNode } from 'react';
import { Baby, UserRound } from 'lucide-react';
import SectionDivider from '@/components/SectionDivider';

export const metadata = {
  title: 'Εγγραφή στο Φροντιστήριο Ψαλτικής',
  description: 'Δήλωση ενδιαφέροντος για παιδιά και ενήλικες στο Φροντιστήριο Ψαλτικής.',
};

export default function RegisterPage() {
  return (
    <div className="container container--flush-left section section--flush-left">
      <div className="mx-auto max-w-5xl space-y-4 sm:space-y-5">
        <section className="px-2 py-2 text-center sm:px-4">
          <div className="mx-auto max-w-3xl space-y-2.5">
            <h1 className="font-heading text-red" style={{ fontSize: 'clamp(24px, 3vw, 34px)', fontWeight: 800 }}>
              Εγγραφή για φυσική παρουσία στο Φροντιστήριο
            </h1>
            <p className="text-[14px] leading-relaxed text-muted">
              Επιλέξτε φόρμα για παιδιά ή ενήλικες. Η δήλωση δεν δημιουργεί λογαριασμό και δεν συνδέεται με Google.
            </p>
          </div>
        </section>

        <div className="scale-y-75">
          <SectionDivider />
        </div>

        <section className="grid gap-5 md:grid-cols-2">
          <RegistrationChoice
            href="/register/kids"
            title="Εγγραφή παιδιού"
            description="Για μαθητές Δημοτικού. Η φόρμα περιλαμβάνει στοιχεία παιδιού, γονέα/κηδεμόνα, εμπειρία και προτιμήσεις προγράμματος."
            icon={<Baby size={34} aria-hidden="true" />}
            tone="kids"
          />
          <RegistrationChoice
            href="/register/adults"
            title="Εγγραφή ενηλίκου"
            description="Για ενήλικες που ενδιαφέρονται να γνωρίσουν ή να συνεχίσουν την ψαλτική τέχνη με φυσική παρουσία."
            icon={<UserRound size={34} aria-hidden="true" />}
            tone="adults"
          />
        </section>
      </div>
    </div>
  );
}

function RegistrationChoice({
  href,
  title,
  description,
  icon,
  tone,
}: {
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
  tone: 'kids' | 'adults';
}) {
  const isKids = tone === 'kids';

  return (
    <Link
      href={href}
      className={`card group block overflow-hidden p-6 no-underline transition hover:-translate-y-0.5 hover:shadow-lg ${
        isKids ? 'bg-gradient-to-br from-amber-50 to-white' : 'bg-gradient-to-br from-white to-blue-50'
      }`}
    >
      <div
        className={`mb-5 inline-flex rounded-2xl border p-4 ${
          isKids ? 'border-amber-200 bg-amber-100 text-amber-900' : 'border-blue-100 bg-blue-50 text-blue'
        }`}
      >
        {icon}
      </div>
      <h2 className="font-heading text-2xl text-red">{title}</h2>
      <p className="mt-3 text-[15px] leading-relaxed text-muted">{description}</p>
    </Link>
  );
}
