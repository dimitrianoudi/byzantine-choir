import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Πρόγραμμα Μαθημάτων | Ψαλτική Παιδεία",
  description:
    "Εβδομαδιαίο πρόγραμμα μαθημάτων Ψαλτικής, αργίες, διακοπές και πρακτική συμμετοχή στα αναλόγια.",
};

const weeklySchedule = [
  {
    day: "Δευτέρα",
    lessons: [
      { time: "16:30–17:20", group: "Παίδων — Α΄ Έτος" },
      { time: "17:30–18:20", group: "Ανδρών — Α΄ Έτος" },
      { time: "18:30–19:20", group: "Γυναικών — Α΄ Έτος" },
      {
        time: "19:30–20:20",
        group: "Κοινή Πράξη Γυναικών — Α΄ και Β΄ Έτος",
      },
      { time: "20:30–21:20", group: "Γυναικών — Β΄ Έτος" },
    ],
  },
  {
    day: "Τετάρτη",
    lessons: [
      { time: "16:30–17:20", group: "Παίδων — Β΄ Έτος" },
      {
        time: "17:30–18:20",
        group: "Ανδρών — Β΄ Έτος / Τμήμα Β1",
      },
      {
        time: "18:30–19:20",
        group: "Κοινή Πράξη Ανδρών — Β΄ Έτος Β1–Β2",
      },
      {
        time: "19:30–20:20",
        group: "Ανδρών — Β΄ Έτος / Τμήμα Β2",
      },
      { time: "20:30–21:20", group: "Προετοιμασία Χορού Κυριακής" },
    ],
  },
];

const holidays = [
  {
    month: "Οκτώβριος",
    details:
      "26/10 Αγίου Δημητρίου · 28/10 Εθνική εορτή — πρακτική συμμετοχή στα αναλόγια όπου υπάρχει ακολουθία",
  },
  { month: "Νοέμβριος", details: "Κανονικά μαθήματα" },
  {
    month: "Δεκέμβριος",
    details:
      "28/12, 30/12 Χριστούγεννα — συμμετοχή στις εορταστικές ακολουθίες",
  },
  {
    month: "Ιανουάριος",
    details:
      "04/01 διακοπές · 06/01 Θεοφάνεια — συμμετοχή στην ακολουθία",
  },
  { month: "Φεβρουάριος", details: "Κανονικά μαθήματα" },
  {
    month: "Μάρτιος",
    details:
      "15/03 Καθαρά Δευτέρα · 24/03 εορταστικές υποχρεώσεις — συμμετοχή όπου ζητηθεί",
  },
  {
    month: "Απρίλιος",
    details:
      "26/04 Μεγάλη Δευτέρα · 28/04 Μεγάλη Τετάρτη — πρακτική συμμετοχή στις ακολουθίες",
  },
  {
    month: "Μάιος",
    details:
      "03/05, 05/05 Διακαινήσιμος — συμμετοχή στις εορταστικές ακολουθίες",
  },
  { month: "Ιούνιος", details: "Λήξη μαθημάτων στις 16/06/2027" },
];

