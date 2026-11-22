"use client";

import { useId, useState, type FormEvent } from "react";

type PublicationOption = {
  id: string;
  title: string;
};

type SubmissionState =
  | { type: "idle"; message: "" }
  | { type: "submitting"; message: string }
  | { type: "success"; message: string }
  | { type: "error"; message: string };

export default function PublicationInterestForm({
  publications,
  initialPublicationId = "",
  heading = "Εκδήλωση ενδιαφέροντος",
}: {
  publications: PublicationOption[];
  initialPublicationId?: string;
  heading?: string;
}) {
  const id = useId();
  const [state, setState] = useState<SubmissionState>({
    type: "idle",
    message: "",
  });

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const phone = String(formData.get("phone") || "").trim();
    const email = String(formData.get("email") || "").trim();

    if (!phone && !email) {
      setState({
        type: "error",
        message: "Συμπληρώστε τουλάχιστον τηλέφωνο ή email.",
      });
      return;
    }

    setState({
      type: "submitting",
      message: "Γίνεται αποστολή…",
    });

    try {
      const response = await fetch("/api/ekdoseis-interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: String(formData.get("fullName") || ""),
          phone,
          email,
          publicationId: String(formData.get("publicationId") || ""),
          message: String(formData.get("message") || ""),
          website: String(formData.get("website") || ""),
          privacyAccepted: formData.get("privacyAccepted") === "on",
        }),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result?.error || "Η αποστολή δεν ολοκληρώθηκε.");
      }

      form.reset();
      setState({
        type: "success",
        message:
          result?.message ||
          "Ευχαριστούμε. Θα επικοινωνήσουμε μαζί σας σύντομα.",
      });
    } catch (error) {
      setState({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Η αποστολή δεν ολοκληρώθηκε.",
      });
    }
  };

  return (
    <section
      id="interest"
      className="scroll-mt-32 rounded-[1.35rem] border border-[#d8c9ad] bg-[#f3e6c4] p-5 shadow-[0_10px_28px_rgba(67,45,26,0.09)] sm:p-7"
      aria-labelledby={`${id}-title`}
    >
      <div className="max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8a6a2f]">
          Επικοινωνία
        </p>
        <h2
          id={`${id}-title`}
          className="mt-2 font-heading text-2xl font-bold text-[#5a1e2e] sm:text-3xl"
        >
          {heading}
        </h2>
        <p className="mt-2 leading-7 text-[#554f47]">
          Αφήστε τα στοιχεία σας και θα επικοινωνήσουμε μαζί σας. Απαιτείται
          τουλάχιστον τηλέφωνο ή email.
        </p>
      </div>

      <form
        className="mt-6 grid gap-4 sm:grid-cols-2"
        onSubmit={submit}
      >
        <label className="text-[#554f47]" htmlFor={`${id}-name`}>
          Ονοματεπώνυμο *
          <input
            id={`${id}-name`}
            name="fullName"
            className="input input--full mt-1 border-[#d8c9ad]"
            type="text"
            autoComplete="name"
            minLength={2}
            maxLength={200}
            required
          />
        </label>

        <label className="text-[#554f47]" htmlFor={`${id}-publication`}>
          Έκδοση
          <select
            id={`${id}-publication`}
            name="publicationId"
            className="input input--full mt-1 border-[#d8c9ad]"
            defaultValue={initialPublicationId}
          >
            <option value="">Γενικά για τις εκδόσεις</option>
            {publications.map((publication) => (
              <option key={publication.id} value={publication.id}>
                {publication.title}
              </option>
            ))}
          </select>
        </label>

        <label className="text-[#554f47]" htmlFor={`${id}-phone`}>
          Τηλέφωνο
          <input
            id={`${id}-phone`}
            name="phone"
            className="input input--full mt-1 border-[#d8c9ad]"
            type="tel"
            autoComplete="tel"
            maxLength={80}
          />
        </label>

        <label className="text-[#554f47]" htmlFor={`${id}-email`}>
          Email
          <input
            id={`${id}-email`}
            name="email"
            className="input input--full mt-1 border-[#d8c9ad]"
            type="email"
            autoComplete="email"
            maxLength={320}
          />
        </label>

        <label
          className="text-[#554f47] sm:col-span-2"
          htmlFor={`${id}-message`}
        >
          Μήνυμα
          <textarea
            id={`${id}-message`}
            name="message"
            className="input input--full mt-1 min-h-28 resize-y border-[#d8c9ad]"
            maxLength={2000}
          />
        </label>

        <div
          aria-hidden="true"
          className="absolute -left-[10000px] h-px w-px overflow-hidden"
        >
          <label htmlFor={`${id}-website`}>
            Ιστότοπος
            <input
              id={`${id}-website`}
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
            />
          </label>
        </div>

        <label className="flex items-start gap-3 text-sm leading-6 text-[#554f47] sm:col-span-2">
          <input
            name="privacyAccepted"
            type="checkbox"
            className="mt-1 h-4 w-4 shrink-0 accent-[#5a1e2e]"
            required
          />
          <span>
            Συμφωνώ να χρησιμοποιηθούν τα στοιχεία μου αποκλειστικά για
            επικοινωνία σχετικά με τις εκδόσεις. Τα στοιχεία αποστέλλονται στο
            Φροντιστήριο και δεν αποθηκεύονται στην ιστοσελίδα.
          </span>
        </label>

        <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center">
          <button
            type="submit"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#5a1e2e] px-5 py-2.5 font-semibold text-white transition hover:bg-[#7a2e40] disabled:opacity-60"
            disabled={state.type === "submitting"}
          >
            {state.type === "submitting" ? "Αποστολή…" : "Αποστολή ενδιαφέροντος"}
          </button>

          <p
            className={
              state.type === "error"
                ? "text-sm font-medium text-red-700"
                : state.type === "success"
                  ? "text-sm font-medium text-green-800"
                  : "text-sm text-[#6e665c]"
            }
            role={state.type === "error" ? "alert" : "status"}
            aria-live="polite"
          >
            {state.message ||
              "Παραλήπτης: psaltikievosmou@gmail.com"}
          </p>
        </div>

        {state.type === "error" && (
          <p className="text-sm text-[#6e665c] sm:col-span-2">
            Εναλλακτικά, στείλτε μήνυμα στο{" "}
            <a
              href="mailto:psaltikievosmou@gmail.com"
              className="font-semibold text-[#5a1e2e] underline underline-offset-4"
            >
              psaltikievosmou@gmail.com
            </a>
            .
          </p>
        )}
      </form>
    </section>
  );
}

