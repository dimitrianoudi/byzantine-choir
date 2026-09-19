import type { Metadata } from "next";
import { readFile } from "node:fs/promises";
import path from "node:path";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getUpcomingLiturgicalSunday } from "@/lib/liturgicalCalendar";

export const metadata: Metadata = {
  title: "Τυπικό | Ψαλτική Παιδεία",
  description: "Ο ήχος της επόμενης Κυριακής και οδηγός για τον Κυριακάτικο Όρθρο.",
};

const toneRows = [
  {
    tone: "Α΄",
    ypakoi: "Ἡ τοῦ Λῃστοῦ μετάνοια…",
    anavathmoi: "Ἐν τῷ θλίβεσθαί με…",
    prokeimeno: "Νῦν ἀναστήσομαι, λέγει Κύριος…",
  },
  {
    tone: "Β΄",
    ypakoi: "Μετὰ τὸ Πάθος πορευθεῖσαι…",
    anavathmoi: "Ἐν τῷ οὐρανῷ τὰ ὄμματα…",
    prokeimeno: "Ἐξεγέρθητι, Κύριε ὁ Θεός μου…",
  },
  {
    tone: "Γ΄",
    ypakoi: "Ἐκπλήττων τῇ ὁράσει…",
    anavathmoi: "Τὴν αἰχμαλωσίαν Σιών…",
    prokeimeno: "Εἴπατε ἐν τοῖς ἔθνεσιν…",
  },
  {
    tone: "Δ΄",
    ypakoi: "Τὰ τῆς σῆς παραδόξου Ἐγέρσεως…",
    anavathmoi: "Ἐκ νεότητός μου πολλὰ πολεμεῖ με πάθη…",
    prokeimeno: "Ἀνάστα Κύριε, βοήθησον ἡμῖν…",
  },
  {
    tone: "Πλ. Α΄",
    ypakoi: "Ἀγγελικῇ ὁράσει τὸν νοῦν…",
    anavathmoi: "Ἐν τῷ θλίβεσθαί με Δαυϊτικῶς…",
    prokeimeno: "Ἀνάστηθι Κύριε ὁ Θεός μου…",
  },
  {
    tone: "Πλ. Β΄",
    ypakoi: "Τῷ ἑκουσίῳ καὶ ζωοποιῷ σου θανάτῳ…",
    anavathmoi: "Ἐν τῷ οὐρανῷ τοὺς ὀφθαλμούς μου αἴρω…",
    prokeimeno: "Κύριε, ἐξέγειρον τὴν δυναστείαν σου…",
  },
  {
    tone: "Βαρύς",
    ypakoi: "Ὁ ἡμετέραν μορφὴν ἀναλαβών…",
    anavathmoi: "Τὴν αἰχμαλωσίαν Σιών, ἐκ πλάνης…",
    prokeimeno: "Ἀνάστηθι, Κύριε ὁ Θεός μου…",
  },
  {
    tone: "Πλ. Δ΄",
    ypakoi: "Αἱ Μυροφόροι τοῦ Ζωοδότου…",
    anavathmoi: "Ἐκ νεότητός μου ὁ ἐχθρός με πειράζει…",
    prokeimeno: "Βασιλεύσει Κύριος εἰς τὸν αἰῶνα…",
  },
];

const tableClassName = "w-full min-w-[760px] border-collapse text-left text-[14px] leading-relaxed";
const tableHeaderClassName =
  "border border-[var(--border)] bg-[var(--blue-200)] px-4 py-3 font-semibold text-[var(--blue-600)]";
const tableCellClassName = "border border-[var(--border)] px-4 py-3 align-top";

