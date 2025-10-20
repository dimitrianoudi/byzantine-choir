import SocialRegisterButton from "@/components/SocialRegisterButton";
import SectionDivider from "@/components/SectionDivider";

export default function HomePage() {
  return (
    <main className="container container--flush-left section section--flush-left">
      <div className="space-y-8 sm:space-y-10">   {/* <-- vertical gaps */}
        {/* Hero */}
        <section className="p-8 sm:p-10 text-center space-y-4">
          <h1 className="font-heading text-red" style={{ fontWeight: 800, fontSize: "clamp(22px, 3.2vw, 34px)" }}>
            Ψαλτική Παιδεία - Εκπαίδευση στη Βυζαντινή Μουσική
          </h1>
          <span className="font-heading text-muted" style={{ fontSize: "clamp(16px, 2.2vw, 20px)" }}>
            Ενορία Αγίου Αθανασίου &amp; Ευαγγελισμού Ευόσμου
          </span>
        </section>

        <SectionDivider />
        

        {/* Buttons */}
        <section className="stack">
          <div className="actions justify-center gap-4 sm:gap-6 block-gap">
            <SocialRegisterButton
              label="Ἐγγραφή για φυσική παρουσία στο Φροντιστήριο"
              className="btn btn-gold"
              redirectTo="/material"
            />
            <a href="/calendar" className="btn btn-outline">Πρόγραμμα</a>
          </div>
        </section>

        {/* Mission */}
        <section>
          <div className="mx-auto max-w-[760px] p-6 sm:p-8 text-center space-y-4">
            <h2 className="font-heading text-red" style={{ fontWeight: 700, fontSize: 20 }}>
              Αποστολή
            </h2>

            <p className="text-[15px] leading-relaxed text-muted max-w-6xl mx-auto">
              Με την ευλογία του Σεβασμιωτάτου Μητροπολίτου Νεαπόλεως και Σταυρουπόλεως κ.κ. Βαρνάβα, και σε αγαστή συνεργασία με τη Σχολή Βυζαντινής Μουσικής «Ιωσήφ ο Υμνογράφος», το "Φροντιστήριο Ψαλτικής", αποτελεί ενοριακό έργο του Ιερού Ναού Αγίου Αθανασίου και Ευαγγελισμού της Θεοτόκου Ευόσμου.
            </p>

            <p className="text-[15px] leading-relaxed text-muted max-w-6xl mx-auto">
                Με βαθύ σεβασμό και ευγνωμοσύνη προς τους πατέρες και το εκκλησιαστικό συμβούλιο της ενορίας, το Φροντιστήριο λειτουργεί υπό την πνευματική τους καθοδήγηση και φιλοξενία, υπηρετώντας την ψαλτική τέχνη ως προέκταση της λατρευτικής ζωής της Εκκλησίας.
            </p>

            <p className="text-[15px] leading-relaxed text-muted max-w-6xl mx-auto">
                Το Φροντιστήριο Ψαλτικής δεν αποτελεί σχολή ή Ωδείο. Είναι μαθητεία στην προσευχή μέσα από την Ψαλτική Τέχνη. Με στοιχεία θεωρητικής γνώσης Βυζαντινής Μουσικής και Τυπικού και κυρίως τη βιωματική πράξη του αναλογίου, οι συμμετέχοντες μαθαίνουν να κατανοούν, να ψάλλουν και να υπηρετούν με ταπείνωση και ακρίβεια το ιερό αναλόγιο και τη Λατρεία κυρίως της Ενορίας.
            </p>

            <p className="text-[15px] leading-relaxed text-muted max-w-6xl mx-auto">
              Στόχοι μας είναι η καλλιέργεια της μουσικής δεξιότητας, της εκκλησιαστικής συνείδησης και του ήθους που αρμόζει στον ιεροψάλτη. Οι σπουδαστές γνωρίζουν τη σημειογραφία και τη ρυθμική αγωγή της Βυζαντινής Μουσικής, ενώ ταυτόχρονα αναπτύσσουν σωστή φωνητική τοποθέτηση και ομαδική αρμονία.
            </p>

            <p className="text-[15px] leading-relaxed text-muted max-w-6xl mx-auto">
              Με απλά παραδείγματα, πρακτικές ασκήσεις και ζωντανή συμμετοχή, κάθε μάθημα γίνεται αφορμή να πλησιάσει κανείς το κάλλος της εκκλησιαστικής υμνολογίας και να βιώσει τη χαρά της διακονίας στο αναλόγιο.
            </p>

            <p className="text-[15px] leading-relaxed text-muted max-w-6xl mx-auto">
              Η κοινότητα του Φροντιστηρίου λειτουργεί ως οικογένεια πίστης και προσφοράς· οι μαθητές μοιράζονται ηχογραφήσεις, ασκήσεις και μικρούς εβδομαδιαίους στόχους, προχωρώντας όλοι μαζί με πνεύμα συνεργασίας και αλληλοενίσχυσης.
            </p>

            <p className="text-[15px] leading-relaxed text-muted max-w-xv mx-auto">
              Όποιος κι αν είναι ο βαθμός εμπειρίας του, ο καθένας βρίσκει εδώ έναν δρόμο μαθητείας και προόδου· έναν τρόπο να ενωθεί με τη ζωντανή παράδοση της Εκκλησίας και να προσφέρει τη φωνή του ως δώρο λατρείας και ευγνωμοσύνης.
            </p>

          </div>
        </section>

      </div>
    </main>
  );
}