export default function CalendarPage() {
  return (
    <div className="container container--flush-left section section--flush-left space-y-10 pb-8">
      <header className="space-y-4 pt-2 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--blue-600)]">
          Ενοριακό Φροντιστήριο Ψαλτικής
        </p>
        <h1 className="font-heading text-red text-[clamp(30px,5vw,44px)] font-bold">
          Πρόγραμμα Μαθημάτων Ψαλτικής
        </h1>
        <div className="mx-auto max-w-3xl space-y-1 text-sm leading-relaxed text-muted sm:text-base">
          <p>Ιερά Μητρόπολη Νεαπόλεως και Σταυρουπόλεως</p>
          <p>
            Ενοριακό Φροντιστήριο Ψαλτικής Αγίου Αθανασίου και Ευαγγελισμού
            Ευόσμου
          </p>
        </div>
        <span className="badge text-sm font-semibold">Διδακτικό έτος 2026–2027</span>
      </header>

      <section className="space-y-5" aria-labelledby="weekly-schedule-title">
        <div className="text-center">
          <h2
            id="weekly-schedule-title"
            className="font-heading text-[clamp(25px,4vw,32px)] font-bold text-red"
          >
            Εβδομαδιαίο πρόγραμμα
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Κάθε μάθημα διαρκεί 50 λεπτά. Ακολουθούν 10 λεπτά για διάλειμμα,
            ερωτήσεις και πληροφορίες.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {weeklySchedule.map((schedule) => (
            <article key={schedule.day} className="card overflow-hidden">
              <h3 className="font-heading bg-[var(--blue-200)] px-5 py-3 text-center text-2xl font-bold text-[var(--blue-600)]">
                {schedule.day}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm leading-relaxed">
                  <thead>
                    <tr>
                      <th
                        scope="col"
                        className="border-b border-[var(--border)] px-5 py-3 font-semibold text-muted"
                      >
                        Ώρα
                      </th>
                      <th
                        scope="col"
                        className="border-b border-[var(--border)] px-5 py-3 font-semibold text-muted"
                      >
                        Τμήμα
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedule.lessons.map((lesson) => (
                      <tr
                        key={`${schedule.day}-${lesson.time}`}
                        className="even:bg-[rgba(231,239,255,0.3)]"
                      >
                        <th
                          scope="row"
                          className="whitespace-nowrap border-b border-[var(--border)] px-5 py-4 align-top font-semibold text-[var(--blue-600)]"
                        >
                          {lesson.time}
                        </th>
                        <td className="border-b border-[var(--border)] px-5 py-4 align-top">
                          {lesson.group}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-5" aria-labelledby="holidays-title">
        <div className="text-center">
          <h2
            id="holidays-title"
            className="font-heading text-[clamp(25px,4vw,32px)] font-bold text-red"
          >
            Αργίες, διακοπές και πρακτική συμμετοχή στα αναλόγια
          </h2>
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm leading-relaxed">
              <thead>
                <tr className="bg-[var(--blue-200)] text-[var(--blue-600)]">
                  <th
                    scope="col"
                    className="w-40 border-b border-r border-[var(--border)] px-5 py-4 font-semibold"
                  >
                    Μήνας
                  </th>
                  <th
                    scope="col"
                    className="border-b border-[var(--border)] px-5 py-4 font-semibold"
                  >
                    Ημέρες χωρίς μάθημα και αιτιολόγηση
                  </th>
                </tr>
              </thead>
              <tbody>
                {holidays.map((holiday) => (
                  <tr
                    key={holiday.month}
                    className="even:bg-[rgba(231,239,255,0.3)]"
                  >
                    <th
                      scope="row"
                      className="border-b border-r border-[var(--border)] px-5 py-4 align-top font-semibold text-[var(--blue-600)]"
                    >
                      {holiday.month}
                    </th>
                    <td className="border-b border-[var(--border)] px-5 py-4 align-top">
                      {holiday.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="space-y-5" aria-labelledby="lesson-details-title">
        <div className="text-center">
          <h2
            id="lesson-details-title"
            className="font-heading text-[clamp(25px,4vw,32px)] font-bold text-red"
          >
            Στοιχεία μαθημάτων και υπεύθυνοι
          </h2>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <article className="card p-5 sm:p-6">
            <h3 className="font-heading text-xl font-bold text-[var(--blue-600)]">
              Τόπος μαθημάτων
            </h3>
            <p className="mt-2 leading-relaxed text-[var(--text)]">
              Αίθουσα Ι. Ν. Αγ. Αθανασίου, στην αυλή του Αγίου Αθανασίου.
            </p>

            <div className="mt-6 border-t border-[var(--border)] pt-5">
              <h3 className="font-heading text-xl font-bold text-[var(--blue-600)]">
                Έναρξη και λήξη
              </h3>
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
                <dt className="font-semibold text-muted">Έναρξη</dt>
                <dd>05/10/2026</dd>
                <dt className="font-semibold text-muted">Λήξη</dt>
                <dd>16/06/2027</dd>
              </dl>
            </div>
          </article>

          <article className="card p-5 sm:p-6">
            <h3 className="font-heading text-xl font-bold text-[var(--blue-600)]">
              Πληροφορίες και εγγραφές
            </h3>
            <p className="mt-2 leading-relaxed">
              κ. Ρούντος Κων. —{" "}
              <a
                href="tel:+306973439673"
                className="font-semibold text-[var(--blue-600)] underline decoration-[var(--border)] underline-offset-4"
              >
                +30 697 3439673
              </a>
            </p>

            <dl className="mt-6 space-y-5 border-t border-[var(--border)] pt-5">
              <div>
                <dt className="text-sm font-semibold text-muted">
                  Υπεύθυνος οικονομικής ενίσχυσης ενοριακής δράσης
                </dt>
                <dd className="mt-1">κ. Κωνσταντίνου Παναγιώτης</dd>
              </div>
              <div>
                <dt className="text-sm font-semibold text-muted">
                  Υπεύθυνος Προγράμματος, διδακτικού υλικού και διδασκαλίας
                </dt>
                <dd className="mt-1">κ. Στάθης Νικόλαος</dd>
              </div>
            </dl>
          </article>
        </div>
      </section>
    </div>
  );
}
