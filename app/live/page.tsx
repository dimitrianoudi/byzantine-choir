import { LIVE_STREAM, getYouTubeLiveEmbedUrl, getYouTubeLivePageUrl } from '@/lib/live';

export const metadata = {
  title: `${LIVE_STREAM.title} | Ψαλτική Παιδεία`,
  description: 'Παρακολουθήστε τις ζωντανές μεταδόσεις του καναλιού του Φροντιστηρίου από μία σταθερή σελίδα.',
};

export default function LivePage() {
  const embedUrl = getYouTubeLiveEmbedUrl();
  const livePageUrl = getYouTubeLivePageUrl();

  return (
    <div className="container container--flush-left section section--flush-left">
      <div className="space-y-6">
        <section className="card p-6 sm:p-8 space-y-4">
          <h1
            className="font-heading text-red"
            style={{ fontWeight: 800, fontSize: 'clamp(24px, 3vw, 34px)' }}
          >
            {LIVE_STREAM.title}
          </h1>

          <p className="text-[15px] leading-relaxed text-muted max-w-3xl">
            Όλες οι μελλοντικές ζωντανές μεταδόσεις του καναλιού{' '}
            <strong>{LIVE_STREAM.channelName}</strong> θα εμφανίζονται εδώ αυτόματα μόλις
            ξεκινήσει ένα YouTube Live.
          </p>

          <div className="actions gap-3 flex-wrap">
            <a
              href={livePageUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-gold"
            >
              Άνοιγμα live στο YouTube
            </a>
            <a
              href={LIVE_STREAM.channelUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-outline"
            >
              Άνοιγμα καναλιού
            </a>
          </div>
        </section>

        <section className="card p-3 sm:p-4 space-y-4">
          <div
            className="overflow-hidden rounded-[18px] border border-[var(--border)] bg-black"
            style={{ aspectRatio: '16 / 9' }}
          >
            <iframe
              src={embedUrl}
              title={`Ζωντανή μετάδοση ${LIVE_STREAM.channelName}`}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>

          <p className="text-sm leading-relaxed text-muted">
            Αν δεν υπάρχει ενεργή μετάδοση τη δεδομένη στιγμή, το YouTube μπορεί να εμφανίζει
            μήνυμα ότι δεν υπάρχει τρέχον live. Μόλις προγραμματιστεί ή ξεκινήσει η επόμενη
            μετάδοση από το ίδιο κανάλι, θα εμφανιστεί εδώ χωρίς να χρειαστεί νέα σελίδα.
          </p>
        </section>
      </div>
    </div>
  );
}