export default async function TypikoPage() {
  const [markdown, nextSunday] = await Promise.all([
    readFile(
      path.join(process.cwd(), "content", "kyriakatikos-orthros.md"),
      "utf8",
    ),
    getUpcomingLiturgicalSunday(),
  ]);
  const liturgicalDetails = [
    nextSunday.tone ? `Ήχος ${nextSunday.tone}` : null,
    nextSunday.eothinon ? `Εωθινόν ${nextSunday.eothinon}` : null,
  ].filter((detail): detail is string => detail !== null);

  return (
    <div className="container container--flush-left section section--flush-left space-y-8 pb-8">
      <header className="space-y-4 pt-2 text-center">
        <h1 className="font-heading text-red text-[clamp(30px,5vw,44px)] font-bold">
          Τυπικό
        </h1>

        <div className="card mx-auto max-w-2xl overflow-hidden">
          <div className="bg-[var(--blue-200)] px-5 py-2 text-sm font-semibold tracking-wide text-[var(--blue-600)]">
            Η επόμενη Κυριακή
          </div>
          <div className="space-y-2 px-5 py-6 sm:px-8">
            <time
              dateTime={nextSunday.isoDate}
              className="font-heading block text-[clamp(25px,4vw,34px)] font-bold text-[var(--text)]"
            >
              {nextSunday.formattedDate}
            </time>
            {liturgicalDetails.length > 0 && (
              <p className="font-heading text-[clamp(19px,3vw,24px)] font-semibold text-red">
                {liturgicalDetails.join(", ")}.
              </p>
            )}

            <div className="mt-5 border-t border-[var(--border)] pt-5">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                Εορτή της ημέρας
              </p>
              {nextSunday.feastTitle ? (
                <>
                  <p className="font-heading mt-2 text-xl font-semibold text-[var(--blue-600)]">
                    {nextSunday.feastTitle}
                  </p>
                  {nextSunday.commemorations.length > 0 && (
                    <ul className="mt-3 space-y-1 text-sm leading-relaxed text-muted">
                      {nextSunday.commemorations.map((commemoration) => (
                        <li key={commemoration}>{commemoration}</li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <p className="mt-2 text-sm text-muted">
                  Δεν ήταν δυνατή η αυτόματη φόρτωση της εορτής.
                </p>
              )}
            </div>

            <p className="pt-3 text-xs text-muted">
              Τα στοιχεία ενημερώνονται αυτόματα από το ορθόδοξο εκκλησιαστικό ημερολόγιο.
            </p>
          </div>
        </div>
      </header>

      <article className="card px-5 py-7 sm:px-8 sm:py-9">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => (
              <h2 className="font-heading mb-5 mt-10 text-3xl font-bold text-red first:mt-0">
                {children}
              </h2>
            ),
            h2: ({ children }) => (
              <h3 className="font-heading mb-3 mt-8 text-2xl font-bold text-[var(--blue-600)]">
                {children}
              </h3>
            ),
            h3: ({ children }) => (
              <h4 className="font-heading mb-2 mt-6 text-xl font-semibold text-[var(--text)]">
                {children}
              </h4>
            ),
            p: ({ children }) => (
              <p className="my-3 leading-7 text-[var(--text)]">{children}</p>
            ),
            ul: ({ children }) => (
              <ul className="my-4 list-disc space-y-1.5 pl-6 text-[var(--text)]">{children}</ul>
            ),
            li: ({ children }) => <li className="pl-1">{children}</li>,
            strong: ({ children }) => (
              <strong className="font-semibold text-[var(--text)]">{children}</strong>
            ),
            hr: () => <hr className="my-8 border-0 border-t border-[var(--border)]" />,
            table: ({ children }) => (
              <div className="my-6 overflow-x-auto rounded-xl border border-[var(--border)]">
                <table className={tableClassName}>{children}</table>
              </div>
            ),
            th: ({ children }) => <th className={tableHeaderClassName}>{children}</th>,
            td: ({ children }) => <td className={tableCellClassName}>{children}</td>,
          }}
        >
          {markdown}
        </ReactMarkdown>
      </article>

      <section className="space-y-4" aria-labelledby="tone-table-title">
        <div className="text-center">
          <h2
            id="tone-table-title"
            className="font-heading text-[clamp(25px,4vw,32px)] font-bold text-red"
          >
            Υπακοή, Αναβαθμοί και Προκείμενο
          </h2>
          <p className="mt-2 text-sm text-muted">Τα αναστάσιμα μέρη για κάθε Ήχο</p>
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className={tableClassName}>
              <thead>
                <tr>
                  <th scope="col" className={tableHeaderClassName}>
                    Ήχος
                  </th>
                  <th scope="col" className={tableHeaderClassName}>
                    Υπακοή
                  </th>
                  <th scope="col" className={tableHeaderClassName}>
                    Αναβαθμοί
                  </th>
                  <th scope="col" className={tableHeaderClassName}>
                    Προκείμενο
                  </th>
                </tr>
              </thead>
              <tbody>
                {toneRows.map((row) => (
                  <tr key={row.tone} className="even:bg-[rgba(231,239,255,0.3)]">
                    <th
                      scope="row"
                      className={`${tableCellClassName} whitespace-nowrap font-bold text-[var(--blue-600)]`}
                    >
                      {row.tone}
                    </th>
                    <td className={tableCellClassName}>{row.ypakoi}</td>
                    <td className={tableCellClassName}>{row.anavathmoi}</td>
                    <td className={tableCellClassName}>{row.prokeimeno}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
